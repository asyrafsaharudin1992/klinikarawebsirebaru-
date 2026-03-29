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

  res.status(200).send(html);
});