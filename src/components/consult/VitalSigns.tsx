import React, { useEffect, useState } from 'react';
import { useInView } from './consultLib';
import { Ed, useContent } from './editing';

const CountUp: React.FC<{ to: number; run: boolean }> = ({ to, run }) => {
  const [n, setN] = useState(to);
  useEffect(() => {
    if (!run || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100);
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{n}</>;
};

/** "Vital signs" proof strip. Whole numbers count up on view; anything else (words, placeholders) shows as is. */
const VitalSigns: React.FC = () => {
  const { editing, content, get } = useContent();
  const [ref, seen] = useInView<HTMLDListElement>(0.4);
  // <dt> comes first in the DOM (valid definition list); CSS shows the value above the label.
  return (
    <dl className="c-vitals" ref={ref}>
      {content.vitals.map((_, i) => {
        const value = get(`vitals.${i}.value`);
        const numeric = /^\d{1,4}$/.test(value);
        return (
          <div className="c-vital" key={i}>
            <Ed as="dt" k={`vitals.${i}.label`} className="c-vital-label" />
            {numeric && !editing ? (
              <dd className="c-vital-value">
                <CountUp to={Number(value)} run={seen} />
              </dd>
            ) : (
              <Ed as="dd" k={`vitals.${i}.value`} className={`c-vital-value${numeric ? '' : ' c-vital-value--word'}`} />
            )}
          </div>
        );
      })}
    </dl>
  );
};

export default VitalSigns;
