// Mirrors the real output of cv/calibrate.py + cv/detect_waterline.py
// (AGOS-006/007). pointA/pointB here are each calibration file's
// display_point_a/display_point_b — a VERTICAL span of the reference
// object's fuller, visually-recognizable extent (e.g. the whole visible
// piling, not just its paint band) — and displayLengthCm is that segment's
// estimated real length. Both are derived from the same px_per_cm as the
// file's actual calibration datum (point_a/point_b), which is unaffected —
// this is a supplementary visualization, not a re-calibration. See each
// calibration file's "estimation_method" for how the underlying scale was
// derived, and "display_note" for how the display segment relates to it.
//
// waterlineRow is the representative detected row from
// cv/output/<clip>/readings.csv (independent of the above, drawn as the
// horizontal estimated-flood-level line). Coordinates are in the video's
// native pixel space; CalibratedVideo maps them onto the displayed
// (object-fit: contain) element at render time. Videos with no entry here
// haven't been calibrated (see cv/README.md).
//
// Keyed by the CURRENT filename under data/videos/ — these slots get
// reassigned from time to time (flood_2.mp4 and flood_3.mp4 both changed
// content on 2026-09-10), so always cross-check against each calibration
// file's own "clip" field before trusting a key here.
export const CV_CALIBRATION = {
  'flood_1.mp4': {
    videoWidth: 856,
    videoHeight: 716,
    pointA: [522, 78],
    pointB: [522, 200],
    referenceLabel: 'Mooring piling',
    referenceLengthCm: 65.9, // visible extent, top of hazard-marker band to waterline — see calibration/marinig_fishing_port.json
    waterlineRow: 161, // mean of readings.csv's waterline_row_px (156-170)
  },
  'flood_2.mp4': {
    videoWidth: 856,
    videoHeight: 718,
    pointA: [435, 228],
    pointB: [435, 300],
    referenceLabel: 'Mooring piling',
    referenceLengthCm: 96, // visible extent, top of hazard-marker band to where the moored boat occludes it — see calibration/marinig_fishing_port_stormy.json
    waterlineRow: 258, // constant across all sampled frames
  },
  'flood_3.mp4': {
    videoWidth: 1886,
    videoHeight: 1060,
    pointA: [800, 425],
    pointB: [800, 560],
    referenceLabel: 'Bridge pier',
    referenceLengthCm: 506.2, // visible extent, underside of deck to current waterline — see calibration/marikina_river_bridge.json
    waterlineRow: 505, // mean of readings.csv's waterline_row_px (482-519, jitters — see cv/README.md)
  },
};
