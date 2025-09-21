import { API_BASE } from "./env.js";

export async function health(){
  const r = await fetch((API_BASE || "") + "/health");
  if(!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

/**
 * Load parameter/state options by fetching the server-rendered HTML form
 * and scraping the <option> values. This avoids needing a separate JSON API.
 */
export async function loadClassicalOptions(){
  const r = await fetch((API_BASE || "") + "/forms/classical", { headers: { "Accept": "text/html" } });
  if(!r.ok) throw new Error("HTTP " + r.status);
  const html = await r.text();
  const params = Array.from(html.matchAll(/<select[^>]*id=["']param["'][\s\S]*?<\/select>/i))
    .flatMap(m => Array.from(m[0].matchAll(/<option[^>]*value=["']([^"']+)["'][^>]*>(.*?)<\/option>/gi)).map(x => x[1]));
  const states = Array.from(html.matchAll(/<select[^>]*id=["']state["'][\s\S]*?<\/select>/i))
    .flatMap(m => Array.from(m[0].matchAll(/<option[^>]*value=["']([^"']+)["'][^>]*>(.*?)<\/option>/gi)).map(x => x[1]));
  return { params, states };
}
