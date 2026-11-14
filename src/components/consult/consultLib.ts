import { useEffect, useRef, useState } from 'react';
import firebaseConfig from '../../../firebase-applet-config.json';
import meta from './meta.json';

export const WA_NUMBER = '60182199218';
/** Bump when the consent line under the form changes, so each record shows which wording was shown. */
export const CONSENT_VERSION = 'wa-tap-v2';
export const CONSENT_TEXT = 'By tapping Book on WhatsApp, you agree we store these details to contact you.';
export const FORM_ID = 'book';

const COOLDOWN_KEY = 'ara_consult_last_tap';
const COOLDOWN_MS = 10_000;

export interface LeadDetails {
  name: string;
  email: string;
  phone: string;
  situation: string; // one of SITUATIONS' codes, or '' if not chosen
  topic: string;
}

/** Codes are what gets stored (and checked by the Firestore rules); labels are what visitors see. */
export const SITUATIONS: { code: string; label: string }[] = [
  { code: 'first_clinic', label: 'Planning to open my first clinic' },
  { code: 'existing_owner', label: 'Already own a clinic' },
  { code: 'another_branch', label: 'Planning to open another clinic branch' },
  { code: 'exploring', label: 'Exploring clinic ownership' },
];
export const situationLabel = (code: string) => SITUATIONS.find((s) => s.code === code)?.label ?? '';

/** wa.me link. With details it carries what the visitor typed; without, a generic hello. */
export const buildWaUrl = (details?: LeadDetails): string => {
  const clean = (v: string, max: number) => v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);
  let text = 'Hi Dr. Asyraf, saya berminat nak tahu lebih lanjut tentang sesi konsultasi bisnes klinik percuma.';
  if (details) {
    const name = clean(details.name, 80);
    const email = clean(details.email, 120);
    const phone = clean(details.phone, 30);
    const contact = phone ? `${email}, ${phone}` : email;
    text = `Hi Dr. Asyraf, saya ${name} (${contact}). Saya berminat nak tahu lebih lanjut tentang sesi konsultasi bisnes klinik percuma.`;
    const situation = situationLabel(details.situation);
    const topic = clean(details.topic, 500);
    if (situation) text += ` Situasi saya: ${situation}.`;
    if (topic) text += ` Saya nak bincang: ${topic}`;
  }
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
};

/**
 * Must be called synchronously from the click handler (no await before it), otherwise
 * iOS Safari and popup blockers kill the new tab. Falls back to same-tab navigation.
 */
export const openWhatsApp = (url: string) => {
  const win = window.open(url, '_blank');
  if (win) {
    win.opener = null; // same effect as rel="noopener" without losing the blocked-popup signal
  } else {
    window.location.href = url;
  }
};

export const track = (event: string, params: Record<string, string> = {}) => {
  try {
    window.gtag?.('event', event, { page_path: window.location.pathname, ...params });
  } catch {
    /* analytics must never break the page */
  }
};

export const validate = (d: LeadDetails) => {
  const errors: Partial<Record<keyof LeadDetails, string>> = {};
  const name = d.name.trim();
  const email = d.email.trim();
  const phone = d.phone.trim();
  if (name.length < 2) errors.name = 'Please enter your full name.';
  else if (name.length > 80) errors.name = 'That name is a bit long. Please shorten it.';
  if (!email) errors.email = 'Please enter your email.';
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) errors.email = 'That email doesn’t look right. Please check it.';
  if (!phone) errors.phone = 'Please enter your contact number.';
  else if (!/^[0-9+()\-\s]{7,30}$/.test(phone) || phone.replace(/\D/g, '').length < 7) {
    errors.phone = 'That phone number doesn’t look right. Please check it.';
  }
  if (!SITUATIONS.some((s) => s.code === d.situation)) errors.situation = 'Please choose the option that fits you best.';
  if (d.topic.trim().length > 500) errors.topic = 'Please keep this under 500 characters.';
  return errors;
};

/** True if the last tap was under 10 seconds ago in this browser; otherwise stamps now. */
export const hitCooldown = (): boolean => {
  try {
    const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    if (Date.now() - last < COOLDOWN_MS) return true;
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    /* storage blocked: skip the guard */
  }
  return false;
};

const randomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

/**
 * Fire-and-forget record of a "tapped Book on WhatsApp" event.
 *
 * Uses the Firestore REST :commit endpoint with fetch({ keepalive: true }) instead of the SDK
 * write: a keepalive request is handed to the browser's network process, so it still completes
 * when mobile jumps to the WhatsApp app right after the tap. The SDK write runs on the page's
 * own connection, which is frozen on backgrounding. :commit (not createDocument) is used so
 * createdAt can be a real server timestamp via an updateTransform.
 */
export const recordTap = (d: LeadDetails) => {
  try {
    const str = (v: string, max: number) => ({ stringValue: v.trim().slice(0, max) });
    const fields: Record<string, { stringValue: string }> = {
      name: str(d.name, 80),
      email: str(d.email, 120),
      status: { stringValue: 'clicked' },
      sourcePage: str(window.location.pathname, 100),
      userAgent: str(navigator.userAgent, 200),
      consentVersion: { stringValue: CONSENT_VERSION },
    };
    if (d.phone.trim()) fields.phone = str(d.phone, 30);
    if (d.situation) fields.situation = str(d.situation, 40);
    if (d.topic.trim()) fields.topic = str(d.topic, 500);
    const qs = new URLSearchParams(window.location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = qs.get(key);
      if (v) fields[key.replace(/_(\w)/, (_, c: string) => c.toUpperCase())] = str(v, 100);
    }

    const base = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || '(default)'}/documents`;
    const body = {
      writes: [
        {
          update: { name: `${base}/consultation_leads/${randomId()}`, fields },
          currentDocument: { exists: false },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
        },
      ],
    };
    // text/plain keeps this a "simple" CORS request (no preflight), which keepalive needs to be reliable.
    void fetch(`https://firestore.googleapis.com/v1/${base}:commit`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) track('booking_error', { reason: `record_failed_${res.status}` });
      })
      .catch(() => track('booking_error', { reason: 'record_failed_network' }));
  } catch {
    /* recording must never block opening WhatsApp */
  }
};

/**
 * Live document count of a publicly readable Firestore collection (the main site's own lists), via
 * the REST aggregation endpoint so the page doesn't need the Firebase SDK. Resolves null on any failure.
 */
export const fetchCollectionCount = async (collectionId: string): Promise<number | null> => {
  try {
    const base = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId || '(default)'}/documents`;
    const res = await fetch(`https://firestore.googleapis.com/v1/${base}:runAggregationQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        structuredAggregationQuery: {
          structuredQuery: { from: [{ collectionId }] },
          aggregations: [{ alias: 'n', count: {} }],
        },
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: { aggregateFields?: { n?: { integerValue?: string } } } }[];
    const n = Number(json?.[0]?.result?.aggregateFields?.n?.integerValue);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

/** True once the element has been on screen (stays true). Content is always visible if IntersectionObserver is missing. */
export const useInView = <T extends Element>(threshold = 0.25) => {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
};

export { meta };
