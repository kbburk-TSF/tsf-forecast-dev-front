export function getApiBase() {
  const s = localStorage.getItem('tsf_api_base') || ''
  return s.trim()
}
export function setApiBase(v) {
  localStorage.setItem('tsf_api_base', (v || '').trim())
}
export async function apiGet(path) {
  const base = getApiBase()
  if (!base) throw new Error('Set API URL in Settings first')
  const res = await fetch(base.replace(/\/$/, '') + path)
  if (!res.ok) {
    const txt = await res.text().catch(()=> '')
    throw new Error(`GET ${path} -> ${res.status} ${res.statusText} ${txt}`)
  }
  return res.json()
}
