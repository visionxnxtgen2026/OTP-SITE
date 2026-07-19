import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL;
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Inject stored admin JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dds_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// TODO: Replace this bypass with secure Admin authentication before production deployment.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Development mode bypass: do not force login redirect
    return Promise.reject(error);
  }
);

export default api;
