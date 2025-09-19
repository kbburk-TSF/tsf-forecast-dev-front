// DIAGNOSTIC api helper: reports full error details instead of generic 'Failed to fetch'.
const API_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_ENGINE_API_URL) ||
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ENGINE_API_URL) ||
  "";

// sanitize trailing slash
const BASE = API_BASE.replace(/\/$/, "");

export async function api(path, opts = {}) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
      ...opts,
    });
    const contentType = res.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      const detail = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(
        `HTTP ${res.status} ${res.statusText} for ${url}\n` +
        `Response: ${detail}`
      );
    }
    return body;
  } catch (err) {
    // Enrich network errors
    const e = err instanceof Error ? err : new Error(String(err));
    e.message = `[FETCH] ${url}\n${e.message}`;
    console.error(e);
    throw e;
  }
}

export async function get(path) {
  return api(path, { method: "GET" });
}

export async function post(path, data) {
  return api(path, { method: "POST", body: JSON.stringify(data || {}) });
}
