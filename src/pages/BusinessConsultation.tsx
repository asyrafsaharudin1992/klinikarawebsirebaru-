import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SiteFooter from '../components/SiteFooter';
import { ScrollEcg, EcgDivider } from '../components/consult/Ecg';
import VitalSigns from '../components/consult/VitalSigns';
import { StageCards, ProfitFlow } from '../components/consult/StageCards';
import BookingForm from '../components/consult/BookingForm';
import StickyCta from '../components/consult/StickyCta';
import { Placeholder, WhatsAppLink, goToForm } from '../components/consult/Bits';
import { meta } from '../components/consult/consultLib';
import '../components/consult/Consult.css';

// Small local copy of the Klinik Ara mark (the site favicon, cropped), so the header doesn't download a large image.
const LOGO = '/consult-logo.png';

const AUDIENCE = [
  'You’re a doctor who has wondered, “What if this were my own clinic?”',
  'You want straight answers from someone who actually runs clinics.',
  'You’re not sure where to begin, or what you might be missing.',
];

const STEPS = [
  { title: 'Book', line: 'Tap the button and say hello on WhatsApp.' },
  { title: 'Chat online', line: 'We talk through your situation, one doctor to another.' },
  { title: 'Leave with clarity', line: 'You know what to do next, and what to avoid.' },
];

const FAQ = [
  { q: 'Is it really free?', a: 'Yes, the first online session is on the house.' },
  { q: 'Do I need business experience?', a: 'Not at all, we start from where you are in the session.' },
  { q: 'How much does it take to start?', a: 'It depends on your situation, and that’s exactly what we map out in the session.' },
  { q: 'Do I have to leave my current job?', a: 'Not necessarily, and we’ll look at what fits your life in the session.' },
  { q: 'What happens after the session?', a: 'You decide your next step, with clarity from the session.' },
];

const Tag: React.FC<{ letter: string; word: string }> = ({ letter, word }) => (
  <p className="c-soap">
    <span className="c-soap-letter">{letter}</span>
    <span className="c-soap-word">{word}</span>
  </p>
);

export default function BusinessConsultation() {
  // The static copy written at build time (scripts/prerender-consult.mjs) carries these tags for
  // crawlers that skip JavaScript. Once <SEO> has rendered the same tags, drop the static ones.
  useEffect(() => {
    document.querySelectorAll('[data-prerender="true"]').forEach((el) => el.remove());
  }, []);

  return (
    <div className="consult-page">
      <SEO
        lang="en"
        title={meta.title}
        description={meta.description}
        url={meta.url}
        canonicalUrl={meta.url}
        image={meta.image}
        keywords="open a clinic, doctor clinic business, clinic consultation, start a clinic Malaysia"
      />
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
          <p className="c-chip">{meta.hero.chip}</p>
          <Tag letter="S" word="Subjective" />
          <h1 id="c-h1" className="c-h1">
            {meta.hero.h1Lead} <em>{meta.hero.h1Em}</em>
          </h1>
          <p className="c-lede">{meta.hero.lede}</p>
          <p className="c-sub">{meta.hero.sub}</p>
          <div className="c-actions">
            <button type="button" className="c-btn c-btn--red" onClick={() => goToForm('hero')}>
              Book free session
            </button>
            <WhatsAppLink where="hero" className="c-btn c-btn--ghost" label="WhatsApp me" />
          </div>
        </section>
        <div id="c-hero-end" aria-hidden="true" />

        <EcgDivider />

        {/* O - Objective */}
        <section className="c-section" aria-labelledby="c-why">
          <Tag letter="O" word="Objective" />
          <div className="c-why">
            <div className="c-photo" role="img" aria-label="Photo of Dr. Asyraf, to be added">
              <Placeholder>photo of Dr. Asyraf, portrait, at least 800px wide</Placeholder>
            </div>
            <div>
              <h2 id="c-why" className="c-h2">
                Doctor first. Operator second.
              </h2>
              <p className="c-p">I run Klinik Ara 24 Jam: three branches that never close, on systems we built ourselves.</p>
              <p className="c-p c-p--note">
                <Placeholder>one-line credential or personal fact</Placeholder>
              </p>
            </div>
          </div>
          <VitalSigns />
        </section>

        <EcgDivider />

        {/* A - Assessment */}
        <section className="c-section" aria-labelledby="c-assess">
          <Tag letter="A" word="Assessment" />
          <h2 id="c-assess" className="c-h2">
            Three stages. Most doctors stumble on at least one.
          </h2>
          <StageCards />
          <div className="c-flow-wrap">
            <p className="c-flow-title">Follow the money</p>
            <ProfitFlow />
          </div>
        </section>

        <EcgDivider />

        <section className="c-section c-two" aria-label="Who this is for and how it works">
          <div>
            <h2 className="c-h3">Who this is for</h2>
            <ul className="c-list">
              {AUDIENCE.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="c-h3">How the free session works</h2>
            <ol className="c-steps">
              {STEPS.map((s) => (
                <li key={s.title}>
                  <strong>{s.title}</strong>
                  <span>{s.line}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <EcgDivider />

        <section className="c-section" aria-labelledby="c-faq">
          <h2 id="c-faq" className="c-h2">
            Quick questions
          </h2>
          <div className="c-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <EcgDivider />

        {/* P - Plan */}
        <section id="book" className="c-section c-plan" aria-labelledby="c-book">
          <Tag letter="P" word="Plan" />
          <h2 id="c-book" className="c-h2">
            Book your free session
          </h2>
          <p className="c-p">Leave your details and we’ll continue on WhatsApp.</p>
          <div className="c-plan-card">
            <BookingForm />
          </div>
          <p className="c-or">
            Prefer to skip the form? <WhatsAppLink where="final" className="c-link-wa" label="Message me directly" />
          </p>
        </section>
      </main>

      <SiteFooter>
        <p className="text-zinc-400 text-xs max-w-3xl">
          This page offers general business guidance only. It is not legal, financial or tax advice.
        </p>
      </SiteFooter>
      <StickyCta />
    </div>
  );
}
