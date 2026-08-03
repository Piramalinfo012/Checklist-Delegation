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

// Concurrency limiter: caps how many requests THIS browser tab sends to Google at once.
// Google Apps Script web apps have a limited pool of simultaneous executions shared across
// EVERY user hitting the same deployment. With ~20 people using the app together, if each
// browser fires several requests at once (multiple widgets/tabs loading sheets in parallel),
// the shared pool fills up and Apps Script's redirect layer starts returning 404s to whoever
// missed the slot. Queuing requests locally (instead of firing them all instantly) keeps each
// client's contribution to that shared pool small and steady, so it stays healthy for everyone.
const MAX_CONCURRENT_SCRIPT_REQUESTS = 5;
let activeScriptRequests = 0;
const requestQueue = [];

const acquireSlot = () => new Promise((resolve) => {
  const tryAcquire = () => {
    if (activeScriptRequests < MAX_CONCURRENT_SCRIPT_REQUESTS) {
      activeScriptRequests++;
      resolve();
    } else {
      requestQueue.push(tryAcquire);
    }
  };
  tryAcquire();
});

const releaseSlot = () => {
  activeScriptRequests--;
  const next = requestQueue.shift();
  if (next) next();
};

// Per-attempt timeout: on mobile networks (slow/unstable cellular, or a very large sheet
// payload), a request can stall for minutes with no error and no response — nothing ever
// tells the browser to give up. Without a timeout, the page just sits on "Loading..." forever.
// Aborting a stuck attempt after ATTEMPT_TIMEOUT_MS and trying again keeps the worst case
// bounded to well under a minute instead of 3+ minutes of silence.
const ATTEMPT_TIMEOUT_MS = 20000;

const fetchWithTimeout = async (args, timeoutMs) => {
  // cache: 'no-store' forces every attempt to hit script.google.com/exec fresh instead of the
  // browser silently reusing an earlier attempt's cached 302 redirect. Google Apps Script's
  // redirect points to a one-time script.googleusercontent.com/macros/echo?... URL; if the
  // browser's HTTP cache replays that same (already-consumed) redirect target on a retry, it
  // 404s every time — which is exactly why a retry alone wasn't fixing repeated failures.
  if (typeof AbortController === 'undefined') {
    return originalFetch(args[0], { ...(args[1] || {}), cache: 'no-store' });
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const mergedArgs = [args[0], { ...(args[1] || {}), cache: 'no-store', signal: controller.signal }];
    return await originalFetch(...mergedArgs);
  } finally {
    clearTimeout(timeoutId);
  }
};

// Up to 3 total attempts with short, bounded delays (not exponential) — enough to smooth over
// an intermittent server-side hiccup we can't fix from the frontend, without the 30-45s stacking
// delay a longer exponential retry caused. If all 3 fail, that's surfaced immediately rather than
// continuing to retry indefinitely. Combined with the per-attempt timeout above, the absolute
// worst case (3 stalled attempts) is ~62s instead of hanging for minutes.
const GET_RETRY_DELAYS_MS = [400, 900];

const fetchGetLimited = async (args) => {
  await acquireSlot();
  try {
    let lastError;
    for (let attempt = 0; attempt <= GET_RETRY_DELAYS_MS.length; attempt++) {
      try {
        const response = await fetchWithTimeout(args, ATTEMPT_TIMEOUT_MS);
        if (response.ok) return response;
        lastError = new Error(`Request failed: ${response.status}`);
      } catch (err) {
        lastError = err;
      }
      if (attempt < GET_RETRY_DELAYS_MS.length) {
        await new Promise((r) => setTimeout(r, GET_RETRY_DELAYS_MS[attempt]));
      }
    }
    throw lastError;
  } finally {
    releaseSlot();
  }
};

const revalidateInBackground = (cacheKey, args) => {
  const now = Date.now();
  const last = lastRevalidated.get(cacheKey) || 0;
  // Skip if we already refreshed this URL very recently.
  if (now - last < REVALIDATE_INTERVAL_MS) return;
  lastRevalidated.set(cacheKey, now);

  setTimeout(async () => {
    try {
      const bgResponse = await fetchGetLimited(args);
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
    // Mutations are queued through the same concurrency limiter as reads (so this client never
    // bursts many simultaneous writes at Apps Script) but are NEVER auto-retried here — a write
    // may already have been processed server-side even if the response fails to come back, so
    // blindly retrying could double-submit. Pages that need write-retry safety (e.g. bulk image
    // uploads) implement their own idempotent retry already.
    await acquireSlot();
    try {
      return await originalFetch(...args);
    } finally {
      releaseSlot();
    }
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
        const response = await fetchGetLimited(args);
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
      // Last-resort fallback still goes through the timeout wrapper — otherwise this single
      // uncapped call could itself stall for minutes, undoing the whole point of the timeout above.
      return fetchWithTimeout(args, ATTEMPT_TIMEOUT_MS);
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
