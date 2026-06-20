/**
 * Centralized API configuration for SHUBHAM AI OS
 * All API calls must use this base URL to ensure fallback safety.
 */
export const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://shubham-ai-backend.onrender.com';

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Safe fetch wrapper — adds timeout, try/catch and a standard error shape.
 * Returns { data, error } — never throws.
 */
export async function safeFetch(path, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (path === '/api/chat') console.log("CHAT_REQUEST_SOURCE", window.location.pathname);
  if (path === '/api/system-command') console.log("SYSTEM_REQUEST_SOURCE", window.location.pathname);
  
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      credentials: 'omit',
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: `Server error ${res.status}: ${text || res.statusText}` };
    }

    const data = await res.json().catch(() => null);
    return { data, error: null };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      return { data: null, error: '⚠️ Request timed out. AI server may be starting up on Render.' };
    }
    return { data: null, error: '⚠️ AI server temporarily unavailable. Check your connection.' };
  }
}

/**
 * Keep-alive pinger — hits /api/ping every 4.5 minutes to prevent
 * Render free-tier dyno from sleeping (which causes 503 on CORS preflights).
 * Call once on app boot: keepAlive();
 */
export function keepAlive() {
  const INTERVAL_MS = 4.5 * 60 * 1000; // 4 minutes 30 seconds
  const ping = () => {
    fetch(`${API_URL}/api/ping`, { method: 'GET', credentials: 'omit' })
      .then(() => console.log('[keepAlive] ping ok'))
      .catch((e) => console.warn('[keepAlive] ping failed:', e.message));
  };
  ping(); // immediate first ping on boot
  setInterval(ping, INTERVAL_MS);
}
