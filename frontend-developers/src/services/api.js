import axios from 'axios';
import { useDevStore } from '../store/devStore';

// Get API base URL from environment
const rawBaseURL = import.meta.env.VITE_API_URL;

// Strip trailing '/api' if present so that relative endpoint paths starting with '/api/dev/...'\
// map cleanly to 'http://localhost:5000/api/dev/...'
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL.slice(0, -4) : rawBaseURL;

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach developer JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dev_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — call Zustand logout() which clears BOTH dev_token AND the
// persisted 'dds-dev-auth' store key. This sets isAuthenticated=false so
// ProtectedRoute redirects to /login via React Router without any page reload.
// A page reload (window.location.href) would re-hydrate Zustand from the
// stale persisted key and cause an infinite redirect loop.
let isHandling401 = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isHandling401) {
      isHandling401 = true;
      // Clear all auth state — Zustand persist + localStorage token
      useDevStore.getState().logout();
      // Reset flag after a tick so future legitimate 401s are handled
      setTimeout(() => { isHandling401 = false; }, 100);
    }
    return Promise.reject(error);
  }
);

export default api;
