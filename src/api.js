import { API_BASE } from "./env.js";

async function jget(path){
  const r = await fetch(API_BASE + path);
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const endpoints = {
  health: () => jget("/health"),
  targets: (db) => jget(`/api/targets?db=${encodeURIComponent(db)}`),
  filters: (db, target) => jget(`/api/filters?db=${encodeURIComponent(db)}&target=${encodeURIComponent(target)}`),
};
