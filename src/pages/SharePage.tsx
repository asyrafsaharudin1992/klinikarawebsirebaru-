import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function SharePage() {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');

  // We can't fetch Firestore data fast enough for the bot here, 
  // so we will use a Generic Big Image for now to prove it works.
  const imageUrl = "https://klinikara24jam.hsohealthcare.com/og-image.jpg"; 

  useEffect(() => {
    // Redirect real humans to the actual service page
    if (serviceId) {
      window.location.href = `/services/${serviceId}`;
    }
  }, [serviceId]);

  return (
    <Helmet>
      <title>Klinik Ara 24 Jam</title>
      <meta property="og:title" content="Klinik Ara 24 Jam - Servis Kami" />
      <meta property="og:description" content="Lihat servis kesihatan terbaik kami." />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}