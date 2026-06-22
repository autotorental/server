import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import { exec } from "child_process"

// BTCPay (Bitcoin) is configured via env vars that medusa-config reads at boot.
// This admin route lets the owner set the BTCPay server + keys from the dashboard
// (written to .env) and restarts the API so the plugin loads them. Admin-only.
const ENV_PATH = "/opt/autorental/packages/api/.env"

const readVar = (name: string): string => {
  try {
    const t = fs.readFileSync(ENV_PATH, "utf8")
    const m = t.match(new RegExp("^" + name + "=(.*)$", "m"))
    return m ? m[1].trim() : ""
  } catch { return "" }
}

const setVars = (vars: Record<string, string>) => {
  let t = ""
  try { t = fs.readFileSync(ENV_PATH, "utf8") } catch {}
  for (const [k, v] of Object.entries(vars)) {
    const line = `${k}=${v}`
    const re = new RegExp("^" + k + "=.*$", "m")
    if (re.test(t)) t = t.replace(re, line)
    else t = t.replace(/\s*$/, "") + "\n" + line + "\n"
  }
  fs.writeFileSync(ENV_PATH, t)
}

// GET /admin/btcpay — config status (never returns secrets).
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const url = readVar("BTCPAY_URL")
  res.json({
    configured: !!url && !!readVar("BTCPAY_API_KEY"),
    url_set: !!url,
    url,
    api_key_set: !!readVar("BTCPAY_API_KEY"),
    store_id_set: !!readVar("BTCPAY_STORE_ID"),
    webhook_set: !!readVar("BTCPAY_WEBHOOK_SECRET"),
    webhook_url: "https://api.autotorental.com/hooks/payment/pp_btcpay_btcpay",
  })
}

// POST /admin/btcpay — owner saves BTCPay server + keys → .env → API restarts.
// Body: { url, api_key, store_id, webhook_secret }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b: any = req.body || {}
  const vars: Record<string, string> = {}
  if (typeof b.url === "string" && b.url.trim()) vars.BTCPAY_URL = b.url.trim().replace(/\/+$/, "")
  if (typeof b.api_key === "string" && b.api_key.trim()) vars.BTCPAY_API_KEY = b.api_key.trim()
  if (typeof b.store_id === "string" && b.store_id.trim()) vars.BTCPAY_STORE_ID = b.store_id.trim()
  if (typeof b.webhook_secret === "string" && b.webhook_secret.trim()) vars.BTCPAY_WEBHOOK_SECRET = b.webhook_secret.trim()

  if (b.disconnect === true) { vars.BTCPAY_URL = ""; vars.BTCPAY_API_KEY = ""; vars.BTCPAY_STORE_ID = ""; vars.BTCPAY_WEBHOOK_SECRET = "" }

  try { setVars(vars) } catch (e: any) { return res.status(500).json({ message: "Could not write config: " + (e?.message || "") }) }
  res.json({ ok: true, restarting: true })
  setTimeout(() => { try { exec("pm2 restart autorental-api --update-env", () => {}) } catch {} }, 700)
}
