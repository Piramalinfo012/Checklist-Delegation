import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import 'core-js/stable'
import 'regenerator-runtime/runtime'

// Global Fetch Interceptor for Stale-While-Revalidate Caching
// This magically speeds up Google Apps Script requests from 15s to <1s across the entire application!
const originalFetch = window.fetch;

// In-memory cache layer: fastest possible reads, survives localStorage quota errors,
// and (unlike localStorage) needs no parsing/decoding on every hit.
const memoryCache = new Map();
// De-duplicates identical GETs that are in flight at the same time. React StrictMode
// double-invokes effects (so every page fires its fetch twice) and multiple widgets can
// request the same sheet at once — without this each of those hits the 15s network call.
const inflight = new Map();
// Throttles background revalidation so rapid navigation doesn't spawn a storm of network calls.
const lastRevalidated = new Map();
const REVALIDATE_INTERVAL_MS = 30000;

const makeJsonResponse = (text) => new Response(text, {
  status: 200,
  headers: new Headers({ 'Content-Type': 'application/json' })
});

// A valid Sheets/Apps Script payload is JSON-ish, never an HTML page. If a response (or a stale
// cache entry) starts with '<' it's a Google error/login page — serving it would blow up the
// page's JSON.parse with "Unexpected token '<'". We detect and reject these instead of caching them.
const looksLikeHtml = (text) => typeof text === 'string' && text.trim().startsWith('<');

// NOTE: We deliberately do NOT retry / abort / hedge these requests. Google's Apps Script
// web app redirects through script.googleusercontent.com with single-use tokens, and firing
// retries (or extra parallel copies) makes that endpoint return 404. So each request is a
// single, clean fetch — speed comes purely from the cache layers below, never from retrying.

const revalidateInBackground = (cacheKey, args) => {
  const now = Date.now();
  const last = lastRevalidated.get(cacheKey) || 0;
  // Skip if we already refreshed this URL very recently.
  if (now - last < REVALIDATE_INTERVAL_MS) return;
  lastRevalidated.set(cacheKey, now);

  setTimeout(async () => {
    try {
      const bgResponse = await originalFetch(...args);
      if (bgResponse.ok) {
        const text = await bgResponse.text();
        // Don't let a transient HTML error page overwrite good cached data.
        if (!looksLikeHtml(text)) {
          memoryCache.set(cacheKey, text);
          try { localStorage.setItem(cacheKey, text); } catch (quotaErr) { /* ignore quota */ }
        }
      }
    } catch (e) {
      // Ignore background errors
    }
  }, 100);
};

window.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
  const options = args[1] || {};
  const isGet = !options.method || options.method === 'GET';
  const isPostOrMutation = options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase());

  // 1. If we are mutating data, clear all caches so next loads are fresh!
  if (isPostOrMutation) {
    try {
      memoryCache.clear();
      inflight.clear();
      lastRevalidated.clear();
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

      // 2a. Fastest path: serve from memory instantly.
      let cachedText = memoryCache.get(cacheKey);

      // 2b. Fall back to localStorage (persists across full page reloads) and warm the memory cache.
      if (cachedText === undefined) {
        const stored = localStorage.getItem(cacheKey);
        if (stored !== null) {
          cachedText = stored;
          memoryCache.set(cacheKey, stored);
        }
      }

      // 2b-guard. Never serve a poisoned (HTML error page) cache entry — purge it and refetch.
      if (cachedText !== undefined && looksLikeHtml(cachedText)) {
        memoryCache.delete(cacheKey);
        try { localStorage.removeItem(cacheKey); } catch (e) { /* ignore */ }
        cachedText = undefined;
      }

      if (cachedText !== undefined) {
        // We have cache! Return instantly and refresh in the background (throttled) for the next visit.
        revalidateInBackground(cacheKey, args);
        return makeJsonResponse(cachedText);
      }

      // 2c. First-time load with no cache. De-dupe concurrent identical requests so we only
      // ever pay the slow network cost once, then share the result with every caller.
      if (inflight.has(cacheKey)) {
        const text = await inflight.get(cacheKey);
        return makeJsonResponse(text);
      }

      const fetchPromise = (async () => {
        const response = await originalFetch(...args);
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const text = await response.text();
        // Guard: don't cache/serve a Google HTML error page as if it were JSON.
        if (looksLikeHtml(text)) {
          throw new Error('Received HTML error page instead of data');
        }
        memoryCache.set(cacheKey, text);
        try { localStorage.setItem(cacheKey, text); } catch (quotaErr) { /* ignore quota */ }
        return text;
      })();
      inflight.set(cacheKey, fetchPromise);

      try {
        const text = await fetchPromise;
        return makeJsonResponse(text);
      } finally {
        inflight.delete(cacheKey);
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
