import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BottomNavigation from './BottomNavigation';
import SecureApprovalPopup from './SecureApprovalPopup';
import { useSocket } from '../hooks/useSocket';

export const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();

  // Keep WebSocket session connected persistently
  useSocket();

  // Gesture swiping states
  const [xOffset, setXOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });

  const isHome = location.pathname === '/dashboard';
  const isBack = navType === 'POP';

  // Determine if bottom navigation is shown (Home, Inbox, Activity, Settings tabs)
  const showBottomNav = ['/dashboard', '/inbox', '/activity', '/settings'].includes(location.pathname);

  // Swipe Back Gesture Listeners
  const handleTouchStart = (e) => {
    if (isHome) return; // Disable swipe back on Home page
    const touch = e.touches[0];
    
    // Detect start within left 30px edge of screen
    if (touch.clientX < 30) {
      setIsSwiping(true);
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStart.x;
    const diffY = touch.clientY - touchStart.y;

    // Ignore accidental vertical scroll movements
    if (Math.abs(diffY) > Math.abs(diffX) && diffX < 10) {
      setIsSwiping(false);
      setXOffset(0);
      return;
    }

    if (diffX > 0) {
      setXOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    
    // Perform back navigation if dragged past 100px threshold
    if (xOffset > 100) {
      navigate(-1);
    }
    
    setIsSwiping(false);
    setXOffset(0);
  };

  // Framer Motion Page Transition Variants (Forward = slide left, Pop/Back = slide right)
  const pageVariants = {
    initial: (isBack) => ({
      x: isBack ? '-100%' : '100%',
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
    },
    exit: (isBack) => ({
      x: isBack ? '100%' : '-100%',
      opacity: 0,
      transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <div 
      className="w-full h-full flex flex-col bg-[#F8FAFC] relative overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Global verification popup overlay */}
      <SecureApprovalPopup />
      
      {/* Animated main viewport chassis */}
      <div 
        className="flex-grow overflow-hidden h-full relative"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 0px)',
          paddingBottom: showBottomNav ? 'calc(env(safe-area-inset-bottom) + 64px)' : 'calc(env(safe-area-inset-bottom) + 0px)'
        }}
      >
        <AnimatePresence mode="popLayout" initial={false} custom={isBack}>
          <motion.div
            key={location.pathname}
            custom={isBack}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 overflow-y-auto overflow-x-hidden w-full h-full scrollbar-none"
            style={{
              transform: xOffset > 0 ? `translateX(${xOffset}px)` : 'none',
              transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Nav Bar (Rendered only on primary dashboard tab views) */}
      {showBottomNav && <BottomNavigation />}
    </div>
  );
};

export default AppLayout;
