import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createSellerAccountWorkflow } from "@mercurjs/core/workflows/seller/workflows/create-seller-account"
import { ipToCountry, getClientIp } from "./geoip"
import { sendEmail, isEmailConfiguredForScope } from "./email"
import { linkSellerAuthIdentity, resolveSellerAuthByEmail } from "./link-seller-auth"
import { notifyAdminFeed } from "./admin-feed"

export type SellerSignupBody = {
  email: string
  password: string
  name: string
  handle: string
  phone: string
  whatsapp?: string
  default_city_id?: string
  country?: string
  city_name?: string
  trade_license_number: string
  trade_license_expiry: string
  trade_license_url: string
}

const FROM = process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.RESEND_FROM || "Auto to Rental <info@autotorental.com>"
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || "admin@autotorental.com"

class SellerSignupConflictError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = "SellerSignupConflictError"
    this.status = 409
  }
}

function newId(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
}

/** Mercur requires URL-safe handles; derive from name when user enters spaces/symbols. */
export function slugifySellerHandle(input: string): string {
  const slug = String(input || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return slug || "company"
}

// Instant acknowledgement email sent to the vendor the moment they register.
export async function sendSellerWelcomeEmail(scope: any, sellerName: string, sellerEmail: string) {
  if (!sellerEmail) return
  if (!(await isEmailConfiguredForScope(scope))) return
  try {
    await sendEmail({
      scope,
      from: FROM,
      to: sellerEmail,
      subject: "Thanks for registering with Auto to Rental 🚗",
      html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#1e3a8a;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center">
      <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:.5px">AUTO TO RENTAL</div>
      <div style="color:#bfdbfe;font-size:11px;letter-spacing:2px;margin-top:4px">CAR RENTAL MARKETPLACE</div>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <h1 style="margin:0 0 12px;font-size:22px;color:#0f172a">Welcome aboard, ${sellerName}! 🎉</h1>
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;font-size:15px">
        Thank you for registering your company on <strong>Auto to Rental</strong>. We have received your application and trade license.
      </p>
      <p style="margin:0 0 16px;color:#334155;line-height:1.6;font-size:15px">
        Our team is reviewing your details now. You will receive a confirmation email as soon as your account is verified and activated — usually within <strong>24 hours</strong>.
      </p>
      <p style="margin:0 0 4px;color:#334155;line-height:1.6;font-size:15px">In the meantime, you can sign in to your dashboard anytime:</p>
      <p style="margin:8px 0 20px">
        <a href="https://partner.autotorental.com/rental/login" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;font-size:14px">Go to my dashboard</a>
      </p>
      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6">
        Need help? Just reply to this email and our team will assist you.<br/>
        — The Auto to Rental Team
      </p>
    </div>
  </div>
</body></html>`,
    })
    console.log(`[seller-signup] welcome email sent to ${sellerEmail}`)
  } catch (e: any) {
    console.error("[seller-signup] welcome email failed:", e?.message)
  }
}

export async function sendAdminSignupNotification(scope: any, sellerName: string, sellerEmail: string, licenseNumber: string) {
  if (!(await isEmailConfiguredForScope(scope))) return
  try {
    await sendEmail({
      scope,
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `New Company Signup: ${sellerName}`,
      html: `<p><strong>${sellerName}</strong> (${sellerEmail}) registered. License: ${licenseNumber}.</p>
        <p><a href="https://admin.autotorental.com/dashboard/sellers">Review in admin</a></p>`,
    })
  } catch (e: any) {
    console.error("[seller-signup] admin notification failed:", e?.message)
  }
}

async function registerAuth(req: MedusaRequest, email: string, password: string) {
  const authService = req.scope.resolve(Modules.AUTH)
  const { success, error, authIdentity } = await authService.register("emailpass", {
    url: "/auth/seller/emailpass/register",
    headers: {},
    query: {},
    body: { email, password },
    protocol: req.protocol,
  })
  if (!success || !authIdentity?.id) {
    return { error: error || "Account creation failed (email may already be in use)" }
  }
  return { authIdentityId: authIdentity.id }
}

async function runMercurWorkflow(req: MedusaRequest, authIdentityId: string, b: SellerSignupBody): Promise<string | undefined> {
  try {
    const { result: seller } = await createSellerAccountWorkflow(req.scope).run({
      input: {
        auth_identity_id: authIdentityId,
        member_email: b.email,
        first_name: b.name,
        seller: {
          name: b.name,
          handle: b.handle,
          email: b.email,
          currency_code: "aed",
        },
      },
    })
    return seller?.id
  } catch (e: any) {
    console.error("[seller-signup] workflow failed, falling back to PG:", e?.message || e, e?.stack?.split("\n").slice(0, 3).join(" "))
    return undefined
  }
}


const CCY_BY_COUNTRY: Record<string, string> = {
  ae: "aed", sa: "sar", kw: "kwd", qa: "qar", om: "omr", bh: "bhd", jo: "jod",
  sy: "syp", eg: "egp", lb: "lbp", iq: "iqd", ye: "yer", ma: "mad", dz: "dzd", tn: "tnd",
  us: "usd", gb: "gbp", ca: "cad", au: "aud", de: "eur", fr: "eur", it: "eur", es: "eur",
  nl: "eur", be: "eur", tr: "try", in: "inr", pk: "pkr", ng: "ngn", za: "zar", br: "brl",
}
function currencyForCountry(cc?: string): string {
  return CCY_BY_COUNTRY[String(cc || "").toLowerCase()] || "usd"
}

async function createSellerViaPg(pg: any, authIdentityId: string, b: SellerSignupBody): Promise<string> {
  const sellerId = newId("sel_")
  try {
    await pg("seller").insert({
      id: sellerId,
      name: b.name,
      handle: b.handle,
      email: b.email,
      phone: b.phone,
      currency_code: currencyForCountry(b.country),
      default_city_id: b.default_city_id || null,
      company_address: b.city_name || null,
      metadata: JSON.stringify({ country: (b.country || "").toLowerCase() || null, city_name: b.city_name || null }),
      status: "pending_approval",
      is_premium: false,
      subscription_status: "trial",
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
  } catch (e: any) {
    const msg = String(e?.message || "")
    const code = String(e?.code || "")
    if (code === "23505" || msg.includes("duplicate key value")) {
      if (msg.includes("IDX_seller_email_unique")) {
        throw new SellerSignupConflictError("This email is already registered as a vendor")
      }
      if (msg.includes("IDX_seller_handle_unique")) {
        throw new SellerSignupConflictError("This company handle is already in use")
      }
      if (msg.includes("IDX_seller_name_unique")) {
        throw new SellerSignupConflictError("This company name is already registered")
      }
      throw new SellerSignupConflictError("Vendor account already exists")
    }
    throw e
  }

  const memberId = newId("mem_")
  await pg("member").insert({
    id: memberId,
    email: b.email,
    first_name: b.name,
    is_active: true,
  })
  await pg("seller_member").insert({
    id: newId("smbr_"),
    seller_id: sellerId,
    member_id: memberId,
    role_id: "role_seller_administration",
    is_owner: true,
  })

  await pg("auth_identity").where({ id: authIdentityId }).update({
    app_metadata: JSON.stringify({ seller_id: sellerId, member_id: memberId }),
  })

  return sellerId
}

async function applyExtendedFields(pg: any, sellerId: string, b: SellerSignupBody) {
  await pg("seller").where({ id: sellerId }).update({
    company_phone: b.phone,
    company_whatsapp: b.whatsapp || b.phone,
    default_city_id: b.default_city_id || null,
    trade_license_number: b.trade_license_number,
    // Empty string is not a valid Postgres date — coerce to NULL when unset.
    trade_license_expiry: b.trade_license_expiry || null,
    trade_license_url: b.trade_license_url,
    trade_license_verified: false,
    updated_at: new Date(),
  })
}

export async function processSellerSignup(req: MedusaRequest, b: SellerSignupBody) {
  if (!b?.email || !b?.password || !b?.name) {
    return { status: 400, body: { message: "Missing required fields" } }
  }

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const normalizedEmail = String(b.email || "").trim().toLowerCase()
  b.handle = slugifySellerHandle(b.name)  // slug always = company name
  const normalizedHandle = b.handle

  const existingByEmail = normalizedEmail
    ? await pg("seller")
        .whereRaw("LOWER(email) = ?", [normalizedEmail])
        .first("id")
    : null
  if (existingByEmail?.id) {
    return { status: 409, body: { message: "This email is already registered as a vendor" } }
  }

  const existingByHandle = normalizedHandle
    ? await pg("seller")
        .whereRaw("LOWER(handle) = ?", [normalizedHandle])
        .first("id")
    : null
  if (existingByHandle?.id) {
    return { status: 409, body: { message: "This company handle is already in use" } }
  }

  if (!b.default_city_id) {
    try {
      const ip = getClientIp(req)
      const countryCode = await ipToCountry(ip, req.headers as Record<string, unknown>)
      if (countryCode) {
        const cities = await pg("city")
          .where({ country_code: countryCode, is_active: true })
          .orderBy("sort_order", "asc")
          .limit(1)
          .select("id")
        if (cities.length) b.default_city_id = cities[0].id
      }
    } catch (e: any) {
      console.error("[seller-signup] country detect error:", e?.message)
    }
  }
  if (!b.default_city_id) {
    const fallback = await pg("city").where({ is_active: true }).orderBy("sort_order", "asc").limit(1).select("id")
    if (fallback.length) b.default_city_id = fallback[0].id
  }

  const auth = await registerAuth(req, b.email, b.password)
  if (auth.error) return { status: 400, body: { message: auth.error } }

  let sellerId = await runMercurWorkflow(req, auth.authIdentityId!, b)
  if (!sellerId) {
    try {
      sellerId = await createSellerViaPg(pg, auth.authIdentityId!, b)
    } catch (e: any) {
      if (e instanceof SellerSignupConflictError) {
        return { status: e.status, body: { message: e.message } }
      }
      throw e
    }
  }

  if (auth.authIdentityId) {
    const resolved = await resolveSellerAuthByEmail(pg, b.email)
    if (resolved?.member_id) {
      await linkSellerAuthIdentity(pg, auth.authIdentityId, sellerId, resolved.member_id)
    }
  }

  await applyExtendedFields(pg, sellerId, b)
  await sendSellerWelcomeEmail(req.scope, b.name, b.email)
  await sendAdminSignupNotification(req.scope, b.name, b.email, b.trade_license_number)
  await notifyAdminFeed(req.scope, "New company registered", b.name + " (" + b.email + ") — pending license verification")

  return {
    status: 201,
    body: {
      seller_id: sellerId,
      message: "Account created. Trade license pending admin verification.",
    },
  }
}
