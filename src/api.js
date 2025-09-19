// API client with robust base resolution + fallback
export const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta &&
    import.meta.env &&
    (import.meta.env.VITE_ENGINE_API_URL || import.meta.env.VITE_BACKEND_URL)) ||
  (typeof process !== "undefined" &&
    process &&
    process.env &&
    (process.env.NEXT_PUBLIC_ENGINE_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL)) ||
  "https://tsf-forecast-dev-backend.onrender.com"; // fallback hardcoded

const BASE = (API_BASE || "").replace(/\/$/, "");

async function http(path, init) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init && init.headers ? init.headers : {}) },
    ...init,
  });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");
  if (!res.ok) {
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}\nResponse: ${detail}`);
  }
  return body;
}

export const api = {
  get: (p) => http(p, { method: "GET" }),
  post: (p, data) => http(p, { method: "POST", body: JSON.stringify(data || {}) }),
};

// Convenience wrappers for known endpoints
export const endpoints = {
  health: () => api.get("/health"),
  dataTargets: (db) => api.get(`/data/${encodeURIComponent(db)}/targets`),
  dataFilters: (db, target) => api.get(`/data/${encodeURIComponent(db)}/filters?target=${encodeURIComponent(target)}`),
  classicalProbe: (params) => api.get(`/classical/probe?${params}`),
  classicalStart: (payload) => api.post(`/classical/start`, payload),
  classicalStatus: (jobId) => api.get(`/classical/status?job_id=${encodeURIComponent(jobId)}`),
  classicalDownload: (jobId) => `${BASE}/classical/download?job_id=${encodeURIComponent(jobId)}`,
  pipelineRun: (forecastId) => api.post(`/pipeline/run`, { forecast_id: forecastId }),
  pipelineStatus: (runId) => api.get(`/pipeline/status?run_id=${encodeURIComponent(runId)}`),
  pipelineRetry: (runId, phase) => api.post(`/pipeline/retry-phase`, { run_id: runId, phase }),
};
