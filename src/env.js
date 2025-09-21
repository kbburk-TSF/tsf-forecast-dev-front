export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.NEXT_PUBLIC_BACKEND_URL)) ||
  (typeof window !== "undefined" && window.__API_BASE__) ||
  "";
