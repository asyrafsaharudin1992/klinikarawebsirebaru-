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
  // 1. Added "Doktor Perempuan" to title - high conversion rate for Malaysian clinics
  title = "Klinik Ara 24 Jam & Doktor Perempuan | Kajang, SK, Semenyih",
  // 2. Naturally blended new keywords into the description
  description = "Klinik Ara 24 jam di Kajang, SK & Semenyih. Tawarkan rawatan asthma, sedut kahak, sakit lutut, scan ibu mengandung & vaksin baby. Doktor perempuan tersedia.",
  // 3. Added all new keywords to the keyword meta tag
  keywords = "Klinik Ara, 24 hour clinic Kajang, 24 hour clinic Seri Kembangan, 24 hour clinic Semenyih, buka buku pink, vaksin influenza, klinik 24 jam, clinic near me, medical clinic Selangor, AraMommy, AraVax, AraSihat, healthcare Kajang, rawatan asthma, sedut kahak, sakit lutut, scan ibu mengandung, vaksin baby, klinik 24 jam nearby, doktor perempuan",
  image = "https://klinikara24jam.hsohealthcare.com/og-image.jpg", 
  url = "https://klinikara24jam.hsohealthcare.com",
}) => {
  
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    "name": "Klinik Ara 24 Jam",
    "alternateName": "Klinik Ara",
    "url": url,
    "logo": "https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/Light%20Logo%20HSO%20.png?alt=media&token=af618257-921e-42c6-9197-daf5b513fcd4",
    "description": description,
    "telephone": "+60-18-219-4392",
    "priceRange": "$$",
    "image": image,
    // 4. SUPERCHARGED Services Schema - Google reads this to rank you for specific treatments
    "availableService": [
      { "@type": "MedicalProcedure", "name": "Rawatan Kecemasan (ER)" },
      { "@type": "MedicalProcedure", "name": "Rawatan Asma (Asthma)" },
      { "@type": "MedicalProcedure", "name": "Sedut Kahak (Nebulization)" },
      { "@type": "MedicalProcedure", "name": "Rawatan Sakit Lutut" },
      { "@type": "MedicalProcedure", "name": "Buka Buku Pink (Maternity)" },
      { "@type": "MedicalProcedure", "name": "Scan Ibu Mengandung (Ultrasound)" },
      { "@type": "MedicalProcedure", "name": "Vaksin Baby (Imunisasi Kanak-kanak)" },
      { "@type": "MedicalProcedure", "name": "Vaksinasi (AraVax, Influenza)" },
      { "@type": "MedicalProcedure", "name": "Rawatan Umum" }
    ],
    "sameAs": [
      "https://www.facebook.com/klinikara24jam",
      "https://www.instagram.com/klinikara24jam"
    ],
    "hasMap": "https://maps.app.goo.gl/X2N1AqjHJ2AN66mH6",
    "location": [
      {
        "@type": "MedicalClinic",
        "name": "Klinik Ara 24 Jam - Kajang",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "D-13-GA, Jalan Prima Saujana 2/F, Taman Prima Saujana",
          "addressLocality": "Kajang",
          "addressRegion": "Selangor",
          "postalCode": "43000",
          "addressCountry": "MY"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 3.009031666988971,
          "longitude": 101.8038767090708
        },
        "url": url,
        "telephone": "+60-18-219-4392",
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
          "opens": "00:00",
          "closes": "23:59"
        }
      },
      {
        "@type": "MedicalClinic",
        "name": "Klinik Ara 24 Jam - Seri Kembangan",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "No. F-1-G, Blok F Putra Walk, Jalan PP 25, Taman Pinggiran Putra, Pusat Bandar Putra Permai",
          "addressLocality": "Seri Kembangan",
          "addressRegion": "Selangor",
          "postalCode": "43300",
          "addressCountry": "MY"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 2.9918560881007696,
          "longitude": 101.67487043741545
        },
        "url": url,
        "telephone": "+60-18-219-4392",
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
          "opens": "00:00",
          "closes": "23:59"
        }
      },
      {
        "@type": "MedicalClinic",
        "name": "Klinik Ara 24 Jam - Semenyih",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "No 8-G, Jalan Seri Mawar 1, Taman Seri Mawar",
          "addressLocality": "Semenyih",
          "addressRegion": "Selangor",
          "postalCode": "43500",
          "addressCountry": "MY"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 2.9454322148195216,
          "longitude": 101.84132794135503
        },
        "url": url,
        "telephone": "+60-18-219-4392",
        "openingHoursSpecification": {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
          "opens": "00:00",
          "closes": "23:59"
        }
      }
    ]
  };

  return (
    <Helmet>
      <html lang="ms" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />

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

      {/* JSON-LD Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify(schemaMarkup)}
      </script>
    </Helmet>
  );
};

export default SEO;