/**
 * API base priority:
 * 1) Vite-style env: import.meta.env.VITE_API_BASE
 * 2) Next-style env: import.meta.env.NEXT_PUBLIC_BACKEND_URL
 * 3) Runtime global: window.__API_BASE__ (optional)
 * 4) Fallback: "" (same origin)
 */
export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.NEXT_PUBLIC_BACKEND_URL)) ||
  (typeof window !== "undefined" && window.__API_BASE__) ||
  "";
