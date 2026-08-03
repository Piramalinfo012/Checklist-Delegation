import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import 'core-js/stable'
import 'regenerator-runtime/runtime'

// Global Fetch Interceptor for Stale-While-Revalidate Caching
// This magically speeds up Google Apps Script requests from 15s to <1s across the entire application!
const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
  const options = args[1] || {};
  const isGet = !options.method || options.method === 'GET';
  const isPostOrMutation = options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase());

  // 1. If we are mutating data, clear all caches so next loads are fresh!
  if (isPostOrMutation) {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('app_cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error("Failed to clear cache", e);
    }
    return originalFetch(...args);
  }

  // 2. Only intercept Google Apps Script or Sheets GET queries
  if (isGet && (url.includes('script.google.com') || url.includes('docs.google.com/spreadsheets'))) {
    try {
      // Create a deterministic cache key
      const safeUrlStr = encodeURIComponent(url);
      const cacheKey = 'app_cache_' + (btoa(safeUrlStr).substring(0, 60) + safeUrlStr.length);
      const cachedText = localStorage.getItem(cacheKey);

      if (cachedText) {
        // We have cache!
        // Fire background fetch to keep cache fresh for the NEXT visit
        setTimeout(async () => {
          try {
            const bgResponse = await originalFetch(...args);
            if (bgResponse.ok) {
              const text = await bgResponse.text();
              localStorage.setItem(cacheKey, text);
            }
          } catch (e) {
            // Ignore background errors
          }
        }, 100);

        // Return a mock Response object instantly
        return new Response(cachedText, {
          status: 200,
          headers: new Headers({ 'Content-Type': 'application/json' })
        });
      } else {
        // First time load: Fetch normally, then cache it
        const response = await originalFetch(...args);
        if (response.ok) {
          const clone = response.clone();
          clone.text().then(text => {
            try {
              localStorage.setItem(cacheKey, text);
            } catch (quotaErr) {
              // Ignore quota errors
            }
          }).catch(e => {});
        }
        return response;
      }
    } catch (interceptorError) {
      console.error("Fetch interceptor error:", interceptorError);
      return originalFetch(...args);
    }
  }

  // 3. Passthrough for everything else
  return originalFetch(...args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
