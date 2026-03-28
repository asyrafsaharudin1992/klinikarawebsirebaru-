const functions = require("firebase-functions");
const admin = require("firebase-admin");
const https = require("https");

admin.initializeApp();

exports.serveDynamicTags = functions.https.onRequest((req, res) => {
  const serviceId = req.query.service;
  const liveHtmlUrl = "https://new-website-7b8dd.web.app/app.html";

  https.get(liveHtmlUrl, (response) => {
    let html = '';
    response.on('data', chunk => html += chunk);
    
    response.on('end', async () => {
      // 1. Default fallback text
      let finalTitle = "Klinik Ara 24 Jam";
      let finalDesc = "Selamat datang ke laman sesawang Klinik Ara 24 Jam. Jom sertai TeamAra untuk menikmati pelbagai manfaat.";
      let finalImage = "https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/Light%20Logo%20HSO%20.png?alt=media";

      // 2. Fetch specific service if ID exists
      if (serviceId) {
        try {
          const doc = await admin.firestore().collection("services").doc(serviceId).get();
          if (doc.exists) {
            const data = doc.data();
            if (data.title) finalTitle = `${data.title} - Klinik Ara 24 Jam`;
            if (data.description) finalDesc = data.description.substring(0, 150) + '...';
            if (data.imageUrl || (data.imageUrls && data.imageUrls[0])) {
              finalImage = data.imageUrl || data.imageUrls[0];
            }
          }
        } catch (error) {
          console.error("Database error:", error);
        }
      }

      // 3. Replace the raw placeholders in the HTML
      html = html.replace(/__OG_TITLE__/g, finalTitle)
                 .replace(/__OG_DESC__/g, finalDesc)
                 .replace(/__OG_IMAGE__/g, finalImage);

      // 4. Send the clean HTML to WhatsApp!
      res.status(200).send(html);
    });
  }).on('error', (err) => {
    console.error("Network error:", err);
    res.status(500).send("Server Error");
  });
});