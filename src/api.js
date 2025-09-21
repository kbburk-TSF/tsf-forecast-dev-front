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
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const paramSel = doc.querySelector('select[name="parameter"], select#parameter, select#param');
  const stateSel = doc.querySelector('select[name="state"], select#state');
  const params = paramSel ? Array.from(paramSel.options).map(o => o.value).filter(Boolean) : [];
  const states = stateSel ? Array.from(stateSel.options).map(o => o.value).filter(Boolean) : [];
  return { params, states };
}
