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

// Custom hook for Affiliate Tracking
function useAffiliateTracking() {
  useEffect(() => {
    // 1. Check the URL for a ?ref= parameter
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');

    // 2. Save to Memory if it exists
    if (refCode) {
      localStorage.setItem('ara_affiliate_code', refCode);
    }

    // Read the saved code
    const savedCode = localStorage.getItem('ara_affiliate_code');

    // 3. Modify Booking Links dynamically
    if (savedCode) {
      const modifyLinks = () => {
        // Find all links on the page
        const links = document.querySelectorAll('a');
        
        links.forEach(link => {
          // Check if the link is a booking link (adjust the condition based on your actual booking URL)
          // For example, checking if the text contains "Book Appointment" or "Tempah"
          const linkText = link.textContent?.toLowerCase() || '';
          if (
            linkText.includes('book appointment') || 
            linkText.includes('tempah') ||
            link.href.includes('wa.me') || // For WhatsApp booking links
            link.href.includes('arapower.hsohealthcare.com') // Booking portal domain
          ) {
            try {
              const url = new URL(link.href);
              // Only append if it doesn't already have the ref parameter
              if (!url.searchParams.has('ref')) {
                url.searchParams.set('ref', savedCode);
                link.href = url.toString();
              }
            } catch (e) {
              // Ignore invalid URLs
            }
          }
        });
      };

      // Run initially
      modifyLinks();

      // Since React is a Single Page Application (SPA) and renders dynamically,
      // we use a MutationObserver to watch for new links being added to the DOM
      const observer = new MutationObserver((mutations) => {
        let shouldModify = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            shouldModify = true;
            break;
          }
        }
        if (shouldModify) {
          modifyLinks();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Cleanup observer on unmount
      return () => observer.disconnect();
    }
  }, []);
}

export default function App() {
  useAffiliateTracking(); // Initialize the affiliate tracking

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
      <HelmetProvider>    {/* <--- ADD THIS LINE HERE */}
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
      </HelmetProvider>   {/* <--- ADD THIS LINE HERE */}
    </ErrorBoundary>
  );
}
