import { useEffect, useRef, useState } from 'react';

// Renders a <video> with an SVG overlay drawing the AGOS-006 calibration
// reference line and the AGOS-007 detected waterline, positioned correctly
// on top of the video regardless of the container's aspect ratio (which
// rarely matches the source clip's own). Uses `object-fit: contain` rather
// than `cover` — cover crops part of the frame to fill the box, and for the
// Marinig piling clips (source ~1.2:1 inside a 16:9 card) that cropped off
// the calibration point near the top of frame entirely. Contain guarantees
// the full frame — and every calibrated point in it — stays visible,
// letterboxed on the black background instead.
export default function CalibratedVideo({ src, calibration, ...videoProps }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [videoSize, setVideoSize] = useState({
    width: calibration?.videoWidth ?? 0,
    height: calibration?.videoHeight ?? 0,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (v && v.videoWidth && v.videoHeight) {
      setVideoSize({ width: v.videoWidth, height: v.videoHeight });
    }
  };

  const overlay = renderOverlay(calibration, containerSize, videoSize);

  return (
    // Absolutely fills the nearest positioned ancestor (the aspect-ratio box in
    // SensorsFeeds) rather than participating in it as a percentage-height flex
    // child — that combination is unreliable across browsers/timing and was
    // causing some cards to size to the video's native aspect ratio instead.
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <video
        ref={videoRef}
        src={src}
        onLoadedMetadata={handleLoadedMetadata}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        {...videoProps}
      />
      {overlay}
    </div>
  );
}

function renderOverlay(calibration, containerSize, videoSize) {
  if (!calibration || !containerSize.width || !videoSize.width) return null;

  const scale = Math.min(containerSize.width / videoSize.width, containerSize.height / videoSize.height);
  const offsetX = (containerSize.width - videoSize.width * scale) / 2;
  const offsetY = (containerSize.height - videoSize.height * scale) / 2;
  const toScreen = ([x, y]) => [offsetX + x * scale, offsetY + y * scale];

  const [ax, ay] = toScreen(calibration.pointA);
  const [bx, by] = toScreen(calibration.pointB);
  const waterlineY = offsetY + calibration.waterlineRow * scale;

  const labelStyle = { paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.85)', strokeWidth: 3, fill: 'white', fontSize: 12, fontWeight: 600 };

  return (
    <svg
      width={containerSize.width}
      height={containerSize.height}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      {/* AGOS-006 calibration reference line — endpoints mark the object's
          measured extent; the length label is a professional estimate, not
          a field measurement (see the calibration file's estimation_method) */}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#facc15" strokeWidth={3} />
      <circle cx={ax} cy={ay} r={5} fill="#ef4444" stroke="white" strokeWidth={1} />
      <circle cx={bx} cy={by} r={5} fill="#ef4444" stroke="white" strokeWidth={1} />
      <text x={ax + 10} y={Math.max(14, ay - 6)} style={labelStyle}>
        {calibration.referenceLabel}
        {calibration.referenceLengthCm ? ` (~${calibration.referenceLengthCm}cm est.)` : ''}
      </text>

      {/* AGOS-007 detected waterline (representative reading) */}
      <line
        x1={0} y1={waterlineY} x2={containerSize.width} y2={waterlineY}
        stroke="#ec4899" strokeWidth={2} strokeDasharray="6,4"
      />
      <text x={8} y={Math.max(14, waterlineY - 8)} style={{ ...labelStyle, fill: '#fbcfe8' }}>
        Detected waterline (avg. reading)
      </text>
    </svg>
  );
}
