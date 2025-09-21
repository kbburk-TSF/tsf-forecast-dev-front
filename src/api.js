import { API_BASE } from "./env.js";

export async function health(){
  const r = await fetch((API_BASE || "") + "/health");
  if(!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}

export async function loadClassicalOptions(){
  const r = await fetch((API_BASE || "") + "/forms/classical", { headers: { "Accept": "text/html" } });
  if(!r.ok) throw new Error("HTTP " + r.status);
  const html = await r.text();

  // Parse server-rendered HTML safely
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Try common selectors used in your backend form
  const paramSel = doc.querySelector('select[name="parameter"], select#parameter, select#param');
  const stateSel = doc.querySelector('select[name="state"], select#state');

  const params = paramSel ? Array.from(paramSel.options).map(o => o.value).filter(Boolean) : [];
  const states = stateSel ? Array.from(stateSel.options).map(o => o.value).filter(Boolean) : [];

  // Fallback to a very broad regex scrape only if needed
  function regexGrab(idOrName){
    const selectRe = new RegExp(`<select[^>]*(?:name|id)=["']${idOrName}["'][\s\S]*?<\/select>`, "i");
    const m = html.match(selectRe);
    if(!m) return [];
    return Array.from(m[0].matchAll(/<option[^>]*value=["']([^"']+)["'][^>]*>/gi)).map(x => x[1]).filter(Boolean);
  }
  return {
    params: params.length ? params : regexGrab("parameter"),
    states: states.length ? states : regexGrab("state")
  };
}
