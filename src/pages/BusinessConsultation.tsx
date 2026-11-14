import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, ClipboardList, GitBranch, Handshake, Landmark, MapPin, ShieldCheck, UserRound, Video, Wallet } from 'lucide-react';
import SEO from '../components/SEO';
import SiteFooter from '../components/SiteFooter';
import ProblemCards, { CardPick } from '../components/consult/ProblemCards';
import BookingForm, { Prefill } from '../components/consult/BookingForm';
import StickyCta from '../components/consult/StickyCta';
import SiteStats from '../components/consult/SiteStats';
import { WhatsAppLink, goToForm, scrollToId } from '../components/consult/Bits';
import { meta, track } from '../components/consult/consultLib';
import { ContentProvider, Ed, useContent } from '../components/consult/editing';
import '../components/consult/Consult.css';

// Small local copy of the Klinik Ara mark (the site favicon, cropped), so the header doesn't download a large image.
const LOGO = '/consult-logo.png';

// The localhost editor toolbar is only imported in dev (the condition is a build-time constant, so
// production bundles drop it entirely).
const EditorBar = import.meta.env.DEV ? lazy(() => import('../components/consult/EditorBar')) : null;

const DISCUSS_ICONS = [ClipboardList, Landmark, Wallet, MapPin, ShieldCheck, GitBranch];
const TRUST_ICONS = [BadgeCheck, Video, UserRound, Handshake];

const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: meta.title,
  url: meta.url,
  description: meta.description,
  inLanguage: 'en-MY',
  isPartOf: { '@type': 'WebSite', name: 'Klinik Ara 24 Jam', url: 'https://klinikara24jam.hsohealthcare.com' },
});

/** A photo from content.json. Shows nothing for visitors until a real photo is set; in the localhost editor it is a click-to-upload box. */
const PhotoSlot: React.FC<{ k: string; alt: string; className?: string; priority?: boolean }> = ({ k, alt, className, priority }) => {
  const { editing, get, uploadPhoto } = useContent();
  const input = useRef<HTMLInputElement>(null);
  const src = get(k);
  if (!src && !editing) return null;
  return (
    <div
      className={`c-photo ${className ?? ''}${editing ? ' is-editable' : ''}`}
      role={editing ? 'button' : undefined}
      tabIndex={editing ? 0 : undefined}
      aria-label={editing ? (src ? 'Replace photo' : 'Upload photo') : undefined}
      onClick={editing ? () => input.current?.click() : undefined}
      onKeyDown={editing ? (e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click() : undefined}
    >
      {src ? (
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" />
      ) : (
        <span className="c-photo-empty">Photo goes here</span>
      )}
      {editing && (
        <>
          <span className="c-photo-hint">{src ? 'Click to replace photo' : 'Click to upload photo'}</span>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await uploadPhoto(file, k);
              e.target.value = '';
            }}
          />
        </>
      )}
    </div>
  );
};

