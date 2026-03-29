const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Add .runWith to force reset the settings
exports.serveDynamicTags = functions.runWith({
  memory: '256MB',
  timeoutSeconds: 60
}).https.onRequest(async (req, res) => {
  const serviceId = req.query.service;
  const db = admin.firestore();

  try {
    const doc = await db.collection("services").doc(serviceId).get();

    if (!doc.exists) {
      return res.status(404).send("Service not found");
    }

    const data = doc.data();
    const imageUrl = data.image || "https://klinikara24jam.hsohealthcare.com/default-share.jpg";

    // This is the HTML that tells WhatsApp to show the BIG image
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="ms">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${data.title}</title>
        
        <meta property="og:type" content="website">
        <meta property="og:title" content="${data.title}">
        <meta property="og:description" content="${data.description}">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:url" content="https://klinikara24jam.hsohealthcare.com/share?service=${serviceId}">

        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:image" content="${imageUrl}">

        <script>
          window.location.href = "https://klinikara24jam.hsohealthcare.com/services/${serviceId}";
        </script>
      </head>
      <body>
        <p>Sila tunggu...</p>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});