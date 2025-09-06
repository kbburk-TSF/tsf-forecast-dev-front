export const API_BASE = "https://tsf-forecast-dev-backend.onrender.com";

export async function api(path, opts) {
  const res = await fetch(API_BASE + path, opts);
  if (!res.ok) throw new Error(await res.text());
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}
