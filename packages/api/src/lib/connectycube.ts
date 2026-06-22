// ConnectyCube server-side helper. Keeps the Auth Secret on the server: the app
// (mobile / web) asks our backend for a short-lived ConnectyCube USER session
// token, then connects to ConnectyCube chat directly with that token.
import crypto from "crypto"

const HOST = "api.connectycube.com"
const appId = () => process.env.CONNECTYCUBE_APP_ID || ""
const authKey = () => process.env.CONNECTYCUBE_AUTH_KEY || ""
const authSecret = () => process.env.CONNECTYCUBE_AUTH_SECRET || ""

export const ccConfigured = () => !!(appId() && authKey() && authSecret())

function ccReq(method: string, path: string, token: string | null, body?: any): Promise<{ status: number; json: any }> {
  return new Promise((resolve) => {
    const https = require("https")
    const data = body ? JSON.stringify(body) : null
    const headers: any = { "Content-Type": "application/json" }
    if (token) headers["CB-Token"] = token
    if (data) headers["Content-Length"] = Buffer.byteLength(data)
    const r = https.request({ hostname: HOST, path, method, headers, timeout: 15000 }, (res: any) => {
      let b = ""
      res.on("data", (c: any) => (b += c))
      res.on("end", () => { try { resolve({ status: res.statusCode, json: JSON.parse(b) }) } catch { resolve({ status: res.statusCode, json: null }) } })
    })
    r.on("error", () => resolve({ status: 0, json: null }))
    r.on("timeout", () => { r.destroy(); resolve({ status: 0, json: null }) })
    if (data) r.write(data)
    r.end()
  })
}

// Sign params (incl. nested user[...]) — sort all flattened keys, HMAC-SHA1.
function sign(params: Record<string, any>): string {
  const flat: Record<string, any> = {}
  const walk = (obj: any, prefix: string) => {
    for (const k of Object.keys(obj)) {
      const key = prefix ? `${prefix}[${k}]` : k
      const v = obj[k]
      if (v && typeof v === "object") walk(v, key)
      else flat[key] = v
    }
  }
  walk(params, "")
  const str = Object.keys(flat).sort().map((k) => `${k}=${flat[k]}`).join("&")
  return crypto.createHmac("sha1", authSecret()).update(str).digest("hex")
}

async function appSession(): Promise<string> {
  const p = { application_id: appId(), auth_key: authKey(), nonce: Math.floor(Math.random() * 1e6), timestamp: Math.floor(Date.now() / 1000) }
  const r = await ccReq("POST", "/session.json", null, { ...p, signature: sign(p) })
  return r.json?.session?.token || ""
}

// Deterministic ConnectyCube login + password for an app user, so the same app
// user always maps to the same ConnectyCube user.
const ccLogin = (kind: string, id: string) => `atr_${kind}_${id}`.slice(0, 50)
const ccPassword = (id: string) => crypto.createHmac("sha256", authSecret()).update(id).digest("hex").slice(0, 24)

// Ensure a ConnectyCube user exists for this app user, then mint a USER session
// token. Returns { token, cc_user_id, app_id } for the client to connect to chat.
export async function mintChatToken(opts: { kind: "c" | "v"; id: string; name?: string }): Promise<{ ok: boolean; token?: string; cc_user_id?: number; app_id?: string; error?: string }> {
  if (!ccConfigured()) return { ok: false, error: "not_configured" }
  const login = ccLogin(opts.kind, opts.id)
  const password = ccPassword(opts.id)
  const appTok = await appSession()
  if (!appTok) return { ok: false, error: "app_session_failed" }
  // create user (ignore "already exists")
  await ccReq("POST", "/users.json", appTok, { user: { login, password, full_name: (opts.name || login).slice(0, 100) } })
  // mint user session
  const p: any = { application_id: appId(), auth_key: authKey(), nonce: Math.floor(Math.random() * 1e6), timestamp: Math.floor(Date.now() / 1000), user: { login, password } }
  const r = await ccReq("POST", "/session.json", null, { ...p, signature: sign(p) })
  const token = r.json?.session?.token
  const cc_user_id = r.json?.session?.user_id
  if (!token) return { ok: false, error: "user_session_failed" }
  return { ok: true, token, cc_user_id, app_id: appId() }
}

// Lightweight health check — mint an app session to confirm the keys work.
export async function ccPing(): Promise<{ ok: boolean; app_id: string }> {
  if (!ccConfigured()) return { ok: false, app_id: appId() }
  const t = await appSession()
  return { ok: !!t, app_id: appId() }
}

// Ensure a PEER ConnectyCube user (e.g. a seller) exists and return its id, so
// the requester can open a private dialog with them. (No token returned.)
export async function ensureCCUserId(opts: { kind: "c" | "v"; id: string; name?: string }): Promise<number | null> {
  if (!ccConfigured()) return null
  const login = ccLogin(opts.kind, opts.id)
  const password = ccPassword(opts.id)
  const appTok = await appSession()
  if (!appTok) return null
  await ccReq("POST", "/users.json", appTok, { user: { login, password, full_name: (opts.name || login).slice(0, 100) } })
  const p: any = { application_id: appId(), auth_key: authKey(), nonce: Math.floor(Math.random() * 1e6), timestamp: Math.floor(Date.now() / 1000), user: { login, password } }
  const r = await ccReq("POST", "/session.json", null, { ...p, signature: sign(p) })
  return r.json?.session?.user_id || null
}
