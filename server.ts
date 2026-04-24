import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { createServer as createViteServer } from 'vite';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: "new-website-7b8dd",
  });
}

const db = admin.firestore();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// PAGE METADATA REGISTRY
// Add an entry here for every route that needs its own link-preview metadata.
// The key is the exact pathname (no trailing slash, lowercase).
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_META: Record<string, { title: string; description: string; image: string }> = {
  '/arapower': {
    title: 'AraPower — Earn. Share. Heal.',
    description:
      "Join AraPower, Klinik Ara 24 Jam's exclusive affiliate programme. Share health services, earn commission, and help your community access quality healthcare.",
    image:
      'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/AraPower%20Poster%20.jpg?alt=media&token=122ea2b4-d858-42c0-9a5d-4e217d3d42ea',
  },

  // ── Add more pages below ──────────────────────────────────────────────────
  // '/about': {
  //   title: 'About Us | Klinik Ara 24 Jam',
  //   description: 'Learn about Klinik Ara 24 Jam and our mission to provide 24-hour healthcare.',
  //   image: 'https://...your-about-image...',
  // },
  // '/services': {
  //   title: 'Our Services | Klinik Ara 24 Jam',
  //   description: 'Browse all health services offered at Klinik Ara 24 Jam.',
  //   image: 'https://...your-services-image...',
  // },
};

// Default metadata used for the homepage and any unregistered route
const DEFAULT_META = {
  title: 'Klinik Ara 24 Jam',
  description:
    'Selamat datang ke laman sesawang Klinik Ara 24 Jam. Jom sertai TeamAra untuk menikmati pelbagai manfaat.',
  image:
    'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/locations%2F1774409163998-uha4uj0-%7BA3113931-E36A-4750-9461-CF9E820F4CE2%7D.png?alt=media&token=9ab31dee-069e-4b33-b21c-1feb457c916c',
};

const BASE_URL = 'https://klinikara24jam.hsohealthcare.com';

// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m as keyof object] ?? m)
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ── API Routes ──────────────────────────────────────────────────────────────
  app.patch('/api/services/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    try {
      await db.collection('services').doc(id).update(updates);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating service:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Vite / Static ────────────────────────────────────────────────────────────
  let vite: any;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist'), { index: false }));
  }

  // ── HTML handler (SSR meta injection for link previews) ─────────────────────
  app.get('*', async (req, res) => {
    // Let actual static files through (handled above); only process page routes
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
      return res.status(404).end();
    }

    const serviceId = req.query.service as string | undefined;
    const refId = req.query.ref as string | undefined;

    const indexPath = isProduction
      ? path.join(__dirname, 'dist', 'index.html')
      : path.join(__dirname, 'index.html');

    if (!fs.existsSync(indexPath)) {
      return res.status(404).send('Build not found. Please run npm run build.');
    }

    let html = fs.readFileSync(indexPath, 'utf8');

    if (vite && !isProduction) {
      html = await vite.transformIndexHtml(req.url, html);
    }

    // Normalise path: strip trailing slash, lowercase
    const normalizedPath = req.path.replace(/\/$/, '').toLowerCase() || '/';

    let title = DEFAULT_META.title;
    let description = DEFAULT_META.description;
    let imageUrl = DEFAULT_META.image;
    let fullUrl = BASE_URL + req.url;

    // 1. Check the static page registry first
    const pageMeta = PAGE_META[normalizedPath];
    if (pageMeta) {
      title = pageMeta.title;
      description = pageMeta.description;
      imageUrl = pageMeta.image;
      fullUrl = BASE_URL + normalizedPath;
    }

    // 2. Dynamic service pages (query-string based: /?service=<id>)
    else if (serviceId) {
      try {
        const serviceDoc = await db.collection('services').doc(serviceId).get();
        if (serviceDoc.exists) {
          const service = serviceDoc.data();
          title = service?.title ? `${service.title} | Klinik Ara 24 Jam` : title;
          description = service?.description || description;
          imageUrl = service?.heroImageUrl ?? service?.imageUrl ?? service?.imageUrls?.[0] ?? imageUrl;
          fullUrl = `${BASE_URL}/?service=${serviceId}${refId ? `&ref=${refId}` : ''}`;
        }
      } catch (error) {
        console.error('Error fetching service:', error);
      }
    }

    // Inject into HTML placeholders (now hardcoded in index.html <head>)
    html = html
      .replace(/AraPower — Earn\. Share\. Heal\./g, escapeHtml(title))
      // Also catch the main <title> which is Klinik Ara 24 Jam
      .replace(/<title>Klinik Ara 24 Jam<\/title>/g, `<title>${escapeHtml(title)}</title>`)
      .replace(/Join AraPower, Klinik Ara 24 Jam's exclusive affiliate programme\. Share health services, earn commission, and help your community access quality healthcare\./g, escapeHtml(description))
      // Also catch the default description
      .replace(/Selamat datang ke laman sesawang Klinik Ara 24 Jam\. Jom sertai TeamAra untuk menikmati pelbagai manfaat\./g, escapeHtml(description))
      .replace(/https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/new-website-7b8dd\.firebasestorage\.app\/o\/AraPower%20Poster%20\.jpg\?alt=media&token=122ea2b4-d858-42c0-9a5d-4e217d3d42ea/g, escapeHtml(imageUrl))
      .replace(/https:\/\/klinikara24jam\.hsohealthcare\.com\/arapower/g, escapeHtml(fullUrl));

    res.send(html);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();