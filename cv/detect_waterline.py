"""cv/detect_waterline.py — AGOS-007/008: relative water-level estimation POC.

Given a fixed-camera clip and a calibration file produced by calibrate.py,
this scans a narrow vertical band around a chosen reference column, finds
the row where the scene's color stops matching a "known dry" patch sampled
fresh from just above the scan range in that same frame, and converts that
row into a relative water-level value (cm) using the calibration's
pixel-per-cm scale.

This is a classical, explainable heuristic — a calibration-method POC, not
a trained/learned model (see docs/scope.md). It is validated by eye against
the annotated frames it exports, not against measured ground truth.

Usage:
    python detect_waterline.py --input ../data/videos/flood_1.mp4 \
        --calibration calibration/marinig_fishing_port.json \
        --scan-column 522 --scan-range 140,420 \
        --output-dir output/flood_1
"""
import argparse
import csv
import json
import os
import sys

import cv2
import numpy as np

# Source clips can have non-ASCII names (e.g. downloaded livestream titles);
# don't let a console that can't render them crash the whole run.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def parse_range(s: str) -> tuple[int, int]:
    a, b = s.split(",")
    return int(a), int(b)


def parse_box(s: str) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = (int(v) for v in s.split(","))
    return x0, y0, x1, y1


def row_colors(hsv: np.ndarray, column: int, band_halfwidth: int, y0: int, y1: int) -> np.ndarray:
    """Mean HSV color per row across a narrow vertical strip, band-limited to [y0:y1)."""
    strip = hsv[y0:y1, max(0, column - band_halfwidth):column + band_halfwidth + 1].astype(np.float32)
    return strip.mean(axis=1)  # shape (y1-y0, 3)


def smooth(profile: np.ndarray, window: int) -> np.ndarray:
    if window <= 1:
        return profile
    kernel = np.ones(window) / window
    return np.convolve(profile, kernel, mode="same")


def find_waterline_row(
    frame_bgr: np.ndarray, column: int, y0: int, y1: int,
    dry_patch_height: int = 15, band_halfwidth: int = 6,
    color_threshold: float = 35.0, run_length: int = 5, smoothing_window: int = 7,
) -> int | None:
    """Returns the first row (absolute y) within [y0, y1) whose color diverges from a
    freshly-sampled 'known dry' patch (the band just above the scan range, which the
    calibration's lower reference point is chosen to keep above typical water level)
    for at least `run_length` consecutive rows.

    Comparison is done in HSV (hue/saturation separate water's muddy/reflective look
    from a dry structure's color better than raw brightness) and the per-row distance
    profile is smoothed with a moving average first, so a single rippling/reflective
    row can't trigger or break a detection on its own.

    This compares each frame against its own dry reference patch rather than a fixed
    baseline frame, so it isn't thrown off by water ripple/reflection noise that would
    make a plain frame-vs-frame difference fire everywhere water is present.
    """
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)

    dry_y0, dry_y1 = max(0, y0 - dry_patch_height), y0
    if dry_y1 <= dry_y0:
        dry_y0, dry_y1 = y0, min(y1, y0 + dry_patch_height)
    dry_patch = hsv[dry_y0:dry_y1, max(0, column - band_halfwidth):column + band_halfwidth + 1]
    dry_color = dry_patch.reshape(-1, 3).astype(np.float32).mean(axis=0)

    colors = row_colors(hsv, column, band_halfwidth, y0, y1)
    color_distance = np.linalg.norm(colors - dry_color, axis=1)
    color_distance = smooth(color_distance, smoothing_window)

    above_threshold = color_distance > color_threshold
    run = 0
    for i, flag in enumerate(above_threshold):
        run = run + 1 if flag else 0
        if run >= run_length:
            return y0 + i - run_length + 1
    return None


