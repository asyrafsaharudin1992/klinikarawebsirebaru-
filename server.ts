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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
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

  app.get('*', async (req, res) => {
    // Skip API routes or static files that should have been handled
    if (req.path.includes('.') && !req.path.endsWith('.html')) {
      return res.status(404).end();
    }

    const serviceId = req.query.service as string;
    const refId = req.query.ref as string;
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

    let title = 'Klinik Ara 24 Jam';
    let description = 'Selamat datang ke laman sesawang Klinik Ara 24 Jam. Jom sertai TeamAra untuk menikmati pelbagai manfaat.';
    let imageUrl = 'https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/locations%2F1774409163998-uha4uj0-%7BA3113931-E36A-4750-9461-CF9E820F4CE2%7D.png?alt=media&token=9ab31dee-069e-4b33-b21c-1feb457c916c';
    let fullUrl = 'https://klinikara24jam.hsohealthcare.com' + req.url;

    // Normalize path for matching (ignore trailing slash)
    const normalizedPath = req.path.replace(/\/$/, '') || '/';

    if (normalizedPath === '/arapower') {
      title = "AraPower — Earn. Share. Heal.";
      description = "Join AraPower, Klinik Ara 24 Jam's exclusive affiliate programme. Share health services, earn commission, and help your community access quality healthcare.";
      imageUrl = "https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/AraPower%20Poster%20.jpg?alt=media&token=122ea2b4-d858-42c0-9a5d-4e217d3d42ea";
    } else if (serviceId) {
      try {
        const serviceDoc = await db.collection('services').doc(serviceId).get();
        if (serviceDoc.exists) {
          const service = serviceDoc.data();
          title = service?.title ? `${service.title} | Klinik Ara 24 Jam` : title;
          description = service?.description || description;
          imageUrl = service?.heroImageUrl || service?.imageUrl || service?.imageUrls?.[0] || imageUrl;
          fullUrl = `https://klinikara24jam.hsohealthcare.com/?service=${serviceId}${refId ? `&ref=${refId}` : ''}`;
        }
      } catch (error) {
        console.error('Error fetching service:', error);
      }
    }

    const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m as keyof any] || m));

    html = html.replace(/__OG_TITLE__/g, escapeHtml(title));
    html = html.replace(/__OG_DESC__/g, escapeHtml(description));
    html = html.replace(/__OG_IMAGE__/g, escapeHtml(imageUrl));
    html = html.replace(/__OG_URL__/g, escapeHtml(fullUrl));

    res.send(html);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();