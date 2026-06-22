import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"
import { getClientIp, resolveCountryFromIp } from "../../../lib/geoip"
import { rateLimited, clientIp as rlIp } from "../../../lib/rate-limit"

const FIREBASE_LOOKUP_URL = "https://identitytoolkit.googleapis.com/v1/accounts:lookup"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("firebase_login", rlIp(req), 15, 60000)) return res.status(429).json({ message: "Too many attempts — please wait" })
  const body = (req.body || {}) as {
    id_token?: string
    idToken?: string
    role?: string
    name?: string
    phone?: string
    country?: string
  }

  const idToken = String(body.id_token || body.idToken || "").trim()
  const nameInput = String(body.name || "").trim()
  const phoneInput = String(body.phone || "").trim()

  if (!idToken) {
    return res.status(400).json({ message: "id_token is required" })
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY
  if (!apiKey) {
    return res.status(500).json({ message: "Firebase verification is not configured" })
  }

  let info: any
  try {
    const lookup = await fetch(`${FIREBASE_LOOKUP_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })
    const data: any = await lookup.json()
    info = data?.users?.[0]
  } catch (e) {
    return res.status(401).json({ message: "Failed to verify Firebase token" })
  }

  if (!info) {
    return res.status(401).json({ message: "Invalid Firebase token" })
  }

  let email = String(info.email || "").trim().toLowerCase()
  const phoneNumber = String(info.phoneNumber || phoneInput || "").trim()

  if (!email) {
    const digits = phoneNumber.replace(/[^0-9]/g, "")
    if (!digits) {
      return res.status(400).json({ message: "No email or phone associated with this account" })
    }
    email = `phone+${digits}@phone.autotorental.com`
  }

  const displayName = String(info.displayName || nameInput || "").trim()
  const parts = displayName ? displayName.split(" ") : []
  const firstName = parts.length ? parts[0] : ""
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : ""

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const customerModule: any = req.scope.resolve(Modules.CUSTOMER)
  const authService: any = req.scope.resolve(Modules.AUTH)

  let customer = await pg("customer").whereRaw("LOWER(email) = ?", [email]).first()
  if (!customer) {
    const created = await customerModule.createCustomers({
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phoneNumber || null,
      has_account: true,
    })
    customer = Array.isArray(created) ? created[0] : created
  }
  const customerId = customer.id

  // Record where the client signed in from (shown in admin → Customer Locations).
  const clientIp = getClientIp(req)
  void pg("customer")
    .where({ id: customerId })
    .update({
      metadata: pg.raw(
        "COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_ip', ?::text, 'last_seen_at', ?::text)",
        [clientIp, new Date().toISOString()]
      ),
      updated_at: new Date(),
    })
    .catch(() => {})
  void (async () => {
    try {
      const { country_code, country_name } = await resolveCountryFromIp(
        clientIp,
        req.headers as Record<string, unknown>
      )
      if (country_code) {
        await pg("customer")
          .where({ id: customerId })
          .update({
            metadata: pg.raw(
              "COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('last_country', ?::text, 'last_country_name', ?::text)",
              [country_code, country_name || ""]
            ),
          })
      }
    } catch {
      /* geo lookup is best-effort */
    }
  })()

  let authIdentityId: string | undefined
  const pi = await pg("provider_identity")
    .where("provider", "emailpass")
    .whereRaw("LOWER(entity_id) = ?", [email])
    .first()

  if (pi?.auth_identity_id) {
    authIdentityId = pi.auth_identity_id
  } else {
    const randomPassword = `Fb_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}!9`
    const reg = await authService.register("emailpass", {
      url: req.url,
      headers: req.headers,
      query: req.query,
      body: { email, password: randomPassword },
      protocol: req.protocol,
    })
    if (!reg.success || !reg.authIdentity?.id) {
      return res.status(500).json({ message: reg.error || "Failed to create auth identity" })
    }
    authIdentityId = reg.authIdentity.id
  }

  await pg("auth_identity")
    .where("id", authIdentityId)
    .update({
      app_metadata: pg.raw(
        "jsonb_set(COALESCE(app_metadata, '{}'::jsonb), '{customer_id}', ?::jsonb, true)",
        [JSON.stringify(customerId)]
      ),
    })

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).json({ message: "JWT secret is not configured" })
  }

  const token = jwt.sign(
    {
      actor_id: customerId,
      actor_type: "customer",
      auth_identity_id: authIdentityId,
      app_metadata: { customer_id: customerId },
      user_metadata: {},
    },
    secret,
    { expiresIn: "30d" }
  )

  return res.json({
    token,
    user: {
      id: customerId,
      email,
      name: displayName || null,
      role: "client",
      phone: phoneNumber || null,
    },
  })
}
