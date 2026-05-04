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
  '/p/aracme': {
    title: 'AraCME | Continuing Medical Education at Klinik Ara',
    description: 'Explore professional medical modules, video presentations, and slide decks designed for continuous learning and professional development.',
    image: 'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/AraCEM%20Thumbnail.jpg?alt=media&token=6414fca1-f1d5-4475-916d-fc2404a2ea5f',
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
  title: 'Klinik Ara 24 Jam | Klinik 24 Jam Berdekatan Anda',
  description:
    'Klinik Ara 24 Jam menyediakan perkhidmatan kesihatan sepanjang masa di Kajang, Seri Kembangan & Semenyih. Klinik 24 jam berdekatan anda tawarkan rawatan kecemasan, scan ibu mengandung & vaksinasi.',
  image:
    'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/%7BA3113931-E36A-4750-9461-CF9E820F4CE2%7D.jpg?alt=media&token=0ec7467b-89e4-48c1-bde0-97736c744589',
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
  // Only handle known page routes to avoid intercepting internal Vite/asset requests
  const pageRoutes = /^\/($|arapower|p\/|share|admin|login)/i;
  app.get('*', async (req, res, next) => {
    const normalizedPath = req.path.replace(/\/$/, '').toLowerCase() || '/';
    
    // If it's not a known page route and has an extension, let it pass through
    // (Vite middlewares or express.static should have handled it)
    if (!pageRoutes.test(normalizedPath) && req.path.includes('.')) {
      return next();
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
    // (normalizedPath already defined above)

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
    // 2. Dynamic pages (/p/<slug>)
    else if (normalizedPath.startsWith('/p/')) {
      const slug = normalizedPath.replace('/p/', '');
      try {
        const pagesRef = db.collection('pages');
        const snapshot = await pagesRef.where('slug', '==', slug).limit(1).get();
        if (!snapshot.empty) {
          const pageData = snapshot.docs[0].data();
          title = pageData.title ? `${pageData.title} | Klinik Ara 24 Jam` : title;
          description = pageData.description || description;
          imageUrl = pageData.image || imageUrl;
          fullUrl = BASE_URL + normalizedPath;
        }
      } catch (error) {
        console.error('Error fetching dynamic page meta:', error);
      }
    }
    // 3. Dynamic service pages (query-string based: /?service=<id>)
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

    // Inject into HTML placeholders
    html = html
      .replace(/Klinik Ara 24 Jam \| Klinik 24 Jam Berdekatan Anda/g, escapeHtml(title))
      .replace(/Klinik Ara 24 Jam menyediakan perkhidmatan kesihatan sepanjang masa di Kajang, Seri Kembangan & Semenyih\. Klinik 24 jam berdekatan anda tawarkan rawatan kecemasan, scan ibu mengandung & vaksinasi\./g, escapeHtml(description))
      .replace(/https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/new-website-7b8dd\.firebasestorage\.app\/o\/%7BA3113931-E36A-4750-9461-CF9E820F4CE2%7D\.jpg\?alt=media&token=0ec7467b-89e4-48c1-bde0-97736c744589/g, escapeHtml(imageUrl));

    res.send(html);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();