import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, writeBatch, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Service, Location, Panel, Collaborator, AdminUser, Vendor, AppSettings, InternalApp, GoogleReview, handleFirestoreError, OperationType } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LogOut, Plus, GripVertical, Image as ImageIcon, Trash2, Loader2, AlertCircle, CheckCircle2, X, Edit2, Sparkles, MapPin, Phone, ArrowUp, ArrowDown, ChevronLeft } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { GoogleGenAI } from '@google/genai';

// Sortable Card Component (Horizontal Swimlane)
const SortableServiceCard: React.FC<{ service: Service, onDelete: (id: string) => void, onEdit: (service: Service) => void, isHighlighted?: boolean }> = ({ service, onDelete, onEdit, isHighlighted }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const displayImage = service.thumbnailUrl || service.heroImageUrl || service.imageUrls?.[0] || service.imageUrl;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex-shrink-0 w-64 rounded-xl overflow-hidden border transition-all group relative flex flex-col ${
        isDragging ? 'bg-zinc-800 shadow-2xl z-10 border-zinc-600 scale-105' : 
        isHighlighted ? 'bg-green-500/10 border-green-500 ring-2 ring-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' :
        'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
      }`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute top-2 left-2 z-20 p-1.5 bg-black/50 backdrop-blur-md rounded-md text-white/70 hover:text-white cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Image */}
      <div className="h-32 w-full bg-zinc-800 relative overflow-hidden">
        {displayImage ? (
          <img src={displayImage} alt={service.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        {service.isFeatured && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold bg-amber-500 text-white shadow-lg">
            FEATURED
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <h4 className="font-medium text-white text-sm line-clamp-2 mb-1">{service.title}</h4>
        <div className="text-xs text-zinc-400 mt-auto">
          {service.price && <div className="font-semibold text-zinc-300">RM{service.price}</div>}
          {service.teamAraPrice && <div>TeamAra: RM{service.teamAraPrice}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-zinc-800/50 bg-black/20 flex justify-end gap-2">
        <button 
          onClick={() => onEdit(service)}
          className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-all"
          title="Edit Service"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(service.id)}
          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
          title="Delete Service"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminUI({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'services' | 'locations' | 'panels' | 'collaborators' | 'leads' | 'staff' | 'vendors' | 'layout' | 'reviews'>('services');

  const [currentAdminInfo, setCurrentAdminInfo] = useState<AdminUser | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

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

  // ==========================================
  // ADDED DRAG AND DROP STATE & FUNCTION HERE
  // ==========================================
  const [draggedPanelIndex, setDraggedPanelIndex] = useState<number | null>(null);

  const handleDropReorder = async (dropIndex: number) => {
    // 1. If we didn't drag anything, or dropped it in the exact same spot, do nothing
    if (draggedPanelIndex === null || draggedPanelIndex === dropIndex) return;
    
    // 2. Create a copy of the panels, remove the dragged item, and insert it at the new spot
    const newPanels = [...panels];
    const [draggedItem] = newPanels.splice(draggedPanelIndex, 1);
    newPanels.splice(dropIndex, 0, draggedItem);
    
    // 3. Update the screen instantly
    setPanels(newPanels); 
    setDraggedPanelIndex(null);

    // 4. IMPORTANT: You will need to save this new order to your database.
    // If you already have a function that saves the whole list of panels, call it here!
    // Example: await savePanelsOrderToDatabase(newPanels); 
    // (You can look at how your existing `handleMovePanel` function saves to the database and do the same thing here).
  };
  // ==========================================
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLocConfirmId, setDeleteLocConfirmId] = useState<string | null>(null);
  const [deletePanelConfirmId, setDeletePanelConfirmId] = useState<string | null>(null);
  const [highlightedServiceId, setHighlightedServiceId] = useState<string | null>(null);
  const [deleteCollabConfirmId, setDeleteCollabConfirmId] = useState<string | null>(null);
  const [deleteLeadConfirmId, setDeleteLeadConfirmId] = useState<string | null>(null);
  const [deleteReviewConfirmId, setDeleteReviewConfirmId] = useState<string | null>(null);

  // Location Form state
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [locForm, setLocForm] = useState({
    branchName: '', address: '', phone: '', whatsapp: '',
    operatingHours: '', googleMapsUrl: '', wazeUrl: '',
    landmark: '', imageUrl: ''
  });
  const [locImageFile, setLocImageFile] = useState<File | null>(null);
  const [locImagePreview, setLocImagePreview] = useState<string | null>(null);

  // Panel Form state
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [panelForm, setPanelForm] = useState({
    name: '',
    imageUrl: '',
    availableLocations: [] as string[],
    rankOrder: 0
  });
  const [panelImageFile, setPanelImageFile] = useState<File | null>(null);
  const [panelImagePreview, setPanelImagePreview] = useState<string | null>(null);

  // Collaborator Form state
  const [editingCollabId, setEditingCollabId] = useState<string | null>(null);
  const [collabForm, setCollabForm] = useState({
    name: '',
    location: '',
    imageUrl: ''
  });
  const [collabImageFile, setCollabImageFile] = useState<File | null>(null);
  const [collabImagePreview, setCollabImagePreview] = useState<string | null>(null);

  // Vendor Form state
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [deleteVendorConfirmId, setDeleteVendorConfirmId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: '',
    address: '',
    phone: '',
    mapUrl: '',
    imageUrl: '',
    perks: ''
  });
  const [vendorImageFile, setVendorImageFile] = useState<File | null>(null);
  const [vendorImagePreview, setVendorImagePreview] = useState<string | null>(null);

  // Staff Form state
  const [staffForm, setStaffForm] = useState({
    email: '',
    role: 'branchadmin' as 'superadmin' | 'branchadmin',
    branchId: ''
  });
  const [deleteStaffConfirmId, setDeleteStaffConfirmId] = useState<string | null>(null);

  // Review Form state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    reviewerName: '',
    reviewText: '',
    branchName: '',
    reviewUrl: ''
  });

  // Service Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('AraMommy');
  const [price, setPrice] = useState('');
  const [teamAraPrice, setTeamAraPrice] = useState('');
  const [showTeamAraDisclaimer, setShowTeamAraDisclaimer] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Zone 2: Thumbnail Image (Portrait 3:4)
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // Zone 3: Modal Gallery Images (Portrait 3:4)
  const [modalImageUrls, setModalImageUrls] = useState<string[]>([]);
  const [modalImageFiles, setModalImageFiles] = useState<File[]>([]);
  const [modalImagePreviews, setModalImagePreviews] = useState<string[]>([]);

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'uploading'>('idle');

  // AI Generation State
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageBase64, setGeneratedImageBase64] = useState<string | null>(null);

  const deleteImageFromStorage = async (imageUrl: string) => {
    if (!imageUrl || imageUrl.startsWith('data:image')) return;
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn('Failed to delete image from storage (may already be deleted):', error);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!user || !user.email) return;

    const qCurrentAdmin = query(collection(db, 'admins'));
    const unsubscribeCurrentAdmin = onSnapshot(qCurrentAdmin, (snapshot) => {
      const adminsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AdminUser[];
      const current = adminsData.find(a => a.email === user.email);
      
      if (current) {
        setCurrentAdminInfo(current);
        if (current.role === 'superadmin') {
          setAdminUsers(adminsData);
        }
      } else {
        // If no admin record exists at all in the DB, default the first user to superadmin
        if (adminsData.length === 0) {
          const defaultAdmin: AdminUser = { email: user.email, role: 'superadmin' };
          setCurrentAdminInfo(defaultAdmin);
          setAdminUsers([]);
        } else {
          // User is not an admin
          setCurrentAdminInfo(null);
        }
      }
      setAdminLoading(false);
    }, (error) => {
      console.error("Admin Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'admins', auth);
      setAdminLoading(false);
    });

    const qServices = query(collection(db, 'services'));
    const unsubscribeServices = onSnapshot(qServices, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];
      
      // Sort in memory to avoid query issues with missing fields
      const sortedServices = [...servicesData].sort((a, b) => (a.rankOrder || 0) - (b.rankOrder || 0));
      setServices(sortedServices);
      setLoading(false);
    }, (error) => {
      console.error("Admin Services Fetch Error:", error);
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
      console.error("Admin Locations Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'locations', auth);
    });

    const qPanels = query(collection(db, 'panels'));
    const unsubscribePanels = onSnapshot(qPanels, (snapshot) => {
      const panelData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Panel[];
      
      // Sort in memory to handle missing rankOrder fields without excluding them from the query
      const sortedPanels = panelData.sort((a, b) => (a.rankOrder ?? 9999) - (b.rankOrder ?? 9999));
      setPanels(sortedPanels);
    }, (error) => {
      console.error("Admin Panels Fetch Error:", error);
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
      console.error("Admin Collaborators Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'collaborators', auth);
    });

    const qVendors = query(collection(db, 'vendors'));
    const unsubscribeVendors = onSnapshot(qVendors, (snapshot) => {
      const vendorData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Vendor[];
      
      // Sort by name by default
      const sortedVendors = [...vendorData].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setVendors(sortedVendors);
    }, (error) => {
      console.error("Admin Vendors Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'vendors', auth);
    });

    const docSettings = doc(db, 'settings', 'homepage');
    const unsubscribeSettings = onSnapshot(docSettings, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      } else {
        setSettings({ vendorSubheading: '', carouselOrder: ['services', 'teamAra', 'vendors', 'panels'] });
      }
    }, (error) => {
      console.error("Admin Settings Fetch Error:", error);
      handleFirestoreError(error, OperationType.GET, 'settings/homepage', auth);
    });

    const qReviews = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      const reviewData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GoogleReview[];
      setReviews(reviewData);
    }, (error) => {
      console.error("Admin Reviews Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'reviews', auth);
    });

    const qLeads = query(collection(db, 'leads'));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      let leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (currentAdminInfo?.role === 'branchadmin' && currentAdminInfo.branchId) {
        leadsData = leadsData.filter((lead: any) => lead.branchId === currentAdminInfo.branchId);
      }

      // Sort so newest ones are at the top based on timestamp
      leadsData.sort((a: any, b: any) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });
      
      setLeads(leadsData);
    }, (error) => {
      console.error("Admin Leads Fetch Error:", error);
      handleFirestoreError(error, OperationType.LIST, 'leads', auth);
    });

    return () => {
      unsubscribeCurrentAdmin();
      unsubscribeServices();
      unsubscribeLocations();
      unsubscribePanels();
      unsubscribeCollaborators();
      unsubscribeVendors();
      unsubscribeSettings();
      unsubscribeReviews();
      unsubscribeLeads();
    };
  }, [user, currentAdminInfo?.role, currentAdminInfo?.branchId]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setThumbnailUrl('');
  };

  const handleModalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      setModalImageFiles(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setModalImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeExistingModalImage = (index: number) => {
    setModalImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewModalImage = (index: number) => {
    setModalImageFiles(prev => prev.filter((_, i) => i !== index));
    setModalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      
      const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
      if (validFiles.length < files.length) {
        setErrorMsg('Some files were too large and skipped. Please select images under 10MB.');
      }

      setImageFiles(prev => [...prev, ...validFiles]);
      
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (index: number) => {
    const urlToRemove = existingImageUrls[index];
    await deleteImageFromStorage(urlToRemove);
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeHeroImage = async () => {
    if (heroImageUrl) {
      await deleteImageFromStorage(heroImageUrl);
      setHeroImageUrl('');
    }
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setTitle(service.title);
    setCategory(service.category);
    setPrice(service.price || '');
    setTeamAraPrice(service.teamAraPrice || '');
    setShowTeamAraDisclaimer(service.showTeamAraDisclaimer || false);
    setStartDate(service.startDate || '');
    setEndDate(service.endDate || '');
    setDescription(service.description || '');
    setIsFeatured(service.isFeatured || false);
    
    setHeroImageUrl(service.heroImageUrl || '');
    setThumbnailUrl(service.thumbnailUrl || '');
    setThumbnailPreview(service.thumbnailUrl || null);
    setModalImageUrls(service.modalImageUrls || []);
    setModalImagePreviews(service.modalImageUrls || []);
    setAiPrompt('');
    setGeneratedImageBase64(null);

    const urls = service.imageUrls || (service.imageUrl ? [service.imageUrl] : []);
    setExistingImageUrls(urls);
    setImageFiles([]);
    setImagePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('AraMommy');
    setPrice('');
    setTeamAraPrice('');
    setShowTeamAraDisclaimer(false);
    setStartDate('');
    setEndDate('');
    setDescription('');
    setIsFeatured(false);
    setExistingImageUrls([]);
    setImageFiles([]);
    setImagePreviews([]);
    setHeroImageUrl('');
    setThumbnailUrl('');
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setModalImageUrls([]);
    setModalImageFiles([]);
    setModalImagePreviews([]);
    setAiPrompt('');
    setGeneratedImageBase64(null);
  };

  const handleEditLocation = (loc: Location) => {
    setEditingLocId(loc.id);
    setLocForm({
      branchName: loc.branchName || '',
      address: loc.address || '',
      phone: loc.phone || '',
      whatsapp: loc.whatsapp || '',
      operatingHours: loc.operatingHours || '',
      googleMapsUrl: loc.googleMapsUrl || '',
      wazeUrl: loc.wazeUrl || '',
      landmark: loc.landmark || '',
      imageUrl: loc.imageUrl || ''
    });
    setLocImagePreview(loc.imageUrl || null);
    setLocImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetLocForm = () => {
    setEditingLocId(null);
    setLocForm({
      branchName: '', address: '', phone: '', whatsapp: '',
      operatingHours: '', googleMapsUrl: '', wazeUrl: '',
      landmark: '', imageUrl: ''
    });
    setLocImageFile(null);
    setLocImagePreview(null);
  };

  const handleEditPanel = (panel: Panel) => {
    setEditingPanelId(panel.id);
    setPanelForm({
      name: panel.name || '',
      imageUrl: panel.imageUrl || '',
      availableLocations: panel.availableLocations || [],
      rankOrder: panel.rankOrder || 0
    });
    setPanelImagePreview(panel.imageUrl || null);
    setPanelImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetPanelForm = () => {
    setEditingPanelId(null);
    setPanelForm({
      name: '',
      imageUrl: '',
      availableLocations: [],
      rankOrder: 0
    });
    setPanelImageFile(null);
    setPanelImagePreview(null);
  };

  const handleMovePanel = async (panelId: string, direction: 'up' | 'down') => {
    const currentIndex = panels.findIndex(p => p.id === panelId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= panels.length) return;

    const currentPanel = panels[currentIndex];
    const otherPanel = panels[newIndex];

    try {
      const currentRef = doc(db, 'panels', currentPanel.id);
      const otherRef = doc(db, 'panels', otherPanel.id);

      // Use current index as fallback if rankOrder is missing to ensure we have values to swap
      const currentOrder = currentPanel.rankOrder ?? currentIndex;
      const otherOrder = otherPanel.rankOrder ?? newIndex;

      // Swap rankOrder
      // If they are the same (e.g. both missing and indices were same? No, indices are different)
      // If they were both 0 in DB, they will now be swapped based on their current list position
      await updateDoc(currentRef, { rankOrder: otherOrder });
      await updateDoc(otherRef, { rankOrder: currentOrder });
    } catch (error) {
      console.error("Error moving panel:", error);
    }
  };

  const handleSavePanel = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalImageUrl = panelForm.imageUrl || '';

      if (panelImageFile) {
        const options = {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 800,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(panelImageFile, options);
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${panelImageFile.name}`;
        const storageRef = ref(storage, `panels/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        finalImageUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      if (!finalImageUrl) {
        throw new Error('Please upload a logo for the panel.');
      }

      const panelData = { 
        ...panelForm,
        imageUrl: finalImageUrl,
        rankOrder: editingPanelId ? panelForm.rankOrder : (panels.length > 0 ? Math.max(...panels.map(p => p.rankOrder || 0)) + 1 : 0)
      };
      
      if (editingPanelId) {
        await updateDoc(doc(db, 'panels', editingPanelId), panelData);
        setSuccessMsg('Panel updated successfully!');
      } else {
        await addDoc(collection(db, 'panels'), panelData);
        setSuccessMsg('Panel added successfully!');
      }
      resetPanelForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to save panel.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePanel = async (id: string) => {
    setDeletePanelConfirmId(id);
  };

  const confirmDeletePanel = async () => {
    if (!deletePanelConfirmId) return;
    try {
      const panelToDelete = panels.find(p => p.id === deletePanelConfirmId);
      if (panelToDelete?.imageUrl) {
        await deleteImageFromStorage(panelToDelete.imageUrl);
      }
      await deleteDoc(doc(db, 'panels', deletePanelConfirmId));
      setSuccessMsg('Panel deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      setErrorMsg('Failed to delete panel.');
    } finally {
      setDeletePanelConfirmId(null);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!reviewForm.reviewerName || !reviewForm.reviewText || !reviewForm.reviewUrl) {
        alert('Please fill in all required fields.');
        setLoading(false);
        return;
      }

      const newReviewData = {
        reviewerName: reviewForm.reviewerName,
        reviewText: reviewForm.reviewText,
        branchName: reviewForm.branchName || 'General',
        reviewUrl: reviewForm.reviewUrl,
        createdAt: serverTimestamp()
      };

      if (editingReviewId) {
        await updateDoc(doc(db, 'reviews', editingReviewId), newReviewData);
        // Update UI immediately (optimistic update)
        setReviews(prev => prev.map(r => r.id === editingReviewId ? { id: editingReviewId, ...newReviewData } : r));
        alert('Review updated successfully!');
      } else {
        const docRef = await addDoc(collection(db, 'reviews'), newReviewData);
        // Update UI immediately
        setReviews(prev => [{ id: docRef.id, ...newReviewData }, ...prev]);
        alert('Review saved successfully!');
      }

      setReviewForm({ reviewerName: '', reviewText: '', branchName: '', reviewUrl: '' });
      setEditingReviewId(null);
    } catch (error: any) {
      console.error("Error saving review: ", error);
      alert(`Failed to save review. Error: ${error.message}`);
      setErrorMsg(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditReview = (review: GoogleReview) => {
    setEditingReviewId(review.id!);
    setReviewForm({
      reviewerName: review.reviewerName,
      reviewText: review.reviewText,
      branchName: review.branchName,
      reviewUrl: review.reviewUrl
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReview = async (id: string) => {
    setDeleteReviewConfirmId(id);
  };

  const confirmDeleteReview = async () => {
    if (!deleteReviewConfirmId) return;
    try {
      await deleteDoc(doc(db, 'reviews', deleteReviewConfirmId));
      setSuccessMsg('Review deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reviews/${deleteReviewConfirmId}`, auth);
      setErrorMsg('Failed to delete review.');
    } finally {
      setDeleteReviewConfirmId(null);
    }
  };

  const handleEditCollab = (collab: Collaborator) => {
    setEditingCollabId(collab.id);
    setCollabForm({
      name: collab.name || '',
      location: collab.location || '',
      imageUrl: collab.imageUrl || ''
    });
    setCollabImagePreview(collab.imageUrl || null);
    setCollabImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetCollabForm = () => {
    setEditingCollabId(null);
    setCollabForm({
      name: '',
      location: '',
      imageUrl: ''
    });
    setCollabImageFile(null);
    setCollabImagePreview(null);
  };

  const handleSaveCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalImageUrl = collabForm.imageUrl || '';

      if (collabImageFile) {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(collabImageFile, options);
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${collabImageFile.name}`;
        const storageRef = ref(storage, `collaborators/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        finalImageUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      if (!finalImageUrl) {
        throw new Error('Please upload an image for the collaborator.');
      }

      const collabData = { 
        ...collabForm,
        imageUrl: finalImageUrl
      };
      
      if (editingCollabId) {
        await updateDoc(doc(db, 'collaborators', editingCollabId), collabData);
        setSuccessMsg('Collaborator updated successfully!');
      } else {
        await addDoc(collection(db, 'collaborators'), collabData);
        setSuccessMsg('Collaborator added successfully!');
      }
      resetCollabForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to save collaborator.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollab = async (id: string) => {
    setDeleteCollabConfirmId(id);
  };

  const confirmDeleteCollab = async () => {
    if (!deleteCollabConfirmId) return;
    try {
      const collabToDelete = collaborators.find(c => c.id === deleteCollabConfirmId);
      if (collabToDelete?.imageUrl) {
        await deleteImageFromStorage(collabToDelete.imageUrl);
      }
      await deleteDoc(doc(db, 'collaborators', deleteCollabConfirmId));
      setSuccessMsg('Collaborator deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      setErrorMsg('Failed to delete collaborator.');
    } finally {
      setDeleteCollabConfirmId(null);
    }
  };

  const resetVendorForm = () => {
    setVendorForm({ name: '', address: '', phone: '', mapUrl: '', imageUrl: '', perks: '' });
    setVendorImageFile(null);
    setVendorImagePreview(null);
    setEditingVendorId(null);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setVendorForm({
      name: vendor.name,
      address: vendor.address,
      phone: vendor.phone,
      mapUrl: vendor.mapUrl,
      imageUrl: vendor.imageUrl,
      perks: vendor.perks
    });
    setVendorImagePreview(vendor.imageUrl);
    setVendorImageFile(null);
    setEditingVendorId(vendor.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalImageUrl = vendorForm.imageUrl || '';

      if (vendorImageFile) {
        // Bypass compression entirely for maximum quality
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${vendorImageFile.name}`;
        const storageRef = ref(storage, `vendors/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, vendorImageFile);

        finalImageUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      if (!finalImageUrl) {
        throw new Error('Please upload an image for the vendor.');
      }

      const vendorData = { 
        ...vendorForm,
        imageUrl: finalImageUrl
      };
      
      if (editingVendorId) {
        await updateDoc(doc(db, 'vendors', editingVendorId), vendorData);
        setSuccessMsg('Vendor updated successfully!');
      } else {
        await addDoc(collection(db, 'vendors'), vendorData);
        setSuccessMsg('Vendor added successfully!');
      }
      resetVendorForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      setErrorMsg(error.message || 'Failed to save vendor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    setDeleteVendorConfirmId(id);
  };

  const confirmDeleteVendor = async () => {
    if (!deleteVendorConfirmId) return;
    try {
      const vendorToDelete = vendors.find(v => v.id === deleteVendorConfirmId);
      if (vendorToDelete?.imageUrl) {
        await deleteImageFromStorage(vendorToDelete.imageUrl);
      }
      await deleteDoc(doc(db, 'vendors', deleteVendorConfirmId));
      setSuccessMsg('Vendor deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      setErrorMsg('Failed to delete vendor.');
    } finally {
      setDeleteVendorConfirmId(null);
    }
  };

  const handleSaveLayout = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateDoc(doc(db, 'settings', 'homepage'), {
        vendorSubheading: settings.vendorSubheading || '',
        carouselOrder: settings.carouselOrder || ['services', 'teamAra', 'vendors', 'panels'],
        categorySubheadings: settings.categorySubheadings || {},
        teamAraSub: settings.teamAraSub || '',
        panelsSub: settings.panelsSub || '',
        vendorsSub: settings.vendorsSub || '',
        reviewsSub: settings.reviewsSub || '',
        internalApps: settings.internalApps || []
      });
      setSuccessMsg('Layout saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      // If document doesn't exist, create it
      if (error.code === 'not-found') {
        try {
          await setDoc(doc(db, 'settings', 'homepage'), settings);
          setSuccessMsg('Layout saved successfully!');
          setTimeout(() => setSuccessMsg(null), 3000);
        } catch (innerError: any) {
          setErrorMsg(innerError.message || 'Failed to save layout.');
        }
      } else {
        setErrorMsg(error.message || 'Failed to save layout.');
      }
    } finally {
      setLoading(false);
    }
  };

  const moveCarouselItem = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...settings.carouselOrder];
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    setSettings({ ...settings, carouselOrder: newOrder });
  };

  const addInternalApp = () => {
    setSettings(prev => ({
      ...prev,
      internalApps: [
        ...(prev.internalApps || []),
        { name: '', url: '', description: '' }
      ]
    }));
  };

  const removeInternalApp = (index: number) => {
    setSettings(prev => ({
      ...prev,
      internalApps: (prev.internalApps || []).filter((_, i) => i !== index)
    }));
  };

  const updateInternalApp = (index: number, field: keyof InternalApp, value: string) => {
    setSettings(prev => {
      const newApps = [...(prev.internalApps || [])];
      newApps[index] = { ...newApps[index], [field]: value } as InternalApp;
      return { ...prev, internalApps: newApps };
    });
  };

  const fillKajangLocation = () => {
    setLocForm({
      branchName: 'KLINIK ARA 24 JAM KAJANG',
      address: 'D-13-GA, Jalan Prima Saujana 2/F, Taman Prima Saujana, 43000 Kajang, Selangor',
      phone: '0182194392',
      whatsapp: '0182194392',
      operatingHours: '24 Hours',
      googleMapsUrl: 'https://www.google.com/maps/dir//KLINIK+ARA+24+JAM+%7C+PRIMA+SAUJANA+KAJANG+%7C+KLINIK+PEMERIKSAAN+HAJI+%7C+PANEL+AIA,+D-13-GA,+Jalan+Prima+Saujana+2%2FF,+Taman+Prima+Saujana,+43000+Kajang,+Selangor/@3.0015488,101.810176,15z/data=!3m1!4b1!4m8!4m7!1m0!1m5!1m1!1s0x31cdcdc60d37356b:0xfec7288d53391815!2m2!1d101.8037656!2d3.0090361?entry=ttu&g_ep=EgoyMDI2MDMyMi4wIKXMDSoASAFQAw%3D%3D',
      wazeUrl: 'https://www.waze.com/live-map/directions/klinik-ara-24-jam-jalan-prima-saujana-2f-13-kajang?to=place.w.66715678.667156781.26624734',
      landmark: 'Econsave Prima Saujana',
      imageUrl: ''
    });
    setLocImagePreview(null);
    setLocImageFile(null);
    setSuccessMsg('Kajang location details filled! Please upload an image if needed and click Save.');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let finalImageUrl = locForm.imageUrl || '';

      if (locImageFile) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.9,
        };
        const compressedFile = await imageCompression(locImageFile, options);
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${locImageFile.name}`;
        const storageRef = ref(storage, `locations/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        finalImageUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      const locData = { 
        ...locForm,
        imageUrl: finalImageUrl
      };
      
      if (editingLocId) {
        await updateDoc(doc(db, 'locations', editingLocId), locData);
        setSuccessMsg('Location updated successfully!');
      } else {
        await addDoc(collection(db, 'locations'), locData);
        setSuccessMsg('Location added successfully!');
      }
      resetLocForm();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, editingLocId ? OperationType.UPDATE : OperationType.CREATE, 'locations', auth);
      setErrorMsg('Failed to save location.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    setDeleteLocConfirmId(id);
  };

  const confirmDeleteLocation = async () => {
    if (!deleteLocConfirmId) return;
    try {
      await deleteDoc(doc(db, 'locations', deleteLocConfirmId));
      setSuccessMsg('Location deleted successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `locations/${deleteLocConfirmId}`, auth);
      setErrorMsg('Failed to delete location.');
    } finally {
      setDeleteLocConfirmId(null);
    }
  };

  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: aiPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
      });
      
      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64EncodeString = response.generatedImages[0].image.imageBytes;
        setGeneratedImageBase64(`data:image/jpeg;base64,${base64EncodeString}`);
      } else {
        throw new Error("No image generated");
      }
    } catch (error: any) {
      console.error('AI Generation error:', error);
      const errorText = `AI Generation failed: ${error.message || 'Unknown error'}. Please check your API keys and permissions.`;
      setErrorMsg(errorText);
      window.alert(errorText);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploadingHero(true);
    setErrorMsg(null);
    
    try {
      // Bypass compression entirely for maximum quality
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`;
      const storageRef = ref(storage, `promotions/${uniqueFileName}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      const url = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', null, reject, async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        });
      });
      
      setHeroImageUrl(url);
      setSuccessMsg('Hero image uploaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error('Hero upload error:', error);
      const errorText = `Hero upload failed: ${error.message}`;
      setErrorMsg(errorText);
      window.alert(errorText);
    } finally {
      setIsUploadingHero(false);
      e.target.value = '';
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    if (existingImageUrls.length === 0 && imageFiles.length === 0 && !generatedImageBase64 && !heroImageUrl) {
      setErrorMsg('Please provide at least one image or generate a hero banner.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      let newlyUploadedUrls: string[] = [];
      let finalHeroImageUrl = heroImageUrl;
      let finalThumbnailUrl = thumbnailUrl;
      let newlyUploadedModalUrls: string[] = [];

      setUploadStatus('uploading');

      // 1. Upload AI Generated Hero Image if it's a pending base64 string
      if (heroImageUrl && heroImageUrl.startsWith('data:image')) {
        const blob = base64ToBlob(heroImageUrl);
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-ai-generated-hero.jpg`;
        const storageRef = ref(storage, `promotions/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        finalHeroImageUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      // 2. Upload Thumbnail Image
      if (thumbnailFile) {
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-thumbnail-${thumbnailFile.name}`;
        const storageRef = ref(storage, `services/${uniqueFileName}`);
        const uploadTask = uploadBytesResumable(storageRef, thumbnailFile);

        finalThumbnailUrl = await new Promise<string>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            }
          );
        });
      }

      // 3. Upload Modal Gallery Images
      if (modalImageFiles.length > 0) {
        const uploadPromises = modalImageFiles.map(async (file) => {
          const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-modal-${file.name}`;
          const storageRef = ref(storage, `services/${uniqueFileName}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          return new Promise<string>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              null,
              (error) => reject(error),
              async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              }
            );
          });
        });

        newlyUploadedModalUrls = await Promise.all(uploadPromises);
      }

      const finalModalImageUrls = [...modalImageUrls, ...newlyUploadedModalUrls];

      // 4. Upload Legacy Gallery Images
      if (imageFiles.length > 0) {
        setUploadStatus('uploading');
        
        const uploadPromises = imageFiles.map(async (file, index) => {
          // Bypass compression entirely for maximum quality
          const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`;
          const storageRef = ref(storage, `services/${uniqueFileName}`);
          const uploadTask = uploadBytesResumable(storageRef, file);

          return new Promise<string>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress((prev) => Math.min(99, prev + (fileProgress / imageFiles.length)));
              },
              (error) => reject(error),
              async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(url);
              }
            );
          });
        });

        newlyUploadedUrls = await Promise.all(uploadPromises);
      }

      const finalImageUrls = [...existingImageUrls, ...newlyUploadedUrls];

      const serviceData = {
        title,
        category,
        imageUrls: finalImageUrls,
        heroImageUrl: finalHeroImageUrl,
        thumbnailUrl: finalThumbnailUrl,
        modalImageUrls: finalModalImageUrls,
        price,
        teamAraPrice,
        showTeamAraDisclaimer,
        startDate,
        endDate,
        description,
        isFeatured,
      };

      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), serviceData);
        setSuccessMsg('Service updated successfully!');
        setHighlightedServiceId(editingId);
      } else {
        const newRankOrder = (services || []).length > 0 ? Math.max(...(services || []).map(s => s.rankOrder)) + 1 : 0;
        const docRef = await addDoc(collection(db, 'services'), {
          ...serviceData,
          rankOrder: newRankOrder
        });
        setSuccessMsg('Service added successfully!');
        setHighlightedServiceId(docRef.id);
      }

      resetForm();
      setTimeout(() => {
        setSuccessMsg(null);
        setHighlightedServiceId(null);
      }, 3000);
    } catch (error: any) {
      console.error('Save error:', error);
      setErrorMsg(`Save failed: ${error.message || 'Unknown error'}.`);
    } finally {
      setIsUploading(false);
      setUploadStatus('idle');
      setUploadProgress(0);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const serviceToDelete = services.find(s => s.id === deleteConfirmId);
      if (serviceToDelete) {
        const urlsToDelete = [
          ...(serviceToDelete.imageUrls || []),
          serviceToDelete.heroImageUrl,
          serviceToDelete.imageUrl
        ].filter(Boolean) as string[];

        await Promise.all(urlsToDelete.map(url => deleteImageFromStorage(url)));
      }

      await deleteDoc(doc(db, 'services', deleteConfirmId));
      setDeleteConfirmId(null);
      setSuccessMsg('Service deleted successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `services/${deleteConfirmId}`, auth);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const draggedService = services.find(s => s.id === active.id);
      if (!draggedService) return;

      const category = draggedService.category;
      
      const categoryServices = services.filter(s => s.category === category).sort((a, b) => a.rankOrder - b.rankOrder);
      
      const oldIndex = categoryServices.findIndex(s => s.id === active.id);
      const newIndex = categoryServices.findIndex(s => s.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newCategoryServices = arrayMove(categoryServices, oldIndex, newIndex) as Service[];
        
        const updatedServices = [...services];
        const batch = writeBatch(db);
        
        newCategoryServices.forEach((service, index) => {
          const serviceIndex = updatedServices.findIndex(s => s.id === service.id);
          if (serviceIndex !== -1) {
            updatedServices[serviceIndex] = { ...service, rankOrder: index };
          }
          
          const docRef = doc(db, 'services', service.id);
          batch.update(docRef, { rankOrder: index });
        });
        
        setServices(updatedServices);
        
        try {
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, 'services', auth);
        }
      }
    }
  };

  const existingCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)));

  const handleMarkContacted = async (id: string) => {
    try {
      await updateDoc(doc(db, 'leads', id), { status: 'contacted' });
      setSuccessMsg('Lead marked as contacted');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${id}`, auth);
    }
  };

  const confirmDeleteLead = async () => {
    if (!deleteLeadConfirmId) return;
    try {
      await deleteDoc(doc(db, 'leads', deleteLeadConfirmId));
      setDeleteLeadConfirmId(null);
      setSuccessMsg('Lead deleted successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `leads/${deleteLeadConfirmId}`, auth);
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const staffData = {
        email: staffForm.email,
        role: staffForm.role,
        branchId: staffForm.role === 'branchadmin' ? (staffForm.branchId || null) : null
      };

      await addDoc(collection(db, 'admins'), staffData);
      setSuccessMsg('Staff member added successfully!');
      setStaffForm({ email: '', role: 'branchadmin', branchId: '' });
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error: any) {
      console.error('Save staff error:', error);
      setErrorMsg(`Save failed: ${error.message || 'Unknown error'}.`);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteStaff = async () => {
    if (!deleteStaffConfirmId) return;
    try {
      await deleteDoc(doc(db, 'admins', deleteStaffConfirmId));
      setDeleteStaffConfirmId(null);
      setSuccessMsg('Staff member deleted successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${deleteStaffConfirmId}`, auth);
    }
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!currentAdminInfo) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-zinc-400 mb-6">You do not have administrative privileges.</p>
        <button 
          onClick={() => signOut(auth)}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-medium rounded-md border border-red-500/20">
              Klinik Ara 24 Jam
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400 hidden md:inline-block">{user.email}</span>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-6 border-t border-zinc-800">
          <button
            onClick={() => setActiveTab('services')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'services' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Manage Promotions
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'locations' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Manage Locations
          </button>
          <button
            onClick={() => setActiveTab('panels')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'panels' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Manage Panels
          </button>
          <button
            onClick={() => setActiveTab('collaborators')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'collaborators' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Manage TeamAra
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vendors' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Manage Vendors
          </button>
          <button
            onClick={() => setActiveTab('layout')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'layout' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Manage Layout
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'reviews' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Manage Reviews
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Patient Leads
          </button>
          {currentAdminInfo?.role === 'superadmin' && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'staff' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
            >
              Manage Staff
            </button>
          )}
        </div>
      </header>

      {activeTab === 'services' && (
      <main className="max-w-6xl mx-auto px-4 mt-8 flex flex-col gap-8">
        
        {/* Top: Form */}
        <div className="w-full max-w-3xl mx-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-red-500" />}
                {editingId ? 'Edit Service' : 'Add New Service'}
              </h2>
              {editingId && (
                <button onClick={resetForm} className="text-sm text-zinc-400 hover:text-white">Cancel</button>
              )}
            </div>
            
            <form onSubmit={handleSaveService} className="space-y-5">
              {successMsg && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Service Title *</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Category *</label>
                  <input 
                    type="text" 
                    list="category-options"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="e.g., AraSihat, AraVax, or type a new one..."
                    required
                  />
                  <datalist id="category-options">
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                      className="w-5 h-5 rounded border-zinc-700 bg-zinc-950 text-red-500 focus:ring-red-500 focus:ring-offset-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-300">Feature in Hero</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Regular Price (RM)</label>
                  <input 
                    type="text" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="e.g., 150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">TeamAra Price (RM)</label>
                  <input 
                    type="text" 
                    value={teamAraPrice}
                    onChange={(e) => setTeamAraPrice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                    placeholder="e.g., 120"
                  />
                  <label className="flex items-center gap-2 mt-4 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={showTeamAraDisclaimer} 
                      onChange={(e) => setShowTeamAraDisclaimer(e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-zinc-900 border-zinc-700 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <span className="text-sm text-zinc-300">Show TeamAra Membership Disclaimer on Modal</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">End Date</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none"
                  placeholder="Details about this service..."
                />
              </div>

              {/* Zone 1: Hero Banner Image (Horizontal 16:9) */}
              <div className="bg-zinc-950/50 border border-zinc-800/80 p-5 rounded-xl space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Zone 1: Hero Banner Image (Horizontal 16:9)</h3>
                </div>

                {/* Visual Feedback: Current Hero Banner */}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400 font-medium">Current Hero Banner Preview:</p>
                  {heroImageUrl ? (
                    <div className="w-full aspect-video rounded-lg overflow-hidden border border-purple-500/50 relative group">
                      <img src={heroImageUrl} alt="Current Hero" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setHeroImageUrl('')} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-6 h-6 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full aspect-video rounded-lg border-2 border-dashed border-zinc-700 bg-zinc-900 flex flex-col items-center justify-center text-zinc-500">
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-sm font-medium">No Hero Banner Selected</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-zinc-800/80">
                  {/* Option 1: Pick from Gallery */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-300">Option 1: Pick from Gallery</h4>
                    {[...modalImageUrls, ...existingImageUrls].length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {[...modalImageUrls, ...existingImageUrls].map((url, i) => (
                          <div key={`ext-hero-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-1">
                              <button type="button" onClick={() => setHeroImageUrl(url)} className="text-[10px] bg-white text-black px-2 py-1 rounded font-bold hover:bg-zinc-200 text-center w-full">
                                Set Hero
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">Upload images in Zone 3 to pick one.</p>
                    )}
                  </div>

                  {/* Option 2: Upload Custom Wide Image */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-300">Option 2: Upload Custom Wide Image</h4>
                    <div className="flex items-center gap-4">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleHeroImageUpload}
                        disabled={isUploadingHero}
                        className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 transition-colors"
                      />
                      {isUploadingHero && <Loader2 className="w-5 h-5 text-red-500 animate-spin" />}
                    </div>
                  </div>

                  {/* Option 3: Generate with AI */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-300">Option 3: Generate with AI</h4>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={2}
                      disabled={isGenerating || isUploadingHero}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500 resize-none disabled:opacity-50"
                      placeholder="e.g., Warm photo of Malay doctor with healthy baby..."
                    />
                    <button 
                      type="button"
                      onClick={handleGenerateImage}
                      disabled={isGenerating || !aiPrompt}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : '✨ Generate AI Banner'}
                    </button>

                    {generatedImageBase64 && heroImageUrl !== generatedImageBase64 && (
                      <div className="mt-3 p-3 bg-zinc-900 border border-purple-500/30 rounded-lg space-y-3 animate-in fade-in zoom-in duration-300">
                        <img src={generatedImageBase64} alt="AI Preview" className="w-full aspect-video object-cover rounded border border-zinc-700" />
                        <button 
                          type="button"
                          onClick={() => setHeroImageUrl(generatedImageBase64)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Use This Banner
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Zone 2: Thumbnail Image (Portrait 3:4) */}
              <div className="bg-zinc-950/50 border border-zinc-800/80 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Zone 2: Thumbnail Image (Portrait 3:4)</h3>
                </div>
                <p className="text-xs text-zinc-500">This image appears on the homepage carousel cards.</p>

                <div className="flex items-start gap-4">
                  <div className="w-24 h-32 rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden flex-shrink-0">
                    {thumbnailPreview ? (
                      <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-grow space-y-3">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="block w-full text-xs text-zinc-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                    />
                    {thumbnailPreview && (
                      <button type="button" onClick={removeThumbnail} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Remove Thumbnail
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Zone 3: Modal Gallery Images (Portrait 3:4) */}
              <div className="bg-zinc-950/50 border border-zinc-800/80 p-5 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-green-400" />
                  <h3 className="text-sm font-semibold text-white">Zone 3: Modal Gallery Images (Portrait 3:4)</h3>
                </div>
                <p className="text-xs text-zinc-500">These images appear in the popup gallery when a service is clicked.</p>

                <div className="flex flex-wrap gap-3">
                  {modalImageUrls.map((url, i) => (
                    <div key={`modal-ext-${i}`} className="relative w-20 h-28 rounded-lg overflow-hidden border border-zinc-700 group">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeExistingModalImage(i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  ))}
                  {modalImagePreviews.map((preview, i) => (
                    <div key={`modal-new-${i}`} className="relative w-20 h-28 rounded-lg overflow-hidden border border-green-500/50 group">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] px-1 font-bold">NEW</div>
                      <button type="button" onClick={() => removeNewModalImage(i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-28 rounded-lg border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                    <Plus className="w-6 h-6 text-zinc-600" />
                    <span className="text-[10px] text-zinc-500 font-medium">Add Image</span>
                    <input type="file" accept="image/*" multiple onChange={handleModalImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Legacy Gallery (Optional) */}
              <div className="opacity-50 hover:opacity-100 transition-opacity">
                <details className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
                  <summary className="text-xs font-medium text-zinc-500 cursor-pointer">Legacy Gallery Settings (Optional)</summary>
                  <div className="pt-4 space-y-4">
                    {existingImageUrls.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {existingImageUrls.map((url, i) => (
                          <div key={`ext-${i}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeExistingImage(i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={handleImageChange}
                      className="block w-full text-xs text-zinc-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700"
                    />
                  </div>
                </details>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-2 capitalize">
                      {uploadStatus === 'compressing' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {uploadStatus}...
                    </span>
                    {uploadStatus === 'uploading' && <span>{Math.round(uploadProgress)}%</span>}
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${uploadStatus === 'compressing' ? 'bg-amber-500 animate-pulse' : 'bg-red-600'}`} 
                      style={{ width: uploadStatus === 'compressing' ? '100%' : `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isUploading || isGenerating || isUploadingHero || !title || (!thumbnailUrl && !thumbnailFile && !heroImageUrl && existingImageUrls.length === 0)}
                className={`w-full ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6`}
              >
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  editingId ? 'Update Service' : 'Save Service'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Bottom: Active Services List */}
        <div className="w-full">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Active Services</h2>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <AlertCircle className="w-4 h-4" />
              <span>Drag to reorder within categories</span>
            </div>
          </div>

          {services.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
              <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-zinc-300 font-medium mb-1">No services yet</h3>
              <p className="text-zinc-500 text-sm">Add your first service using the form above.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {existingCategories.map(category => {
                const categoryServices = services.filter(s => s.category === category).sort((a, b) => a.rankOrder - b.rankOrder);
                if (categoryServices.length === 0) return null;
                
                return (
                  <div key={category} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-white mb-4 capitalize">{category}</h3>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={categoryServices.map(s => s.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
                          {categoryServices.map(service => (
                            <SortableServiceCard 
                              key={service.id} 
                              service={service} 
                              onDelete={(id) => setDeleteConfirmId(id)} 
                              onEdit={handleEdit}
                              isHighlighted={highlightedServiceId === service.id}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      )}

      {activeTab === 'locations' && (
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Form */}
        <div className="lg:col-span-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-32">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingLocId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-red-500" />}
                {editingLocId ? 'Edit Location' : 'Add New Location'}
              </h2>
              <div className="flex items-center gap-3">
                {!editingLocId && (
                  <button 
                    type="button"
                    onClick={fillKajangLocation}
                    className="text-xs bg-red-600/20 text-red-400 hover:bg-red-600/30 px-2 py-1 rounded border border-red-500/30 transition-colors"
                  >
                    Quick Add Kajang
                  </button>
                )}
                {(editingLocId || locForm.branchName) && (
                  <button onClick={resetLocForm} className="text-sm text-zinc-400 hover:text-white">Cancel</button>
                )}
              </div>
            </div>
            
            <form onSubmit={handleSaveLocation} className="space-y-4">
              {successMsg && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{errorMsg}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Branch Name</label>
                <input required type="text" value={locForm.branchName} onChange={e => setLocForm({...locForm, branchName: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. Klinik Ara 24 Jam (Shah Alam)" />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Branch Image</label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center">
                    {locImagePreview ? (
                      <img src={locImagePreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-700" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      {locImagePreview ? 'Change Image' : 'Upload Image'}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLocImageFile(file);
                          setLocImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Address</label>
                <textarea required value={locForm.address} onChange={e => setLocForm({...locForm, address: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors min-h-[80px]" placeholder="Full address..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Landmark Remark</label>
                <input type="text" value={locForm.landmark} onChange={e => setLocForm({...locForm, landmark: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. Next to Petronas, Opposite McDonalds" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Phone</label>
                  <input required type="text" value={locForm.phone} onChange={e => setLocForm({...locForm, phone: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. 03-1234 5678" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">WhatsApp</label>
                  <input required type="text" value={locForm.whatsapp} onChange={e => setLocForm({...locForm, whatsapp: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. 60123456789" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Operating Hours</label>
                <input required type="text" value={locForm.operatingHours} onChange={e => setLocForm({...locForm, operatingHours: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. Open 24 Hours" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Google Maps URL</label>
                <input required type="url" value={locForm.googleMapsUrl} onChange={e => setLocForm({...locForm, googleMapsUrl: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="https://maps.google.com/..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Waze URL</label>
                <input required type="url" value={locForm.wazeUrl} onChange={e => setLocForm({...locForm, wazeUrl: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="https://waze.com/ul/..." />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {editingLocId ? 'Update Location' : 'Save Location'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: List */}
        <div className="lg:col-span-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white">Active Locations</h2>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700">
                {locations.length} Total
              </span>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {locations?.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <p>No locations found.</p>
                  <p className="text-sm mt-1">Add your first clinic branch using the form.</p>
                </div>
              ) : (
                locations?.map(loc => (
                  <div key={loc.id} className="p-6 hover:bg-zinc-800/30 transition-colors group flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex gap-4 items-start">
                      {loc.imageUrl && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800">
                          <img src={loc.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{loc.branchName}</h3>
                        <p className="text-sm text-zinc-400 mb-2 max-w-md">{loc.address}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700">{loc.operatingHours}</span>
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded border border-zinc-700">{loc.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditLocation(loc)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" title="Edit">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteLocation(loc.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      )}

      {activeTab === 'panels' && (
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Form */}
        <div className="lg:col-span-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-32">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingPanelId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-red-500" />}
                {editingPanelId ? 'Edit Panel' : 'Add New Panel'}
              </h2>
              {editingPanelId && (
                <button onClick={resetPanelForm} className="text-sm text-zinc-400 hover:text-white">Cancel</button>
              )}
            </div>
            
            <form onSubmit={handleSavePanel} className="space-y-4">
              {successMsg && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{errorMsg}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Panel Name</label>
                <input required type="text" value={panelForm.name} onChange={e => setPanelForm({...panelForm, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. AIA, PMCare" />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Panel Logo</label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-white border border-zinc-800 overflow-hidden flex items-center justify-center p-2">
                    {panelImagePreview ? (
                      <img src={panelImagePreview} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-300" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      {panelImagePreview ? 'Change Logo' : 'Upload Logo'}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPanelImageFile(file);
                          setPanelImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wider">Available Locations</label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {locations.map(loc => (
                    <label key={loc.id} className="flex items-center gap-3 p-2 bg-zinc-950 border border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-700 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={panelForm.availableLocations.includes(loc.branchName)}
                        onChange={(e) => {
                          const updatedLocations = e.target.checked 
                            ? [...panelForm.availableLocations, loc.branchName]
                            : panelForm.availableLocations.filter(name => name !== loc.branchName);
                          setPanelForm({...panelForm, availableLocations: updatedLocations});
                        }}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-red-500 focus:ring-red-500"
                      />
                      <span className="text-sm text-zinc-300">{loc.branchName}</span>
                    </label>
                  ))}
                  {locations.length === 0 && <p className="text-xs text-zinc-500 italic">No locations added yet.</p>}
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {editingPanelId ? 'Update Panel' : 'Save Panel'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: List */}
        <div className="lg:col-span-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white">Accepted Panels</h2>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700">
                {panels.length} Total
              </span>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {panels.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p>No panels found.</p>
                  <p className="text-sm mt-1">Add your first insurance panel using the form.</p>
                </div>
              ) : (
                panels.map((panel, index) => (
                  <div 
                    key={panel.id} 
                    draggable
                    onDragStart={() => setDraggedPanelIndex(index)}
                    onDragOver={(e) => e.preventDefault()} // Required to allow dropping
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropReorder(index);
                    }}
                    className={`p-6 hover:bg-zinc-800/30 transition-all group flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center cursor-grab active:cursor-grabbing ${
                      draggedPanelIndex === index ? 'opacity-40 bg-zinc-800/50 border-dashed border border-zinc-600' : ''
                    }`}
                  >
                    <div className="flex gap-4 items-center">
                      {/* New Drag Handle Icon */}
                      <div className="text-zinc-600 group-hover:text-cyan-500 transition-colors pr-2">
                        <GripVertical className="w-5 h-5" />
                      </div>

                      {/* pointer-events-none prevents the browser from trying to drag the image file instead of the whole row */}
                      <div className="w-16 h-16 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-zinc-800 p-2 pointer-events-none">
                        <img src={panel.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="pointer-events-none">
                        <h3 className="text-lg font-bold text-white mb-1">{panel.name}</h3>
                        <p className="text-xs text-zinc-400 mb-2">
                          Accepted at: {panel.availableLocations?.length > 0 ? panel.availableLocations.join(', ') : 'No locations specified'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Original move buttons kept intact */}
                      <div className="flex items-center gap-1 mr-2 border-r border-zinc-800 pr-2">
                        <button 
                          onClick={() => handleMovePanel(panel.id, 'up')}
                          disabled={index === 0}
                          className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"
                          title="Move Up"
                        >
                          <ChevronLeft className="w-5 h-5 rotate-90" />
                        </button>
                        <button 
                          onClick={() => handleMovePanel(panel.id, 'down')}
                          disabled={index === panels.length - 1}
                          className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20 transition-colors"
                          title="Move Down"
                        >
                          <ChevronLeft className="w-5 h-5 -rotate-90" />
                        </button>
                      </div>
                      
                      <button onClick={() => handleEditPanel(panel)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" title="Edit">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeletePanel(panel.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      )}

      {activeTab === 'collaborators' && (
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Form */}
        <div className="lg:col-span-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-32">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                {editingCollabId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-red-500" />}
                {editingCollabId ? 'Edit Collaborator' : 'Add Collaborator'}
              </h2>
              {editingCollabId && (
                <button onClick={resetCollabForm} className="text-sm text-zinc-400 hover:text-white">Cancel</button>
              )}
            </div>
            
            <form onSubmit={handleSaveCollab} className="space-y-4">
              {successMsg && (
                <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>{errorMsg}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Name</label>
                <input required type="text" value={collabForm.name} onChange={e => setCollabForm({...collabForm, name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. Dr. Jane Doe, Klinik XYZ" />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Location / Area</label>
                <input required type="text" value={collabForm.location} onChange={e => setCollabForm({...collabForm, location: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500 transition-colors" placeholder="e.g. Bangi, Selangor" />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider">Image</label>
                <div className="mt-1 flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
                    {collabImagePreview ? (
                      <img src={collabImagePreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-zinc-500" />
                    )}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg border border-zinc-700 transition-colors flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      {collabImagePreview ? 'Change Image' : 'Upload Image'}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCollabImageFile(file);
                          setCollabImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {editingCollabId ? 'Update Collaborator' : 'Save Collaborator'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Col: List */}
        <div className="lg:col-span-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white">Keluarga TeamAra</h2>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700">
                {collaborators.length} Total
              </span>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {collaborators.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p>No collaborators found.</p>
                  <p className="text-sm mt-1">Add your first TeamAra member using the form.</p>
                </div>
              ) : (
                collaborators.map(collab => (
                  <div key={collab.id} className="p-6 hover:bg-zinc-800/30 transition-colors group flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                        <img src={collab.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{collab.name}</h3>
                        <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {collab.location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditCollab(collab)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" title="Edit">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteCollab(collab.id)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      )}

      {activeTab === 'vendors' && (
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {editingVendorId ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-red-500" />}
                {editingVendorId ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
              {editingVendorId && (
                <button onClick={resetVendorForm} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" /> Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Vendor Name</label>
                <input
                  type="text"
                  required
                  value={vendorForm.name}
                  onChange={e => setVendorForm({...vendorForm, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="e.g., Ara Cafe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Perks / Description</label>
                <textarea
                  required
                  rows={3}
                  value={vendorForm.perks}
                  onChange={e => setVendorForm({...vendorForm, perks: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none"
                  placeholder="e.g., 10% discount for TeamAra members"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Address</label>
                <input
                  type="text"
                  required
                  value={vendorForm.address}
                  onChange={e => setVendorForm({...vendorForm, address: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="e.g., 123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={vendorForm.phone}
                    onChange={e => setVendorForm({...vendorForm, phone: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder="e.g., 0123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Google Maps URL</label>
                  <input
                    type="url"
                    required
                    value={vendorForm.mapUrl}
                    onChange={e => setVendorForm({...vendorForm, mapUrl: e.target.value})}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Vendor Logo/Image</label>
                <div className="relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setVendorImageFile(file);
                        setVendorImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required={!editingVendorId && !vendorImagePreview}
                  />
                  <div className={`w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden ${vendorImagePreview ? 'border-red-500/50 bg-red-500/5' : 'border-zinc-800 bg-zinc-950 group-hover:border-zinc-700 group-hover:bg-zinc-900'}`}>
                    {vendorImagePreview ? (
                      <img src={vendorImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-zinc-400 transition-colors" />
                        <span className="text-sm text-zinc-500 group-hover:text-zinc-400 transition-colors">Click or drag to upload</span>
                        <span className="text-xs text-zinc-600 mt-1">PNG, JPG up to 5MB</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingVendorId ? 'Update Vendor' : 'Add Vendor')}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white">Vendor Directory</h2>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700">
                {vendors.length} Total
              </span>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {vendors.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p>No vendors found.</p>
                  <p className="text-sm mt-1">Add your first vendor using the form.</p>
                </div>
              ) : (
                vendors.map(vendor => (
                  <div key={vendor.id} className="p-6 hover:bg-zinc-800/30 transition-colors group flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                        <img src={vendor.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{vendor.name}</h3>
                        <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {vendor.address}
                        </p>
                        <p className="text-xs text-zinc-500">{vendor.perks}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEditVendor(vendor)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all" title="Edit">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDeleteVendor(vendor.id!)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      )}

      {activeTab === 'layout' && (
      <main className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GripVertical className="w-5 h-5 text-red-500" />
              Homepage Layout Manager
            </h2>
          </div>

          <div className="space-y-8">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-6">
              <h3 className="text-lg font-medium text-white mb-4 border-b border-zinc-800 pb-2">Subheadings</h3>
              
              {Array.from(new Set(services.map(s => s.category))).map(category => (
                <div key={String(category)}>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">{String(category)} Subheading</label>
                  <input
                    type="text"
                    value={settings.categorySubheadings?.[String(category)] || ''}
                    onChange={e => setSettings(prev => ({
                      ...prev,
                      categorySubheadings: { ...(prev?.categorySubheadings || {}), [String(category)]: e.target.value }
                    }))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder={`e.g., Explore our ${String(category)} packages`}
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">TeamAra Subheading</label>
                <input
                  type="text"
                  value={settings.teamAraSub || ''}
                  onChange={e => setSettings({...settings, teamAraSub: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="e.g., Exclusive health plans for your whole family"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Vendors Subheading</label>
                <input
                  type="text"
                  value={settings.vendorsSub || settings.vendorSubheading || ''}
                  onChange={e => setSettings({...settings, vendorsSub: e.target.value, vendorSubheading: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="e.g., Business entities providing perks to TeamAra members"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Panels Subheading</label>
                <input
                  type="text"
                  value={settings.panelsSub || ''}
                  onChange={e => setSettings({...settings, panelsSub: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="e.g., Click to see branch availability"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Reviews Subheading</label>
                <input
                  type="text"
                  value={settings.reviewsSub || ''}
                  onChange={e => setSettings({...settings, reviewsSub: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="e.g., Apa kata pesakit kami..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">Homepage Section Order</label>
              <div className="space-y-2">
                {settings.carouselOrder.map((section, index) => (
                  <div key={section} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
                    <span className="text-white font-medium capitalize">{section === 'teamAra' ? 'Keluarga TeamAra' : section}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => moveCarouselItem(index, 'up')}
                        disabled={index === 0}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveCarouselItem(index, 'down')}
                        disabled={index === settings.carouselOrder.length - 1}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <h3 className="text-lg font-medium text-white">Internal Applications (Special Access)</h3>
                <button 
                  onClick={addInternalApp}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add App
                </button>
              </div>
              
              <div className="space-y-6">
                {(settings.internalApps || []).map((app, index) => (
                  <div key={index} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl relative group">
                    <button 
                      onClick={() => removeInternalApp(index)}
                      className="absolute top-4 right-4 text-zinc-500 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">App Name</label>
                        <input
                          type="text"
                          value={app.name}
                          onChange={e => updateInternalApp(index, 'name', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-all"
                          placeholder="e.g., Inventory Management"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">App URL</label>
                        <input
                          type="text"
                          value={app.url}
                          onChange={e => updateInternalApp(index, 'url', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-all"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-zinc-500 mb-1 uppercase tracking-wider">Description</label>
                        <input
                          type="text"
                          value={app.description}
                          onChange={e => updateInternalApp(index, 'description', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-all"
                          placeholder="Short description of what this app does"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!settings.internalApps || settings.internalApps.length === 0) && (
                  <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                    No internal applications added yet.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSaveLayout}
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Layout'}
            </button>
          </div>
        </div>
      </main>
      )}

      {activeTab === 'reviews' && (
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              {editingReviewId ? <Edit2 className="w-5 h-5 text-blue-400" /> : <Plus className="w-5 h-5 text-red-500" />}
              {editingReviewId ? 'Edit Review' : 'Add New Review'}
            </h2>
            
            <form onSubmit={handleSaveReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Reviewer Name</label>
                <input 
                  type="text" 
                  required
                  value={reviewForm.reviewerName}
                  onChange={e => setReviewForm({...reviewForm, reviewerName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Branch Name</label>
                <select 
                  required
                  value={reviewForm.branchName}
                  onChange={e => setReviewForm({...reviewForm, branchName: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                >
                  <option value="">Select a branch...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.branchName}>{loc.branchName}</option>
                  ))}
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Review Text</label>
                <textarea 
                  required
                  rows={4}
                  value={reviewForm.reviewText}
                  onChange={e => setReviewForm({...reviewForm, reviewText: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none"
                  placeholder="Paste the review text here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Google Review URL</label>
                <input 
                  type="url" 
                  required
                  value={reviewForm.reviewUrl}
                  onChange={e => setReviewForm({...reviewForm, reviewUrl: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editingReviewId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setEditingReviewId(null);
                      setReviewForm({ reviewerName: '', reviewText: '', branchName: '', reviewUrl: '' });
                    }}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingReviewId ? 'Update Review' : 'Add Review')}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white">Google Reviews</h2>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700">
                {reviews.length} Total
              </span>
            </div>
            
            <div className="divide-y divide-zinc-800">
              {reviews.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <p>No reviews found.</p>
                  <p className="text-sm mt-1">Add your first review using the form.</p>
                </div>
              ) : (
                reviews.map(review => (
                  <div key={review.id} className="p-6 hover:bg-zinc-800/30 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">{review.reviewerName}</h3>
                        <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full border border-zinc-700">
                          {review.branchName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditReview(review)} className="p-2 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDeleteReview(review.id!)} className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 line-clamp-3 italic">"{review.reviewText}"</p>
                    <a 
                      href={review.reviewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-2 inline-block"
                    >
                      View on Google Maps
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
      )}

      {activeTab === 'leads' && (
        <main className="max-w-6xl mx-auto px-4 mt-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <h2 className="text-lg font-semibold text-white">Patient Leads</h2>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full border border-zinc-700">
                {leads.length} Total
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-900/50 border-b border-zinc-800 text-zinc-400 text-sm">
                    <th className="p-4 font-medium">Date/Time</th>
                    <th className="p-4 font-medium">Patient</th>
                    <th className="p-4 font-medium">Service</th>
                    <th className="p-4 font-medium">Branch</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-zinc-500">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertCircle className="w-8 h-8" />
                        </div>
                        <p>No patient leads found.</p>
                      </td>
                    </tr>
                  ) : (
                    leads.map(lead => {
                      const date = lead.timestamp?.toDate ? lead.timestamp.toDate() : new Date(lead.timestamp);
                      const formattedDate = date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
                      const formattedTime = date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
                      
                      const branchName = locations.find(l => l.id === lead.branchId)?.branchName || lead.branchId;

                      return (
                        <tr key={lead.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="p-4">
                            <div className="text-white font-medium">{formattedDate}</div>
                            <div className="text-zinc-500 text-sm">{formattedTime}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-white font-bold">{lead.name}</div>
                            <div className="text-zinc-400 text-sm">{lead.phone}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-zinc-300">{lead.service}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-zinc-300">{branchName}</div>
                          </td>
                          <td className="p-4">
                            {lead.status === 'new' ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                New
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                Contacted
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a 
                                href={`https://wa.me/${lead.phone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                </svg>
                                WhatsApp
                              </a>
                              {lead.status === 'new' && (
                                <button 
                                  onClick={() => handleMarkContacted(lead.id)}
                                  className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                  title="Mark as Contacted"
                                >
                                  <CheckCircle2 className="w-5 h-5" />
                                </button>
                              )}
                              <button 
                                onClick={() => setDeleteLeadConfirmId(lead.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {activeTab === 'staff' && currentAdminInfo?.role === 'superadmin' && (
        <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Col: Form */}
          <div className="lg:col-span-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-red-500" />
                  Add Staff Access
                </h2>
              </div>
              
              <form onSubmit={handleSaveStaff} className="space-y-5">
                {successMsg && (
                  <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-xl flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {successMsg}
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-xl flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Email Address *</label>
                  <input 
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={e => setStaffForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    placeholder="staff@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Role *</label>
                  <select 
                    required
                    value={staffForm.role}
                    onChange={e => setStaffForm(prev => ({ ...prev, role: e.target.value as 'superadmin' | 'branchadmin' }))}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  >
                    <option value="branchadmin">Branch Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>

                {staffForm.role === 'branchadmin' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1.5">Assigned Branch</label>
                    <select 
                      value={staffForm.branchId}
                      onChange={e => setStaffForm(prev => ({ ...prev, branchId: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                    >
                      <option value="">All Branches (No Restriction)</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.branchName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Access'}
                </button>
              </form>
            </div>
          </div>

          {/* Right Col: List */}
          <div className="lg:col-span-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <h2 className="text-lg font-semibold text-white">Staff Directory</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/50 text-zinc-400">
                    <tr>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Role</th>
                      <th className="p-4 font-medium">Assigned Branch</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {adminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-zinc-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <AlertCircle className="w-8 h-8 text-zinc-700" />
                            <p>No staff members found</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      adminUsers.map(admin => {
                        const branchName = admin.branchId ? locations.find(l => l.id === admin.branchId)?.branchName || 'Unknown Branch' : 'All Branches';
                        return (
                          <tr key={admin.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="p-4">
                              <div className="font-medium text-white">{admin.email}</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${admin.role === 'superadmin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                {admin.role === 'superadmin' ? 'Super Admin' : 'Branch Admin'}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-400">
                              {admin.role === 'superadmin' ? '-' : branchName}
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => setDeleteStaffConfirmId(admin.id!)}
                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete Access"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <button onClick={() => setDeleteConfirmId(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Service?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. This service will be removed from the public website immediately.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Panel Confirmation Modal */}
      {deletePanelConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <button onClick={() => setDeletePanelConfirmId(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Panel?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. This panel will be removed from the public website immediately.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletePanelConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletePanel}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Collaborator Confirmation Modal */}
      {deleteCollabConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <button onClick={() => setDeleteCollabConfirmId(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Collaborator?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. This collaborator will be removed from the public website immediately.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteCollabConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteCollab}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Location Confirmation Modal */}
      {deleteLocConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <button onClick={() => setDeleteLocConfirmId(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Location?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. This location will be removed from the public website immediately.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteLocConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteLocation}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Confirmation Modal */}
      {deleteLeadConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <button onClick={() => setDeleteLeadConfirmId(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Lead?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. This lead will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteLeadConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteLead}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {deleteStaffConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <button onClick={() => setDeleteStaffConfirmId(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Staff Access?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. This user will lose admin access immediately.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteStaffConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteStaff}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Review Confirmation Modal */}
      {deleteReviewConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <button onClick={() => setDeleteReviewConfirmId(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Review?</h3>
            <p className="text-zinc-400 text-sm mb-6">
              This action cannot be undone. This review will be removed from the public website immediately.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteReviewConfirmId(null)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteReview}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
