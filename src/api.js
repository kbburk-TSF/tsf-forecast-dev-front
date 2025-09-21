import { API_BASE } from "./env.js";

export async function health(){
  const r = await fetch((API_BASE || "") + "/health");
  if(!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
}
