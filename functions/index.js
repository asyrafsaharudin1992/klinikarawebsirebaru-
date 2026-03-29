const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.serveDynamicTags = functions.https.onRequest(async (req, res) => {
  const serviceId = req.query.service;
  
  // Default fallbacks if a service isn't found
  let title = "Klinik Ara 24 Jam";
  let description = "Klinik Kesihatan 24 Jam Pilihan Anda";
  // Default logo just in case
  let image = "https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/Light%20Logo%20HSO%20.png?alt=media"; 

  if (serviceId) {
    try {
      const doc = await admin.firestore().collection("services").doc(serviceId).get();
      if (doc.exists) {
        const data = doc.data();
        title = data.title || title;
        description = data.description || description;
        
        // THE FIX: Look inside the imageUrls array!
        if (data.imageUrls && data.imageUrls.length > 0) {
          image = data.imageUrls[0];
        }
      }
    } catch (error) {
      console.error("Error fetching service:", error);
    }
  }

  // The HTML that WhatsApp reads
  const html = `
    <!DOCTYPE html>
    <html lang="ms">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:image" content="${image}">
      <meta property="og:type" content="website">
      
      <script>
        // Instantly redirect humans to your actual website
        window.location.href = "https://klinikara24jam.hsohealthcare.com/?service=${serviceId}";
      </script>
    </head>
    <body>
      <p>Redirecting to ${title}...</p>
    </body>
    </html>
  `;

  // Inside your serveDynamicTags function, update the HTML response:
res.status(200).send(`
  <!DOCTYPE html>
  <html lang="ms">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>${data.title}</title>
    <meta name="description" content="${data.description}">

    <meta property="og:type" content="website">
    <meta property="og:url" content="${req.url}">
    <meta property="og:title" content="${data.title}">
    <meta property="og:description" content="${data.description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${data.title}">
    <meta name="twitter:description" content="${data.description}">
    <meta name="twitter:image" content="${imageUrl}">

    <script>window.location.href = "https://klinikara24jam.hsohealthcare.com/services/${serviceId}";</script>
  </head>
  <body>
    <p>Sila tunggu, anda sedang dibawa ke laman servis...</p>
  </body>
  </html>
`);