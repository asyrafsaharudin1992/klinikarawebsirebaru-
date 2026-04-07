import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { DynamicPageData, PageBlock } from '../types';
import { ChevronLeft, ArrowRight, Loader2, AlertCircle, X, Share2, MessageCircle, ExternalLink } from 'lucide-react';
import SEO from './SEO';
import { CarouselCard } from '../types';

// --- ARACME SPECIFIC DATA ---
export const ARACME_CAROUSEL_DATA = [
  {
    id: 'aracme-1',
    type: 'video',
    title: 'ARACME Video Presentation',
    url: 'https://drive.google.com/file/d/123456789/view', // Replace with actual Google Drive video link
    thumbnail: 'https://picsum.photos/seed/aracme1/400/500',
    description: 'Watch our latest ARACME video presentation.'
  },
  {
    id: 'aracme-2',
    type: 'slide',
    title: 'ARACME Slide Deck',
    url: 'https://docs.google.com/presentation/d/123456789/edit', // Replace with actual Google Slides link
    thumbnail: 'https://picsum.photos/seed/aracme2/400/500',
    description: 'Review the ARACME slide deck for more details.'
  }
];

// Helper to convert Google Drive links to embeddable preview links
const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  if (url.includes('docs.google.com/presentation/d/')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return `https://docs.google.com/presentation/d/${match[1]}/embed`;
  }
  return url;
};

  export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [pageData, setPageData] = useState<DynamicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCard, setSelectedCard] = useState<CarouselCard | null>(null);
  const [activeMediaUrl, setActiveMediaUrl] = useState<string | null>(null);
  // --- 🌟 CUSTOM SHARE FUNCTION ---
  const handleShare = async (card: CarouselCard) => {
    // Note: We are passing BOTH the card ID and the page slug so your backend 
    // knows exactly what image to fetch, and where to redirect the user afterwards!
    const shareUrl = `https://share.klinikara24jam.hsohealthcare.com/?card=${card.id}&page=${slug}`;
    const shareTitle = `${card.title} | Klinik Ara 24 Jam`;
    const shareText = card.shortDescription || "Lihat promosi/info ini dari Klinik Ara 24 Jam!";

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        alert(`Pautan telah disalin ke papan keratan!\n\n${shareUrl}`);
      } else {
        prompt("Sila salin pautan ini secara manual:", shareUrl);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        prompt("Sila salin pautan ini secara manual:", shareUrl);
      }
    }
  };

  // --- 🎥 MEDIA CLICK HANDLER ---
  const handleMediaClick = (e: React.MouseEvent, url: string | undefined) => {
    if (!url) return;
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      e.preventDefault();
      setActiveMediaUrl(url);
    }
  };

 // --- 🕵️‍♂️ AUTO-OPEN MODAL FROM SHARED LINK ---
  useEffect(() => {
    // Only run if the Firebase data has finished loading
    if (!pageData) return;

    // Use React Router's location object to read the "?card=..."
    const urlParams = new URLSearchParams(location.search);
    const cardIdFromUrl = urlParams.get('card');

    if (cardIdFromUrl) {
      // Loop through the blocks to find the matching card
      for (const block of pageData.blocks) {
        if (block.type === 'carousel' && block.carouselCards) {
          const foundCard = block.carouselCards.find(c => c.id === cardIdFromUrl);
          if (foundCard) {
            setSelectedCard(foundCard); // Open the modal!
            break;
          }
        }
      }
    } else {
      // If there is no card ID in the URL, make sure the modal is closed
      setSelectedCard(null);
    }
  }, [pageData, location.search]); // The magic fix: It listens to changes in location.search!
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
        if (slug?.toLowerCase() === 'aracme') return null; // Hide dynamic carousel for ARACME
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

  const isAracme = slug?.toLowerCase() === 'aracme';
  
  const t = {
    backToHome: isAracme ? 'Back to Home' : 'Laman Utama',
    pageNotFound: isAracme ? 'Page not found.' : 'Halaman tidak dijumpai.',
    backButton: isAracme ? 'Back to Home' : 'Kembali ke Laman Utama',
    noImage: isAracme ? 'No Image' : 'Tiada Gambar',
    learnMore: isAracme ? 'Learn More' : 'Baca Lanjut',
    moreInfo: isAracme ? 'Learn More' : 'Maklumat Lanjut',
    noDetails: isAracme ? 'No additional details provided.' : 'Tiada butiran tambahan disediakan untuk rekod ini.',
    share: isAracme ? 'Share' : 'Kongsi',
    contactUs: isAracme ? 'Contact Us' : 'Hubungi',
    bookNow: isAracme ? 'Book Now' : 'Lanjut'
  };

  if (error || !pageData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white px-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl font-bold mb-2">404</h1>
        <p className="text-zinc-400 mb-8">{error || t.pageNotFound}</p>
        <Link to="/" className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors">
          {t.backButton}
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
          <span className="text-sm font-medium">{t.backToHome}</span>
        </Link>
      </nav>

      {/* Render all blocks dynamically */}
      <main className="w-full">
        {pageData.blocks.map(block => renderBlock(block))}
        
        {/* ARACME Custom Carousel */}
        {isAracme && (
          <section className="max-w-7xl mx-auto px-4 py-12">
            <div className="flex overflow-x-auto pb-8 -mx-4 px-4 gap-6 snap-x snap-mandatory hide-scrollbar">
              {ARACME_CAROUSEL_DATA.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    setSelectedCard({
                      id: item.id,
                      title: item.title,
                      shortDescription: item.description,
                      imageUrl: item.thumbnail,
                      buttonLink: item.url,
                      isAracmeItem: true,
                      aracmeType: item.type
                    } as any);
                    window.history.pushState(null, '', `${location.pathname}?card=${item.id}`);
                  }}
                  className="snap-start shrink-0 w-[260px] md:w-[300px] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden cursor-pointer hover:border-zinc-700 transition-all duration-300 group hover:shadow-xl hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative aspect-[4/5] w-full bg-zinc-950 overflow-hidden">
                    <img 
                      src={item.thumbnail} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20">
                        <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[12px] border-l-white border-b-8 border-b-transparent ml-1"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-zinc-800 text-cyan-400 text-[10px] font-bold tracking-widest rounded uppercase">
                        {item.type}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-zinc-400 line-clamp-2">{item.description}</p>
                    <div className="mt-4 text-cyan-400 text-sm font-bold flex items-center gap-2 mt-auto pt-2">
                      {t.learnMore} <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
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
              
              {/* Left Panel: Image or Iframe */}
              <div className="relative w-full md:w-1/2 flex-shrink-0 bg-zinc-950 flex items-center justify-center overflow-hidden min-h-[50vw] md:min-h-0">
                {(selectedCard as any).isAracmeItem && (selectedCard as any).buttonLink ? (
                  <div className="w-full px-4 md:px-8 py-8 md:py-0">
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
                      <iframe 
                        src={getEmbedUrl((selectedCard as any).buttonLink)} 
                        className="absolute inset-0 w-full h-full border-0" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen
                      ></iframe>
                    </div>
                  </div>
                ) : selectedCard.imageUrl ? (
                  <img 
                    src={selectedCard.imageUrl} 
                    alt={selectedCard.title} 
                    className="w-full h-auto max-h-[70vh] md:max-h-[85vh] object-contain block z-10 relative"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-zinc-600 font-medium py-20">{t.noImage}</div>
                )}
              </div>

              {/* Right Panel: Content (Scrollable on desktop, matches image height) */}
              <div className="w-full md:w-1/2 bg-zinc-900 flex flex-col min-h-0 relative z-30 rounded-t-[32px] md:rounded-none -mt-8 md:mt-0 border-t md:border-t-0 border-zinc-800">
                <div className="flex-1 md:overflow-y-auto p-6 md:p-10 pb-48 md:pb-32 flex flex-col hide-scrollbar">
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 text-cyan-400 text-[10px] font-bold tracking-widest rounded-full uppercase shadow-sm">
                      {t.moreInfo}
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
                    {selectedCard.modalFullText || t.noDetails}
                  </div>

                </div>
              </div>
            </div>

            {/* Floating Action Footer */}
            <div className="absolute bottom-0 left-0 w-full md:w-1/2 md:left-1/2 bg-gradient-to-t from-zinc-900 via-zinc-900/95 to-zinc-900/0 md:bg-zinc-900/95 md:backdrop-blur-md md:border-t md:border-zinc-800 pt-12 md:pt-5 pb-6 md:pb-5 px-4 md:px-6 flex flex-wrap md:flex-nowrap flex-row gap-2 z-50 pointer-events-none md:pointer-events-auto">
              
              {/* 🌟 BULLETPROOF NATIVE SHARE BUTTON */}
              <button 
                onClick={() => handleShare(selectedCard)}
                className="pointer-events-auto flex-1 min-w-[100px] bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 md:py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-zinc-950/50 text-xs sm:text-sm md:text-base border border-zinc-700"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">{t.share}</span>
              </button>
              
              {/* 🌟 PRIMARY CUSTOM BUTTON */}
              {selectedCard.buttonLink && !(selectedCard as any).isAracmeItem && (
                <a 
                  href={selectedCard.buttonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleMediaClick(e, selectedCard.buttonLink)}
                  className="pointer-events-auto flex-1 min-w-[120px] bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 md:py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-cyan-900/20 text-xs sm:text-sm md:text-base whitespace-nowrap px-2"
                >
                  <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                  {selectedCard.buttonText || t.bookNow}
                </a>
              )}

              {/* 🌟 SECONDARY CUSTOM BUTTON (NEW) */}
              {selectedCard.button2Link && !(selectedCard as any).isAracmeItem && (
                <a 
                  href={selectedCard.button2Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleMediaClick(e, selectedCard.button2Link)}
                  // Using green here so it defaults perfectly as a WhatsApp CTA, but you can change it!
                  className="pointer-events-auto flex-1 min-w-[120px] bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 md:py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-900/20 text-xs sm:text-sm md:text-base whitespace-nowrap px-2"
                >
                  <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
                  {selectedCard.button2Text || t.contactUs}
                </a>
              )}

            </div>
            
          </div>
        </div>
      )}

      {/* --- FULLSCREEN MEDIA MODAL --- */}
      {activeMediaUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 md:p-10">
          <button 
            onClick={() => setActiveMediaUrl(null)}
            className="absolute top-6 right-6 z-[210] bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="w-full h-full max-w-6xl flex items-center justify-center">
            <iframe 
              src={getEmbedUrl(activeMediaUrl)} 
              className="w-full h-full rounded-2xl border border-white/10 shadow-2xl"
              allow="autoplay; encrypted-media" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}