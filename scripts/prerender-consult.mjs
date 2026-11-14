// Writes dist/business-consultation/index.html: a copy of the built index.html with this page's
// title, description, canonical and Open Graph / Twitter tags already in the HTML.
// Why: the site is a client-side SPA and WhatsApp's link-preview crawler does not run JavaScript,
// so without this a shared link would show the homepage card. Vercel serves real files before
// the catch-all rewrite in vercel.json, so /business-consultation gets this copy; the app then
// boots normally from it. The tags carry data-prerender="true"; BusinessConsultation removes them
// once <SEO> has rendered the same tags, so the live DOM has no duplicates.

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const meta = JSON.parse(await readFile(path.join(__dirname, '..', 'src', 'components', 'consult', 'meta.json'), 'utf8'));

const { hero } = JSON.parse(await readFile(path.join(__dirname, '..', 'src', 'components', 'consult', 'content.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const tags = [
  `<meta data-prerender="true" name="description" content="${esc(meta.description)}" />`,
  `<link data-prerender="true" rel="canonical" href="${esc(meta.url)}" />`,
  `<meta data-prerender="true" property="og:type" content="website" />`,
  `<meta data-prerender="true" property="og:url" content="${esc(meta.url)}" />`,
  `<meta data-prerender="true" property="og:title" content="${esc(meta.title)}" />`,
  `<meta data-prerender="true" property="og:description" content="${esc(meta.description)}" />`,
  `<meta data-prerender="true" property="og:image" content="${esc(meta.image)}" />`,
  `<meta data-prerender="true" property="og:image:width" content="1200" />`,
  `<meta data-prerender="true" property="og:image:height" content="630" />`,
  `<meta data-prerender="true" property="og:locale" content="en_MY" />`,
  `<meta data-prerender="true" name="twitter:card" content="summary_large_image" />`,
  `<meta data-prerender="true" name="twitter:url" content="${esc(meta.url)}" />`,
  `<meta data-prerender="true" name="twitter:title" content="${esc(meta.title)}" />`,
  `<meta data-prerender="true" name="twitter:description" content="${esc(meta.description)}" />`,
  `<meta data-prerender="true" name="twitter:image" content="${esc(meta.image)}" />`,
].join('\n    ');

// Preload this page's lazy chunk and stylesheet so they download alongside the main bundle
// instead of waiting for it to boot and discover the route (saves one network round trip).
const assets = await readdir(path.join(dist, 'assets'));
const pageJs = assets.find((f) => /^BusinessConsultation-.*\.js$/.test(f));
const pageCss = assets.find((f) => /^BusinessConsultation-.*\.css$/.test(f));
const preloads = [
  `<link data-prerender="true" rel="preconnect" href="https://fonts.googleapis.com" />`,
  `<link data-prerender="true" rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
  // Non-blocking: first paint uses the system fallback, then swaps to Roboto when it arrives.
  `<link data-prerender="true" rel="stylesheet" href="${esc(meta.fontCss)}" media="print" onload="this.media='all'" />`,
  pageJs && `<link rel="modulepreload" crossorigin href="/assets/${pageJs}" />`,
  pageCss && `<link rel="stylesheet" crossorigin href="/assets/${pageCss}" />`,
]
  .filter(Boolean)
  .join('\n    ');

// Static first paint: header + hero markup (same classes and copy as the React page) go inside
// #root, so the headline paints straight from HTML + CSS instead of waiting for JavaScript.
// React replaces it with identical content once it boots; if JavaScript never loads, the
// visitor still sees the headline. The booking form and everything below need JS.
const shell = `<div class="consult-page">
      <header class="c-header"><div class="c-container c-header-in">
        <a href="/" class="c-brand" aria-label="Klinik Ara 24 Jam home"><img src="/consult-logo.png" alt="" width="40" height="40" /><span>Klinik Ara 24 Jam</span></a>
        <a href="/" class="c-back">Main site</a>
      </div></header>
      <main>
        <section class="c-hero" aria-labelledby="c-h1"><div class="c-container c-hero-grid"><div class="c-hero-copy">
          <p class="c-eyebrow">${esc(hero.eyebrow)}</p>
          <h1 id="c-h1" class="c-h1"><span>${esc(hero.h1Lead)}</span> <span class="c-h1-em">${esc(hero.h1Em)}</span></h1>
          <p class="c-sub">${esc(hero.sub)}</p>
          <p class="c-desc">${esc(hero.desc)}</p>
          <div class="c-actions"><a href="#book" class="c-btn c-btn--primary">${esc(hero.ctaPrimary)}</a><a href="#discuss" class="c-btn c-btn--ghost">${esc(hero.ctaSecondary)}</a></div>
        </div></div></section>
      </main>
    </div>`;

let html = await readFile(path.join(dist, 'index.html'), 'utf8');
if (!html.includes('<div id="root"></div>')) {
  throw new Error('dist/index.html has no empty <div id="root"></div>; cannot inject the static first paint.');
}
if (!/<title>[\s\S]*?<\/title>/.test(html) || !html.includes('</head>')) {
  throw new Error('dist/index.html has no <title> or </head>; cannot prerender the consultation page.');
}
html = html
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
  .replace('<html lang="ms">', '<html lang="en">')
  .replace('<div id="root"></div>', `<div id="root">${shell}</div>`)
  .replace('</head>', `    ${tags}\n    ${preloads}\n  </head>`);

const outDir = path.join(dist, 'business-consultation');
await mkdir(outDir, { recursive: true });
await writeFile(path.join(outDir, 'index.html'), html, 'utf8');
console.log(`Wrote ${path.join(outDir, 'index.html')}`);
