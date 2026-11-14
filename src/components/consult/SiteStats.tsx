import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Link2, Monitor, UserPlus, Users, Handshake } from 'lucide-react';
import { fetchCollectionCount, track, useInView } from './consultLib';
import { Ed, useContent } from './editing';

/**
 * Counts a figure up from 0 (easing out, like a tally settling) once `run` is true. Keeps any
 * suffix, so "8k++" counts 0 to 8 and shows k++ throughout. Static for reduced motion, and
 * non-numeric values are shown as they are.
 */
const Figure: React.FC<{ value: string; run: boolean; delay?: number }> = ({ value, run, delay = 0 }) => {
  const m = /^(\d{1,6})(.*)$/.exec(value.trim());
  const target = m ? Number(m[1]) : null;
  const suffix = m ? m[2] : '';
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    if (target === null || !run) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const timer = setTimeout(() => {
      const tick = (now: number) => {
        start = start || now;
        const t = Math.min(1, (now - start) / 1500);
        setN(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, run, delay]);

  if (target === null) return <>{value}</>;
  // Before the count starts, show 0 so the figure doesn't flash its final value first.
  return (
    <span aria-label={value}>
      <span aria-hidden="true">
        {n ?? 0}
        {suffix}
      </span>
    </span>
  );
};

/**
 * Dedicated "visit the main website" panel with community stats. Keluarga TeamAra and Vendor TeamAra
 * are live counts of the main site's own lists (loaded once the panel scrolls into view); the
 * membership figure is the owner-supplied value in content.json. A count that can't be loaded is
 * left out rather than guessed. An optional real photo (site.photo) sits behind the bottom-left.
 */
const SiteStats: React.FC = () => {
  const { editing, content, get, uploadPhoto } = useContent();
  const [ref, seen] = useInView<HTMLElement>(0.15);
  const [counts, setCounts] = useState<{ collab: number | null; vendor: number | null } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const photo = get('site.photo');

  useEffect(() => {
    if (!seen) return;
    let live = true;
    Promise.all([fetchCollectionCount('collaborators'), fetchCollectionCount('vendors')]).then(([collab, vendor]) => {
      if (live) setCounts({ collab, vendor });
    });
    return () => {
      live = false;
    };
  }, [seen]);

  const tile = (Icon: React.ElementType, value: React.ReactNode, labelKey: string, key: string) => (
    <li className="c-stat" key={key}>
      <span className="c-stat-icon" aria-hidden="true">
        <Icon size={28} strokeWidth={1.6} />
      </span>
      <span className="c-stat-sep" aria-hidden="true" />
      <span className="c-stat-text">
        <span className="c-stat-value">{value}</span>
        <Ed as="span" k={labelKey} className="c-stat-label" />
      </span>
    </li>
  );
  const skeleton = <span className="c-stat-skel" aria-hidden="true" />;

  return (
    <section className="c-section c-site-sec" aria-labelledby="c-site" ref={ref}>
      <div className="c-container">
        <div className="c-site">
          <span className="c-site-shape" aria-hidden="true" />
          {photo && <img className="c-site-photo" src={photo} alt="" loading="lazy" decoding="async" />}
          <div className="c-site-copy">
            <p className="c-site-eyebrow">
              <Link2 size={16} aria-hidden="true" />
              <Ed k="site.eyebrow" />
            </p>
            <h2 id="c-site" className="c-site-h2">
              <Ed k="site.h2Lead" /> <Ed k="site.h2Em" className="c-site-h2-em" />
            </h2>
            <Ed as="p" k="site.body" className="c-site-body" />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="c-btn c-btn--light c-site-btn"
              onClick={() => track('main_site_link_clicked')}
            >
              <Monitor size={20} strokeWidth={1.75} aria-hidden="true" />
              <span>{content.site.cta}</span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
            {editing && (
              <>
                <button type="button" className="c-site-upload" onClick={() => input.current?.click()}>
                  {photo ? 'Replace background photo' : 'Add a background photo (real branch photo)'}
                </button>
                <input
                  ref={input}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) await uploadPhoto(file, 'site.photo');
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>
          <ul className="c-stats">
            {(!counts || counts.collab !== null) && tile(Users, counts ? <Figure value={String(counts.collab)} run delay={0} /> : skeleton, 'site.collabLabel', 'collab')}
            {(!counts || counts.vendor !== null) && tile(Handshake, counts ? <Figure value={String(counts.vendor)} run delay={150} /> : skeleton, 'site.vendorLabel', 'vendor')}
            {tile(UserPlus, editing ? <Ed k="site.membersValue" /> : <Figure value={get('site.membersValue')} run={seen} delay={300} />, 'site.membersLabel', 'members')}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default SiteStats;
