# AGOS CV POC — Waterline Detection (Phase 1 / AGOS-006, 007, 008)

A classical OpenCV calibration-method proof-of-concept, **not a trained/learned
model** (see `../docs/scope.md`). It estimates a fixed camera's water level
*relative to a manually calibrated reference object* — it does not attempt
absolute, validated, or live measurements. That is explicitly out of scope
for this phase and deferred to a CDRRMO-partnered pilot.

## How it works

1. **`calibrate.py`** — one-time-per-camera step. You (or a script) mark two
   points along a fixed, visible reference object in one frame and give the
   real-world distance between them. This writes a small JSON calibration
   file (`calibration/*.json`) plus a `_preview.png` so the calibration can
   be checked by eye before trusting it. A fixed CCTV/bridge camera doesn't
   move, so this is a one-time cost per camera framing, not per clip or frame.

   `calibrate.py` also accepts an optional `--display-point-a`/`--display-point-b`
   pair: a separate, usually longer span of the object's fuller
   visually-recognizable extent (e.g. the whole visible piling, not just its
   paint band), used only to draw/label the object on the frontend's video
   overlay. Its `display_length_cm` is derived from the *same* px_per_cm as
   the real calibration points — it does not change the scale or the
   water-level datum, which stay anchored to `--point-a`/`--point-b`.

2. **`detect_waterline.py`** — for each analyzed frame, scans a narrow
   vertical strip at a chosen column and finds the row where the scene's
   color (in HSV) stops matching a "known dry" patch sampled fresh from just
   above the search range in that same frame. This is compared per-frame
   against its own dry reference, not a single fixed baseline frame — plain
   frame-vs-frame differencing was tried first and produced false positives
   everywhere rippling water appeared different from frame 0, even where
   nothing had actually changed. The per-row color-distance profile is
   smoothed before thresholding to resist single-row reflection/ripple noise.
   The detected row is converted to a relative-cm value using the
   calibration's px/cm scale, annotated on the frame, and logged to CSV.

## ⚠️ `flood_N.mp4` is a reused slot name, not a stable identity

`data/videos/flood_1.mp4`/`flood_2.mp4`/`flood_3.mp4` are demo-video slots
that get **reassigned** — as happened on 2026-09-10, when `flood_2.mp4` and
`flood_3.mp4` were both swapped for different footage and a fourth clip (the
"3rd Alarm" Marikina night clip) was deleted entirely. Calibration files are
therefore named after what the camera actually **shows** (e.g.
`marinig_fishing_port_stormy.json`), never after a `flood_N` slot — that name
would go stale the next time someone reassigns the slots. Each calibration
file's own `"clip"` field is the single source of truth for which current
filename it applies to; if you're touching this pipeline, verify that field
still matches reality before trusting anything downstream (`cvCalibration.js`,
`data/seed.json`) that's keyed by filename.

## Calibrated cameras

Each `reference_length_cm` below is a **professional estimate, not a field
measurement** — nobody has visited these cameras with a tape measure. What
distinguishes an estimate from an arbitrary guess is the reasoning behind it,
so every calibration file's `estimation_method` field records exactly how the
number was derived (domain knowledge of the object class, and/or a
cross-reference against another object of roughly known size visible in the
same frame). Treat these as the calibration-method POC's best defensible
numbers pending an actual site visit, not as validated measurements.

| Calibration file | Current clip | Reference object (datum) | Estimated length | How it was estimated | Display extent (video overlay) |
|---|---|---|---|---|---|
| `marinig_fishing_port.json` | `flood_1.mp4` | Mooring piling, red/white cap band | 40cm | The piling is a maritime mooring pile with an IALA-style red/white navigational hazard-marker paint band on its upper section — a convention for keeping the pile visible to boat operators. Marker bands of this type are typically 30–60cm long; 40cm is the mid-range value. No independent secondary object of confidently-known size was available in this frame to cross-check further (the moored boat's freeboard varies with load/buoyancy, and nearby stairs/railings are too foreshortened by the camera's oblique angle to measure reliably). | Top of cap band down to where the piling meets the water surface (the clean edge gives way to a rippling reflection below that) — 65.9cm, derived from the same 1.85px/cm scale. |
| `marinig_fishing_port_stormy.json` | `flood_2.mp4` | Same piling, same cap band, stormier/higher-water observation | 40cm | **Separate calibration** — despite showing the same physical piling as `marinig_fishing_port.json`, this clip uses a visibly different camera zoom/framing (a real finding: calibrate per **camera framing**, never assume two clips from "the same place" share one calibration — reusing the other calibration here silently produced a nonsense reading, the detected line landing on open sky). Same object, same 40cm estimate, for consistency between the two observations. | Top of cap band down to where the moored boat's hull occludes the piling — 96cm, derived from the same 0.75px/cm scale. |
| `marikina_river_bridge.json` | `flood_3.mp4` | Near bridge pier, width | 150cm | Cross-referenced against a light/medium delivery truck (Isuzu Elf-class — a standardized ~2.5m-tall PH commercial vehicle) visible on the near-side access road in the same frame: the truck measures ~71px tall there, giving ~0.284px/cm at *its* distance from camera. The truck is closer to camera than the pier row across the river, and apparent size shrinks with distance, so the pier's true px/cm (at its greater distance) is lower than the truck's ratio — i.e. the pier is wider than a naive same-ratio read would suggest. Combined with standard DPWH practice for elevated-viaduct RC column piers (commonly 1.2–1.8m diameter for a multi-lane carriageway of this span), 150cm was taken as the representative diameter, revised up from an earlier unreferenced 100cm placeholder. This clip is also a screen recording of a YouTube livestream (player UI baked into the frame) — the chosen scan region avoids the on-screen chrome. | **Vertical**, not horizontal like the datum above: underside of the bridge deck down to the current waterline — 506.2cm (~5.06m), derived from the same 0.267px/cm scale. Plausible for an elevated flood-control viaduct's clearance above an already-elevated river. |

