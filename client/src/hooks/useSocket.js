import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import { toast } from 'react-hot-toast';

/**
 * Custom React Hook to retrieve state from the central WebSocket connection.
 * Reuses the singleton socket connection managed under services/socket.js.
 */
export const useSocket = () => {
  const { jwt, isAuthenticated, mobileVerified, onlineCount, notifications, liveActivity } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !jwt || !mobileVerified) {
      disconnectSocket();
      return;
    }

    // Establish/reuse socket connection
    connectSocket(jwt);
    
    // We do NOT disconnect on cleanup because we want a single persistent
    // connection across tab switching (Dashboard, Inbox, Activity, Settings).
  }, [jwt, isAuthenticated, mobileVerified]);

  const sendHeartbeat = () => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('heartbeat', { timestamp: new Date() });
      toast.success('Heartbeat ping sent', {
        id: 'ping-toast',
        duration: 1000,
        style: {
          borderRadius: '20px',
          fontSize: '12px',
          padding: '4px 12px'
        }
      });
    } else {
      toast.error('Socket disconnected', { id: 'ping-toast' });
    }
  };

  return {
    onlineCount,
    notifications,
    liveActivity,
    sendHeartbeat
  };
};

export default useSocket;
