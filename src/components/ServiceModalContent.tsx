import React, { useContext, useEffect, useState } from 'react';
import { Calendar, Check, ChevronLeft, ChevronRight, MessageCircle, Share2, X } from 'lucide-react';
import { Service, Location } from '../types';
import { appendCacheBuster, formatPhoneNumber, shareService } from '../utils';
import { AffiliateContext } from '../App';

interface ServiceModalContentProps {
  service: Service;
  locations: Location[];
  onClose: () => void;
}

const ServiceModalContent: React.FC<ServiceModalContentProps> = ({ service, locations, onClose }) => {
  const { affiliateRef, clearAffiliateRef } = useContext(AffiliateContext);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBranchSelect, setShowBranchSelect] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setCurrentImageIndex(0);
    setShowBranchSelect(false);
  }, [service.id]);

  const handleBookNow = (e: React.MouseEvent) => {
    e.preventDefault();

    const lsRef = typeof window !== 'undefined' ? localStorage.getItem('ara_affiliate_code') : null;
    const urlRef = new URLSearchParams(window.location.search).get('ref');
    const finalRef = affiliateRef || lsRef || urlRef;

    let outboundUrl = `https://arapower.hsohealthcare.com/?serviceId=${service.id}`;
    outboundUrl += `&serviceName=${encodeURIComponent(service.title || '')}`;
    outboundUrl += `&serviceCode=${service.id}`;

    if (finalRef) {
      outboundUrl += `&ref=${finalRef}`;
      clearAffiliateRef();
    }

    window.location.href = outboundUrl;
  };

  const handleShareClick = async () => {
    const result = await shareService(service);
    if (result === 'copied') {
      setIsCopied(true);
      alert("Link disalin! Sila tampal di WhatsApp.");
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  const carouselImages = [...(service.modalImageUrls || []), ...(service.imageUrls || []), service.imageUrl].filter(Boolean) as string[];

  return (
    <div
      className="w-full h-[95vh] md:h-auto md:max-h-[85vh] md:max-w-5xl rounded-t-[32px] md:rounded-3xl overflow-hidden flex flex-col md:flex-row relative bg-zinc-950 shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] bg-zinc-800/80 hover:bg-zinc-700 md:bg-zinc-800 md:hover:bg-zinc-700 text-white p-2.5 rounded-full backdrop-blur-md transition-colors border border-zinc-700 md:border-zinc-700"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="w-full h-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row relative hide-scrollbar">

        <div className="relative w-full md:w-1/2 shrink-0 group bg-zinc-950 overflow-hidden md:flex md:items-center min-h-[50vw] md:min-h-0 pb-8 md:pb-0">
          {carouselImages.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-900 py-20">No Image</div>
          ) : (
            <>
              <img
                src={appendCacheBuster(carouselImages[currentImageIndex])}
                alt=""
                className="hidden md:block absolute inset-0 w-full h-full object-cover blur-3xl opacity-50 scale-125 pointer-events-none z-0"
                referrerPolicy="no-referrer"
              />

              <img
                src={appendCacheBuster(carouselImages[currentImageIndex])}
                alt={`${service.title} - Image ${currentImageIndex + 1}`}
                className="w-full h-auto max-h-[70vh] md:max-h-[85vh] object-contain block z-10 relative"
                referrerPolicy="no-referrer"
                loading="lazy"
              />

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
          )}
        </div>

        <div className="w-full md:w-1/2 bg-zinc-950 flex flex-col rounded-t-[32px] md:rounded-none -mt-8 md:mt-0 relative md:absolute md:right-0 md:top-0 md:bottom-0 z-30 border-l border-zinc-900/50 md:overflow-hidden">

          <div className="p-6 pb-32 md:p-10 md:pb-48 flex flex-col md:flex-1 md:overflow-y-auto hide-scrollbar">

            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-white text-zinc-950 text-[10px] font-bold tracking-widest rounded-full uppercase">
                {service.category}
              </span>
              {(service.startDate || service.endDate) && (
                <span className="px-3 py-1 bg-zinc-800 text-zinc-300 text-[10px] font-bold tracking-widest rounded-full uppercase flex items-center gap-1 border border-zinc-700">
                  <Calendar className="w-3 h-3" /> Valid Now
                </span>
              )}
            </div>

            <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-6">
              {service.title}
            </h3>

            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 my-6 flex flex-wrap items-center gap-6">
              {service.teamAraPrice ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      TeamAra Price
                    </span>
                    <span className="text-4xl font-black text-green-400 tracking-tighter">RM{service.teamAraPrice}</span>
                  </div>
                  {service.price && (
                    <div className="flex flex-col border-l border-zinc-700 pl-6">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Regular Price</span>
                      <span className="text-xl font-bold text-zinc-500 line-through decoration-zinc-600">RM{service.price}</span>
                    </div>
                  )}
                </>
              ) : service.price ? (
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Price</span>
                  <span className="text-4xl font-black text-white tracking-tighter">RM{service.price}</span>
                </div>
              ) : (
                <span className="text-sm font-medium text-zinc-400">Price available upon request</span>
              )}
            </div>

            {service.showTeamAraDisclaimer && (
              <p className="text-xs text-zinc-400 mb-8 leading-relaxed">
                Harga TeamAra hanya untuk ahli TeamAra sahaja. Pendaftaran keahlian TeamAra boleh dilakukan di klinik secara percuma, harga TeamAra boleh dinikmati secara terus selepas pendaftaran keahlian dibuat.
              </p>
            )}

            <div className="w-full h-px bg-zinc-800 mb-8"></div>

            <div className="prose prose-sm md:prose-base prose-invert text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {service.description || "No detailed description provided for this service."}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full md:w-1/2 md:left-1/2 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-zinc-950/0 md:bg-zinc-950/95 md:backdrop-blur-md md:border-t md:border-zinc-800 pt-20 md:pt-5 pb-6 md:pb-5 px-4 md:px-6 flex flex-col gap-3 z-50 pointer-events-none md:pointer-events-auto">
        {showBranchSelect ? (
          <div className="pointer-events-auto w-full bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-4 border border-zinc-800 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pilih Cawangan WhatsApp</h4>
              <button onClick={() => setShowBranchSelect(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {locations.map(loc => (
                <a
                  key={loc.id}
                  href={`https://wa.me/${formatPhoneNumber(loc.whatsapp)}?text=${encodeURIComponent(`Hai, saya berminat dengan ${service.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-3 px-2 rounded-xl text-center transition-all border border-zinc-700"
                >
                  {loc.branchName}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-row gap-3 w-full">
            <button
              onClick={(e) => {
                if (service.isWalkInOnly) {
                  setShowBranchSelect(true);
                } else {
                  handleBookNow(e);
                }
              }}
              className="pointer-events-auto flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-green-900/20 text-sm md:text-lg transition-transform active:scale-95"
            >
              {service.isWalkInOnly ? (
                <>
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp Kami
                </>
              ) : (
                "Saya nak tempah slot"
              )}
            </button>
            <button
              onClick={handleShareClick}
              className="pointer-events-auto shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 md:py-4 px-5 md:px-6 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 text-sm md:text-lg transition-transform active:scale-95"
            >
              {isCopied ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : <Share2 className="w-4 h-4 md:w-5 md:h-5" />}
              <span className="hidden sm:inline ml-2">{isCopied ? "Telah Disalin!" : "Kongsi"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceModalContent;