All three currently-present videos are calibrated — there's no "not yet
calibrated" clip left in the active set (there was, briefly: an uncalibrated
wide establishing shot and the deleted "3rd Alarm" night clip both occupied
slots at one point, but neither survived the 2026-09-10 reassignment).

The "reference object (datum)" columns are what `detect_waterline.py` actually
uses for the px/cm scale and the water-level zero-point — those numbers back
every `water_level_estimate_cm` in `data/seed.json`. The "display extent"
column is a separate, purely-visual span (usually longer, and vertical, since
that's what a viewer expects "how tall is this thing" to look like) drawn on
the frontend's video overlay via `frontend/src/cvCalibration.js` — it's
derived from the same underlying scale, not an independent measurement, and
changing it never changes the calibration or the seeded cm values.

The Marikina clip was originally sourced with a YouTube-livestream title as
its filename (including emoji and special characters), which broke shell
quoting and console encoding in a couple of the commands above — it's since
been renamed to the clean, convention-matching name shown here.

## Results (`output/<clip>/`)

Each folder has `readings.csv` (full sampled series), `summary.json`
(min/max/mean + an explicit `"trained_model": false` flag), and a `frames/`
folder with a representative subset of annotated frames (reference line,
detected waterline, relative-cm reading — the full series lives in the CSV
even where not every frame's image was kept).

- **`flood_1` vs `flood_2`** (same physical piling, Jul 19 → Jul 20, real
  CDRRMO "Water Level Monitoring" footage from Fishing Port, Brgy. Marinig):
  mean relative level rose from **-4.9cm to 0.0cm** relative to each frame's
  own calibration datum — i.e. the water visibly rose between the two
  real recorded observations, which matches what's visible by eye (calmer/
  drier in `flood_1`, stormy with water lapping the steps in `flood_2`).
  This is the strongest, most consistent result and the one to lead with
  for AGOS-007's "validated by eye against 2+ clips" bar.
- **`flood_3`** (Marikina bridge pier): detection is directionally correct
  (lands close to the visible waterline) but jitters roughly ±45–140cm
  frame-to-frame on this clip (mean -167.2cm, range -82.5 to -221.2cm),
  versus a tight, stable reading on the Marinig piling. Part of that range is
  real detection jitter; part of it is simply that the 150cm reference spans
  more real-world distance per pixel than a shorter reference would, so the
  same pixel-row jitter converts to a wider cm spread. The pier is grey
  concrete against muddy, reflective brown water — lower color contrast and
  more specular noise than the piling's red-vs-grey contrast. **Flagged as a
  known limitation**, not hidden: a good next iteration is a per-frame
  Otsu/K-means split on the scan column instead of a fixed distance
  threshold, since that adapts to each frame's own contrast rather than
  relying on one hand-tuned number.

## Usage

```bash
cd cv
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt

# One-time per camera framing:
python calibrate.py --input ../data/videos/flood_1.mp4 \
  --output calibration/my_camera.json \
  --point-a 522,78 --point-b 522,152 --length-cm 40 \
  --label "Mooring piling, white cap band" \
  --display-point-a 522,78 --display-point-b 522,200   # optional: fuller extent for the video overlay
# (omit --point-a/--point-b to click interactively instead, if you have a display)

# Then, per clip:
python detect_waterline.py --input ../data/videos/flood_1.mp4 \
  --calibration calibration/my_camera.json \
  --scan-column 522 --scan-range 152,450 \
  --output-dir output/flood_1
```

Run `python calibrate.py --help` / `python detect_waterline.py --help` for
the full flag list (crop box for stripping player UI chrome, sampling rate,
band width, thresholds, etc).
