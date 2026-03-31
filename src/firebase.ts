import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAmmSouC3QXrUa0cTkaNMOJ_vWZA26w9VQ",
  authDomain: "new-website-7b8dd.firebaseapp.com",
  projectId: "new-website-7b8dd",
  storageBucket: "new-website-7b8dd.firebasestorage.app",
  messagingSenderId: "81459036171",
  appId: "1:81459036171:web:a2ffb5c0d1be12a177470e",
  measurementId: "G-DYRMRJ7SHN"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
