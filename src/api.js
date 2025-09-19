import { API_BASE } from "./env";

async function http(path, init){
  const url = API_BASE + path;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init && init.headers ? init.headers : {}) },
    ...init,
  });
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("application/json") ? await res.json().catch(()=>({})) : await res.text().catch(()=> "");
  if(!res.ok){
    const detail = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`[HTTP ${res.status}] ${url}\n${detail}`);
  }
  return body;
}

export const api = {
  get: (p)=>http(p,{method:"GET"}),
  post: (p,d)=>http(p,{method:"POST", body: JSON.stringify(d || {})}),
};

export const endpoints = {
  health: ()=>api.get("/health"),
  targets: (db)=>api.get(`/data/${encodeURIComponent(db)}/targets`), // expects {targets:[...]}
  filters: (db,target)=>api.get(`/data/${encodeURIComponent(db)}/filters?target=${encodeURIComponent(target)}`), // expects {filters:{states:[...]}} 
  classicalStart: (payload)=>api.post("/classical/start", payload),
  classicalStatus: (jobId)=>api.get(`/classical/status?job_id=${encodeURIComponent(jobId)}`),
  classicalDownloadUrl: (jobId)=>`${API_BASE}/classical/download?job_id=${encodeURIComponent(jobId)}`,
  pipelineRun: (forecastId)=>api.post("/pipeline/run",{forecast_id:forecastId}),
  pipelineStatus: (runId)=>api.get(`/pipeline/status?run_id=${encodeURIComponent(runId)}`),
  pipelineRetry: (runId, phase)=>api.post("/pipeline/retry-phase",{run_id:runId,phase}),
};