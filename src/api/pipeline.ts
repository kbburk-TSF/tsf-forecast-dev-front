// Minimal client for the pipeline API. Works with Vite or Next.js envs.
const base =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ENGINE_API_URL) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ENGINE_API_URL) ||
  "";

// Defensive: strip trailing slash
const BASE_URL = base.replace(/\/$/, "");

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function startRun(forecastId: string): Promise<{ run_id: string }> {
  return http("/pipeline/run", {
    method: "POST",
    body: JSON.stringify({ forecast_id: forecastId }),
  });
}

export interface PhaseRow {
  run_id: string;
  forecast_id: string;
  phase: "sr_s" | "sr_sq" | "sr_sqm" | "fc_ms" | "fc_msq" | "fc_msqm";
  status: "queued" | "running" | "done" | "error";
  started_at?: string | null;
  finished_at?: string | null;
  rows_written?: number | null;
  message?: string | null;
}

export interface RunHeader {
  run_id: string;
  forecast_id: string;
  status: "queued" | "running" | "done" | "error";
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  overall_error?: string | null;
}

export async function getStatus(runId: string): Promise<{ run: RunHeader; phases: PhaseRow[] }> {
  return http(`/pipeline/status?run_id=${encodeURIComponent(runId)}`);
}

export async function retryPhase(runId: string, phase: PhaseRow["phase"]): Promise<{ run_id: string; resumed_from: string }> {
  return http("/pipeline/retry-phase", {
    method: "POST",
    body: JSON.stringify({ run_id: runId, phase }),
  });
}
