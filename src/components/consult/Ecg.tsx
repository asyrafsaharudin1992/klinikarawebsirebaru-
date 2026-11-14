import React, { useEffect, useRef } from 'react';
import { useInView } from './consultLib';

/**
 * Both pieces reveal an ECG trace with transforms only: an overflow-hidden wrapper slides in
 * from the left while its child slides the opposite way, so the line appears to be "drawn".
 */

/** Fixed bar along the top edge that draws itself as the page scrolls. */
export const ScrollEcg: React.FC = () => {
  const reveal = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (reveal.current) reveal.current.style.transform = `translateX(${(p - 1) * 100}%)`;
      if (inner.current) inner.current.style.transform = `translateX(${(1 - p) * 100}%)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="c-ecg-progress" aria-hidden="true">
      <div className="c-ecg-reveal" ref={reveal} style={{ transform: 'translateX(-100%)' }}>
        <div className="c-ecg-inner" ref={inner} style={{ transform: 'translateX(100%)' }}>
          <div className="c-ecg-line" />
        </div>
      </div>
    </div>
  );
};

/** Section divider that draws itself once when it scrolls into view. */
export const EcgDivider: React.FC = () => {
  const [ref, seen] = useInView<HTMLDivElement>(0.6);
  return (
    <div ref={ref} className={`c-ecg-divider${seen ? ' is-in' : ''}`} aria-hidden="true">
      <div className="c-ecg-reveal">
        <div className="c-ecg-inner">
          <div className="c-ecg-line" />
        </div>
      </div>
    </div>
  );
};
