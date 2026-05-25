// Server-side seller signup. Uses Mercur's createSellerAccountWorkflow via the
// runtime workflow engine (no static import — avoids module-resolution issues).
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type SignupBody = {
  email: string
  password: string
  name: string
  handle: string
  phone: string
  whatsapp?: string
  default_city_id: string
  trade_license_number: string
  trade_license_expiry: string
  trade_license_url: string
}

const API_INTERNAL = "http://127.0.0.1:9000"

function decodeJwt(token: string): any {
  try {
    const [, payload] = token.split(".")
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"))
  } catch { return null }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = req.body as SignupBody
  if (!b?.email || !b?.password || !b?.name || !b?.handle || !b?.default_city_id) {
    return res.status(400).json({ message: "Missing required fields" })
  }

  try {
    // 1) Create the auth identity
    const regRes = await fetch(`${API_INTERNAL}/auth/seller/emailpass/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: b.email, password: b.password }),
    })
    const reg = await regRes.json()
    if (!regRes.ok || !reg.token) {
      return res.status(400).json({ message: reg.message || reg.type || "Account creation failed (email may already be in use)" })
    }
    const claims = decodeJwt(reg.token)
    const authIdentityId = claims?.auth_identity_id || claims?.sub
    if (!authIdentityId) {
      return res.status(500).json({ message: "Could not derive auth identity from token" })
    }

    // 2) Run the seller-account workflow via the workflows engine (no import needed)
    let sellerId: string | undefined
    try {
      const workflows: any = req.scope.resolve(Modules.WORKFLOW_ENGINE)
      const result: any = await workflows.run("create-seller-account", {
        input: {
          auth_identity_id: authIdentityId,
          member_email: b.email,
          first_name: b.name,
          last_name: null,
          seller: {
            name: b.name,
            handle: b.handle,
            email: b.email,
            phone: b.phone,
          },
        },
      })
      sellerId = result?.result?.id || result?.result?.seller?.id
    } catch (e: any) {
      // Fallback: write seller directly via PG (workflow can't be loaded)
      console.error("[seller-signup] workflow failed, falling back to PG:", e?.message || e)
    }

    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    if (!sellerId) {
      // Direct PG fallback — creates the seller without the full Mercur workflow
      // (no roles or members table — but admin will still see the row with pending license)
      sellerId = "sel_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
      const handle = b.handle
      await pg("seller").insert({
        id: sellerId,
        name: b.name,
        handle,
        email: b.email,
        phone: b.phone,
        currency_code: "aed",
        status: "pending_approval",
        is_premium: false,
        subscription_status: "trial",
      })
      // Also create member + seller_member link
      try {
        const memberId = "mem_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
        await pg("member").insert({
          id: memberId,
          email: b.email,
          first_name: b.name,
          is_active: true,
        })
        await pg("seller_member").insert({
          id: "smbr_" + Math.random().toString(36).slice(2, 14),
          seller_id: sellerId,
          member_id: memberId,
          is_owner: true,
        })
        // Link auth_identity → member via app_metadata + provider_identity
        await pg("auth_identity").where({ id: authIdentityId }).update({
          app_metadata: JSON.stringify({ seller_id: sellerId, actor_id: memberId, actor_type: "seller" }),
        })
        await pg("provider_identity")
          .where({ auth_identity_id: authIdentityId, provider: "emailpass" })
          .update({ entity_id: memberId })
      } catch (e: any) {
        console.error("[seller-signup] member linking warning:", e?.message)
      }
    }

    // 3) Write our extended fields
    await pg("seller").where({ id: sellerId }).update({
      company_phone: b.phone,
      company_whatsapp: b.whatsapp || b.phone,
      default_city_id: b.default_city_id,
      trade_license_number: b.trade_license_number,
      trade_license_expiry: b.trade_license_expiry,
      trade_license_url: b.trade_license_url,
      trade_license_verified: false,
      updated_at: new Date(),
    })

    return res.status(201).json({
      seller_id: sellerId,
      message: "Account created. Trade license pending admin verification.",
    })
  } catch (e: any) {
    console.error("[seller-signup]", e)
    return res.status(500).json({ message: e?.message || "Internal error" })
  }
}
