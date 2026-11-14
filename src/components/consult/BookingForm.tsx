import React, { useEffect, useRef, useState } from 'react';
import {
  CONSENT_TEXT,
  FORM_ID,
  LeadDetails,
  SITUATIONS,
  buildWaUrl,
  hitCooldown,
  openWhatsApp,
  recordTap,
  track,
  validate,
} from './consultLib';

type Errors = Partial<Record<keyof LeadDetails, string>>;

export interface Prefill {
  situation: string;
  topic: string;
  nonce: number; // changes every time a problem card asks to fill the form
}

const EMPTY: LeadDetails = { name: '', email: '', phone: '', situation: '', topic: '' };

/**
 * The booking flow: the submit button IS the WhatsApp link. On a valid tap it records the tap in
 * Firestore (fire-and-forget, started first) and opens WhatsApp in the same synchronous click
 * handler. Nothing here claims a booking happened; the visitor completes it by sending the message.
 */
const BookingForm: React.FC<{ prefill: Prefill }> = ({ prefill }) => {
  const [values, setValues] = useState<LeadDetails>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [filledFromCard, setFilledFromCard] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);
  const lastOpen = useRef(0);
  const started = useRef(false);

  // A problem card's button pre-fills the situation and topic, and keeps whatever the visitor already typed.
  useEffect(() => {
    if (!prefill.nonce) return;
    setValues((v) => ({ ...v, situation: prefill.situation, topic: prefill.topic }));
    setErrors((er) => ({ ...er, situation: undefined, topic: undefined }));
    setFilledFromCard(true);
  }, [prefill]);

  const set = (key: keyof LeadDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const onStart = () => {
    if (started.current) return;
    started.current = true;
    track('booking_form_started');
  };

  // Everything from validation to window.open is synchronous on purpose: any await before
  // openWhatsApp() makes iOS Safari and popup blockers discard the new tab.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // An accidental double-tap must not open two WhatsApp tabs.
    if (Date.now() - lastOpen.current < 3000) return;
    const found = validate(values);
    setErrors(found);
    const firstBad = (['name', 'email', 'phone', 'situation', 'topic'] as const).find((k) => found[k]);
    if (firstBad) {
      track('booking_error', { reason: 'validation', field: firstBad });
      document.getElementById(`${FORM_ID}-${firstBad}`)?.focus();
      return;
    }

    const url = buildWaUrl(values);
    const isBot = !!honeypot.current?.value;
    if (!isBot && !hitCooldown()) recordTap(values); // 1. record first, not awaited
    openWhatsApp(url); // 2. open WhatsApp in the same tick
    lastOpen.current = Date.now();
    if (!isBot) {
      track('booking_form_submitted');
      track('booking_success', { method: 'whatsapp_handoff' }); // WhatsApp opened; completion happens when the visitor sends
    }
    setWaUrl(url);
  };

  const field = (key: keyof LeadDetails, label: React.ReactNode, control: React.ReactNode) => (
    <div className="c-field">
      <label htmlFor={`${FORM_ID}-${key}`}>{label}</label>
      {control}
      {errors[key] && (
        <p id={`${FORM_ID}-${key}-err`} className="c-error" role="alert">
          {errors[key]}
        </p>
      )}
    </div>
  );
  const aria = (key: keyof LeadDetails) => ({
    'aria-invalid': !!errors[key],
    'aria-describedby': errors[key] ? `${FORM_ID}-${key}-err` : undefined,
  });

  return (
    <form className="c-form" onSubmit={onSubmit} onFocus={onStart} noValidate aria-label="Book your free consultation on WhatsApp">
      {field(
        'name',
        'Full name',
        <input id={`${FORM_ID}-name`} name="name" type="text" autoComplete="name" value={values.name} onChange={set('name')} maxLength={80} {...aria('name')} />,
      )}
      {field(
        'email',
        'Email address',
        <input id={`${FORM_ID}-email`} name="email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={set('email')} maxLength={120} {...aria('email')} />,
      )}
      {field(
        'phone',
        'Contact number',
        <input id={`${FORM_ID}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} maxLength={30} {...aria('phone')} />,
      )}
      {field(
        'situation',
        'Your current situation',
        <select id={`${FORM_ID}-situation`} name="situation" value={values.situation} onChange={set('situation')} {...aria('situation')}>
          <option value="">Select the one that fits you best</option>
          {SITUATIONS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label}
            </option>
          ))}
        </select>,
      )}
      {field(
        'topic',
        <>
          What would you like to discuss? <span className="c-optional">(optional)</span>
        </>,
        <textarea id={`${FORM_ID}-topic`} name="topic" rows={3} value={values.topic} onChange={set('topic')} maxLength={500} {...aria('topic')} />,
      )}
      {filledFromCard && (
        <p className="c-filled-note" role="status">
          We filled in your situation and topic from the card you chose. Change them if you like.
        </p>
      )}

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div className="c-hp" aria-hidden="true">
        <label htmlFor={`${FORM_ID}-website`}>Website</label>
        <input id={`${FORM_ID}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypot} />
      </div>

      <button type="submit" className="c-btn c-btn--wa c-btn--block">
        Submit
      </button>
      <p className="c-consent">{CONSENT_TEXT}</p>

      <div className="c-after" role="status" aria-live="polite">
        {waUrl && (
          <>
            <p className="c-after-main">WhatsApp is opening. Just press send to complete your booking.</p>
            <p className="c-after-sub">
              WhatsApp didn’t open?{' '}
              <a href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('consult_whatsapp_click', { placement: 'form_fallback' })}>
                Tap here
              </a>
            </p>
          </>
        )}
      </div>
    </form>
  );
};

export default BookingForm;