function Page() {
  const { editing, content } = useContent();
  const [prefill, setPrefill] = useState<Prefill>({ situation: '', topic: '', nonce: 0 });

  // The static copy written at build time (scripts/prerender-consult.mjs) carries these tags for
  // crawlers that skip JavaScript. Once <SEO> has rendered the same tags, drop the static ones.
  useEffect(() => {
    document.querySelectorAll('[data-prerender="true"]').forEach((el) => el.remove());
    track('consultation_page_view');
  }, []);

  const onPick = (pick: CardPick) => {
    setPrefill((p) => ({ ...pick, nonce: p.nonce + 1 }));
    scrollToId('book');
  };

  const hasHeroPhoto = !!content.hero.photo;

  return (
    <div className={`consult-page${editing ? ' is-editing' : ''}`}>
      <SEO
        lang="en"
        title={meta.title}
        description={meta.description}
        url={meta.url}
        canonicalUrl={meta.url}
        image={meta.image}
        keywords="clinic setup consultation Malaysia, how to open a private clinic in Malaysia, starting a medical clinic in Malaysia, clinic business setup, clinic startup costs, private clinic registration Malaysia, opening a second clinic branch"
      />
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={meta.fontCss} />
        <script type="application/ld+json">{JSON_LD}</script>
      </Helmet>
      {EditorBar && editing && (
        <Suspense fallback={null}>
          <EditorBar />
        </Suspense>
      )}

      <header className="c-header">
        <div className="c-container c-header-in">
          <Link to="/" className="c-brand" aria-label="Klinik Ara 24 Jam home">
            <img src={LOGO} alt="" width="40" height="40" />
            <span>Klinik Ara 24 Jam</span>
          </Link>
          <Link to="/" className="c-back">
            Main site
          </Link>
        </div>
      </header>

      <main>
        {/* A. Hero */}
        <section className="c-hero" aria-labelledby="c-h1">
          <div className="c-container c-hero-grid">
            <div className="c-hero-copy">
              <Ed as="p" k="hero.eyebrow" className="c-eyebrow" />
              <h1 id="c-h1" className="c-h1">
                <Ed k="hero.h1Lead" /> <Ed k="hero.h1Em" className="c-h1-em" />
              </h1>
              <Ed as="p" k="hero.sub" className="c-sub" />
              <Ed as="p" k="hero.desc" className="c-desc" />
              <div className="c-actions">
                <a
                  href="#book"
                  className="c-btn c-btn--primary"
                  onClick={(e) => {
                    e.preventDefault();
                    goToForm('hero');
                  }}
                >
                  {content.hero.ctaPrimary}
                </a>
                <a
                  href="#discuss"
                  className="c-btn c-btn--ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    track('hero_secondary_cta_clicked');
                    scrollToId('discuss');
                  }}
                >
                  {content.hero.ctaSecondary}
                </a>
              </div>
              <ul className="c-trust">
                {content.hero.trust.map((_, i) => {
                  const Icon = TRUST_ICONS[i];
                  return (
                    <li key={i}>
                      <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                      <Ed k={`hero.trust.${i}`} />
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="c-hero-visual">
              {hasHeroPhoto || editing ? (
                <PhotoSlot k="hero.photo" alt="Your consultant, a fellow doctor with experience in clinic ownership" className="c-photo--hero" priority />
              ) : null}
              {!hasHeroPhoto && (
                <aside className="c-panel" aria-label="What we can discuss">
                  <Ed as="p" k="hero.panelTitle" className="c-panel-title" />
                  <ul>
                    {content.discuss.items.map((_, i) => {
                      const Icon = DISCUSS_ICONS[i];
                      return (
                        <li key={i}>
                          <span className="c-panel-icon" aria-hidden="true">
                            <Icon size={18} strokeWidth={1.75} />
                          </span>
                          <Ed k={`discuss.items.${i}.title`} />
                        </li>
                      );
                    })}
                  </ul>
                </aside>
              )}
            </div>
          </div>
        </section>
        <div id="c-hero-end" aria-hidden="true" />

        {/* B. Problem recognition */}
        <section className="c-section" aria-labelledby="c-problems">
          <div className="c-container">
            <div className="c-head">
              <Ed as="h2" id="c-problems" k="problems.h2" className="c-h2" />
              <Ed as="p" k="problems.sub" className="c-lead" />
            </div>
            <ProblemCards onPick={onPick} />
            <div className="c-inline-cta">
              <Ed as="p" k="problems.ctaLine" />
              <button type="button" className="c-btn c-btn--primary" onClick={() => goToForm('problems')}>
                {content.hero.ctaPrimary}
              </button>
            </div>
          </div>
        </section>

        {/* C. What we can discuss */}
        <section id="discuss" className="c-section c-section--white" aria-labelledby="c-discuss">
          <div className="c-container">
            <div className="c-head">
              <Ed as="h2" id="c-discuss" k="discuss.h2" className="c-h2" />
              <Ed as="p" k="discuss.sub" className="c-lead" />
            </div>
            <ul className="c-dgrid">
              {content.discuss.items.map((_, i) => {
                const Icon = DISCUSS_ICONS[i];
                return (
                  <li key={i} className="c-dcard">
                    <span className="c-dcard-icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <Ed as="h3" k={`discuss.items.${i}.title`} className="c-h3" />
                    <Ed as="p" k={`discuss.items.${i}.desc`} />
                  </li>
                );
              })}
            </ul>
            <Ed as="p" k="discuss.note" className="c-note" />
          </div>
        </section>

        {/* D. Personal credibility */}
        <section className="c-section" aria-labelledby="c-cred">
          <div className={`c-container c-cred${content.credibility.photo || editing ? '' : ' c-cred--solo'}`}>
            <PhotoSlot k="credibility.photo" alt="Your consultant, a fellow doctor" className="c-photo--cred" />
            <div className="c-cred-copy">
              <Ed as="h2" id="c-cred" k="credibility.h2" className="c-h2" />
              {content.credibility.paras.map((_, i) => (
                <Ed as="p" key={i} k={`credibility.paras.${i}`} className="c-para" />
              ))}
              <div className="c-cred-sign">
                <Ed as="p" k="credibility.name" className="c-cred-name" optional />
                <Ed as="p" k="credibility.role" className="c-cred-role" optional />
              </div>
            </div>
          </div>
        </section>

        {/* Main website: its own space, with community stats */}
        <SiteStats />

        {/* E. How it works */}
        <section className="c-section c-section--white" aria-labelledby="c-how">
          <div className="c-container">
            <div className="c-head c-head--center">
              <Ed as="h2" id="c-how" k="how.h2" className="c-h2" />
            </div>
            <ol className="c-steps">
              {content.how.steps.map((_, i) => (
                <li key={i}>
                  <span className="c-step-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <Ed as="h3" k={`how.steps.${i}.title`} className="c-h3" />
                  <Ed as="p" k={`how.steps.${i}.line`} />
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* F. Booking */}
        <section id="book" className="c-section c-book" aria-labelledby="c-book">
          <div className="c-container c-book-grid">
            <div className="c-book-copy">
              <Ed as="h2" id="c-book" k="book.h2" className="c-h2" />
              <Ed as="p" k="book.body" className="c-lead" />
              <Ed as="p" k="book.emphasis" className="c-emphasis" />
              <ul className="c-checks">
                {content.book.trust.map((_, i) => (
                  <li key={i}>
                    <Check size={18} strokeWidth={2.25} aria-hidden="true" />
                    <Ed k={`book.trust.${i}`} />
                  </li>
                ))}
              </ul>
            </div>
            <div className="c-book-card">
              <BookingForm prefill={prefill} />
              <p className="c-or">
                Prefer to skip the form? <WhatsAppLink where="booking" className="c-link-wa" label="Message on WhatsApp" />
              </p>
            </div>
          </div>
        </section>

        {/* G. FAQ */}
        <section className="c-section c-section--white" aria-labelledby="c-faq">
          <div className="c-container c-faq-wrap">
            <Ed as="h2" id="c-faq" k="faq.h2" className="c-h2" />
            <div className="c-faq">
              {content.faq.items.map((_, i) =>
                editing ? (
                  // Text can't be edited inside <summary>, so the editor shows each question as a plain block.
                  <div className="c-faq-edit" key={i}>
                    <Ed as="p" k={`faq.items.${i}.q`} className="c-faq-q" />
                    <Ed as="p" k={`faq.items.${i}.a`} />
                  </div>
                ) : (
                  <details key={i} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && track('faq_opened', { item: String(i + 1) })}>
                    <summary>
                      <Ed k={`faq.items.${i}.q`} />
                    </summary>
                    <Ed as="p" k={`faq.items.${i}.a`} />
                  </details>
                ),
              )}
            </div>
          </div>
        </section>

        {/* H. Final CTA */}
        <section className="c-final" aria-labelledby="c-final">
          <div className="c-container c-final-in">
            <Ed as="h2" id="c-final" k="final.h2" className="c-final-h2" />
            <Ed as="p" k="final.body" className="c-final-body" />
            <button type="button" className="c-btn c-btn--light" onClick={() => goToForm('final')}>
              {content.final.cta}
            </button>
            <Ed as="p" k="final.sub" className="c-final-sub" />
          </div>
        </section>
      </main>

      <SiteFooter>
        <p className="text-zinc-300 text-sm">Klinik Ara 24 Jam &middot; HSO Healthcare Sdn. Bhd.</p>
        <Ed as="p" k="footer.disclaimer" className="text-zinc-400 text-xs max-w-3xl" />
      </SiteFooter>
      {!editing && <StickyCta label="BOOK FREE CONSULTATION" />}
    </div>
  );
}

export default function BusinessConsultation() {
  return (
    <ContentProvider>
      <Page />
    </ContentProvider>
  );
}
