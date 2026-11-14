import React, { useRef, useState } from 'react';
import {
  CONSENT_TEXT,
  FORM_ID,
  LeadDetails,
  buildWaUrl,
  hitCooldown,
  openWhatsApp,
  recordTap,
  track,
  validate,
} from './consultLib';
import { WhatsAppIcon } from './Bits';

type Errors = Partial<Record<keyof LeadDetails, string>>;

const BookingForm: React.FC = () => {
  const [values, setValues] = useState<LeadDetails>({ name: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const lastOpen = useRef(0);

  const set = (key: keyof LeadDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  // Everything from validation to window.open is synchronous on purpose: any await before
  // openWhatsApp() makes iOS Safari and popup blockers discard the new tab.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // An accidental double-tap must not open two WhatsApp tabs.
    if (Date.now() - lastOpen.current < 3000) return;
    const found = validate(values);
    setErrors(found);
    const firstBad = (['name', 'email', 'phone'] as const).find((k) => found[k]);
    if (firstBad) {
      document.getElementById(`${FORM_ID}-${firstBad}`)?.focus();
      return;
    }

    const url = buildWaUrl(values);
    const isBot = !!honeypot.current?.value;
    if (!isBot && !hitCooldown()) recordTap(values); // 1. record first, not awaited
    openWhatsApp(url); // 2. open WhatsApp in the same tick
    lastOpen.current = Date.now();
    if (!isBot) track('consult_book_whatsapp_tap');
    setWaUrl(url);
  };

  return (
    <form className="c-form" onSubmit={onSubmit} noValidate aria-label="Book a free session on WhatsApp">
      <div className="c-field">
        <label htmlFor={`${FORM_ID}-name`}>Full name</label>
        <input
          id={`${FORM_ID}-name`}
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={set('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${FORM_ID}-name-err` : undefined}
          maxLength={80}
        />
        {errors.name && (
          <p id={`${FORM_ID}-name-err`} className="c-error" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="c-field">
        <label htmlFor={`${FORM_ID}-email`}>Email</label>
        <input
          id={`${FORM_ID}-email`}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={values.email}
          onChange={set('email')}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `${FORM_ID}-email-err` : undefined}
          maxLength={120}
        />
        {errors.email && (
          <p id={`${FORM_ID}-email-err`} className="c-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div className="c-field">
        <label htmlFor={`${FORM_ID}-phone`}>
          Phone <span className="c-optional">(optional)</span>
        </label>
        <input
          id={`${FORM_ID}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          onChange={set('phone')}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? `${FORM_ID}-phone-err` : undefined}
          maxLength={30}
        />
        {errors.phone && (
          <p id={`${FORM_ID}-phone-err`} className="c-error" role="alert">
            {errors.phone}
          </p>
        )}
      </div>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div className="c-hp" aria-hidden="true">
        <label htmlFor={`${FORM_ID}-website`}>Website</label>
        <input id={`${FORM_ID}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" ref={honeypot} />
      </div>

      <button type="submit" className="c-btn c-btn--wa c-btn--block">
        <WhatsAppIcon className="c-icon" />
        <span>Book on WhatsApp</span>
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
