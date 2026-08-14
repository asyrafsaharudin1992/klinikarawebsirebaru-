// Regenerates public/sitemap.xml, including one <url> per real service page
// (/service/<slug>) pulled live from Firestore. Runs as part of `npm run build`
// so the sitemap never goes stale as services are added/renamed/removed.
// Uses the public Firestore REST endpoint (no auth needed - services are
// publicly readable) rather than firebase-admin, since this needs to run
// in CI/Vercel builds without any service-account credentials configured.

import { writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'new-website-7b8dd';
const BASE_URL = 'https://klinikara24jam.hsohealthcare.com';
const today = new Date().toISOString().split('T')[0];

const escapeXml = (str) =>
  String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

async function fetchServiceSlugs() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/services?pageSize=300`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Firestore fetch failed: ${res.status}`);
  const json = await res.json();
  const docs = json.documents || [];
  return docs
    .map((d) => d.fields?.slug?.stringValue)
    .filter(Boolean)
    .sort();
}

function urlEntry({ loc, changefreq, priority }) {
  return `   <url>
      <loc>${escapeXml(loc)}</loc>
      <lastmod>${today}</lastmod>
      <changefreq>${changefreq}</changefreq>
      <priority>${priority}</priority>
   </url>`;
}

function buildXml(serviceSlugs) {
  const otherUrls = [
    { loc: `${BASE_URL}/arapower`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/p/cme-ara`, changefreq: 'weekly', priority: '0.9' },
    ...serviceSlugs.map((slug) => ({ loc: `${BASE_URL}/service/${slug}`, changefreq: 'monthly', priority: '0.7' })),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

   <url>
      <loc>${BASE_URL}/</loc>
      <lastmod>${today}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>1.0</priority>

      <image:image>
         <image:loc>${BASE_URL}/Light_Logo_HSO.webp</image:loc>
         <image:title>Klinik Ara 24 Jam Logo</image:title>
      </image:image>
   </url>

${otherUrls.map(urlEntry).join('\n\n')}

</urlset>
`;
}

async function main() {
  let slugs = [];
  try {
    slugs = await fetchServiceSlugs();
    console.log(`Fetched ${slugs.length} service slugs from Firestore.`);
  } catch (error) {
    console.warn('Could not fetch services for sitemap (keeping static entries only):', error.message);
  }

  const xml = buildXml(slugs);
  const outPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
  await writeFile(outPath, xml, 'utf8');
  console.log(`Wrote ${outPath} with ${3 + slugs.length} URLs.`);
}

main();
