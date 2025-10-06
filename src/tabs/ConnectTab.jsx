// Self-contained tabs (no api.js dependency)
// Updated: 2025-10-06 01:16
// Endpoints used:
//   GET  {BACKEND}/health
//   GET  {BACKEND}/views/forecasts
//   GET  {BACKEND}/views/months?forecast_name=...
//   POST {BACKEND}/views/query   body: { forecast_name, month, span }

import React, { useState } from "react";

// ---- backend resolver & fetch helpers ----
import { API_BASE } from "../env.js"; // safe if present; ignored if not used

const BACKEND = (
  (typeof window !== "undefined" && window.__BACKEND_URL__) ||
  (typeof API_BASE !== "undefined" && API_BASE) ||
  "https://tsf-demand-back.onrender.com"
).replace(/\/$/, "");

async function httpGet(path) {
  const res = await fetch(`${BACKEND}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
async function httpPost(path, body) {
  const res = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


export default function ConnectTab(){
  const [status, setStatus] = useState("");
  const [details, setDetails] = useState("");

  async function check(){
    setStatus("checking...");
    try {
      const data = await httpGet("/health");
      setStatus("Healthy");
      setDetails(JSON.stringify(data));
    } catch (err) {
      setStatus("Error");
      setDetails(String(err && err.message || err));
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-sm opacity-70">Backend: {BACKEND}</div>
      <button onClick={check} className="px-3 py-2 rounded bg-black text-white">Check Health</button>
      <div className="text-sm">Status: {status}</div>
      {details && <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">{details}</pre>}
    </div>
  );
}