def annotate_frame(frame, calibration, column, y0, y1, waterline_row, relative_cm, frame_idx, timestamp_s):
    out = frame.copy()
    pa, pb = tuple(calibration["point_a"]), tuple(calibration["point_b"])
    cv2.line(out, pa, pb, (0, 255, 255), 2)
    for p in (pa, pb):
        cv2.circle(out, p, 5, (0, 0, 255), -1)
    cv2.putText(out, calibration["reference_label"], (pa[0] + 8, pa[1]),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

    cv2.rectangle(out, (column - 6, y0), (column + 6, y1), (255, 128, 0), 1)

    if waterline_row is not None:
        cv2.line(out, (0, waterline_row), (out.shape[1], waterline_row), (255, 0, 255), 2)
        label = f"waterline (row {waterline_row})"
    else:
        label = "waterline: not detected (still dry in scan range)"
    cv2.putText(out, label, (10, y0 - 10 if y0 > 20 else y1 + 20),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 0, 255), 2)

    level_text = f"Relative level: {relative_cm:+.1f} cm" if relative_cm is not None else "Relative level: n/a"
    cv2.putText(out, level_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(out, f"frame {frame_idx}  t={timestamp_s:.1f}s", (10, 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 1)
    cv2.putText(out, "POC estimate - OpenCV calibration method, not a trained model",
                (10, out.shape[0] - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1)
    return out


def main():
    ap = argparse.ArgumentParser(description="AGOS-007/008 relative water-level estimation POC")
    ap.add_argument("--input", required=True, help="Path to the source clip")
    ap.add_argument("--calibration", required=True, help="Path to a calibration JSON from calibrate.py")
    ap.add_argument("--output-dir", required=True, help="Directory to write annotated frames + readings.csv")
    ap.add_argument("--scan-column", type=int, help="x column to scan for the waterline (default: midpoint of the calibration points)")
    ap.add_argument("--scan-range", type=parse_range, required=True, help="y0,y1 search band to scan for the waterline")
    ap.add_argument("--crop", type=parse_box, help="x0,y0,x1,y1 — crop applied to every frame before analysis (use to strip player/UI chrome from screen-recorded clips)")
    ap.add_argument("--sample-every", type=int, default=15, help="Analyze/export every Nth frame (default: 15)")
    ap.add_argument("--max-samples", type=int, default=20, help="Cap on exported annotated frames (default: 20)")
    ap.add_argument("--band-halfwidth", type=int, default=6, help="Half-width in px of the scan strip (default: 6)")
    ap.add_argument("--dry-patch-height", type=int, default=15, help="Rows just above the scan range treated as a fresh 'known dry' color sample (default: 15)")
    ap.add_argument("--color-threshold", type=float, default=35.0, help="HSV color-distance threshold from the dry patch (default: 35.0)")
    ap.add_argument("--run-length", type=int, default=5, help="Consecutive rows that must exceed the threshold before it counts as the waterline — higher = more resistant to noise/reflections (default: 5)")
    args = ap.parse_args()

    with open(args.calibration, encoding="utf-8") as f:
        calibration = json.load(f)

    scan_column = args.scan_column
    if scan_column is None:
        scan_column = round((calibration["point_a"][0] + calibration["point_b"][0]) / 2)
    y0, y1 = args.scan_range

    cap = cv2.VideoCapture(args.input)
    if not cap.isOpened():
        raise SystemExit(f"Could not open video: {args.input}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    def read_frame(idx):
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ok, frame = cap.read()
        if not ok:
            return None
        if args.crop:
            x0, cy0, x1, cy1 = args.crop
            frame = frame[cy0:cy1, x0:x1]
        return frame

    frames_dir = os.path.join(args.output_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)

    datum_row = calibration["point_b"][1]  # lower calibration point = the "0 cm" datum
    px_per_cm = calibration["px_per_cm"]

    readings = []
    exported = 0
    for idx in range(0, n_frames, args.sample_every):
        if exported >= args.max_samples:
            break
        frame = read_frame(idx)
        if frame is None:
            continue

        waterline_row = find_waterline_row(
            frame, scan_column, y0, y1,
            dry_patch_height=args.dry_patch_height, band_halfwidth=args.band_halfwidth,
            color_threshold=args.color_threshold, run_length=args.run_length,
        )
        relative_cm = (datum_row - waterline_row) / px_per_cm if waterline_row is not None else None
        timestamp_s = idx / fps

        annotated = annotate_frame(frame, calibration, scan_column, y0, y1, waterline_row, relative_cm, idx, timestamp_s)
        cv2.imwrite(os.path.join(frames_dir, f"frame_{idx:05d}.png"), annotated)

        readings.append({
            "frame_idx": idx,
            "timestamp_s": round(timestamp_s, 2),
            "waterline_row_px": waterline_row,
            "relative_level_cm": round(relative_cm, 2) if relative_cm is not None else None,
        })
        exported += 1

    cap.release()

    csv_path = os.path.join(args.output_dir, "readings.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["frame_idx", "timestamp_s", "waterline_row_px", "relative_level_cm"])
        writer.writeheader()
        writer.writerows(readings)

    levels = [r["relative_level_cm"] for r in readings if r["relative_level_cm"] is not None]
    summary = {
        "clip": os.path.basename(args.input),
        "calibration_file": os.path.basename(args.calibration),
        "frames_analyzed": len(readings),
        "min_relative_level_cm": min(levels) if levels else None,
        "max_relative_level_cm": max(levels) if levels else None,
        "mean_relative_level_cm": round(sum(levels) / len(levels), 2) if levels else None,
        "estimate_type": "opencv_calibration_poc",
        "trained_model": False,
        "validation": "visual (annotated frames), not measured against ground truth — see docs/scope.md",
    }
    with open(os.path.join(args.output_dir, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Analyzed {len(readings)} frames from {args.input}")
    print(f"Annotated frames -> {frames_dir}")
    print(f"Readings CSV     -> {csv_path}")
    print(f"Summary          -> {os.path.join(args.output_dir, 'summary.json')}")
    print(summary)


if __name__ == "__main__":
    sys.exit(main())
