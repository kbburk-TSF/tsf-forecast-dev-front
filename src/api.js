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

/* ---------- Views API ---------- */

export async function fetchViewsMeta(){
  const r = await fetch((API_BASE || "") + "/views/meta");
  if(!r.ok) throw new Error("HTTP " + r.status);
  return r.json(); // { scopes, models, series, most_recent? }
}

export async function listForecastIds({ scope, model, series }){
  const q = new URLSearchParams({ scope, model: model || "", series: series || "" });
  const r = await fetch((API_BASE || "") + "/views/ids?" + q.toString());
  if(!r.ok) throw new Error("HTTP " + r.status);
  return r.json(); // ["uuid", ...] newest-first
}

export async function queryView({ scope, model, series, forecast_id, date_from, date_to, page = 1, page_size = 2000 }){
  const r = await fetch((API_BASE || "") + "/views/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope, model, series, forecast_id, date_from, date_to, page, page_size })
  });
  if(!r.ok) throw new Error("HTTP " + r.status);
  return r.json(); // { rows, total }
}
