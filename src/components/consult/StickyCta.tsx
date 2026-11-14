import React, { useEffect, useState } from 'react';
import { WhatsAppLink, goToForm } from './Bits';

/** Mobile bottom bar and desktop pill. Appears after the hero and hides while the form is on screen. */
const StickyCta: React.FC<{ label: string }> = ({ label }) => {
  const [pastHero, setPastHero] = useState(false);
  const [formInView, setFormInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const hero = document.getElementById('c-hero-end');
    const form = document.getElementById('book');
    const heroIo = new IntersectionObserver(([e]) => setPastHero(!e.isIntersecting && e.boundingClientRect.top < 0));
    const formIo = new IntersectionObserver(([e]) => setFormInView(e.isIntersecting), { threshold: 0.1 });
    if (hero) heroIo.observe(hero);
    if (form) formIo.observe(form);
    return () => {
      heroIo.disconnect();
      formIo.disconnect();
    };
  }, []);

  const show = pastHero && !formInView;

  return (
    <div className={`c-sticky${show ? ' is-on' : ''}`} aria-hidden={!show}>
      <button type="button" className="c-btn c-btn--primary c-sticky-main" tabIndex={show ? 0 : -1} onClick={() => goToForm('sticky')}>
        {label}
      </button>
      <span className="c-sticky-wa">
        <WhatsAppLink where="sticky" className="c-btn c-btn--wa c-btn--icon" iconOnly />
      </span>
    </div>
  );
};

export default StickyCta;
