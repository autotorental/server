import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fs from "fs"
import { exec } from "child_process"

// PayPal (Alphabite plugin) is configured via env vars that medusa-config reads
// at boot. This admin route lets the owner set the PayPal keys from the dashboard
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

// GET /admin/paypal — config status (never returns the secret).
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const clientId = readVar("PAYPAL_CLIENT_ID")
  res.json({
    configured: !!clientId && !!readVar("PAYPAL_CLIENT_SECRET"),
    client_id_set: !!clientId,
    client_id_preview: clientId ? `${clientId.slice(0, 6)}…${clientId.slice(-4)}` : "",
    secret_set: !!readVar("PAYPAL_CLIENT_SECRET"),
    webhook_set: !!readVar("PAYPAL_WEBHOOK_ID"),
    sandbox: readVar("PAYPAL_IS_SANDBOX") !== "false",
  })
}

// POST /admin/paypal — owner saves PayPal keys → written to .env → API restarts
// so the plugin activates. Body: { client_id, client_secret, webhook_id?, sandbox? }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b: any = req.body || {}
  const vars: Record<string, string> = {}
  if (typeof b.client_id === "string" && b.client_id.trim()) vars.PAYPAL_CLIENT_ID = b.client_id.trim()
  if (typeof b.client_secret === "string" && b.client_secret.trim()) vars.PAYPAL_CLIENT_SECRET = b.client_secret.trim()
  if (typeof b.webhook_id === "string") vars.PAYPAL_WEBHOOK_ID = b.webhook_id.trim()
  vars.PAYPAL_IS_SANDBOX = b.sandbox === false ? "false" : "true"

  if (b.disconnect === true) { vars.PAYPAL_CLIENT_ID = ""; vars.PAYPAL_CLIENT_SECRET = ""; vars.PAYPAL_WEBHOOK_ID = "" }

  try { setVars(vars) } catch (e: any) { return res.status(500).json({ message: "Could not write config: " + (e?.message || "") }) }
  res.json({ ok: true, restarting: true })
  // Restart after responding so the new env (and the PayPal provider) loads.
  setTimeout(() => { try { exec("pm2 restart autorental-api --update-env", () => {}) } catch {} }, 700)
}
