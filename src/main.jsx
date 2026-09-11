import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import 'core-js/stable'
import 'regenerator-runtime/runtime'

// Global Fetch Interceptor: no caching — every GET fetches fresh so data is always
// real-time. It only adds reliability (concurrency limiting, bounded retries/timeouts,
// HTML-error-page guarding) and de-dupes truly simultaneous identical requests.
const originalFetch = window.fetch;

// De-duplicates identical GETs that are in flight at the same time. React StrictMode
// double-invokes effects (so every page fires its fetch twice) and multiple widgets can
// request the same sheet at once — without this each of those hits the network call.
// This is NOT a cache: the shared result is fresh server data and is discarded the moment
// the request settles, so every page always reads real-time data.
const inflight = new Map();

// Sheet-response caching has been removed so data is always real-time. This helper only
// scrubs any leftover app_cache_ entries written to localStorage by the previous
// (cached) version, so old data on a user's machine can't linger. Auth flows call it on
// login as an extra safety wipe.
const clearAllSheetCaches = () => {
  inflight.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('app_cache_')) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch { /* ignore */ }
};
if (typeof window !== 'undefined') window.clearAllSheetCaches = clearAllSheetCaches;

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
// bounded instead of 3+ minutes of silence.
//
// IMPORTANT: this must be comfortably LONGER than the slowest legitimate Google Apps Script
// response. Apps Script routinely takes 20-40s on a cold start, a large sheet, or when many
// users hit the same deployment at once (the concurrency limiter above can also queue a request
// behind others). A too-short timeout aborts the request just as valid data was about to arrive
// and throws it away — surfacing as "AbortError: signal is aborted without reason" and an empty
// screen. 45s leaves generous headroom so slow-but-valid responses complete instead of dying.
const ATTEMPT_TIMEOUT_MS = 45000;

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

window.fetch = async (...args) => {
  const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
  const options = args[1] || {};
  const isGet = !options.method || options.method === 'GET';
  const isPostOrMutation = options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase());

  // 1. If we are mutating data, drop any in-flight de-dupe and scrub leftover
  //    localStorage cache entries so the next loads are fresh.
  if (isPostOrMutation) {
    try {
      inflight.clear();
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
      // Caching disabled — every GET goes to the server so data is always real-time.
      // We still de-dupe identical concurrent GETs (React StrictMode double-invokes
      // effects, and multiple widgets can request the same sheet at once) so we don't
      // fire two identical network calls at the same instant, but nothing is stored:
      // the result is fresh server data every time, shared only across truly
      // simultaneous callers, then discarded.
      const safeUrlStr = encodeURIComponent(url);
      const dedupeKey = btoa(safeUrlStr).substring(0, 60) + safeUrlStr.length;

      if (inflight.has(dedupeKey)) {
        const text = await inflight.get(dedupeKey);
        return makeJsonResponse(text);
      }

      const fetchPromise = (async () => {
        const response = await fetchGetLimited(args);
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }
        const text = await response.text();
        // Guard: don't serve a Google HTML error page as if it were JSON.
        if (looksLikeHtml(text)) {
          throw new Error('Received HTML error page instead of data');
        }
        return text;
      })();
      inflight.set(dedupeKey, fetchPromise);

      try {
        const text = await fetchPromise;
        return makeJsonResponse(text);
      } finally {
        inflight.delete(dedupeKey);
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
