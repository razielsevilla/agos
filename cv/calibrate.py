"""cv/calibrate.py — AGOS-006: one-time reference-object calibration.

A fixed CCTV/bridge camera doesn't move, so calibration is a one-time cost
per camera, not per-frame or per-clip. This tool marks two points along a
fixed, visible reference object (a pole, pier edge, wall, railing...) in one
frame, takes the real-world distance between them, and writes a small
calibration file that detect_waterline.py uses to convert pixel rows into
relative water-level estimates.

This is deliberately NOT a trained model — it is the calibration-method POC
scoped by docs/tickets.md (AGOS-006) and docs/scope.md.

Interactive (click two points on-screen, then enter the real-world length):
    python calibrate.py --input ../data/videos/flood_1.mp4 \
        --output calibration/marinig_fishing_port.json \
        --label "Mooring piling, white cap band" --length-cm 40

Non-interactive (pixel points already known — used for headless/scripted runs):
    python calibrate.py --input ../data/videos/flood_1.mp4 \
        --output calibration/marinig_fishing_port.json \
        --point-a 522,78 --point-b 522,152 --length-cm 40 \
        --label "Mooring piling, white cap band"

Either way this writes <output>.json plus a <output>_preview.png so the
calibration can be checked by eye before trusting it.
"""
import argparse
import datetime
import json
import math
import os
import sys

import cv2

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def parse_point(s: str) -> tuple[int, int]:
    x, y = s.split(",")
    return int(x), int(y)


def load_frame(path: str, frame_index: int):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise SystemExit(f"Could not open video: {path}")
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
    ok, frame = cap.read()
    cap.release()
    if not ok:
        raise SystemExit(f"Could not read frame {frame_index} from {path}")
    return frame


def interactive_pick(frame) -> tuple[tuple[int, int], tuple[int, int]]:
    points: list[tuple[int, int]] = []
    window = "AGOS calibration - click 2 points on the reference object, then press any key"

    def on_click(event, x, y, flags, userdata):
        if event == cv2.EVENT_LBUTTONDOWN and len(points) < 2:
            points.append((x, y))
            cv2.circle(frame, (x, y), 4, (0, 255, 255), -1)
            if len(points) == 2:
                cv2.line(frame, points[0], points[1], (0, 255, 255), 1)
            cv2.imshow(window, frame)

    try:
        cv2.imshow(window, frame)
        cv2.setMouseCallback(window, on_click)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    except cv2.error as exc:
        raise SystemExit(
            "No display available for interactive calibration "
            "(this environment can't open an OpenCV window).\n"
            "Re-run with --point-a x,y --point-b x,y instead, e.g.:\n"
            "  python calibrate.py --input <clip> --output <file> "
            "--point-a 100,50 --point-b 100,200 --length-cm 40"
        ) from exc

    if len(points) != 2:
        raise SystemExit("Calibration cancelled — need exactly 2 points.")
    return points[0], points[1]


