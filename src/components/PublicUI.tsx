 import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Service, Location, Panel, Collaborator, Vendor, AppSettings, handleFirestoreError, OperationType, GoogleReview } from '../types';
import { Play, Info, ChevronRight, X, ChevronLeft, Calendar, Tag, FileText, CheckCircle2, Search, Sparkles, MapPin, Navigation, MessageCircle, Phone, Share2, Check, Lock, ExternalLink, Database, Users, CreditCard, Settings, Github, Star, GitFork, Code } from 'lucide-react';
import Fuse from 'fuse.js';
import { GoogleGenAI, Type } from '@google/genai';
import GoogleReviews from './GoogleReviews';
import SEO from './SEO';

const CarouselWrapper = ({ children }: { children: React.ReactNode }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth / 1.5 : current.offsetWidth / 1.5;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group">
      {/* Left Arrow (Hidden on mobile, shows on group hover on desktop) */}
      <button 
        onClick={() => scroll('left')}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-30 bg-black/50 hover:bg-black/80 backdrop-blur text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all border border-zinc-700 shadow-xl"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:gap-6 pb-6 hide-scrollbar scroll-smooth relative z-20"
      >
        {children}
      </div>

      {/* Right Arrow */}
      <button 
        onClick={() => scroll('right')}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-30 bg-black/50 hover:bg-black/80 backdrop-blur text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all border border-zinc-700 shadow-xl"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

const ServiceCarouselRow = ({ title, services, onSelect, subheading }: { title: string, services: Service[], onSelect: (s: Service) => void, key?: string | number, subheading?: string }) => {
  if (!services || services.length === 0) return null;
  return (
    <section className="mb-1 md:mb-2 pt-2 border-t border-zinc-800/50 px-4 md:px-12">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-1 flex items-center gap-2 group cursor-pointer">
        {title}
        <ChevronRight className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </h2>
      {subheading && <p className="text-sm text-gray-400 mb-6">{subheading}</p>}
      <CarouselWrapper>
        {services.map(service => {
          const displayImage = service.thumbnailUrl || service.imageUrls?.[0] || service.imageUrl;
          return (
            <div 
              key={service.id} 
              onClick={() => onSelect(service)}
              className="flex-none w-[140px] md:w-[240px] aspect-[2/3] snap-start relative group rounded-md overflow-hidden cursor-pointer transition-transform duration-300 md:hover:scale-105 md:hover:z-20"
            >
              {displayImage ? (
                <img 
                  src={displayImage} 
                  alt={`${service.title} Poster - Klinik Ara 24 Jam`} 
                  className="w-full h-full object-cover bg-zinc-900"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">No Image</div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                <h4 className="font-bold text-sm md:text-base mb-1 line-clamp-2">{service.title}</h4>
                <div className="flex items-center gap-2 text-xs font-medium">
                  {service.teamAraPrice ? (
                    <span className="text-green-500">RM{service.teamAraPrice}</span>
                  ) : (
                    <span className="text-green-500">Available</span>
                  )}
                  <span className="border border-zinc-600 px-1 text-zinc-300">24/7</span>
                </div>
              </div>
            </div>
          );
        })}
      </CarouselWrapper>
    </section>
  );
};

const formatPhoneNumber = (phone: string) => {
  let cleaned = phone.replace(/\D/g, ''); // Remove all non-digits
  if (cleaned.startsWith('0')) { cleaned = '60' + cleaned.substring(1); }
  if (!cleaned.startsWith('60')) { cleaned = '60' + cleaned; }
  return cleaned;
};

interface GithubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

export default function PublicUI() {
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ 
    vendorSubheading: '', 
    carouselOrder: ['services', 'teamAra', 'vendors', 'panels'],
    internalApps: []
  });
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [bookingModalService, setBookingModalService] = useState<Service | null>(null);
  const [leadData, setLeadData] = useState({ name: '', phone: '', locationId: '', locationPhone: '' });
  const [isCopied, setIsCopied] = useState(false);
  const [isSpecialAccessModalOpen, setIsSpecialAccessModalOpen] = useState(false);
  const [specialAccessPassword, setSpecialAccessPassword] = useState('');
  const [isSpecialAccessAuthenticated, setIsSpecialAccessAuthenticated] = useState(false);
  const [specialAccessError, setSpecialAccessError] = useState('');




  const handleSpecialAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (specialAccessPassword === 'TEAMARA1234') {
      setIsSpecialAccessAuthenticated(true);
      setSpecialAccessError('');
    } else {
      setSpecialAccessError('Kata laluan salah. Sila cuba lagi.');
    }
  };

  const getInferredIcon = (name: string, description: string) => {
    const text = (name + ' ' + description).toLowerCase();
    if (text.includes('stok') || text.includes('inventory') || text.includes('ubat') || text.includes('item') || text.includes('database')) return Database;
    if (text.includes('pesakit') || text.includes('patient') || text.includes('rekod') || text.includes('record') || text.includes('users')) return Users;
    if (text.includes('jadual') || text.includes('schedule') || text.includes('syif') || text.includes('shift') || text.includes('calendar')) return Calendar;
    if (text.includes('billing') || text.includes('bayaran') || text.includes('kewangan') || text.includes('finance') || text.includes('duit') || text.includes('credit-card')) return CreditCard;
    if (text.includes('laporan') || text.includes('report') || text.includes('file') || text.includes('dokumen') || text.includes('file-text')) return FileText;
    if (text.includes('admin') || text.includes('tetapan') || text.includes('setting')) return Settings;
    return Database;
  };
const handleShare = async (service: Service) => {
  // 1. Generate the specific link
  const shareUrl = `${window.location.origin}/share?service=${service.id}`;
  
  // 2. The warm sentence
  const warmSentence = `Jom lihat servis ini di Klinik Ara: ${service.title}`;
  
  // 3. The Combined Message (for the Clipboard/Desktop)
  const fullMessage = `${shareUrl}\n\n${warmSentence}`;

  // Try native mobile sharing first
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Klinik Ara 24 Jam - ${service.title}`,
        // FIX: We keep them separate but keep the URL in its own field.
        // WhatsApp is much more likely to show the BIG image this way.
        text: warmSentence,
        url: shareUrl,
      });
      return;
    } catch (error) {
      console.log('Error sharing via native share sheet', error);
    }
  }
  
  // Fallback for Desktop: Copy the FULL message (Link + Text)
  try {
    await navigator.clipboard.writeText(fullMessage);
    alert('Link and message copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy link', err);
  }
};

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);

      const fetchServices = async () => {
        try {
          const q = query(collection(db, 'services'));
          const snapshot = await getDocs(q);
          const servicesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Service[];
          
          const sortedServices = [...servicesData].sort((a, b) => (a.rankOrder || 0) - (b.rankOrder || 0));
          setServices(sortedServices);

          const urlParams = new URLSearchParams(window.location.search);
          const serviceIdFromUrl = urlParams.get('service');

          if (serviceIdFromUrl) {
            const serviceToOpen = sortedServices.find(s => s.id === serviceIdFromUrl);
            if (serviceToOpen) {
              setSelectedService(serviceToOpen);
              window.history.replaceState({}, '', window.location.pathname);
            }
          }
        } catch (error) {
          console.error("Failed to fetch services:", error);
        }
      };

      const fetchLocations = async () => {
        try {
          const q = query(collection(db, 'locations'));
          const snapshot = await getDocs(q);
          const locData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Location[];
          setLocations(locData);
        } catch (error) {
          console.error("Failed to fetch locations:", error);
        }
      };

      const fetchPanels = async () => {
        try {
          const q = query(collection(db, 'panels'));
          const snapshot = await getDocs(q);
          const panelData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Panel[];
          
          // Sort in memory to handle missing rankOrder fields without excluding them from the query
          const sortedPanels = panelData.sort((a, b) => (a.rankOrder ?? 9999) - (b.rankOrder ?? 9999));
          setPanels(sortedPanels);
        } catch (error) {
          console.error("Failed to fetch panels:", error);
        }
      };

      const fetchCollaborators = async () => {
        try {
          const q = query(collection(db, 'collaborators'));
          const snapshot = await getDocs(q);
          const collabData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Collaborator[];
          setCollaborators(collabData);
        } catch (error) {
          console.error("Failed to fetch collaborators:", error);
        }
      };

      const fetchVendors = async () => {
        try {
          const q = query(collection(db, 'vendors'));
          const snapshot = await getDocs(q);
          const vendorData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Vendor[];
          
          // Sort by name by default
          const sortedVendors = [...vendorData].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          setVendors(sortedVendors);
        } catch (error) {
          console.error("Failed to fetch vendors:", error);
        }
      };

      const fetchReviews = async () => {
        try {
          const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
          const snapshot = await getDocs(q);
          const reviewData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as GoogleReview[];
          setReviews(reviewData);
        } catch (error) {
          console.error("Failed to fetch reviews:", error);
        }
      };

      const fetchSettings = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'homepage'));
          if (docSnap.exists()) {
            const data = docSnap.data() as AppSettings;
            setSettings({
              ...data,
              vendorSubheading: data.vendorSubheading || '',
              carouselOrder: data.carouselOrder || ['services', 'teamAra', 'vendors', 'panels'],
              categorySubheadings: data.categorySubheadings || {},
              teamAraSub: data.teamAraSub || '',
              panelsSub: data.panelsSub || '',
              vendorsSub: data.vendorsSub || '',
              reviewsSub: data.reviewsSub || '',
              internalApps: data.internalApps || []
            });
          }
        } catch (error) {
          console.error("Failed to fetch settings:", error);
        }
      };

      await Promise.all([
        fetchServices(),
        fetchLocations(),
        fetchPanels(),
        fetchCollaborators(),
        fetchVendors(),
        fetchReviews(),
        fetchSettings()
      ]);

      setLoading(false);
    };

    loadAllData();
  }, []);

  const uniqueCategories = Array.from(new Set((services || []).map(s => s.category).filter(Boolean))) as string[];
  const featuredServices = (services || []).filter(s => s.isFeatured);

  // Initialize Fuse
  const fuse = new Fuse(services || [], {
    keys: ['title', 'category', 'description'],
    threshold: 0.3,
  });

  const searchResults = aiResults.length > 0 
    ? (services || []).filter(s => aiResults.includes(s.id))
    : searchQuery ? fuse.search(searchQuery).map(result => result.item) : [];

  const handleAskAI = async () => {
    if (!searchQuery) return;
    setIsAiSearching(true);
    setAiResults([]);
    
    try {
      // Prioritize a custom key to bypass the platform's restrictive Secrets UI
      const apiKey = import.meta.env.VITE_CUSTOM_API_KEY || process.env.GEMINI_API_KEY;
        
      if (!apiKey || apiKey === 'undefined') {
        throw new Error("API Key is missing. Please add VITE_CUSTOM_API_KEY to your Secrets panel.");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const simplifiedServices = (services || []).map(s => ({ id: s.id, title: s.title, description: s.description }));
      
      const prompt = `You are a medical triage assistant. Patient says: '${searchQuery}'. Review this list of services: ${JSON.stringify(simplifiedServices)}. Return a JSON array containing ONLY the string IDs of the top 1 to 4 most relevant services.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            }
          }
        }
      });
      
      const text = response.text || "[]";
      // Clean up potential markdown formatting if the model still includes it
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const ids = JSON.parse(cleanedText);
      
      if (Array.isArray(ids)) {
        setAiResults(ids);
      }
    } catch (error) {
      console.error("AI Search Error:", error);
      alert(`Failed to perform AI search: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAiSearching(false);
    }
  };

  // Auto-playing hero section
  useEffect(() => {
    if (featuredServices.length <= 1) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % featuredServices.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredServices.length]);

  const handleOpenModal = (service: Service) => {
    setSelectedService(service);
  };

  const handleCloseModal = () => {
    setSelectedService(null);
  };

  const handleWhatsAppBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingModalService || !leadData.locationId || !leadData.name || !leadData.phone) return;

    const formattedUserPhone = formatPhoneNumber(leadData.phone);
    
    try {
      await addDoc(collection(db, 'leads'), {
        name: leadData.name,
        phone: formattedUserPhone,
        branchId: leadData.locationId,
        service: bookingModalService.title,
        timestamp: new Date(),
        status: 'new'
      });
    } catch (error) {
      console.error("Error saving lead:", error);
      // Continue to WhatsApp anyway
    }

    const formattedClinicPhone = formatPhoneNumber(leadData.locationPhone);
    const message = encodeURIComponent(`Hai, nama saya ${leadData.name}. Saya berminat dengan ${bookingModalService.title}.`);
    const waUrl = `https://wa.me/${formattedClinicPhone}?text=${message}`;

    window.open(waUrl, '_blank');

    setBookingModalService(null);
    setSelectedService(null);
    setLeadData({ name: '', phone: '', locationId: '', locationPhone: '' });
  };

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedService]);

  useEffect(() => {
    if (selectedService || bookingModalService) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedService, bookingModalService]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const currentHero = featuredServices[heroIndex] || (services || [])[0];
  const hasContent = (services || []).length > 0;
  
  const defaultHero = {
    title: "Your Health, Our Priority",
    description: "Welcome to Klinik Ara 24 Jam. We provide comprehensive healthcare services for you and your family, available around the clock.",
    category: "Welcome",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop"
  };

  const heroImage = currentHero?.heroImageUrl || currentHero?.imageUrls?.[0] || currentHero?.imageUrl || defaultHero.image;

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden font-sans">
      <SEO 
        title="Klinik Ara 24 Jam"
        description="Selamat datang ke laman sesawang Klinik Ara 24 Jam, Ayuh sertai TeamAra untuk menikmati pelbagai manfaat."
      />
     {/* Navbar */}
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-gradient-to-b from-black/90 via-black/40 to-transparent px-4 md:px-12 pt-4 pb-8 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-8 pointer-events-auto">
          <a 
            href="/" 
            onClick={(e) => {
              if (window.location.pathname === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="text-white text-2xl md:text-3xl font-bold tracking-tighter hover:opacity-80 transition-opacity cursor-pointer flex items-center gap-3"
          >
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/new-website-7b8dd.firebasestorage.app/o/Light%20Logo%20HSO%20.png?alt=media&token=af618257-921e-42c6-9197-daf5b513fcd4" 
              alt="Logo Klinik Ara" 
              className="h-16 md:h-16 w-auto object-contain"
            />
            KLINIK ARA 24 JAM
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
            <a href="#" className="text-white font-semibold hover:text-white transition">Laman Utama</a>
            <a href="#services" className="hover:text-white transition">Perkhidmatan</a>
            <a href="#locations" className="hover:text-white transition">Cawangan</a>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Banner */}
        <section className="relative h-[70vh] md:h-[85vh] w-full transition-all duration-1000 ease-in-out">
          <div className="absolute inset-0 bg-zinc-950">
            <img 
              key={heroImage}
              src={heroImage} 
              alt={currentHero?.title ? `${currentHero.title} - Klinik Ara 24 Jam` : "Klinik Ara 24 Jam Hero Banner"} 
              className="w-full h-full object-cover animate-fade-in"
              referrerPolicy="no-referrer"
            />
            {/* Gradient overlays restricted to bottom and left for text readability */}
            <div className="absolute inset-y-0 left-0 w-full md:w-2/3 bg-gradient-to-r from-zinc-950/90 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950/90 to-transparent" />
          </div>
          
          <div className="absolute bottom-[15%] left-4 md:left-12 max-w-2xl z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-600 font-bold tracking-widest text-sm drop-shadow-md">
                {(currentHero?.category || defaultHero.category).toUpperCase()}
              </span>
              {currentHero?.isFeatured && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PILIHAN UTAMA</span>
              )}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight drop-shadow-lg">
              {currentHero?.title || defaultHero.title}
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 mb-8 max-w-xl drop-shadow-md line-clamp-3">
              {currentHero?.description || defaultHero.description}
            </p>
            <div className="flex items-center gap-4">
              {currentHero ? (
                <button 
                  onClick={() => handleOpenModal(currentHero)}
                  className="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded md:rounded-md font-bold flex items-center gap-2 hover:bg-white/90 transition"
                >
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-black" />
                  Baca Lanjut
                </button>
              ) : (
                <a 
                  href="/admin"
                  className="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded md:rounded-md font-bold flex items-center gap-2 hover:bg-white/90 transition"
                >
                  Get Started (Admin)
                </a>
              )}
            </div>
          </div>
        </section>

      {/* Floating Search Bar */}
      <div className="-mt-8 relative z-20 mx-auto max-w-4xl px-4 w-full">
        <div className="bg-zinc-900 rounded-2xl p-2 shadow-2xl border border-zinc-800 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Tanya kami" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setAiResults([]); // Clear AI results when typing
              }}
              className="w-full bg-transparent text-white text-sm sm:text-base rounded-xl pl-12 pr-4 py-4 focus:outline-none placeholder:text-zinc-500"
            />
          </div>
          <button 
            onClick={handleAskAI}
            disabled={!searchQuery || isAiSearching}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Sparkles className="w-5 h-5" />
            TeamAra jawab
          </button>
        </div>
      </div>

      {isAiSearching ? (
        <section className="pt-16 pb-20 min-h-[40vh] flex flex-col items-center justify-center text-zinc-400">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-xl animate-pulse">AI is analyzing your symptoms...</p>
        </section>
      ) : searchQuery || aiResults.length > 0 ? (
        <section className="pt-16 px-4 md:px-12 pb-20 min-h-[40vh]">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            {aiResults.length > 0 ? "AI Recommendations" : `Search Results for "${searchQuery}"`}
          </h2>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchResults.map(service => {
                const displayImage = service.imageUrls?.[0] || service.imageUrl;
                return (
                  <div 
                    key={service.id} 
                    onClick={() => handleOpenModal(service)}
                    className="aspect-[2/3] relative group rounded-md overflow-hidden cursor-pointer transition-transform duration-300 md:hover:scale-105 md:hover:z-20"
                  >
                    {displayImage ? (
                      <img 
                        src={displayImage} 
                        alt={`${service.title} - Klinik Ara 24 Jam Service`} 
                        className="w-full h-full object-contain bg-zinc-900"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">No Image</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                      <h4 className="font-bold text-sm md:text-base mb-1 line-clamp-2">{service.title}</h4>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        {service.teamAraPrice ? (
                          <span className="text-green-500">RM{service.teamAraPrice}</span>
                        ) : (
                          <span className="text-green-500">Available</span>
                        )}
                        <span className="border border-zinc-600 px-1 text-zinc-300">24/7</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-zinc-400 mt-12 text-center">
              <p className="text-xl">No services found matching your search.</p>
              <p className="mt-2">Try adjusting your keywords.</p>
            </div>
          )}
        </section>
      ) : (
        <section id="services" className="pt-16 pb-20 relative z-10">
          {settings.carouselOrder.map(section => {
            if (section === 'services') {
              return (
                <div key="services">
                  {hasContent ? uniqueCategories.map(category => {
                    const categoryServices = (services || []).filter(s => s.category === category);
                    return (
                      <ServiceCarouselRow 
                        key={category} 
                        title={category} 
                        services={categoryServices as Service[]} 
                        onSelect={handleOpenModal}
                        subheading={settings?.categorySubheadings?.[category] || ""}
                      />
                    );
                  }) : (
                    <div className="px-4 md:px-12 py-12 text-center">
                      <div className="bg-zinc-900/50 rounded-2xl p-12 border border-zinc-800 border-dashed max-w-2xl mx-auto">
                        <Sparkles className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Services Added Yet</h3>
                        <p className="text-zinc-500 mb-6">Log in to the Admin panel to start adding your clinic's services and promotions.</p>
                        <a href="/admin" className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-bold transition inline-block">
                          Go to Admin Panel
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            if (section === 'teamAra') {
              return collaborators.length > 0 ? (
                <section key="teamAra" className="mb-4 md:mb-6 pt-6 border-t border-zinc-800/50 px-4 md:px-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Keluarga TeamAra</h2>
                  <p className="text-sm text-gray-400 mb-6">{settings?.teamAraSub || 'Pelan kesihatan eksklusif untuk keluarga anda'}</p>
                 <CarouselWrapper>
                    {collaborators.map(collab => (
                      <div key={collab.id} className="w-[280px] sm:w-[300px] flex-shrink-0 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden snap-center group">
                        <div className="h-48 w-full overflow-hidden bg-zinc-800">
                          <img 
                            src={collab.imageUrl} 
                            alt={`${collab.name} - TeamAra Collaborator`} 
                            // CHANGED: object-contain to object-cover
                            className="w-full h-full object-cover bg-zinc-900 transition-transform duration-500 group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h4 className="text-lg font-bold text-white mb-2">{collab.name}</h4>
                          <div className="flex items-start gap-2 text-sm text-zinc-400 mt-auto">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="line-clamp-2">{collab.location}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CarouselWrapper>
                </section>
              ) : null;
            }
            if (section === 'vendors') {
              return vendors.length > 0 ? (
                <section key="vendors" className="mb-4 md:mb-6 pt-6 border-t border-zinc-800/50 px-4 md:px-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Rakan Vendor</h2>
                  <p className="text-sm text-gray-400 mb-6">{settings?.vendorsSub || settings?.vendorSubheading || 'Entiti perniagaan yang memberi keistimewaan kepada ahli TeamAra'}</p>
                  <CarouselWrapper>
                    {vendors.map(vendor => (
                      <div 
                        key={vendor.id} 
                        onClick={() => setSelectedVendor(vendor)}
                        className="w-[280px] sm:w-[300px] flex-shrink-0 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden snap-center group cursor-pointer hover:border-zinc-700 transition-colors"
                      >
                        <div className="h-48 w-full overflow-hidden bg-zinc-800">
                          <img 
                            src={vendor.imageUrl} 
                            alt={`${vendor.name} - Vendor TeamAra`} 
                            // CHANGED: object-contain to object-cover to completely fill the box
                            className="w-full h-full object-cover bg-zinc-900 transition-transform duration-500 group-hover:scale-110" 
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h4 className="text-lg font-bold text-white mb-2">{vendor.name}</h4>
                          <div className="flex items-start gap-2 text-sm text-zinc-400 mt-auto">
                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p className="line-clamp-2">{vendor.address}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CarouselWrapper>
                </section>
              ) : null;
            }
            if (section === 'panels') {
              return panels.length > 0 ? (
                <section key="panels" className="mb-12 md:mb-16 pt-8 border-t border-zinc-800/50 px-4 md:px-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Panel Kesihatan</h2>
                  <p className="text-sm text-gray-400 mb-6">{settings?.panelsSub || 'Klik untuk melihat cawangan'}</p>
                  <CarouselWrapper>
                    {panels.map((panel) => (
                      <div 
                        key={panel.id} 
                        onClick={() => setSelectedPanel(panel)}
                        className="bg-white rounded-xl h-24 w-32 flex items-center justify-center p-2 cursor-pointer hover:scale-105 transition-transform flex-shrink-0 snap-center shadow-lg border border-zinc-800"
                      >
                        <img 
                          src={panel.imageUrl} 
                          alt={`${panel.name} logo`} 
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </CarouselWrapper>
                </section>
              ) : null;
            }
            return null;
          })}

          {/* Google Reviews Section */}
          <GoogleReviews reviews={reviews} subheading={settings?.reviewsSub} />

          {/* Locations Section */}
          <section id="locations" className="mb-4 md:mb-6 pt-6 border-t border-zinc-800/50 px-4 md:px-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Cawangan Ara</h2>
            <CarouselWrapper>
              {locations?.length > 0 ? (
                locations?.map(loc => (
                  <div key={loc.id} className="w-[300px] sm:w-[320px] flex-shrink-0 flex flex-col bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden min-h-[450px] snap-center group">
                    {loc.imageUrl && (
                      <div className="h-52 w-full overflow-hidden bg-zinc-800">
  <img 
    src={loc.imageUrl} 
    alt={`${loc.branchName} - Klinik Ara 24 Jam Branch`} 
    // CHANGED: object-contain to object-cover
    className="w-full h-full object-cover bg-zinc-900 transition-transform duration-500 group-hover:scale-110" 
    referrerPolicy="no-referrer"
    loading="lazy"
  />
</div>
                    )}
                    <div className="flex-1 p-5 flex flex-col">
                      <h4 className="text-lg font-bold text-white mb-1">{loc.branchName}</h4>
                      <div className="inline-block bg-zinc-900 text-zinc-300 text-[10px] font-medium px-2 py-0.5 rounded border border-zinc-800 mb-3 w-fit">
                        {loc.operatingHours}
                      </div>
                      <p className="text-sm text-gray-400 line-clamp-3 mb-2">
                        {loc.address}
                      </p>
                      {loc.landmark && (
                        <p className="text-zinc-500 text-[10px] italic mb-4">
                          Remark: {loc.landmark}
                        </p>
                      )}
                      
                      <div className="mt-auto">
                        {loc.whatsapp && (
                          <a 
                            href={`https://wa.me/${loc.whatsapp.replace(/[^0-9]/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2 rounded-lg flex justify-center items-center mb-2 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            WhatsApp
                          </a>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {loc.googleMapsUrl && (
                            <a 
                              href={loc.googleMapsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg font-medium text-center flex items-center justify-center gap-2 transition-colors"
                            >
                              <MapPin className="w-4 h-4" />
                              Maps
                            </a>
                          )}
                          {loc.wazeUrl && (
                            <a 
                              href={loc.wazeUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg font-medium text-center flex items-center justify-center gap-2 transition-colors"
                            >
                              <Navigation className="w-4 h-4" />
                              Waze
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                  <p>Locations are currently being updated.</p>
                </div>
              )}
            </CarouselWrapper>
          </section>
        </section>
      )}

    
    </main>

      <footer className="bg-zinc-950 border-t border-zinc-900 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} Klinik Ara 24 Jam. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-4 md:gap-8">
            <button 
              onClick={() => setIsSpecialAccessModalOpen(true)}
              className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Special Access
            </button>
            <Link to="/login" className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
              Staff Login
            </Link>
          </div>
        </div>
      </footer>

 {/* Interactive Modal (Premium Mobile & Desktop Split Redesign - Dark Mode) */}
      {selectedService && (
        <div 
          className="fixed inset-0 z-50 flex flex-col md:flex-row md:items-center md:justify-center bg-zinc-950/90 backdrop-blur-sm p-0 md:p-6 overflow-hidden"
          onClick={handleCloseModal}
        >
          <div 
            className="w-full h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-5xl rounded-t-[32px] md:rounded-3xl overflow-hidden flex flex-col md:flex-row relative bg-zinc-950 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button (Sticky Top Right) */}
            <button 
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 z-[60] bg-zinc-800/80 hover:bg-zinc-700 md:bg-zinc-800 md:hover:bg-zinc-700 text-white p-2.5 rounded-full backdrop-blur-md transition-colors border border-zinc-700 md:border-zinc-700"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Unified Scroll Wrapper (Mobile) / Flex Container (Desktop) */}
            <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row relative hide-scrollbar">
              
              {/* Left Section: Portrait Image & Overlays */}
              <div className="relative w-full aspect-square md:aspect-auto md:w-1/2 shrink-0 group bg-zinc-950 overflow-hidden md:flex md:items-center">
                {(() => {
                  const carouselImages = selectedService 
                    ? [...(selectedService.modalImageUrls || []), ...(selectedService.imageUrls || []), selectedService.imageUrl].filter(Boolean) as string[]
                    : [];
                  if (carouselImages.length === 0) return <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900">No Image</div>;
                  
                  return (
                    <>
                      <img 
                        src={carouselImages[currentImageIndex]} 
                        className="hidden md:block absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-125 pointer-events-none z-0" 
                        referrerPolicy="no-referrer" 
                      />

                      <img 
                        src={carouselImages[currentImageIndex]} 
                        alt={`${selectedService.title} - Image ${currentImageIndex + 1}`}
                        className="w-full h-full md:h-auto md:max-h-[85vh] object-cover object-top md:object-contain block z-10 relative"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />

                      {/* Top Floating Controls */}
                      <div className="absolute top-4 inset-x-4 flex items-center justify-between z-50">
                        {/* Heart/Favorite Icon */}
                        <button className="bg-zinc-950/40 backdrop-blur-md p-2 rounded-full text-white/80 hover:text-white transition-all border border-white/10">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                        </button>
                      </div>

                      {/* Carousel Navigation */}
                      {carouselImages.length > 1 && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1)); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full z-50"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % carouselImages.length); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white p-1.5 rounded-full z-50"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>

                          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5 z-50">
                            {carouselImages.map((_, idx) => (
                              <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

            

              {/* Right Section: Details Panel & Desktop Footer */}
              {/* FIX: Changed overflow-hidden to md:overflow-hidden so it scrolls on mobile */}
              <div className="w-full md:w-1/2 bg-zinc-950 flex flex-col rounded-t-[32px] md:rounded-none -mt-8 md:mt-0 relative md:absolute md:right-0 md:top-0 md:bottom-0 z-30 border-l border-zinc-900/50 md:overflow-hidden">
                
                {/* Scrollable Content Area */}
                <div className="p-6 pb-32 md:p-10 md:pb-48 flex flex-col md:flex-1 md:overflow-y-auto hide-scrollbar">
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-white text-zinc-950 text-[10px] font-bold tracking-widest rounded-full uppercase">
                      {selectedService.category}
                    </span>
                    {(selectedService.startDate || selectedService.endDate) && (
                      <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-widest rounded-full uppercase flex items-center gap-1 border border-zinc-700">
                        <Calendar className="w-3 h-3" /> Valid Now
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-6">
                    {selectedService.title}
                  </h3>

                  {/* Pricing Card */}
                  <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 my-6 flex flex-wrap items-center gap-6">
                    {selectedService.teamAraPrice ? (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            TeamAra Price
                          </span>
                          <span className="text-4xl font-black text-green-400 tracking-tighter">RM{selectedService.teamAraPrice}</span>
                        </div>
                        {selectedService.price && (
                          <div className="flex flex-col border-l border-zinc-700 pl-6">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Regular Price</span>
                            <span className="text-xl font-bold text-zinc-500 line-through decoration-zinc-600">RM{selectedService.price}</span>
                          </div>
                        )}
                      </>
                    ) : selectedService.price ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Price</span>
                        <span className="text-4xl font-black text-white tracking-tighter">RM{selectedService.price}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-zinc-400">Price available upon request</span>
                    )}
                  </div>

                  {/* Optional Disclaimer Block (Keep if using the toggle feature we built earlier) */}
                  {selectedService.showTeamAraDisclaimer && (
                    <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
                      Harga TeamAra hanya untuk ahli TeamAra sahaja. Pendaftaran keahlian TeamAra boleh dilakukan di klinik secara percuma, harga TeamAra boleh dinikmati secara terus selepas pendaftaran keahlian dibuat.
                    </p>
                  )}

                  <div className="w-full h-px bg-zinc-800 mb-8"></div>

                  <div className="prose prose-sm md:prose-base prose-invert text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {selectedService.description || "No detailed description provided for this service."}
                  </div>
                </div>

                {/* Desktop Sticky Footer (Hidden on Mobile) */}
                <div className="hidden md:flex absolute bottom-0 left-0 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-20 pb-8 px-10 flex-col gap-3 z-50 pointer-events-none">
                  <button 
                    onClick={() => setBookingModalService(selectedService)}
                    className="pointer-events-auto w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 text-lg transition-transform active:scale-95"
                  >
                    Saya nak tempah slot
                  </button>
                  <button 
                    onClick={() => handleShare(selectedService)}
                    className="pointer-events-auto w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 text-lg transition-transform active:scale-95"
                  >
                    {isCopied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                    {isCopied ? "Telah Disalin!" : "Kongsi"}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Floating Action Footer (Hidden on Desktop) */}
            {/* Pure gradient fade without any hard blur lines or borders */}
            <div className="md:hidden absolute bottom-0 left-0 w-full bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent pt-20 pb-6 px-4 flex flex-row gap-3 z-50 pointer-events-none">
              <button 
                onClick={() => setBookingModalService(selectedService)}
                className="pointer-events-auto flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 text-sm sm:text-base transition-transform active:scale-95"
              >
                Saya nak tempah slot
              </button>
              <button 
                onClick={() => handleShare(selectedService)}
                className="pointer-events-auto shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 text-sm sm:text-base transition-transform active:scale-95"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {isCopied ? "Telah Disalin!" : "Kongsi"}
              </button>
            </div>

          </div>
        </div>
      )}
      {/* Vendor Details Modal */}
      {selectedVendor && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-6 overflow-hidden" 
          onClick={() => setSelectedVendor(null)}
        >
          <div 
            className="w-full h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-5xl rounded-t-[32px] md:rounded-3xl overflow-hidden flex flex-col md:flex-row relative bg-white shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button (Top Right, Sticky) */}
            <button 
              onClick={() => setSelectedVendor(null)}
              className="absolute top-4 right-4 z-[70] bg-black/40 hover:bg-black/60 md:bg-zinc-100 md:hover:bg-zinc-200 text-white md:text-zinc-600 p-2.5 rounded-full backdrop-blur-md transition-colors border border-white/20 md:border-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Unified Scroll Wrapper */}
            <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row relative hide-scrollbar pb-32 md:pb-0">
              
              {/* Left Panel: Image (Dynamic height on desktop, square on mobile) */}
              <div className="relative w-full aspect-square md:aspect-auto md:w-1/2 flex-shrink-0 bg-zinc-950 flex items-center overflow-hidden">
                <img 
                  src={selectedVendor.imageUrl} 
                  alt={selectedVendor.name} 
                  className="w-full h-full md:h-auto md:max-h-[85vh] object-cover object-top md:object-contain block z-10 relative"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Right Panel: Content (Scrollable on desktop, matches image height) */}
              <div className="w-full md:w-1/2 bg-white flex flex-col min-h-0 relative z-30 rounded-t-[32px] md:rounded-none -mt-8 md:mt-0">
                <div className="flex-1 md:overflow-y-auto p-6 md:p-10 pb-48 md:pb-32 flex flex-col hide-scrollbar">
                  
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-zinc-900 text-white text-[10px] font-bold tracking-widest rounded-full uppercase">
                      Rakan Vendor
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 leading-tight mb-6">
                    {selectedVendor.name}
                  </h2>

                  <div className="flex items-start gap-3 text-zinc-600 mb-6">
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5 text-cyan-600" />
                    <p className="text-sm md:text-base leading-relaxed">{selectedVendor.address}</p>
                  </div>

                  {/* Perks Card */}
                  <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Kelebihan TeamAra</span>
                    </div>
                    <p className="text-zinc-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                      {selectedVendor.perks}
                    </p>
                  </div>

                </div>
              </div>
            </div>

            {/* Floating Action Footer (Sticky Bottom, side-by-side buttons) */}
            <div className="absolute bottom-0 left-0 w-full md:w-1/2 md:left-1/2 bg-gradient-to-t from-white via-white/95 to-white/0 md:bg-white/95 md:backdrop-blur-md md:border-t md:border-zinc-100 pt-12 md:pt-5 pb-6 md:pb-5 px-6 flex flex-row gap-3 z-50 pointer-events-none md:pointer-events-auto">
              {selectedVendor.mapUrl && (
                <a 
                  href={selectedVendor.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-zinc-900/20 text-sm md:text-base"
                >
                  <MapPin className="w-5 h-5" />
                  Lokasi
                </a>
              )}
              
              {selectedVendor.phone && (
                <a 
                  href={`https://wa.me/${selectedVendor.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-900/20 text-sm md:text-base"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* Panel Details Modal */}
      {selectedPanel && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setSelectedPanel(null)}>
          <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-800 relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedPanel(null)}
              className="absolute top-4 right-4 z-50 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-white p-4 rounded-xl mb-4 w-32 h-24 flex items-center justify-center">
                <img 
                  src={selectedPanel.imageUrl} 
                  alt={selectedPanel.name} 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{selectedPanel.name}</h2>
              <p className="text-zinc-400 text-sm">Cawangan Tersedia</p>
            </div>

            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 hide-scrollbar">
              {selectedPanel.availableLocations && selectedPanel.availableLocations.length > 0 ? (
                selectedPanel.availableLocations.map((loc, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-zinc-200 font-medium">{loc}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  Tiada maklumat cawangan tersedia.
                </div>
              )}
            </div>

            <button 
              onClick={() => setSelectedPanel(null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl mt-6 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      
      {/* Special Access Modal */}
      {isSpecialAccessModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-zinc-900 w-full max-w-2xl rounded-3xl p-8 border border-zinc-800 relative shadow-2xl overflow-hidden">
            <button 
              onClick={() => {
                setIsSpecialAccessModalOpen(false);
                setIsSpecialAccessAuthenticated(false);
                setSpecialAccessPassword('');
                setSpecialAccessError('');
              }}
              className="absolute top-6 right-6 z-50 bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {!isSpecialAccessAuthenticated ? (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Special Access</h2>
                <p className="text-zinc-400 mb-8">Sila masukkan kata laluan untuk mengakses aplikasi dalaman.</p>
                
                <form onSubmit={handleSpecialAccessSubmit} className="max-w-xs mx-auto space-y-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      required
                      autoFocus
                      value={specialAccessPassword}
                      onChange={(e) => setSpecialAccessPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-white text-center text-xl tracking-widest focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  {specialAccessError && (
                    <p className="text-red-500 text-sm font-medium">{specialAccessError}</p>
                  )}
                  <button 
                    type="submit"
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-200 transition-colors shadow-lg"
                  >
                    Masuk
                  </button>
                </form>
              </div>
            ) : (
              <div className="py-4">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Internal Applications</h2>
                    <p className="text-zinc-400 text-sm">Welcome, TeamAra. Kindly select Ara application to continue.</p>
                  </div>
                </div>

               {/* Scrollable Wrapper Added Here */}
                <div className="overflow-y-auto max-h-[60vh] pr-2 pb-4 hide-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(settings.internalApps || []).map((app, idx) => {
                      const Icon = getInferredIcon(app.name, app.description);
                      return (
                        <a 
                          key={idx}
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group p-5 bg-zinc-950 border border-zinc-800 rounded-2xl hover:border-cyan-500/50 hover:bg-zinc-900/50 transition-all flex items-start gap-4"
                        >
                          <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/10 transition-colors">
                            <Icon className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">{app.name}</h3>
                              <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400" />
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed">{app.description}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>

                <p className="text-center text-[10px] text-zinc-600 mt-8">
                  This access is monitored for security purposes. Please log out when finished.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 1s ease-in-out;
        }
      `}</style>
    </div>
  );
}
