// Server-side seller signup. Uses Mercur's createSellerAccountWorkflow via the
// runtime workflow engine (no static import — avoids module-resolution issues).
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { Resend } from "resend"
import { ipToCountry, getClientIp } from "../../../lib/geoip"

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
const FROM = process.env.RESEND_FROM || "Auto to Rental <info@autotorental.com>"
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "sirizone.com@gmail.com"

function decodeJwt(token: string): any {
  try {
    const [, payload] = token.split(".")
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"))
  } catch { return null }
}

async function sendAdminNotification(sellerName: string, sellerEmail: string, licenseNumber: string) {
  const apiKey = process.env.RESEND_API_KEY || ""
  if (!apiKey) return
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM,
      to: [ADMIN_EMAIL],
      subject: `New Company Signup: ${sellerName}`,
      html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;background:#f4f5f7">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e4e9">
      <tr><td style="padding:32px">
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin:0 0 4px">New Company Registration</p>
        <h2 style="margin:0 0 20px;color:#0f172a">${sellerName}</h2>
        <table width="100%" cellpadding="8" cellspacing="0" style="font-size:14px;color:#334155">
          <tr><td style="border-bottom:1px solid #f1f5f9;font-weight:600;color:#64748b;width:100px">Email</td><td style="border-bottom:1px solid #f1f5f9">${sellerEmail}</td></tr>
          <tr><td style="border-bottom:1px solid #f1f5f9;font-weight:600;color:#64748b">License</td><td style="border-bottom:1px solid #f1f5f9">${licenseNumber}</td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:24px 0 8px">
            <a href="https://admin.autotorental.com/sellers" style="display:inline-block;background:#1753b0;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:8px;font-size:14px">Review in Admin Panel</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
    })
    console.log(`[seller-signup] admin notified about ${sellerName}`)
  } catch (e: any) {
    console.error("[seller-signup] admin notification failed:", e?.message)
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = req.body as SignupBody
  if (!b?.email || !b?.password || !b?.name || !b?.handle) {
    return res.status(400).json({ message: "Missing required fields" })
  }

  // Auto-detect country from IP if city not provided
  if (!b?.default_city_id) {
    try {
      const ip = getClientIp(req)
      const countryCode = await ipToCountry(ip)
      if (countryCode) {
        const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
        const cities = await pg("city").where({ country_code: countryCode, is_active: true }).orderBy("sort_order", "asc").limit(1).select("id")
        if (cities.length) {
          b.default_city_id = cities[0].id
        }
      }
    } catch (e: any) {
      console.error("[seller-signup] country detect error:", e?.message)
    }
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

    // 4) Notify admin of new signup
    sendAdminNotification(b.name, b.email, b.trade_license_number)

    return res.status(201).json({
      seller_id: sellerId,
      message: "Account created. Trade license pending admin verification.",
    })
  } catch (e: any) {
    console.error("[seller-signup]", e)
    return res.status(500).json({ message: e?.message || "Internal error" })
  }
}
