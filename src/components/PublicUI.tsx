import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Service, Location, Panel, Collaborator, Vendor, AppSettings, handleFirestoreError, OperationType } from '../types';
import { Play, Info, ChevronRight, X, ChevronLeft, Calendar, Tag, FileText, CheckCircle2, Search, Sparkles, MapPin, Navigation, MessageCircle, Phone } from 'lucide-react';
import Fuse from 'fuse.js';
import { GoogleGenAI, Type } from '@google/genai';
import GoogleReviews from './GoogleReviews';
import SEO from './SEO';

const ServiceCarouselRow = ({ title, services, onSelect }: { title: string, services: Service[], onSelect: (s: Service) => void, key?: string | number }) => {
  if (!services || services.length === 0) return null;
  return (
    <div className="mb-8 md:mb-12">
      <h2 className="text-xl md:text-2xl font-bold px-4 md:px-12 mb-2 md:mb-4 flex items-center gap-2 group cursor-pointer">
        {title}
        <ChevronRight className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </h2>
      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-4 md:px-12 gap-2 md:gap-4 pb-4">
        {services.map(service => {
          const displayImage = service.imageUrls?.[0] || service.imageUrl;
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
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">No Image</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
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
    </div>
  );
};

const formatPhoneNumber = (phone: string) => {
  let cleaned = phone.replace(/\D/g, ''); // Remove all non-digits
  if (cleaned.startsWith('0')) { cleaned = '60' + cleaned.substring(1); }
  if (!cleaned.startsWith('60')) { cleaned = '60' + cleaned; }
  return cleaned;
};

export default function PublicUI() {
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ vendorSubheading: '', carouselOrder: ['services', 'teamAra', 'vendors', 'panels'] });
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [heroIndex, setHeroIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [bookingModalService, setBookingModalService] = useState<Service | null>(null);
  const [leadData, setLeadData] = useState({ name: '', phone: '', locationId: '', locationPhone: '' });

  useEffect(() => {
    const qServices = query(collection(db, 'services'));
    const unsubscribeServices = onSnapshot(qServices, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];
      
      // Sort in memory to handle documents without rankOrder
      const sortedServices = [...servicesData].sort((a, b) => (a.rankOrder || 0) - (b.rankOrder || 0));
      setServices(sortedServices);
      setLoading(false);
    }, (error) => {
      console.error("Services Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'services', auth);
    });

    const qLocations = query(collection(db, 'locations'));
    const unsubscribeLocations = onSnapshot(qLocations, (snapshot) => {
      const locData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Location[];
      
      setLocations(locData);
    }, (error) => {
      console.error("Locations Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'locations', auth);
    });

    const qPanels = query(collection(db, 'panels'), orderBy('name'));
    const unsubscribePanels = onSnapshot(qPanels, (snapshot) => {
      const panelData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Panel[];
      
      setPanels(panelData);
    }, (error) => {
      console.error("Panels Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'panels', auth);
    });

    const qCollaborators = query(collection(db, 'collaborators'));
    const unsubscribeCollaborators = onSnapshot(qCollaborators, (snapshot) => {
      const collabData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Collaborator[];
      
      setCollaborators(collabData);
    }, (error) => {
      console.error("Collaborators Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'collaborators', auth);
    });

    const qVendors = query(collection(db, 'vendors'));
    const unsubscribeVendors = onSnapshot(qVendors, (snapshot) => {
      const vendorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vendor[];
      
      setVendors(vendorData);
    }, (error) => {
      console.error("Vendors Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'vendors', auth);
    });

    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'homepage'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setSettings({
          vendorSubheading: data.vendorSubheading || '',
          carouselOrder: data.carouselOrder || ['services', 'teamAra', 'vendors', 'panels']
        });
      }
    }, (error) => {
      console.error("Settings Fetch Error:", error);
      handleFirestoreError(error, OperationType.GET, 'settings/homepage', auth);
    });

    return () => {
      unsubscribeServices();
      unsubscribeLocations();
      unsubscribePanels();
      unsubscribeCollaborators();
      unsubscribeVendors();
      unsubscribeSettings();
    };
  }, []);

  const uniqueCategories = Array.from(new Set((services || []).map(s => s.category).filter(Boolean)));
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
    setModalImageIndex(0);
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
    const message = encodeURIComponent(`Hi I'm ${leadData.name}, I would like to book a slot for ${bookingModalService.title}.`);
    const waUrl = `https://wa.me/${formattedClinicPhone}?text=${message}`;

    window.open(waUrl, '_blank');

    setBookingModalService(null);
    setSelectedService(null);
    setLeadData({ name: '', phone: '', locationId: '', locationPhone: '' });
  };

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

  const nextModalImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedService) return;
    const urls = selectedService.imageUrls || (selectedService.imageUrl ? [selectedService.imageUrl] : []);
    setModalImageIndex(prev => (prev + 1) % urls.length);
  };

  const prevModalImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedService) return;
    const urls = selectedService.imageUrls || (selectedService.imageUrl ? [selectedService.imageUrl] : []);
    setModalImageIndex(prev => (prev - 1 + urls.length) % urls.length);
  };

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
        description="Top-rated 24-hour medical clinic in Selangor. View our latest services and packages."
      />
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-md px-4 md:px-12 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-8">
          <div className="text-red-600 text-2xl md:text-3xl font-bold tracking-tighter">KLINIK ARA</div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
            <a href="#" className="text-white font-semibold">Home</a>
            <a href="#services" className="hover:text-white transition">Services</a>
            <a href="#locations" className="hover:text-white transition">Locations</a>
          </div>
        </div>
        <a href="/admin" className="text-sm font-medium text-zinc-300 hover:text-white transition hidden sm:block">Admin Login</a>
      </nav>

      <main>
        {/* Hero Banner */}
        <section className="relative h-[70vh] md:h-[85vh] w-full transition-all duration-1000 ease-in-out">
          <div className="absolute inset-0">
            <img 
              key={heroImage}
              src={heroImage} 
              alt={currentHero?.title ? `${currentHero.title} - Klinik Ara 24 Jam` : "Klinik Ara 24 Jam Hero Banner"} 
              className="w-full h-full object-cover animate-fade-in"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          </div>
          
          <div className="absolute bottom-[15%] left-4 md:left-12 max-w-2xl z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-600 font-bold tracking-widest text-sm drop-shadow-md">
                {(currentHero?.category || defaultHero.category).toUpperCase()}
              </span>
              {currentHero?.isFeatured && (
                <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">FEATURED</span>
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
                  View Details
                </button>
              ) : (
                <a 
                  href="/admin"
                  className="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded md:rounded-md font-bold flex items-center gap-2 hover:bg-white/90 transition"
                >
                  Get Started (Admin)
                </a>
              )}
              <a 
                href="https://wa.me/60182194392"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-500/50 text-white px-6 md:px-8 py-2 md:py-3 rounded md:rounded-md font-bold flex items-center gap-2 hover:bg-zinc-500/70 transition backdrop-blur-sm"
              >
                <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
                Contact Us
              </a>
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
              placeholder="Type here, and we will get you the service you look for" 
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
            ✨ Ask AI
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
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">No Image</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
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
                        key={String(category)} 
                        title={String(category)} 
                        services={categoryServices as Service[]} 
                        onSelect={handleOpenModal}
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
                <section key="teamAra" className="mb-12 md:mb-16 pt-8 border-t border-zinc-800/50 px-4 md:px-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Keluarga TeamAra</h2>
                  <p className="text-sm text-gray-400 mb-6">Keluarga TeamAra ialah entiti atau organisasi yang ahli/murid/pekerjanya dapat menikmati manfaat TeamAra secara automatik</p>
                  <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:gap-6 pb-6 hide-scrollbar">
                    {collaborators.map(collab => (
                      <div key={collab.id} className="w-[280px] sm:w-[300px] flex-shrink-0 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden snap-center group">
                        <div className="h-48 w-full overflow-hidden bg-zinc-800">
                          <img 
                            src={collab.imageUrl} 
                            alt={`${collab.name} - TeamAra Collaborator`} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            referrerPolicy="no-referrer"
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
                  </div>
                </section>
              ) : null;
            }
            if (section === 'vendors') {
              return vendors.length > 0 ? (
                <section key="vendors" className="mb-12 md:mb-16 pt-8 border-t border-zinc-800/50 px-4 md:px-12">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Vendor TeamAra</h2>
                  {settings.vendorSubheading && (
                    <p className="text-sm text-gray-400 mb-6">{settings.vendorSubheading}</p>
                  )}
                  <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:gap-6 pb-6 hide-scrollbar">
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
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            referrerPolicy="no-referrer"
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
                  </div>
                </section>
              ) : null;
            }
            if (section === 'panels') {
              return panels.length > 0 ? (
                <div key="panels" className="mb-12 md:mb-16 pt-8 border-t border-zinc-800/50 px-4 md:px-12 max-w-7xl mx-auto w-full">
                  <div className="max-w-4xl mx-auto mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Panels</h2>
                    <p className="text-sm text-gray-400">Klik untuk lihat ketersediaan panel di cawangan Klinik Ara</p>
                  </div>
                  <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory">
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
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            }
            return null;
          })}

          {/* Google Reviews Section */}
          <GoogleReviews />

          {/* Locations Section */}
          <section id="locations" className="mb-12 md:mb-16 pt-8 border-t border-zinc-800/50 px-4 md:px-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Our Locations</h2>
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 hide-scrollbar">
              {locations?.length > 0 ? (
                locations?.map(loc => (
                  <div key={loc.id} className="w-[300px] sm:w-[320px] flex-shrink-0 flex flex-col bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden min-h-[450px] snap-center group">
                    {loc.imageUrl && (
                      <div className="h-52 w-full overflow-hidden">
                        <img 
                          src={loc.imageUrl} 
                          alt={`${loc.branchName} - Klinik Ara 24 Jam Branch`} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          referrerPolicy="no-referrer"
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
            </div>
          </section>
        </section>
      )}
    </main>

      <footer className="bg-zinc-950 border-t border-zinc-900 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} Klinik Ara 24 Jam. All rights reserved.
          </p>
          <Link to="/login" className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors">
            Staff Login
          </Link>
        </div>
      </footer>

      {/* Interactive Modal */}
      {selectedService && (
        <div 
          className="fixed inset-0 z-50 flex flex-col md:flex-row md:items-center md:justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6 transition-opacity"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-gray-900 w-full mt-auto md:mt-0 md:max-w-4xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] md:max-h-[85vh] relative shadow-2xl border-t md:border border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedService(null)}
              className="absolute top-4 right-4 z-50 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Side / Top: The Hero Image */}
            <div className="w-full h-64 md:h-auto md:w-1/2 flex-shrink-0 bg-gray-950 relative">
              {(() => {
                const urls = selectedService.imageUrls || (selectedService.imageUrl ? [selectedService.imageUrl] : []);
                if (urls.length === 0) return <div className="w-full h-full flex items-center justify-center text-zinc-600">No Image</div>;
                
                return (
                  <>
                    <img 
                      src={urls[modalImageIndex]} 
                      alt={selectedService.title} 
                      className="w-full h-full object-cover object-top"
                      style={{ imageRendering: 'high-quality', WebkitFontSmoothing: 'antialiased' }}
                      referrerPolicy="no-referrer"
                    />
                    {urls.length > 1 && (
                      <>
                        <button onClick={prevModalImage} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors">
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button onClick={nextModalImage} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors">
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                          {urls.map((_, i) => (
                            <div key={i} className={`w-2 h-2 rounded-full ${i === modalImageIndex ? 'bg-white' : 'bg-white/30'}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Right Side / Bottom: The Content Area */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col hide-scrollbar">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold tracking-wider rounded-md border border-zinc-700">
                  {selectedService.category.toUpperCase()}
                </span>
                {(selectedService.startDate || selectedService.endDate) && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-400/10 px-3 py-1 rounded-md border border-amber-400/20">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedService.startDate ? new Date(selectedService.startDate).toLocaleDateString() : 'Now'} 
                    {' - '} 
                    {selectedService.endDate ? new Date(selectedService.endDate).toLocaleDateString() : 'Ongoing'}
                  </span>
                )}
              </div>

              <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                {selectedService.title}
              </h2>

              <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700 mt-6 flex flex-wrap items-baseline gap-4">
                {selectedService.teamAraPrice ? (
                  <>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">TeamAra Price</span>
                      <span className="text-4xl font-black text-green-400">RM{selectedService.teamAraPrice}</span>
                    </div>
                    {selectedService.price && (
                      <div className="flex flex-col ml-4">
                        <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Regular Price</span>
                        <span className="text-xl font-bold text-zinc-500 line-through decoration-red-500/50 decoration-2">RM{selectedService.price}</span>
                      </div>
                    )}
                  </>
                ) : selectedService.price ? (
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1">Price</span>
                    <span className="text-4xl font-black text-white">RM{selectedService.price}</span>
                  </div>
                ) : (
                  <span className="text-xl font-medium text-zinc-400">Price available upon request</span>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                Harga TeamAra hanya untuk ahli TeamAra sahaja. Keahlian TeamAra boleh dilakukan di klinik secara percuma, harga TeamAra boleh digunakan secara terus selepas pendaftaran ahli dibuat.
              </p>

              <div className="flex-grow">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider mt-8 mb-3">
                  <FileText className="w-4 h-4" /> Description
                </h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                  {selectedService.description || "No detailed description provided for this service."}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-800">
                <button 
                  onClick={() => setBookingModalService(selectedService)}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 md:py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-green-900/20 mb-3"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Proceed booking
                </button>
                <button 
                  onClick={() => setSelectedService(null)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 md:py-4 rounded-xl font-bold transition-all"
                >
                  Close / Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Panel Details Modal */}
      {selectedPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 relative border border-gray-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setSelectedPanel(null)}
              className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-4 shadow-xl mb-4">
                <img 
                  src={selectedPanel.imageUrl} 
                  alt={selectedPanel.name} 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <h2 className="text-xl font-bold text-center text-white mt-4">{selectedPanel.name}</h2>
              <p className="text-sm text-gray-400 text-center mt-2 mb-4">Accepted at these branches:</p>

              <div className="w-full space-y-2">
                {selectedPanel.availableLocations.map((loc, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg text-white font-medium">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{loc}</span>
                  </div>
                ))}
                {selectedPanel.availableLocations.length === 0 && (
                  <p className="text-center text-gray-500 italic py-4">No locations listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {selectedVendor && (
        <div 
          className="fixed inset-0 z-50 flex flex-col md:flex-row md:items-center md:justify-center bg-black/80 backdrop-blur-sm p-0 md:p-6 transition-opacity"
          onClick={() => setSelectedVendor(null)}
        >
          <div 
            className="bg-gray-900 w-full mt-auto md:mt-0 md:max-w-4xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] md:max-h-[85vh] relative shadow-2xl border-t md:border border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedVendor(null)}
              className="absolute top-4 right-4 z-50 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left Side / Top: The Hero Image */}
            <div className="w-full h-64 md:h-auto md:w-1/2 flex-shrink-0 bg-gray-950 relative">
              {selectedVendor.imageUrl ? (
                <img 
                  src={selectedVendor.imageUrl} 
                  alt={selectedVendor.name} 
                  className="w-full h-full object-cover object-top"
                  style={{ imageRendering: 'high-quality', WebkitFontSmoothing: 'antialiased' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">No Image</div>
              )}
            </div>

            {/* Right Side / Bottom: The Content Area */}
            <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col hide-scrollbar">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-xs font-bold tracking-wider rounded-md border border-zinc-700">
                  VENDOR TEAMARA
                </span>
              </div>

              <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight mb-6">
                {selectedVendor.name}
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm md:text-base leading-relaxed">{selectedVendor.address}</p>
                </div>
                {selectedVendor.phone && (
                  <div className="flex items-center gap-3 text-gray-300">
                    <Phone className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <p className="text-sm md:text-base">{selectedVendor.phone}</p>
                  </div>
                )}
              </div>

              <div className="flex-grow">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
                  <Sparkles className="w-4 h-4" /> Perks & Description
                </h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                  {selectedVendor.perks || "No detailed description provided for this vendor."}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-800 space-y-3">
                {selectedVendor.phone && (
                  <a 
                    href={`https://wa.me/${formatPhoneNumber(selectedVendor.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 md:py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-green-900/20"
                  >
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp Vendor
                  </a>
                )}
                {selectedVendor.mapUrl && (
                  <a 
                    href={selectedVendor.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 md:py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-blue-900/20"
                  >
                    <MapPin className="w-5 h-5" />
                    Open in Google Maps
                  </a>
                )}
                <button 
                  onClick={() => setSelectedVendor(null)}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 md:py-4 rounded-xl font-bold transition-all"
                >
                  Close / Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Booking Modal */}
      {bookingModalService && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-gray-900 w-full max-w-md rounded-2xl p-6 border border-gray-800 relative">
            <button 
              onClick={() => setBookingModalService(null)}
              className="absolute top-4 right-4 z-50 bg-black/40 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-1">Proceed</h2>
            <p className="text-green-400 font-medium mb-6">{bookingModalService.title}</p>
            
            <form onSubmit={handleWhatsAppBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Select Branch</label>
                <select 
                  required
                  value={leadData.locationId}
                  onChange={(e) => {
                    const loc = locations.find(l => l.id === e.target.value);
                    setLeadData({
                      ...leadData,
                      locationId: e.target.value,
                      locationPhone: loc?.phone || ''
                    });
                  }}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                >
                  <option value="" disabled className="bg-gray-900 text-white">Select a branch...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id} className="bg-gray-900 text-white">{loc.branchName}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Your Name</label>
                <input 
                  type="text" 
                  required
                  value={leadData.name}
                  onChange={(e) => setLeadData({...leadData, name: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                  placeholder="e.g. Ali bin Abu"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  value={leadData.phone}
                  onChange={(e) => setLeadData({...leadData, phone: e.target.value})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all"
                  placeholder="e.g. 0123456789"
                />
              </div>
              
              <button 
                type="submit"
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl mt-4 flex justify-center items-center gap-2 transition-colors shadow-lg shadow-green-900/20"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Proceed
              </button>
              
              <p className="text-[10px] text-gray-500 text-center mt-3 leading-tight">
                By clicking continue, you agree to our terms and conditions, which include allowing Klinik Ara to save your phone number and granting us permission to contact you regarding your inquiry.
              </p>
            </form>
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
