import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  /** Clean URL for the canonical tag (no tracking/state query params). Defaults to `url`. */
  canonicalUrl?: string;
}

const SEO: React.FC<SEOProps> = ({
  title = "Klinik Ara 24 Jam | Klinik 24 Jam Berdekatan Anda",
  description = "Klinik Ara 24 jam berdekatan anda di Kajang, Seri Kembangan & Semenyih. Tawarkan rawatan asma, sedut kahak, sakit lutut, scan ibu mengandung & vaksin baby.",
  keywords = "Klinik Ara, 24 hour clinic Kajang, 24 hour clinic Seri Kembangan, 24 hour clinic Semenyih, buka buku pink, vaksin influenza, klinik 24 jam, clinic near me, medical clinic Selangor, AraMommy, AraVax, AraSihat, healthcare Kajang, rawatan asthma, sedut kahak, sakit lutut, scan ibu mengandung, vaksin baby, klinik 24 jam nearby",
  image = "https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/%7BA3113931-E36A-4750-9461-CF9E820F4CE2%7D.jpg?alt=media&token=0ec7467b-89e4-48c1-bde0-97736c744589",
  url = "https://klinikara24jam.hsohealthcare.com",
  canonicalUrl,
}) => {

  return (
    <Helmet>
      <html lang="ms" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl || url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="ms_MY" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;