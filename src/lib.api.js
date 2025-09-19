// DIAGNOSTIC api helper (plain JS) for Vite/ESBuild
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta &&
    import.meta.env &&
    import.meta.env.VITE_ENGINE_API_URL) ||
  (typeof process !== "undefined" &&
    process &&
    process.env &&
    process.env.NEXT_PUBLIC_ENGINE_API_URL) ||
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
    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json")
      ? await res.json().catch(() => ({}))
      : await res.text().catch(() => "");

    if (!res.ok) {
      const detail = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}\nResponse: ${detail}`);
    }
    return body;
  } catch (err) {
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
