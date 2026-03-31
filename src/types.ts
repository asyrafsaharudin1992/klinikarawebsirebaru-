export interface Service {
  id: string;
  title: string;
  category: string;
  imageUrl?: string; // Legacy support
  imageUrls?: string[]; // Legacy support
  heroImageUrl?: string; // Zone 1: Horizontal Banner
  thumbnailUrl?: string; // Zone 2: Portrait Card
  modalImageUrls?: string[]; // Zone 3: Modal Gallery
  price: string;
  teamAraPrice: string;
  startDate: string;
  endDate: string;
  description: string;
  isFeatured: boolean;
  rankOrder: number;
  showTeamAraDisclaimer?: boolean;
}

export interface Location {
  id: string;
  branchName: string;
  address: string;
  phone: string;
  whatsapp: string;
  operatingHours: string;
  googleMapsUrl: string;
  wazeUrl: string;
  imageUrl?: string;
  landmark?: string;
}

export interface Panel {
  id: string;
  name: string;
  imageUrl: string;
  availableLocations: string[];
  rankOrder: number;
}

export interface Collaborator {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
}

export interface Vendor {
  id?: string;
  name: string;
  address: string;
  phone: string;
  mapUrl: string;
  imageUrl: string;
  perks: string;
}

export interface InternalApp {
  name: string;
  url: string;
  description: string;
}

export interface AppSettings {
  vendorSubheading: string;
  carouselOrder: string[];
  categorySubheadings?: Record<string, string>;
  teamAraSub?: string;
  panelsSub?: string;
  vendorsSub?: string;
  reviewsSub?: string;
  internalApps?: InternalApp[];
}

export interface GoogleReview {
  id?: string;
  reviewerName: string;
  reviewText: string;
  branchName: string; // e.g., "Kajang" or "Semenyih"
  reviewUrl: string; // The actual Google Maps review link
  createdAt?: any;
}

export interface AdminUser {
  id?: string;
  email: string;
  role: 'superadmin' | 'branchadmin';
  branchId?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo?: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, auth: any) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
