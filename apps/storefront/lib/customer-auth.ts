// Client-side customer auth backed by Medusa's built-in customer auth
// (/auth/customer/emailpass + /store/customers). Token kept in localStorage.
const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""
const TKEY = "atr_customer_token"

export type Customer = {
  id: string
  email: string
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
}

export function getToken(): string | null {
  try { return localStorage.getItem(TKEY) } catch { return null }
}
function setToken(t: string) { try { localStorage.setItem(TKEY, t) } catch {} }
export function clearToken() { try { localStorage.removeItem(TKEY) } catch {} }

function authHeaders(token?: string): Record<string, string> {
  const t = token || getToken()
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": KEY,
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  }
}

export async function login(email: string, password: string): Promise<void> {
  const r = await fetch(`${API}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const d = await r.json().catch(() => ({} as any))
  if (!r.ok || !d.token) throw new Error(d.message || "Invalid email or password")
  setToken(d.token)
}

// One login for everyone — detects the role (customer / vendor / admin) and
// either signs the customer in here or returns where to send staff.
export async function unifiedLogin(email: string, password: string): Promise<{ role: string; redirect?: string }> {
  const r = await fetch(`${API}/store/unified-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": KEY },
    body: JSON.stringify({ email, password }),
  })
  const d = await r.json().catch(() => ({} as any))
  if (!r.ok) throw new Error(d.message || "Wrong email or password")
  if (d.role === "customer" && d.token) { setToken(d.token); return { role: "customer" } }
  return { role: d.role, redirect: d.redirect }
}

export async function register(
  email: string,
  password: string,
  first_name: string,
  last_name: string,
  phone?: string
): Promise<void> {
  // 1) obtain an auth token for this new identity
  const r = await fetch(`${API}/auth/customer/emailpass/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const d = await r.json().catch(() => ({} as any))
  if (!r.ok || !d.token) throw new Error(d.message || "This email may already be registered. Try signing in.")
  const token = d.token
  // 2) create the customer profile with that token
  const cr = await fetch(`${API}/store/customers`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ email, first_name, last_name, ...(phone ? { phone } : {}) }),
  })
  if (!cr.ok) {
    const cd = await cr.json().catch(() => ({} as any))
    throw new Error(cd.message || "Could not create your profile")
  }
  // The register token was issued before the customer was linked; re-login to
  // get a fresh token that resolves /store/customers/me.
  await login(email, password)
}

export async function getMe(): Promise<Customer | null> {
  if (!getToken()) return null
  const r = await fetch(`${API}/store/customers/me`, { headers: authHeaders() })
  if (!r.ok) { if (r.status === 401) clearToken(); return null }
  const d = await r.json().catch(() => ({} as any))
  return d.customer || null
}

export async function updateMe(patch: {
  first_name?: string
  last_name?: string
  phone?: string
}): Promise<Customer | null> {
  const r = await fetch(`${API}/store/customers/me`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(patch),
  })
  const d = await r.json().catch(() => ({} as any))
  if (!r.ok) throw new Error(d.message || "Could not save your profile")
  return d.customer || null
}
