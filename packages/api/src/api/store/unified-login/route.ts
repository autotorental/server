import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { rateLimited, clientIp } from "../../../lib/rate-limit"

const BASE = "http://127.0.0.1:9000"

function actorIdOf(token: string): string {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString("utf8"))
    return String(payload?.actor_id || "")
  } catch { return "" }
}

async function tryAuth(actor: string, email: string, password: string): Promise<{ token: string; actorId: string } | null> {
  try {
    const r = await fetch(`${BASE}/auth/${actor}/emailpass`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(15000),
    })
    if (!r.ok) return null
    const d: any = await r.json()
    if (!d?.token) return null
    return { token: d.token, actorId: actorIdOf(d.token) }
  } catch { return null }
}

// POST /store/unified-login  { email, password }
// One login for everyone. A Medusa auth identity can be shared across actor
// types, so we pick the role whose REAL record exists (non-empty actor_id),
// checking staff first so a vendor/admin isn't mistaken for a customer.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("unified_login", clientIp(req), 10, 60000)) return res.status(429).json({ message: "Too many attempts — wait a minute" })
  const { email, password } = (req.body || {}) as { email?: string; password?: string }
  if (!email || !password) return res.status(400).json({ message: "Email and password required" })

  const admin = await tryAuth("user", email, password)
  if (admin?.actorId) return res.json({ role: "admin", redirect: "https://admin.autotorental.com/dashboard" })

  const seller = await tryAuth("seller", email, password)
  if (seller?.actorId) return res.json({ role: "vendor", redirect: "https://partner.autotorental.com/rental" })

  const customer = await tryAuth("customer", email, password)
  if (customer?.actorId) return res.json({ role: "customer", token: customer.token })

  // Password matched a shared identity but no concrete record — treat as customer
  // sign-in token if any succeeded, else reject.
  if (customer?.token) return res.json({ role: "customer", token: customer.token })

  return res.status(401).json({ message: "Wrong email or password" })
}
