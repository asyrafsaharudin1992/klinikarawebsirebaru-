import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SharePage = () => {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  const refId = searchParams.get('ref');

  useEffect(() => {
    if (serviceId) {
      const refParam = refId ? `&ref=${refId}` : '';
      window.location.href = `/?service=${serviceId}${refParam}`;
    }
  }, [serviceId, refId]);

  return (
    <Helmet>
      <title>Klinik Ara 24 Jam</title>
      <meta property="og:title" content="Klinik Ara 24 Jam" />
      <meta property="og:image" content="https://klinikara24jam.hsohealthcare.com/og-image.jpg" />
    </Helmet>
  );
};

export default SharePage;