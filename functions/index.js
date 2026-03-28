const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.serveDynamicTags = functions.https.onRequest(async (req, res) => {
  const serviceId = req.query.service;

  // 1. Default clinic info
  let title = "Klinik Ara 24 Jam";
  let desc = "Selamat datang ke laman sesawang Klinik Ara 24 Jam. Jom sertai TeamAra untuk menikmati pelbagai manfaat.";
  let image = "https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/Light%20Logo%20HSO%20.png?alt=media";
  let redirectUrl = "https://klinikara24jam.hsohealthcare.com/";

  // 2. Fetch specific service
  if (serviceId) {
    redirectUrl = `https://klinikara24jam.hsohealthcare.com/?service=${serviceId}`;
    try {
      const doc = await admin.firestore().collection("services").doc(serviceId).get();
      if (doc.exists) {
        const data = doc.data();
        if (data.title) title = `${data.title} - Klinik Ara 24 Jam`;
        if (data.description) desc = data.description.substring(0, 150) + '...';
        if (data.imageUrl || (data.imageUrls && data.imageUrls[0])) {
          image = data.imageUrl || data.imageUrls[0];
        }
      }
    } catch (error) {
      console.error("Database error:", error);
    }
  }

  // 3. The Magic Shell: Bots read the tags, humans get redirected!
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${desc}">
      <meta property="og:image" content="${image}">
      <meta property="og:url" content="${redirectUrl}">
      <meta name="twitter:card" content="summary_large_image">
      <script>
        // If a real human clicks this, instantly redirect them to the real site!
        window.location.href = "${redirectUrl}";
      </script>
    </head>
    <body>
      <p>Redirecting to Klinik Ara 24 Jam...</p>
    </body>
    </html>
  `;

  res.status(200).send(html);
});