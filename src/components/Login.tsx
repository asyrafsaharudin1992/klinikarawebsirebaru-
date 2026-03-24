import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, AlertCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginPopup = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/admin');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/network-request-failed') {
        setErrorMsg('Network error: This usually happens if a browser extension (like an ad blocker) or your browser settings are blocking the connection to Google. Try disabling ad blockers or use a different browser.');
      } else {
        setErrorMsg(error.message || 'Failed to log in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginRedirect = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
      // The page will redirect, so we don't need to navigate here
    } catch (error: any) {
      console.error('Login error:', error);
      setErrorMsg(error.message || 'Failed to initiate redirect. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-6">
          <Stethoscope className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Klinik Ara 24 Jam</h1>
        <p className="text-zinc-400 mb-8">Admin Dashboard Access</p>
        
        {errorMsg && (
          <div className="w-full bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6 text-sm text-left">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="font-semibold">Login Error</span>
            </div>
            <p className="mb-3">{errorMsg}</p>
            <div className="bg-black/20 p-3 rounded border border-red-500/20 text-xs text-red-400 space-y-2">
              <p><strong>Common Fixes:</strong></p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Disable Ad Blockers (uBlock, AdBlock Plus, etc.)</li>
                <li>Turn off Brave Shields or Safari "Prevent Cross-Site Tracking"</li>
                <li>Try <strong>Incognito/Private</strong> mode</li>
                <li>Open the app in a <strong>new tab</strong> using the button below</li>
              </ul>
            </div>
          </div>
        )}

        <div className="w-full space-y-3">
          <button
            onClick={handleLoginPopup}
            disabled={isLoading}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <GoogleIcon />
            )}
            {isLoading ? 'Signing in...' : 'Sign in with Google (Popup)'}
          </button>

          <button
            onClick={handleLoginRedirect}
            disabled={isLoading}
            className="w-full bg-zinc-800 text-white font-semibold py-3 px-4 rounded-xl hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <GoogleIcon />
            )}
            {isLoading ? 'Redirecting...' : 'Sign in with Google (Redirect)'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800 w-full">
          <a 
            href={window.location.href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Open app in new tab
          </a>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
