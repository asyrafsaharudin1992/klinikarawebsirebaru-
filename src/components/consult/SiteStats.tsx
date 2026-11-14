import React, { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { fetchCollectionCount, track, useInView } from './consultLib';
import { Ed, useContent } from './editing';

/**
 * Dedicated "visit the main website" space with community stats. Keluarga TeamAra and Vendor TeamAra
 * are live counts of the main site's own lists (loaded once the section scrolls into view); the
 * membership figure is the owner-supplied value from content.json. A count that can't be loaded
 * is simply left out rather than guessed.
 */
const SiteStats: React.FC = () => {
  const { content } = useContent();
  const [ref, seen] = useInView<HTMLElement>(0.15);
  const [counts, setCounts] = useState<{ collab: number | null; vendor: number | null } | null>(null);

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

  const tile = (value: React.ReactNode, labelKey: string, key: string) => (
    <li className="c-stat" key={key}>
      <span className="c-stat-value">{value}</span>
      <Ed as="span" k={labelKey} className="c-stat-label" />
    </li>
  );

  return (
    <section className="c-section c-site-sec" aria-labelledby="c-site" ref={ref}>
      <div className="c-container">
        <div className="c-site">
          <div className="c-site-copy">
            <Ed as="p" k="site.eyebrow" className="c-site-eyebrow" />
            <Ed as="h2" id="c-site" k="site.h2" className="c-site-h2" />
            <Ed as="p" k="site.body" className="c-site-body" />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="c-btn c-btn--light"
              onClick={() => track('main_site_link_clicked')}
            >
              {content.site.cta}
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <ul className="c-stats">
            {(!counts || counts.collab !== null) && tile(counts ? counts.collab : <span className="c-stat-skel" aria-hidden="true" />, 'site.collabLabel', 'collab')}
            {(!counts || counts.vendor !== null) && tile(counts ? counts.vendor : <span className="c-stat-skel" aria-hidden="true" />, 'site.vendorLabel', 'vendor')}
            {tile(<Ed k="site.membersValue" />, 'site.membersLabel', 'members')}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default SiteStats;
