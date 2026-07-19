import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';

// Local Routes & State Stores
import { AppRoutes } from './routes/AppRoutes';
import { useAuthStore } from './store/authStore';
import { auth } from './services/firebase';

// Pages
import SplashScreen from './pages/SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const setFirebaseUser = useAuthStore((state) => state.setFirebaseUser);

  // Sync Firebase authentication state changes
  useEffect(() => {
    if (!auth) return;
    
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      console.log('[Firebase Auth] State changed: User is', fbUser ? 'Logged In' : 'Logged Out');
      setFirebaseUser(fbUser);
    });

    return () => unsubscribe();
  }, [setFirebaseUser]);

  return (
    // Outer viewport background (Light gray on desktop, hidden overflow)
    <div className="fixed inset-0 w-screen h-screen bg-[#F1F5F9] flex items-center justify-center overflow-hidden">
      
      {/* Toast Notification Container (remains on top) */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: '16px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            background: '#FFFFFF',
            color: '#111827',
            border: '1px solid rgba(229, 231, 235, 0.8)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.05)',
            padding: '12px 20px',
            zIndex: 99999
          },
          success: {
            iconTheme: {
              primary: '#2563EB',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      {/* Main Mobile App Bezel-free Chassis Container 
          - Mobile: occupies 100% width, 100% height, no margin, no bezel borders
          - Desktop (sm and up): centered, max-width 430px, rounded corners, soft shadow */}
      <div className="relative w-full h-full bg-[#F8FAFC] overflow-hidden flex flex-col sm:max-w-[430px] sm:h-[calc(100vh-32px)] sm:my-4 sm:rounded-[24px] sm:shadow-[0_20px_50px_rgba(0,0,0,0.1)] sm:border sm:border-gray-250/20">
        
        <AnimatePresence mode="wait">
          {showSplash ? (
            // 1. App Launch: Splash Screen
            <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
          ) : (
            // 2. Routing Views
            <BrowserRouter key="main-router">
              <AnimatePresence mode="wait">
                <AppRoutes />
              </AnimatePresence>
            </BrowserRouter>
          )}
        </AnimatePresence>
        
      </div>
    </div>
  );
}

export default App;
