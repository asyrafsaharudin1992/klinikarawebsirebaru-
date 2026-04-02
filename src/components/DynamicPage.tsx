import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DynamicPageData, PageBlock } from '../types';
import { ChevronLeft, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [pageData, setPageData] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPage = async () => {
      if (!slug) return;
      try {
        // Find the page in Firebase where the slug matches the URL
        const q = query(collection(db, 'pages'), where('slug', '==', slug), where('status', '==', 'published'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError('Halaman tidak dijumpai.'); // 404 Not Found
        } else {
          // Grab the first matching document
          const doc = querySnapshot.docs[0];
          setPageData({ id: doc.id, ...doc.data() } as DynamicPageData);
        }
      } catch (err) {
        console.error("Error fetching page:", err);
        setError('Ralat memuatkan halaman.');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  // --- THE BLOCK RENDERER ENGINE ---
  const renderBlock = (block: PageBlock) => {
    switch (block.type) {
      case 'hero':
        return (
          <section key={block.id} className="relative h-[50vh] md:h-[60vh] w-full flex items-center justify-center text-center overflow-hidden mb-12">
            {block.imageUrl && (
              <>
                <img src={block.imageUrl} alt={block.heading} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60" /> {/* Dark overlay */}
              </>
            )}
            <div className="relative z-10 px-4 max-w-4xl mx-auto">
              {block.heading && <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">{block.heading}</h1>}
              {block.subheading && <p className="text-lg md:text-xl text-zinc-300">{block.subheading}</p>}
            </div>
          </section>
        );

      case 'text':
        return (
          <section key={block.id} className="max-w-3xl mx-auto px-4 py-8">
            <div className="prose prose-invert md:prose-lg whitespace-pre-wrap text-zinc-300 leading-relaxed">
              {block.content}
            </div>
          </section>
        );

      case 'image':
        return block.imageUrl ? (
          <section key={block.id} className="max-w-4xl mx-auto px-4 py-8">
            <img src={block.imageUrl} alt="Content" className="w-full h-auto rounded-2xl shadow-2xl border border-zinc-800" />
          </section>
        ) : null;

      case 'cta':
        return (
          <section key={block.id} className="max-w-xl mx-auto px-4 py-12 text-center">
            {block.buttonText && block.buttonLink && (
              <a 
                href={block.buttonLink} 
                target={block.buttonLink.startsWith('http') ? '_blank' : '_self'}
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-full text-lg shadow-lg shadow-cyan-900/20 transition-transform hover:scale-105 active:scale-95"
              >
                {block.buttonText}
                <ArrowRight className="w-5 h-5" />
              </a>
            )}
          </section>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-zinc-400 mb-8">{error || "Halaman tidak dijumpai."}</p>
        <Link to="/" className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors">
          Kembali ke Laman Utama
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Sticky Top Nav */}
      <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/90 to-transparent pt-4 pb-8 px-4 md:px-12 pointer-events-none">
        <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors pointer-events-auto bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Laman Utama</span>
        </Link>
      </nav>

      {/* Render all blocks dynamically */}
      <main className="w-full">
        {pageData.blocks.map(block => renderBlock(block))}
      </main>
    </div>
  );
}