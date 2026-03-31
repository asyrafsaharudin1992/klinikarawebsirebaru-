/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from './firebase';
import { getDoc, doc } from 'firebase/firestore';
import { ErrorBoundary } from './components/ErrorBoundary';
import PublicUI from './components/PublicUI';
import SharePage from './pages/SharePage';

const AdminUI = lazy(() => import('./components/AdminUI'));
const Login = lazy(() => import('./components/Login'));

const LoadingSpinner = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDoc(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setDbError("Firestore Database is not enabled. Please go to your Firebase Console, click 'Build' > 'Firestore Database', and click 'Create database' (Start in Test Mode).");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (dbError) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-red-500/30 p-6 rounded-xl max-w-lg w-full text-center">
          <h2 className="text-xl font-semibold text-red-500 mb-4">Connection Issue Detected</h2>
          <p className="text-zinc-300 mb-6 leading-relaxed">
            {dbError}
            <br /><br />
            <span className="text-sm text-zinc-400">
              If you have already created the database, your browser (like Brave Shields) or an adblocker might be blocking the connection.
            </span>
          </p>
          <div className="flex flex-col gap-3">
            <button
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              onClick={() => window.location.reload()}
            >
              I've enabled it, reload app
            </button>
            <button
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
              onClick={() => setDbError(null)}
            >
              Continue anyway (Ignore warning)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
   <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<PublicUI />} />
              <Route path="/share" element={<SharePage />} />
              <Route 
                path="/admin" 
                element={user ? <AdminUI user={user} /> : <Navigate to="/login" replace />} 
              />
              <Route 
                path="/login" 
                element={!user ? <Login /> : <Navigate to="/admin" replace />} 
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}
