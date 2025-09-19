export const API_BASE = (
  (typeof import.meta !== "undefined" && import.meta && import.meta.env && (import.meta.env.VITE_ENGINE_API_URL || import.meta.env.VITE_BACKEND_URL)) ||
  (typeof process !== "undefined" && process && process.env && (process.env.NEXT_PUBLIC_ENGINE_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL)) ||
  "https://tsf-forecast-dev-backend.onrender.com"
).replace(/\/$/, "");