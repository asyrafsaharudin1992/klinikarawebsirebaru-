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

  let vite: any;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
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

    if (serviceId) {
      try {
        const serviceDoc = await db.collection('services').doc(serviceId).get();
        if (serviceDoc.exists) {
          const service = serviceDoc.data();
          const title = service?.title || 'Klinik Ara 24 Jam';
          const description = service?.description || 'Selamat datang ke laman sesawang Klinik Ara 24 Jam.';
          const imageUrl = service?.heroImageUrl || service?.imageUrl || service?.imageUrls?.[0] || '';

          const escapeHtml = (str: string) => str.replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
          }[m as keyof any] || m));

          const safeTitle = escapeHtml(title);
          const safeDescription = escapeHtml(description);
          const safeImageUrl = escapeHtml(imageUrl);

          html = html.replace(/<title>.*?<\/title>/, `<title>${safeTitle} | Klinik Ara 24 Jam</title>`);
          html = html.replace(/<meta name="title" content=".*?"\s*\/?>/, `<meta name="title" content="${safeTitle}">`);
          html = html.replace(/<meta property="og:title" content=".*?"\s*\/?>/, `<meta property="og:title" content="${safeTitle}">`);
          html = html.replace(/<meta property="og:description" content=".*?"\s*\/?>/, `<meta property="og:description" content="${safeDescription}">`);
          html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>/, `<meta property="og:image" content="${safeImageUrl}">`);
          html = html.replace(/<meta name="description" content=".*?"\s*\/?>/, `<meta name="description" content="${safeDescription}">`);
          
          const fullUrl = `https://klinikara24jam.hsohealthcare.com/?service=${serviceId}`;
          html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>/, `<meta property="og:url" content="${fullUrl}">`);
        }
      } catch (error) {
        console.error('Error fetching service:', error);
      }
    }

    res.send(html);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer();
