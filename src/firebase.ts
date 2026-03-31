import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Ensure databaseId is a string, fallback to undefined (default database) if not present
const databaseId = (firebaseConfig as any).firestoreDatabaseId || undefined;

// Use initializeFirestore with memoryLocalCache to avoid potential indexedDB issues in the iframe environment
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
}, databaseId);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
