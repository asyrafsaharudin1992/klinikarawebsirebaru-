import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, query, where, limit, getDocs, getDocsFromCache, getDocsFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { Service, Location } from '../types';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import SEO from './SEO';
import ServiceModalContent from './ServiceModalContent';

const DEFAULT_IMAGE = "https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/%7BA3113931-E36A-4750-9461-CF9E820F4CE2%7D.jpg?alt=media&token=0ec7467b-89e4-48c1-bde0-97736c744589";

export default function ServiceDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<Service | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchWithCache = async (q: any) => {
      try {
        const snapshot = await getDocsFromCache(q);
        if (!snapshot.empty) return snapshot;
      } catch (e) {
        // Cache miss
      }
      return await getDocsFromServer(q);
    };

    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [serviceSnap, locationsSnap] = await Promise.all([
          fetchWithCache(query(collection(db, 'services'), where('slug', '==', slug), limit(1))),
          fetchWithCache(query(collection(db, 'locations'))),
        ]);

        setLocations(locationsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Location[]);

        if (serviceSnap.empty) {
          setNotFound(true);
        } else {
          const d = serviceSnap.docs[0];
          setService({ id: d.id, ...(d.data() as any) } as Service);
        }
      } catch (error) {
        console.error('Failed to load service:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-pulse text-zinc-600 text-sm">Memuatkan...</div>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-zinc-400 mb-8">Perkhidmatan tidak dijumpai.</p>
        <Link to="/" className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors">
          Kembali ke Laman Utama
        </Link>
      </div>
    );
  }

  const description = service.description
    ? service.description.substring(0, 160)
    : `${service.title} - Klinik Ara 24 Jam. Klinik 24 jam berdekatan anda di Kajang, Seri Kembangan & Semenyih.`;
  const image = service.heroImageUrl || service.imageUrl || service.imageUrls?.[0] || DEFAULT_IMAGE;
  const canonicalUrl = `https://klinikara24jam.hsohealthcare.com/service/${service.slug || service.id}`;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-0 md:p-6">
      <SEO
        title={`${service.title} | Klinik Ara 24 Jam`}
        description={description}
        image={image}
        url={canonicalUrl}
        canonicalUrl={canonicalUrl}
      />

      <nav className="fixed top-0 w-full z-[70] bg-gradient-to-b from-black/90 to-transparent pt-4 pb-8 px-4 md:px-12 pointer-events-none">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Laman Utama</span>
        </button>
      </nav>

      <ServiceModalContent service={service} locations={locations} onClose={() => navigate('/')} />
    </div>
  );
}
