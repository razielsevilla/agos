import { useEffect, useRef, useState } from 'react';

// Only fetches/decodes video once its card is actually near the viewport,
// and pauses (without dropping the loaded data) once it scrolls back out.
// With N cards on screen this is the difference between N videos streaming
// simultaneously and only the handful actually visible doing any work —
// the fix for the "everything autoplays at once" bandwidth/CPU problem.
export default function LazyVideo({ src, style }) {
  const videoRef = useRef(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Track intersection only — never touch the <video> element here, since
  // setting src is async (React re-render) and calling play() in the same
  // tick would run against the *old* (empty) src.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) setHasEnteredView(true);
      },
      { rootMargin: '150px' } // start loading a little before it's actually on screen
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Runs after React has committed the src attribute, so play()/pause()
  // always act on the up-to-date element.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasEnteredView) return;
    if (isVisible) {
      el.play?.().catch(() => {}); // autoplay can be rejected before user interaction; harmless
    } else {
      el.pause?.();
    }
  }, [isVisible, hasEnteredView]);

  return (
    <video
      ref={videoRef}
      src={hasEnteredView ? src : undefined}
      preload="none"
      loop
      muted
      playsInline
      style={style}
    />
  );
}
