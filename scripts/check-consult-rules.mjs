// Run AFTER deploying firestore.rules:  node scripts/check-consult-rules.mjs [--write-valid]
// Proves, as an anonymous visitor, that consultation_leads can only be created in the exact
// allowed shape and can never be read, listed, updated or deleted from a client.
//
// By default it only sends requests that must be REJECTED, so it leaves no data behind.
// --write-valid also sends correctly shaped records (name "RULES TEST - ignore") that must be
// ACCEPTED. The admin tab is read-only, so that row can only be removed from the Firebase console.

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const cfg = JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'firebase-applet-config.json'), 'utf8'));
const base = `projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId || '(default)'}/documents`;
const api = `https://firestore.googleapis.com/v1/${base}`;
const id = () => Array.from({ length: 20 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');

const s = (v) => ({ stringValue: v });
const goodFields = () => ({
  name: s('RULES TEST - ignore'),
  email: s('rules-test@example.com'),
  status: s('clicked'),
  sourcePage: s('/business-consultation'),
  consentVersion: s('wa-tap-v1'),
});
const commit = (fields, docId = id(), transforms = [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }]) =>
  fetch(`${api}:commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      writes: [{ update: { name: `${base}/consultation_leads/${docId}`, fields }, currentDocument: { exists: false }, updateTransforms: transforms }],
    }),
  });

let failures = 0;
const expect = async (label, promise, wantOk) => {
  const res = await promise;
  const ok = res.ok;
  const pass = ok === wantOk;
  if (!pass) failures++;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}  -> HTTP ${res.status} (wanted ${wantOk ? 'accepted' : 'rejected'})`);
};

console.log(`Project ${cfg.projectId}, collection consultation_leads\n`);

// Reads, lists, updates, deletes: all must be rejected for an anonymous client.
await expect('anonymous LIST', fetch(`${api}/consultation_leads?pageSize=1`), false);
await expect('anonymous GET one doc', fetch(`${api}/consultation_leads/${id()}`), false);
await expect('anonymous UPDATE (PATCH)', fetch(`${api}/consultation_leads/${id()}?currentDocument.exists=true`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: goodFields() }) }), false);
await expect('anonymous DELETE', fetch(`${api}/consultation_leads/${id()}`, { method: 'DELETE' }), false);

// Creates in a bad shape: all must be rejected.
await expect('create with status "sent" (not "clicked")', commit({ ...goodFields(), status: s('sent') }), false);
await expect('create missing email', commit((({ email, ...rest }) => rest)(goodFields())), false);
await expect('create with an extra field', commit({ ...goodFields(), isAdmin: s('yes') }), false);
await expect('create with oversize name (81 chars)', commit({ ...goodFields(), name: s('x'.repeat(81)) }), false);
await expect('create with invalid email', commit({ ...goodFields(), email: s('not-an-email') }), false);
await expect('create with client-supplied createdAt (no server time)', commit({ ...goodFields(), createdAt: { timestampValue: '2020-01-01T00:00:00Z' } }, id(), []), false);
await expect('create with a bad document id', commit(goodFields(), 'short'), false);
await expect('create with an unknown situation code', commit({ ...goodFields(), situation: s('hacker') }), false);
await expect('create with oversize topic (501 chars)', commit({ ...goodFields(), topic: s('x'.repeat(501)) }), false);

if (process.argv.includes('--write-valid')) {
  await expect('create with the exact allowed shape', commit(goodFields()), true);
  await expect('create with situation + topic (the full form)', commit({ ...goodFields(), phone: s('012-345 6789'), situation: s('first_clinic'), topic: s('Capital and startup cost planning') }), true);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED. Do not launch until fixed.`);
process.exit(failures === 0 ? 0 : 1);
