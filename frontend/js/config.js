const API_URL = (typeof window !== 'undefined' && window.API_URL_OVERRIDE) 
  ? window.API_URL_OVERRIDE 
  : (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Base URL for static files (brochures, uploads, etc.)
const BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : window.location.origin;

// Register Service Worker for offline support and caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

function logout() {
  clearAuth();
  window.location.href = 'index.html';
}

// Debounce function for performance optimization
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll/resize events
function throttle(func, wait = 100) {
  let timeout;
  let lastRan;
  return function executedFunction(...args) {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if ((Date.now() - lastRan) >= wait) {
          func(...args);
          lastRan = Date.now();
        }
      }, wait - (Date.now() - lastRan));
    }
  };
}

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

function getCachedResponse(key) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  apiCache.delete(key);
  return null;
}

function setCachedResponse(key, data) {
  apiCache.set(key, { data, timestamp: Date.now() });
  // Auto-cleanup old cache entries
  if (apiCache.size > 100) {
    const firstKey = apiCache.keys().next().value;
    apiCache.delete(firstKey);
  }
}

async function apiCall(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });
    
    // Only auto-logout on 401 for critical endpoints, not background polling
    if (response.status === 401 && !endpoint.includes('check-updates')) {
      console.warn('Authentication failed, redirecting to login');
      clearAuth();
      window.location.href = 'index.html';
      return response;
    }
    
    return response;
  } catch (error) {
    console.error('API call failed:', endpoint, error);
    throw error;
  }
}
