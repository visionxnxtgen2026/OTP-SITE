import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token and device ID
api.interceptors.request.use(
  (config) => {
    const jwt = useAuthStore.getState().jwt;
    if (jwt) {
      config.headers.Authorization = `Bearer ${jwt}`;
    }

    // Retrieve or generate a persistent device fingerprint
    let deviceId = localStorage.getItem('dds_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('dds_device_id', deviceId);
    }
    config.headers['x-device-id'] = deviceId;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to intercept session errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    
    // Auto-logout user if server returns 401 or 403 (unauthorized/restricted)
    if (status === 401 || status === 403) {
      console.warn('[API Client] Unauthorized request, logging out session.');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
