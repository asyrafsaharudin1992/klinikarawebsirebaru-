import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SiteFooter from '../components/SiteFooter';
import { ScrollEcg, EcgDivider } from '../components/consult/Ecg';
import VitalSigns from '../components/consult/VitalSigns';
import { StageCards, ProfitFlow } from '../components/consult/StageCards';
import BookingForm from '../components/consult/BookingForm';
import StickyCta from '../components/consult/StickyCta';
import { WhatsAppLink, goToForm } from '../components/consult/Bits';
import { meta } from '../components/consult/consultLib';
import { ContentProvider, Ed, useContent } from '../components/consult/editing';
import '../components/consult/Consult.css';

// Small local copy of the Klinik Ara mark (the site favicon, cropped), so the header doesn't download a large image.
const LOGO = '/consult-logo.png';

// The localhost editor toolbar is only imported in dev (the condition is a build-time constant, so
// production bundles drop it entirely).
const EditorBar = import.meta.env.DEV ? lazy(() => import('../components/consult/EditorBar')) : null;

const Tag: React.FC<{ letter: string; word: string }> = ({ letter, word }) => (
  <p className="c-soap">
    <span className="c-soap-letter">{letter}</span>
    <span className="c-soap-word">{word}</span>
  </p>
);

/** Photo slot: shows the uploaded photo, or the placeholder. In the localhost editor, click to upload. */
const Photo: React.FC = () => {
  const { editing, get, uploadPhoto } = useContent();
  const input = useRef<HTMLInputElement>(null);
  const photo = get('why.photo');
  return (
    <div
      className={`c-photo${photo ? ' has-photo' : ''}${editing ? ' is-editable' : ''}`}
      role={editing ? 'button' : 'img'}
      tabIndex={editing ? 0 : undefined}
      aria-label={photo ? 'Photo of Dr. Asyraf' : 'Photo of Dr. Asyraf, to be added'}
      onClick={editing ? () => input.current?.click() : undefined}
      onKeyDown={editing ? (e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click() : undefined}
    >
      {photo ? (
        <img src={photo} alt="Dr. Asyraf" loading="lazy" decoding="async" />
      ) : (
        <Ed k="why.photoPlaceholder" />
      )}
      {editing && (
        <>
          <span className="c-photo-hint">{photo ? 'Click to replace photo' : 'Click to upload photo'}</span>
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await uploadPhoto(file);
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

  // The static copy written at build time (scripts/prerender-consult.mjs) carries these tags for
  // crawlers that skip JavaScript. Once <SEO> has rendered the same tags, drop the static ones.
  useEffect(() => {
    document.querySelectorAll('[data-prerender="true"]').forEach((el) => el.remove());
  }, []);

  return (
    <div className={`consult-page${editing ? ' is-editing' : ''}`}>
      <SEO
        lang="en"
        title={meta.title}
        description={meta.description}
        url={meta.url}
        canonicalUrl={meta.url}
        image={meta.image}
        keywords="open a clinic, doctor clinic business, clinic consultation, start a clinic Malaysia"
      />
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={meta.fontCss} />
      </Helmet>
      {EditorBar && editing && (
        <Suspense fallback={null}>
          <EditorBar />
        </Suspense>
      )}
      <ScrollEcg />

      <header className="c-header">
        <Link to="/" className="c-brand" aria-label="Klinik Ara 24 Jam home">
          <img src={LOGO} alt="" width="40" height="40" />
          <span>Klinik Ara 24 Jam</span>
        </Link>
        <Link to="/" className="c-back">
          Main site
        </Link>
      </header>

      <main>
        {/* S - Subjective */}
        <section className="c-section c-hero" aria-labelledby="c-h1">
          <Ed as="p" k="hero.chip" className="c-chip" />
          <Tag letter="S" word="Subjective" />
          <h1 id="c-h1" className="c-h1">
            <Ed k="hero.h1Lead" /> <em><Ed k="hero.h1Em" /></em>
          </h1>
          <Ed as="p" k="hero.lede" className="c-lede" />
          <Ed as="p" k="hero.sub" className="c-sub" />
          <div className="c-actions">
            <button type="button" className="c-btn c-btn--red" onClick={() => goToForm('hero')}>
              {content.hero.ctaPrimary}
            </button>
            <WhatsAppLink where="hero" className="c-btn c-btn--ghost" label={content.hero.ctaWhatsApp} />
          </div>
        </section>
        <div id="c-hero-end" aria-hidden="true" />

        <EcgDivider />

        {/* O - Objective */}
        <section className="c-section" aria-labelledby="c-why">
          <Tag letter="O" word="Objective" />
          <div className="c-why">
            <Photo />
            <div>
              <Ed as="h2" id="c-why" k="why.h2" className="c-h2" />
              <Ed as="p" k="why.body" className="c-p" />
              <Ed as="p" k="why.credential" className="c-p c-p--note" />
            </div>
          </div>
          <VitalSigns />
        </section>

        <EcgDivider />

        {/* A - Assessment */}
        <section className="c-section" aria-labelledby="c-assess">
          <Tag letter="A" word="Assessment" />
          <Ed as="h2" id="c-assess" k="assess.h2" className="c-h2" />
          <StageCards />
          <div className="c-flow-wrap">
            <Ed as="p" k="assess.flowTitle" className="c-flow-title" />
            <ProfitFlow />
          </div>
        </section>

        <EcgDivider />

        <section className="c-section c-two" aria-label="Who this is for and how it works">
          <div>
            <Ed as="h2" k="audience.h2" className="c-h3" />
            <ul className="c-list">
              {content.audience.items.map((_, i) => (
                <li key={i}>
                  <Ed k={`audience.items.${i}`} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Ed as="h2" k="steps.h2" className="c-h3" />
            <ol className="c-steps">
              {content.steps.items.map((_, i) => (
                <li key={i}>
                  <Ed as="strong" k={`steps.items.${i}.title`} />
                  <Ed k={`steps.items.${i}.line`} />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <EcgDivider />

        <section className="c-section" aria-labelledby="c-faq">
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
                <details key={i}>
                  <summary>
                    <Ed k={`faq.items.${i}.q`} />
                  </summary>
                  <Ed as="p" k={`faq.items.${i}.a`} />
                </details>
              ),
            )}
          </div>
        </section>

        <EcgDivider />

        {/* P - Plan */}
        <section id="book" className="c-section c-plan" aria-labelledby="c-book">
          <Tag letter="P" word="Plan" />
          <Ed as="h2" id="c-book" k="plan.h2" className="c-h2" />
          <Ed as="p" k="plan.body" className="c-p" />
          <div className="c-plan-card">
            <BookingForm />
          </div>
          <p className="c-or">
            <Ed k="plan.orLead" /> <WhatsAppLink where="final" className="c-link-wa" label="Message me directly" />
          </p>
        </section>
      </main>

      <SiteFooter>
        <Ed as="p" k="footer.disclaimer" className="text-zinc-400 text-xs max-w-3xl" />
      </SiteFooter>
      {!editing && <StickyCta />}
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
