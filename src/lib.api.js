export const API_BASE = "https://tsf-forecast-dev-backend.onrender.com";

export async function api(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
