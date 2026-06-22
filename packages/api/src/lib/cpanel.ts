// Shared cPanel mail helper. Config lives in app_setting.cpanel_mail (editable
// from the admin "Mail Server" page) so the API token can be rotated WITHOUT a
// code change or rebuild. Uses cPanel UAPI on :2083 (the correct port/scheme).
const KEY = "cpanel_mail"

export type CpanelConfig = { host: string; user: string; domain: string; token: string }
export const CPANEL_DEFAULTS: CpanelConfig = {
  host: process.env.CPANEL_HOST || "litespeed.alkhudarigroup.com",
  user: process.env.CPANEL_USER || "autotorental",
  domain: process.env.CPANEL_DOMAIN || "autotorental.com",
  token: process.env.CPANEL_TOKEN || "",
}

export async function loadCpanelConfig(pg: any): Promise<CpanelConfig> {
  try {
    const r = await pg("app_setting").where({ key: KEY }).first()
    if (r?.value) return { ...CPANEL_DEFAULTS, ...JSON.parse(r.value) }
  } catch { /* fall back to env/defaults */ }
  return { ...CPANEL_DEFAULTS }
}

export async function saveCpanelConfig(pg: any, cfg: CpanelConfig): Promise<void> {
  const value = JSON.stringify(cfg)
  const exists = await pg("app_setting").where({ key: KEY }).first()
  if (exists) await pg("app_setting").where({ key: KEY }).update({ value, is_secret: true, updated_at: new Date() })
  else await pg("app_setting").insert({ key: KEY, value, is_secret: true, updated_at: new Date() })
}

export function maskToken(t?: string): string {
  if (!t) return ""
  return t.length <= 6 ? "••••••" : `${t.slice(0, 3)}••••••${t.slice(-3)}`
}

async function uapi(cfg: CpanelConfig, fn: string, params: Record<string, string>, method: "GET" | "POST" = "GET") {
  const auth = { Authorization: `cpanel ${cfg.user}:${cfg.token}` }
  const base = `https://${cfg.host}:2083/execute/Email/${fn}`
  let res: Response
  if (method === "POST") {
    res = await fetch(base, { method: "POST", headers: { ...auth, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params), signal: AbortSignal.timeout(20000) })
  } else {
    res = await fetch(`${base}?${new URLSearchParams(params).toString()}`, { headers: auth, signal: AbortSignal.timeout(20000) })
  }
  const raw = await res.text()
  let json: any = null
  try { json = JSON.parse(raw) } catch { /* cPanel "Access denied" comes back as plain text */ }
  return { httpOk: res.ok, json, raw }
}

// Read-only connection test (list_pops). Returns a human-readable result.
export async function cpanelTest(cfg: CpanelConfig): Promise<{ ok: boolean; message: string }> {
  if (!cfg.token) return { ok: false, message: "No API token set yet" }
  if (!cfg.host || !cfg.user) return { ok: false, message: "Host and username are required" }
  try {
    const r = await uapi(cfg, "list_pops", { domain: cfg.domain })
    if (r.json && r.json.errors === null && Array.isArray(r.json.data)) {
      return { ok: true, message: `Connected ✓ — ${r.json.data.length} mailbox(es) on ${cfg.domain}` }
    }
    const txt = (r.raw || "").trim()
    if (/access denied/i.test(txt)) return { ok: false, message: "Access denied — check the username & API token (and any token IP restriction)." }
    return { ok: false, message: txt.slice(0, 160) || "Connection failed" }
  } catch (e: any) {
    return { ok: false, message: e?.message || "Connection failed" }
  }
}

// Create a mailbox. Returns { ok } or { ok:false, message } with the real error.
export async function cpanelAddPop(cfg: CpanelConfig, mailbox: string, password: string, quotaMb = 1024): Promise<{ ok: boolean; message?: string }> {
  if (!cfg.token) return { ok: false, message: "cPanel mail is not configured. Set the API token in Settings → Mail Server." }
  try {
    const r = await uapi(cfg, "add_pop", { email: mailbox, password, domain: cfg.domain, quota: String(quotaMb) }, "POST")
    if (r.json?.status === 1) return { ok: true }
    const err = (Array.isArray(r.json?.errors) && r.json.errors[0]) || (r.raw || "").trim().slice(0, 180) || "cPanel error"
    return { ok: false, message: String(err) }
  } catch (e: any) {
    return { ok: false, message: e?.message || "Connection failed" }
  }
}