def main():
    ap = argparse.ArgumentParser(description="AGOS-006 reference-object calibration tool")
    ap.add_argument("--input", required=True, help="Path to the source clip")
    ap.add_argument("--output", required=True, help="Path to write the calibration JSON")
    ap.add_argument("--frame", type=int, default=0, help="Frame index to calibrate against (default: 0)")
    ap.add_argument("--point-a", type=parse_point, help="x,y of the first reference point (skips interactive mode)")
    ap.add_argument("--point-b", type=parse_point, help="x,y of the second reference point (skips interactive mode)")
    ap.add_argument("--length-cm", type=float, required=True, help="Real-world distance between point A and B, in cm")
    ap.add_argument("--label", required=True, help="Human description of the reference object, e.g. 'Mooring piling, white cap band'")
    ap.add_argument(
        "--assumed", action="store_true", default=True,
        help="Mark the length as an assumed/illustrative value rather than a field measurement (default: True — pass --measured once someone has actually measured it on-site)",
    )
    ap.add_argument("--measured", dest="assumed", action="store_false", help="Mark the length as a real, field-measured value")
    ap.add_argument(
        "--estimation-method", default=None,
        help="How reference_length_cm was derived when it isn't a field measurement — e.g. domain knowledge of the object class, or cross-referenced against another object of known size visible in frame. Recorded verbatim in the calibration file.",
    )
    ap.add_argument(
        "--display-point-a", type=parse_point, default=None,
        help="Optional: x,y for a SEPARATE, usually longer pair of points spanning the reference object's fuller visually-recognizable extent (e.g. the whole visible piling, not just its paint band). Purely for drawing/labeling the object on video overlays — does NOT change px_per_cm or the water-level datum, which stay anchored to --point-a/--point-b.",
    )
    ap.add_argument("--display-point-b", type=parse_point, default=None, help="See --display-point-a.")
    args = ap.parse_args()

    frame = load_frame(args.input, args.frame)

    if args.point_a and args.point_b:
        point_a, point_b = args.point_a, args.point_b
    else:
        point_a, point_b = interactive_pick(frame.copy())

    pixel_dist = math.dist(point_a, point_b)
    if pixel_dist == 0:
        raise SystemExit("The two points are identical — pick two distinct points along the reference object.")
    px_per_cm = pixel_dist / args.length_cm

    calibration = {
        "clip": os.path.basename(args.input),
        "calibrated_frame_index": args.frame,
        "reference_label": args.label,
        "point_a": list(point_a),
        "point_b": list(point_b),
        "reference_length_cm": args.length_cm,
        "is_illustrative_assumption": args.assumed,
        "px_per_cm": round(px_per_cm, 4),
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "method": "manual reference-object calibration (AGOS-006) — not a trained model",
    }
    if args.assumed:
        calibration["note"] = (
            "reference_length_cm is an ESTIMATED value, not a field measurement. "
            "Replace with an on-site tape-measured value during pilot calibration."
        )
        if args.estimation_method:
            calibration["estimation_method"] = args.estimation_method

    if args.display_point_a and args.display_point_b:
        display_pixel_dist = math.dist(args.display_point_a, args.display_point_b)
        calibration["display_point_a"] = list(args.display_point_a)
        calibration["display_point_b"] = list(args.display_point_b)
        calibration["display_length_cm"] = round(display_pixel_dist / px_per_cm, 1)
        calibration["display_note"] = (
            "display_point_a/b span the reference object's fuller visually-recognizable "
            "extent, for drawing/labeling it on video overlays. display_length_cm is derived "
            "from the same px_per_cm as point_a/point_b above, NOT independently measured. "
            "The water-level datum stays anchored to point_a/point_b, unaffected by this."
        )

    os.makedirs(os.path.dirname(os.path.abspath(args.output)) or ".", exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(calibration, f, indent=2)

    preview = frame.copy()
    cv2.line(preview, point_a, point_b, (0, 255, 255), 2)
    for p in (point_a, point_b):
        cv2.circle(preview, p, 5, (0, 0, 255), -1)
    cv2.putText(
        preview, f"{args.label}: {args.length_cm}cm = {pixel_dist:.1f}px ({px_per_cm:.3f} px/cm)",
        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2,
    )
    if args.display_point_a and args.display_point_b:
        cv2.line(preview, args.display_point_a, args.display_point_b, (255, 200, 0), 2)
        for p in (args.display_point_a, args.display_point_b):
            cv2.circle(preview, p, 5, (255, 0, 255), -1)
        cv2.putText(
            preview, f"display extent: {calibration['display_length_cm']}cm = {display_pixel_dist:.1f}px",
            (10, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 200, 0), 2,
        )
    preview_path = os.path.splitext(args.output)[0] + "_preview.png"
    cv2.imwrite(preview_path, preview)

    print(f"Wrote calibration: {args.output}")
    print(f"Wrote preview:     {preview_path}")
    print(f"px_per_cm = {px_per_cm:.4f}")


if __name__ == "__main__":
    sys.exit(main())
