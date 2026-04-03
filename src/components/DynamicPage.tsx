import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DynamicPageData, PageBlock } from '../types';
import { ChevronLeft, ArrowRight, Loader2, AlertCircle, X, Share2, ExternalLink } from 'lucide-react';
import SEO from './SEO';
import { CarouselCard } from '../types';

  export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [pageData, setPageData] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState<CarouselCard | null>(null);

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
          <section key={block.id} className="relative h-[70vh] md:h-[85vh] w-full transition-all duration-1000 ease-in-out mb-12">
            <div className="absolute inset-0 bg-zinc-950">
              {block.imageUrl ? (
                <img 
                  src={block.imageUrl} 
                  alt={block.heading || "Hero Banner"} 
                  className="w-full h-full object-cover animate-fade-in"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900" /> /* Fallback if no image is uploaded */
              )}
              {/* Gradient overlays restricted to bottom and left for text readability */}
              <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-zinc-950/90 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950/90 to-transparent" />
            </div>
            
            {/* Text Content matching the Homepage layout */}
            <div className="absolute bottom-[15%] left-4 md:left-12 max-w-2xl z-10 pointer-events-none">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-red-600 font-bold tracking-widest text-sm drop-shadow-md">
                  HALAMAN KHAS
                </span>
              </div>
              
              {block.heading && (
                <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight drop-shadow-lg text-white">
                  {block.heading}
                </h1>
              )}
              
              {block.subheading && (
                <p className="text-lg md:text-xl text-zinc-300 max-w-xl drop-shadow-md">
                  {block.subheading}
                </p>
              )}
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

        case 'carousel':
        if (!block.carouselCards || block.carouselCards.length === 0) return null;
        return (
          <section key={block.id} className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex overflow-x-auto pb-8 -mx-4 px-4 gap-6 snap-x snap-mandatory hide-scrollbar">
              {block.carouselCards.map(card => (
                <div 
                  key={card.id} 
                  onClick={() => {
                    setSelectedCard(card);
                    navigate(`${location.pathname}?card=${card.id}`, { replace: true });
                  }}
                  // Note: I slightly reduced the width (260px/300px) because portrait cards get very large on screen!
                  className="snap-start shrink-0 w-[260px] md:w-[300px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:border-zinc-700 transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 flex flex-col"
                >
                  {/* 🌟 CHANGED: Replaced h-48 with aspect-[4/5] for a perfect portrait poster shape */}
                  <div className="relative aspect-[4/5] w-full bg-zinc-950 overflow-hidden">
                    {card.imageUrl ? (
                      <img 
                        src={card.imageUrl} 
                        alt={card.title} 
                        // object-cover will now beautifully fill the portrait box
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 font-medium text-sm">
                        Tiada Gambar
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                    {card.shortDescription && (
                      <p className="text-sm text-zinc-400 line-clamp-2">{card.shortDescription}</p>
                    )}
                    <div className="mt-4 text-cyan-400 text-sm font-bold flex items-center gap-2 mt-auto pt-2">
                      Baca Lanjut <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

  const pageDesc = pageData.blocks.find(b => b.type === 'hero')?.subheading || pageData.blocks.find(b => b.type === 'text')?.content?.substring(0, 160) || "Halaman Khas Klinik Ara 24 Jam";
  const pageImage = pageData.blocks.find(b => b.type === 'hero')?.imageUrl || pageData.blocks.find(b => b.type === 'image')?.imageUrl || "";

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
      {/* ========================================== */}
      {/* ========================================== */}
      {/* CAROUSEL CARD MODAL (Refined Split UI) */}
      {/* ========================================== */}
      {selectedCard && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-6 overflow-hidden" 
          onClick={() => {
            setSelectedCard(null);
            window.history.pushState(null, '', window.location.pathname);
          }}
        >
          {/* 🌟 SPECIFIC MODAL SEO */}
          <SEO 
            title={`${selectedCard.title} | Klinik Ara 24 Jam`} 
            description={selectedCard.shortDescription || selectedCard.modalFullText?.substring(0, 150) || pageDesc} 
            image={selectedCard.imageUrl || pageImage} 
            url={`${window.location.origin}${window.location.pathname}?card=${selectedCard.id}`}
          />

          <div 
            className="w-full h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-5xl rounded-t-[32px] md:rounded-3xl overflow-hidden flex flex-col md:flex-row relative bg-zinc-900 shadow-2xl animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300" 
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button (Top Right, Sticky) */}
            <button 
              onClick={() => {
                setSelectedCard(null);
                window.history.pushState(null, '', window.location.pathname);
              }}
              className="absolute top-4 right-4 z-[70] bg-black/40 hover:bg-black/60 md:bg-zinc-800 md:hover:bg-zinc-700 text-white p-2.5 rounded-full backdrop-blur-md transition-colors border border-white/20 md:border-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Unified Scroll Wrapper */}
            <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row relative hide-scrollbar pb-32 md:pb-0">
              
              {/* Left Panel: Image (Dynamic height on desktop, square on mobile) */}
              <div className="relative w-full aspect-square md:aspect-auto md:w-1/2 flex-shrink-0 bg-zinc-950 flex items-center justify-center overflow-hidden">
                {selectedCard.imageUrl ? (
                  <img 
                    src={selectedCard.imageUrl} 
                    alt={selectedCard.title} 
                    className="w-full h-full md:h-auto md:max-h-[85vh] object-cover object-top md:object-contain block z-10 relative"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-zinc-600 font-medium">Tiada Gambar</div>
                )}
              </div>

              {/* Right Panel: Content (Scrollable on desktop, matches image height) */}
              <div className="w-full md:w-1/2 bg-zinc-900 flex flex-col min-h-0 relative z-30 rounded-t-[32px] md:rounded-none -mt-8 md:mt-0 border-t md:border-t-0 border-zinc-800">
                <div className="flex-1 md:overflow-y-auto p-6 md:p-10 pb-48 md:pb-32 flex flex-col hide-scrollbar">
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 text-cyan-400 text-[10px] font-bold tracking-widest rounded-full uppercase shadow-sm">
                      Maklumat Lanjut
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-6">
                    {selectedCard.title}
                  </h2>

                  {/* Highlight Block (Used for shortDescription) */}
                  {selectedCard.shortDescription && (
                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-5 mb-6">
                      <p className="text-cyan-300 text-sm md:text-base leading-relaxed">
                        {selectedCard.shortDescription}
                      </p>
                    </div>
                  )}

                  {/* Main Content Body */}
                  <div className="prose prose-invert max-w-none text-zinc-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                    {selectedCard.modalFullText || "Tiada butiran tambahan disediakan untuk rekod ini."}
                  </div>

                </div>
              </div>
            </div>

            {/* Floating Action Footer (Sticky Bottom, side-by-side buttons) */}
            <div className="absolute bottom-0 left-0 w-full md:w-1/2 md:left-1/2 bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-zinc-900/0 md:bg-zinc-900/95 md:backdrop-blur-md md:border-t md:border-zinc-800 pt-12 md:pt-5 pb-6 md:pb-5 px-6 flex flex-row gap-3 z-50 pointer-events-none md:pointer-events-auto">
              
             {/* 🌟 BULLETPROOF NATIVE SHARE BUTTON */}
              <button 
                onClick={async () => {
                  const shareUrl = `${window.location.origin}${window.location.pathname}?card=${selectedCard.id}`;
                  const shareTitle = `${selectedCard.title} | Klinik Ara 24 Jam`;
                  
                  try {
                    // 1. Try Mobile Native Share (Only works on HTTPS)
                    if (navigator.share) {
                      await navigator.share({
                        title: shareTitle,
                        text: selectedCard.shortDescription || "Lihat promosi/info ini dari Klinik Ara 24 Jam!",
                        url: shareUrl,
                      });
                    } 
                    // 2. Try Modern Clipboard Copy (Desktop or HTTPS)
                    else if (navigator.clipboard && window.isSecureContext) {
                      await navigator.clipboard.writeText(shareUrl);
                      alert(`Pautan telah disalin ke papan keratan!\n\n${shareUrl}`);
                    } 
                    // 3. Ultimate Fallback (For HTTP local testing)
                    else {
                      prompt("Sila salin pautan ini secara manual:", shareUrl);
                    }
                  } catch (error: any) {
                    // Ignore if the user just clicked "cancel" on the share menu
                    if (error.name !== "AbortError") {
                      console.log("Share failed, falling back...", error);
                      prompt("Sila salin pautan ini secara manual:", shareUrl);
                    }
                  }
                }}
                className="pointer-events-auto flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-zinc-950/50 text-sm md:text-base border border-zinc-700"
              >
                <Share2 className="w-5 h-5" />
                Kongsi
              </button>
              
              {/* The Dynamic Custom Button (Only shows if a link is provided!) */}
              {selectedCard.buttonLink && (
                <a 
                  href={selectedCard.buttonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-cyan-900/20 text-sm md:text-base"
                >
                  <ExternalLink className="w-5 h-5" />
                  {selectedCard.buttonText || "Pautan Lanjut"}
                </a>
              )}

            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}