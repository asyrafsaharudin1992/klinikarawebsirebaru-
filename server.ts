import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { createServer as createViteServer } from 'vite';

import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId, 
  });
}

const db = getFirestore(firebaseConfig.firestoreDatabaseId);
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

    let title = 'Klinik Ara 24 Jam';
    let description = 'Selamat datang ke laman sesawang Klinik Ara 24 Jam. Jom sertai TeamAra untuk menikmati pelbagai manfaat.';
    let imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/locations%2F1774409163998-uha4uj0-%7BA3113931-E36A-4750-9461-CF9E820F4CE2%7D.png?alt=media`;
    let fullUrl = 'https://klinikara24jam.hsohealthcare.com/';

    if (serviceId) {
      try {
        const serviceDoc = await db.collection('services').doc(serviceId).get();
        if (serviceDoc.exists) {
          const service = serviceDoc.data();
          title = service?.title ? `${service.title} | Klinik Ara 24 Jam` : title;
          description = service?.description || description;
          imageUrl = service?.heroImageUrl || service?.imageUrl || service?.imageUrls?.[0] || imageUrl;
          fullUrl = `https://klinikara24jam.hsohealthcare.com/?service=${serviceId}`;
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
