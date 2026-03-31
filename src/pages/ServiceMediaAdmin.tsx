import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  Loader2, 
  Save, 
  ChevronLeft, 
  Layout, 
  GalleryHorizontal, 
  Maximize2,
  Trash2,
  Plus
} from 'lucide-react';

interface ServiceData {
  id?: string;
  title: string;
  description: string;
  galleryUrls: string[];
  heroImageUrl: string;
  carouselImageUrl: string;
  modalImageUrl: string;
  imageUrl: string; // Backward compatibility field
  updatedAt?: any;
}

export default function ServiceMediaAdmin({ serviceId }: { serviceId?: string }) {
  // --- State Management ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Task 1: Image Pool
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Task 2: Role Assignment
  const [selectedHeroUrl, setSelectedHeroUrl] = useState('');
  const [selectedCarouselUrl, setSelectedCarouselUrl] = useState('');
  const [selectedModalUrl, setSelectedModalUrl] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing data if editing
  useEffect(() => {
    if (serviceId) {
      const fetchService = async () => {
        const docRef = doc(db, 'services', serviceId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ServiceData;
          setTitle(data.title || '');
          setDescription(data.description || '');
          setGalleryImages(data.galleryUrls || []);
          setSelectedHeroUrl(data.heroImageUrl || '');
          setSelectedCarouselUrl(data.carouselImageUrl || '');
          setSelectedModalUrl(data.modalImageUrl || '');
        }
      };
      fetchService();
    }
  }, [serviceId]);

  // --- Task 1: Upload Logic ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `services/${Date.now()}-${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        newUrls.push(url);
      }
      setGalleryImages(prev => [...prev, ...newUrls]);
      setMessage({ type: 'success', text: `Successfully uploaded ${newUrls.length} images.` });
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({ type: 'error', text: "Failed to upload images. Please try again." });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- Task 3: Save Logic & Share Compatibility ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // CRITICAL FOR SHARING: Fallback logic
      // 1. Modal Image
      // 2. Hero Image
      // 3. First image in gallery
      const shareImageUrl = selectedModalUrl || selectedHeroUrl || galleryImages[0] || '';

      const payload: ServiceData = {
        title,
        description,
        galleryUrls: galleryImages,
        heroImageUrl: selectedHeroUrl,
        carouselImageUrl: selectedCarouselUrl,
        modalImageUrl: selectedModalUrl,
        imageUrl: shareImageUrl, // Backward compatibility field
        updatedAt: serverTimestamp(),
      };

      if (serviceId) {
        await updateDoc(doc(db, 'services', serviceId), payload as any);
      } else {
        const newDocRef = doc(collection(db, 'services'));
        await setDoc(newDocRef, payload);
      }

      setMessage({ type: 'success', text: "Service saved successfully with backward-compatible sharing!" });
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: 'error', text: "Failed to save service data." });
    } finally {
      setIsSaving(false);
    }
  };

  const removeImageFromGallery = (url: string) => {
    setGalleryImages(prev => prev.filter(img => img !== url));
    if (selectedHeroUrl === url) setSelectedHeroUrl('');
    if (selectedCarouselUrl === url) setSelectedCarouselUrl('');
    if (selectedModalUrl === url) setSelectedModalUrl('');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGalleryImages([]);
    setSelectedHeroUrl('');
    setSelectedCarouselUrl('');
    setSelectedModalUrl('');
    setMessage(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Service Media Library</h1>
            <p className="text-zinc-400">Manage your service assets and assign roles for public display.</p>
          </div>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Basic Info */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layout className="w-5 h-5 text-blue-500" />
              General Information
            </h2>
            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Service Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Premium Spa Treatment"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the service..."
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                />
              </div>
            </div>
          </section>

          {/* Task 1: Service Media Gallery */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <GalleryHorizontal className="w-5 h-5 text-purple-500" />
                Service Media Gallery
              </h2>
              <div className="relative">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                  id="gallery-upload"
                />
                <label 
                  htmlFor="gallery-upload"
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium cursor-pointer transition-all ${
                    isUploading 
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                    : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isUploading ? 'Uploading...' : 'Upload Images'}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <AnimatePresence mode="popLayout">
                {galleryImages.map((url, idx) => (
                  <motion.div 
                    key={url}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative aspect-square group rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950"
                  >
                    <img 
                      src={url} 
                      alt={`Gallery ${idx}`} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button 
                        type="button"
                        onClick={() => removeImageFromGallery(url)}
                        className="p-2 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Indicators for assigned roles */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {selectedHeroUrl === url && <span className="bg-blue-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Hero</span>}
                      {selectedCarouselUrl === url && <span className="bg-purple-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Carousel</span>}
                      {selectedModalUrl === url && <span className="bg-pink-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">Modal</span>}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {galleryImages.length === 0 && !isUploading && (
                <div className="col-span-full py-12 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500">
                  <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p>No images in gallery. Upload some to get started.</p>
                </div>
              )}
            </div>
          </section>

          {/* Task 2: Role Assignment UI */}
          <section className="grid md:grid-cols-3 gap-6">
            {/* Hero Role */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="font-semibold">Hero Image</h3>
              </div>
              <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 relative group">
                {selectedHeroUrl ? (
                  <img src={selectedHeroUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-sm">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-20" />
                    <span>Not assigned</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Select an image from the gallery below to assign as Hero.</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  {galleryImages.map(url => (
                    <button
                      key={`hero-sel-${url}`}
                      type="button"
                      onClick={() => setSelectedHeroUrl(url)}
                      className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${selectedHeroUrl === url ? 'border-blue-500 scale-110' : 'border-transparent hover:border-zinc-600'}`}
                    >
                      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Carousel Role */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <h3 className="font-semibold">Carousel Image</h3>
              </div>
              <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 relative group">
                {selectedCarouselUrl ? (
                  <img src={selectedCarouselUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-sm">
                    <GalleryHorizontal className="w-8 h-8 mb-2 opacity-20" />
                    <span>Not assigned</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Select an image from the gallery below to assign as Carousel.</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  {galleryImages.map(url => (
                    <button
                      key={`carousel-sel-${url}`}
                      type="button"
                      onClick={() => setSelectedCarouselUrl(url)}
                      className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${selectedCarouselUrl === url ? 'border-purple-500 scale-110' : 'border-transparent hover:border-zinc-600'}`}
                    >
                      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Role */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <h3 className="font-semibold">Modal Image</h3>
              </div>
              <div className="aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 relative group">
                {selectedModalUrl ? (
                  <img src={selectedModalUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 text-sm">
                    <Maximize2 className="w-8 h-8 mb-2 opacity-20" />
                    <span>Not assigned</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Select an image from the gallery below to assign as Modal.</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-zinc-950 rounded-lg border border-zinc-800">
                  {galleryImages.map(url => (
                    <button
                      key={`modal-sel-${url}`}
                      type="button"
                      onClick={() => setSelectedModalUrl(url)}
                      className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${selectedModalUrl === url ? 'border-pink-500 scale-110' : 'border-transparent hover:border-zinc-600'}`}
                    >
                      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Feedback Messages */}
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5 rotate-45" />}
                <p className="text-sm font-medium">{message.text}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="pt-6 border-t border-zinc-800 flex items-center justify-end gap-4">
            <button 
              type="button"
              onClick={() => resetForm()}
              className="px-6 py-3 rounded-xl font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Reset Form
            </button>
            <button 
              type="submit"
              disabled={isSaving || !title}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Saving Changes...' : 'Save Service Media'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
