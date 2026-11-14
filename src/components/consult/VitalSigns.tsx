import React, { useEffect, useState } from 'react';
import { useInView } from './consultLib';
import { Placeholder } from './Bits';

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

/** "Vital signs" proof strip. Only numbers confirmed by Dr. Asyraf (3 branches, open 24 hours). */
const VitalSigns: React.FC = () => {
  const [ref, seen] = useInView<HTMLDListElement>(0.4);
  // <dt> comes first in the DOM (valid definition list); CSS shows the value above the label.
  return (
    <dl className="c-vitals" ref={ref}>
      <div className="c-vital">
        <dt className="c-vital-label">Branches</dt>
        <dd className="c-vital-value">
          <CountUp to={3} run={seen} />
        </dd>
      </div>
      <div className="c-vital">
        <dt className="c-vital-label">Hours, open daily</dt>
        <dd className="c-vital-value">
          <CountUp to={24} run={seen} />
        </dd>
      </div>
      <div className="c-vital">
        <dt className="c-vital-label">In-house systems</dt>
        <dd className="c-vital-value c-vital-value--word">Own</dd>
      </div>
      <div className="c-vital">
        <dt className="c-vital-label">
          <Placeholder>proof point label</Placeholder>
        </dt>
        <dd className="c-vital-value c-vital-value--word">
          <Placeholder>proof point value</Placeholder>
        </dd>
      </div>
    </dl>
  );
};

export default VitalSigns;
