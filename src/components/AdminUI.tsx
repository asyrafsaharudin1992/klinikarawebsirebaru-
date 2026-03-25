import React, { useState, useEffect } from 'react';
import { User, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, addDoc, doc, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { Service, Location, Panel, Collaborator, handleFirestoreError, OperationType } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LogOut, Plus, GripVertical, Image as ImageIcon, Trash2, Loader2, AlertCircle, CheckCircle2, X, Edit2, Sparkles, MapPin } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { GoogleGenAI } from '@google/genai';

// Sortable Item Component (Row-based)
const SortableServiceItem: React.FC<{ service: Service, onDelete: (id: string) => void, onEdit: (service: Service) => void }> = ({ service, onDelete, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const displayImage = service.heroImageUrl || service.imageUrls?.[0] || service.imageUrl;

  return (
    <tr 
      ref={setNodeRef} 
      style={style} 
      className={`${isDragging ? 'bg-zinc-800 shadow-2xl z-10' : 'bg-zinc-900/50 hover:bg-zinc-800/50'} border-b border-zinc-800 transition-colors group`}
    >
      <td className="p-4 w-12">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 hover:bg-zinc-700 rounded-lg text-zinc-500 hover:text-white transition-colors">
          <GripVertical className="w-4 h-4" />
        </div>
      </td>
      <td className="p-4 w-20">
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 border border-zinc-700">
          {displayImage ? (
            <img src={displayImage} alt={service.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600"><ImageIcon className="w-5 h-5" /></div>
          )}
        </div>
      </td>
      <td className="p-4">
        <div className="font-medium text-white flex items-center gap-2">
          {service.title}
          {service.isFeatured && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">FEATURED</span>}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {service.price && `RM${service.price}`} {service.teamAraPrice && `(TeamAra: RM${service.teamAraPrice})`}
        </div>
      </td>
      <td className="p-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
          {service.category}
        </span>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(service)}
            className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
            title="Edit Service"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(service.id)}
            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            title="Delete Service"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminUI({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<'services' | 'locations' | 'panels' | 'collaborators' | 'leads'>('services');

  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLocConfirmId, setDeleteLocConfirmId] = useState<string | null>(null);
  const [deletePanelConfirmId, setDeletePanelConfirmId] = useState<string | null>(null);
  const [deleteCollabConfirmId, setDeleteCollabConfirmId] = useState<string | null>(null);
  const [deleteLeadConfirmId, setDeleteLeadConfirmId] = useState<string | null>(null);

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
    availableLocations: [] as string[]
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

  // Service Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('AraMommy');
  const [price, setPrice] = useState('');
  const [teamAraPrice, setTeamAraPrice] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
      
      setPanels(panelData);
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

    const qLeads = query(collection(db, 'leads'));
    const unsubscribeLeads = onSnapshot(qLeads, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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
      unsubscribeServices();
      unsubscribeLocations();
      unsubscribePanels();
      unsubscribeCollaborators();
      unsubscribeLeads();
    };
  }, []);

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
    setStartDate(service.startDate || '');
    setEndDate(service.endDate || '');
    setDescription(service.description || '');
    setIsFeatured(service.isFeatured || false);
    
    setHeroImageUrl(service.heroImageUrl || '');
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
    setStartDate('');
    setEndDate('');
    setDescription('');
    setIsFeatured(false);
    setExistingImageUrls([]);
    setImageFiles([]);
    setImagePreviews([]);
    setHeroImageUrl('');
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
      availableLocations: panel.availableLocations || []
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
      availableLocations: []
    });
    setPanelImageFile(null);
    setPanelImagePreview(null);
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
        imageUrl: finalImageUrl
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
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
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
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`;
      const storageRef = ref(storage, `promotions/${uniqueFileName}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);
      
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

      // 2. Upload Gallery Images
      if (imageFiles.length > 0) {
        setUploadStatus('compressing');
        const options = {
          maxSizeMB: 0.1, 
          maxWidthOrHeight: 1200,
          useWebWorker: true,
          initialQuality: 0.7,
        };
        
        setUploadStatus('uploading');
        
        const uploadPromises = imageFiles.map(async (file, index) => {
          const compressedFile = await imageCompression(file, options);
          const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`;
          const storageRef = ref(storage, `services/${uniqueFileName}`);
          const uploadTask = uploadBytesResumable(storageRef, compressedFile);

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
        price,
        teamAraPrice,
        startDate,
        endDate,
        description,
        isFeatured,
      };

      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), serviceData);
        setSuccessMsg('Service updated successfully!');
      } else {
        const newRankOrder = (services || []).length > 0 ? Math.max(...(services || []).map(s => s.rankOrder)) + 1 : 0;
        await addDoc(collection(db, 'services'), {
          ...serviceData,
          rankOrder: newRankOrder
        });
        setSuccessMsg('Service added successfully!');
      }

      resetForm();
      setTimeout(() => setSuccessMsg(null), 3000);
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
      const oldIndex = services.findIndex(s => s.id === active.id);
      const newIndex = services.findIndex(s => s.id === over.id);
      const newServices = arrayMove(services, oldIndex, newIndex) as Service[];
      setServices(newServices);
      try {
        const batch = writeBatch(db);
        newServices.forEach((service, index) => {
          const docRef = doc(db, 'services', service.id);
          batch.update(docRef, { rankOrder: index });
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, 'services', auth);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
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
            onClick={() => setActiveTab('leads')}
            className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'leads' ? 'border-red-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Patient Leads
          </button>
        </div>
      </header>

      {activeTab === 'services' && (
      <main className="max-w-6xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Form */}
        <div className="lg:col-span-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
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

              {/* Hero Banner Settings (Wide 16:9 Image) */}
              <div className="bg-zinc-950/50 border border-zinc-800/80 p-5 rounded-xl space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Hero Banner Settings (Wide 16:9 Image)</h3>
                </div>

                {/* Visual Feedback: Current Hero Banner */}
                <div className="space-y-2">
                  <p className="text-xs text-zinc-400 font-medium">Current Hero Banner Preview:</p>
                  {heroImageUrl ? (
                    <div className="w-full aspect-video rounded-lg overflow-hidden border border-purple-500/50 relative group">
                      <img src={heroImageUrl} alt="Current Hero" className="w-full h-full object-cover" />
                      <button type="button" onClick={removeHeroImage} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                  {/* Option 1: Pick from Uploaded Posters */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-300">Option 1: Pick from Uploaded Posters</h4>
                    {existingImageUrls.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {existingImageUrls.map((url, i) => (
                          <div key={`ext-hero-${i}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-700 group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-1">
                              <button type="button" onClick={() => setHeroImageUrl(url)} className="text-[10px] bg-white text-black px-2 py-1 rounded font-bold hover:bg-zinc-200 text-center w-full">
                                Set as Hero Banner
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">Upload gallery images below to pick one.</p>
                    )}
                  </div>

                  {/* Option 2: Upload a Custom Wide Image */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-300">Option 2: Upload a Custom Wide Image</h4>
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
                    <h4 className="text-sm font-medium text-zinc-300">Option 3: Generate with AI (Google Vertex/Imagen)</h4>
                    <textarea 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      rows={2}
                      disabled={isGenerating || isUploadingHero}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500 resize-none disabled:opacity-50"
                      placeholder="e.g., Warm photo of Malay doctor with healthy baby, smiling, cinematic lighting."
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
                        <p className="text-xs text-zinc-400 font-medium">Generated Preview:</p>
                        <img src={generatedImageBase64} alt="AI Preview" className="w-full aspect-video object-cover rounded border border-zinc-700" />
                        <button 
                          type="button"
                          onClick={() => {
                            setHeroImageUrl(generatedImageBase64);
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Confirm & Use This
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Gallery Images *</label>
                
                {/* Existing Images */}
                {existingImageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {existingImageUrls.map((url, i) => (
                      <div key={`ext-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeExistingImage(i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-3">
                    {imagePreviews.map((preview, i) => (
                      <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-green-500/50 group">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] px-1 font-bold">NEW</div>
                        <button type="button" onClick={() => removeNewImage(i)} className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-800 border-dashed rounded-xl hover:border-zinc-700 transition-colors relative overflow-hidden group">
                  <div className="space-y-1 text-center">
                    <ImageIcon className="mx-auto h-8 w-8 text-zinc-500" />
                    <div className="flex text-sm text-zinc-400 justify-center">
                      <span className="relative cursor-pointer bg-transparent rounded-md font-medium text-red-500 hover:text-red-400 focus-within:outline-none">
                        <span>Add images</span>
                      </span>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                </div>
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
                disabled={isUploading || isGenerating || isUploadingHero || !title || (existingImageUrls.length === 0 && imageFiles.length === 0 && !heroImageUrl)}
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

        {/* Right Col: Active Services List */}
        <div className="lg:col-span-7">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Active Services</h2>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <AlertCircle className="w-4 h-4" />
              <span>Drag to reorder</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 border-b border-zinc-800">
                  <th className="p-4 w-12"></th>
                  <th className="p-4 w-20 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Image</th>
                  <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Details</th>
                  <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                  <th className="p-4 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                      <h3 className="text-zinc-300 font-medium mb-1">No services yet</h3>
                      <p className="text-zinc-500 text-sm">Add your first service using the form.</p>
                    </td>
                  </tr>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={(services || []).map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {(services || []).map(service => (
                        <SortableServiceItem 
                          key={service.id} 
                          service={service} 
                          onDelete={(id) => setDeleteConfirmId(id)} 
                          onEdit={handleEdit}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </tbody>
            </table>
          </div>
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
                panels.map(panel => (
                  <div key={panel.id} className="p-6 hover:bg-zinc-800/30 transition-colors group flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-zinc-800 p-2">
                        <img src={panel.imageUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{panel.name}</h3>
                        <p className="text-xs text-zinc-400 mb-2">
                          Accepted at: {panel.availableLocations.length > 0 ? panel.availableLocations.join(', ') : 'No locations specified'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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
    </div>
  );
}
