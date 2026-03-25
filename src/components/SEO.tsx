import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
}

const SEO: React.FC<SEOProps> = ({
  title = "Klinik Ara 24 Jam",
  description = "Klinik Ara 24 Jam Selamat datang ke laman sesawang Klinik Ara 24 Jam, Ayuh sertai TeamAra untuk menikmati pelbagai manfaat.",
  keywords = "Klinik Ara, 24 hour clinic Kajang, 24 hour clinic Seri Kembangan, 24 hour clinic Semenyih, buka buku pink, vaksin influenza, klinik 24 jam, clinic near me, medical clinic Selangor, AraMommy, AraVax, AraSihat, healthcare Kajang",
  image = "https://ais-dev-hsvhfigpeqkxawqym2ax4s-499672742043.asia-southeast1.run.app/og-image.jpg", // Replace with actual OG image if available
  url = "https://ais-dev-hsvhfigpeqkxawqym2ax4s-499672742043.asia-southeast1.run.app",
}) => {
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "name": "Klinik Ara 24 Jam",
    "alternateName": "Klinik Ara",
    "description": description,
    "url": url,
    "logo": "https://ais-dev-hsvhfigpeqkxawqym2ax4s-499672742043.asia-southeast1.run.app/logo.png", // Replace with actual logo
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+60182194392",
      "contactType": "customer service",
      "areaServed": "MY",
      "availableLanguage": ["English", "Malay"]
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kajang",
      "addressRegion": "Selangor",
      "addressCountry": "MY"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      "opens": "00:00",
      "closes": "23:59"
    },
    "sameAs": [
      "https://www.facebook.com/klinikara24jam", // Replace with actual social links
      "https://www.instagram.com/klinikara24jam"
    ]
  };

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup)}
      </script>
    </Helmet>
  );
};

export default SEO;
