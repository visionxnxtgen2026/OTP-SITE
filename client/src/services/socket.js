import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

let socket = null;

/**
 * Initialize and connect WebSocket with JWT auth handshake.
 * Maps event listeners globally to the Zustand store once.
 */
export const connectSocket = (token) => {
  let deviceId = localStorage.getItem('dds_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('dds_device_id', deviceId);
  }

  if (socket) {
    // If the token changes (e.g. after phone verification or login/logout)
    if (socket.auth && (socket.auth.token !== token || socket.auth.deviceId !== deviceId)) {
      socket.auth.token = token;
      socket.auth.deviceId = deviceId;
      socket.disconnect();
      socket.connect();
    } else if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  socket = io(serverUrl, {
    auth: {
      token,
      deviceId
    },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000
  });

  // Bind Standard Socket events
  socket.on('connect', () => {
    console.log(`[Socket Client] Connected successfully (ID: ${socket.id})`);
    useAuthStore.getState().setSocketConnected(true);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[Socket Client] Disconnected (Reason: ${reason})`);
    useAuthStore.getState().setSocketConnected(false);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket Client] Connection error:', error.message);
    useAuthStore.getState().setSocketConnected(false);
    if (error.message.includes('Authentication') || error.message.includes('auth')) {
      toast.error('Session authentication failed. Logging out.');
      useAuthStore.getState().logout();
    }
  });

  // Bind Custom Project events
  socket.on('authenticated', (data) => {
    console.log('[Socket Client] Session validated:', data.message);
    if (data.onlineCount !== undefined) {
      useAuthStore.getState().setOnlineCount(data.onlineCount);
    }
    useAuthStore.getState().addLiveActivity({
      type: 'sys',
      message: 'Secure link established',
      time: new Date()
    });
  });

  socket.on('online-users-count', (count) => {
    useAuthStore.getState().setOnlineCount(count);
  });

  socket.on('user-online', (data) => {
    const displayPhone = data.phone || data.phoneNumber || 'User';
    toast.success(`DDS User went online: ${displayPhone}`, {
      icon: '⚡',
      style: {
        borderRadius: '12px',
        background: '#111827',
        color: '#fff',
        fontSize: '14px'
      }
    });
    useAuthStore.getState().addLiveActivity({
      type: 'online',
      message: `User ${displayPhone.slice(-4)} connected`,
      time: new Date()
    });
  });

  socket.on('user-offline', (data) => {
    const displayPhone = data.phone || data.phoneNumber || 'User';
    toast.error(`DDS User went offline: ${displayPhone}`, {
      icon: '🔌',
      style: {
        borderRadius: '12px',
        background: '#111827',
        color: '#fff',
        fontSize: '14px'
      }
    });
    useAuthStore.getState().addLiveActivity({
      type: 'offline',
      message: `User ${displayPhone.slice(-4)} disconnected`,
      time: new Date()
    });
  });

  socket.on('notification', (data) => {
    toast(data.message || 'Notification received', {
      icon: '🔔',
      style: {
        borderRadius: '12px',
        background: '#2563EB',
        color: '#fff',
        fontSize: '14px'
      }
    });
    useAuthStore.getState().addNotification(data);
    useAuthStore.getState().incrementUnreadCount();
  });

  socket.on('force-logout', (data) => {
    toast.error(`Logged out by Server: ${data.reason || 'Session ended'}`);
    useAuthStore.getState().logout();
  });

  socket.on('session-expired', (data) => {
    toast.error(data.message || 'Session expired');
    useAuthStore.getState().logout();
  });

  socket.on('mobile-verified', (data) => {
    toast.success('Mobile number verified & linked!', {
      icon: '🔒',
      style: {
        borderRadius: '12px',
        background: '#10B981',
        color: '#fff',
        fontSize: '14px'
      }
    });
    useAuthStore.getState().updateUserProfile({
      phoneNumber: data.phoneNumber,
      countryCode: data.countryCode,
      countryISO: data.countryISO,
      countryName: data.countryName,
      ddsId: data.ddsId,
      mobileVerified: true,
      phoneVerifiedAt: data.verifiedAt
    });
  });

  socket.on('verification-request', (data) => {
    // Inject client-side timestamp for "Requested At" display
    const enriched = {
      ...data,
      requestedAt: data.requestedAt || new Date().toISOString()
    };
    useAuthStore.getState().setActiveVerificationRequest(enriched);
    useAuthStore.getState().incrementUnreadCount();

    const appName = data.applicationName || data.clientName || 'An application';
    toast(`${appName} is requesting authentication`, {
      icon: '🔐',
      duration: 4000,
      style: {
        borderRadius: '14px',
        background: '#1E40AF',
        color: '#fff',
        fontSize: '13px',
        fontWeight: '600'
      }
    });
  });

  socket.on('verification-code-attached', (data) => {
    const active = useAuthStore.getState().activeVerificationRequest;
    if (active && (active.verificationRequestId === data.verificationRequestId || active.verificationId === data.verificationRequestId)) {
      const updated = {
        ...active,
        verificationCode: data.verificationCode,
        verificationCodeLength: data.verificationCodeLength,
        codeSubmitted: true
      };
      useAuthStore.getState().setActiveVerificationRequest(updated);
      toast.info('Verification code ready on developer website!', { icon: '🔢' });
    }
  });

  socket.on('verification-approved', (data) => {
    toast.success(`Identity request for ${data.clientName} APPROVED`, {
      icon: '✅'
    });
    useAuthStore.getState().setActiveVerificationRequest(null);
  });

  socket.on('verification-rejected', (data) => {
    toast.error(`Identity request for ${data.clientName} REJECTED`, {
      icon: '❌'
    });
    useAuthStore.getState().setActiveVerificationRequest(null);
  });

  return socket;
};

/**
 * Get currently active socket instance
 */
export const getSocket = () => socket;

/**
 * Disconnect socket and clear state
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket Client] Socket disconnected and cleared.');
  }
};

// Automatically disconnect the socket if the user logs out or becomes unverified
useAuthStore.subscribe((state) => {
  if (!state.jwt || !state.mobileVerified) {
    disconnectSocket();
  }
});
