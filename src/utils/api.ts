import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip auth redirect in development mode
    const isDevelopment = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    
    // Check if this error should be silently handled
    const isSilent = error.config?.headers?.['X-Silent-Error'] === 'true';
    
    if (error.response?.status === 401 && !isDevelopment && !isSilent) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    
    // Don't show toast for silent errors or network/connection errors
    if (!isSilent) {
      const message = error.response?.data?.message || error.message || 'An error occurred';
      
      // Check if it's a network error (backend not available)
      const isNetworkError = 
        error.code === 'ERR_NETWORK' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ERR_CONNECTION_REFUSED' ||
        message.includes('Network Error') ||
        message.includes('connect ECONNREFUSED') ||
        message.includes('ERR_CONNECTION_REFUSED') ||
        !error.response; // No response means network issue
      
      // Only show toast if it's not a network error OR we're in production
      if (!isNetworkError || !isDevelopment) {
        // Don't show generic network errors in development
        if (!isDevelopment || error.response) {
          toast.error(message);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;