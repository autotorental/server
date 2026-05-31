// POST /admin/settings/test
// Body: { service: "email" | "stripe" | "facebook" | "instagram" | "google_business" | "openai" | "dataforseo", to?: string }
// Returns { ok, message, details? }

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isEmailConfiguredForScope, sendEmail } from "../../../../lib/email"
import { getSetting } from "../../../../lib/settings"

type Service = "email" | "stripe" | "facebook" | "instagram" | "google_business" | "openai" | "dataforseo"

async function testEmail(_scope: any, to?: string) {
  const from =
    (await getSetting(_scope, "zoho_from_email")) ||
    process.env.ZOHO_FROM ||
    "Auto to Rental <info@autotorental.com>"
  if (!(await isEmailConfiguredForScope(_scope))) {
    return {
      ok: false,
      message:
        "Zoho Mail SMTP not ready — save Zoho App Password in Integrations → Email (field: zoho_smtp_pass), then Save.",
    }
  }
  if (!to) return { ok: false, message: "Provide a 'to' email in the request body" }
  try {
    const r = await sendEmail({
      scope: _scope,
      from, to: [to],
      subject: "✅ Auto to Rental — email test",
      html: `<div style="font-family:sans-serif;padding:24px"><h2 style="color:#1753b0">Zoho Mail SMTP — production test</h2><p>If you received this, outbound mail from <strong>info@autotorental.com</strong> works for password resets and follower alerts.</p><p style="color:#64748b;font-size:13px">Sent from <strong>${from}</strong> at ${new Date().toISOString()}</p></div>`,
    })
    return { ok: true, message: `Test email sent to ${to}`, details: { id: r.id, from } }
  } catch (e: any) { return { ok: false, message: e.message || "SMTP send failed" } }
}

async function testStripe(scope: any) {
  const secret = await getSetting(scope, "stripe_secret_key")
  if (!secret) return { ok: false, message: "No Stripe secret key set" }
  try {
    const r = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${secret}` } })
    const j: any = await r.json()
    if (!r.ok) return { ok: false, message: j.error?.message || "Stripe error" }
    return { ok: true, message: `Connected as ${j.business_profile?.name || j.email || j.id}`, details: { id: j.id, country: j.country, charges_enabled: j.charges_enabled } }
  } catch (e: any) { return { ok: false, message: e.message } }
}

async function testFacebook(scope: any) {
  const pageId = await getSetting(scope, "facebook_page_id")
  const token = await getSetting(scope, "facebook_page_token")
  if (!pageId || !token) return { ok: false, message: "Missing facebook_page_id or facebook_page_token" }
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=id,name,access_token&access_token=${token}`)
    const j: any = await r.json()
    if (j.error) return { ok: false, message: j.error.message }
    return { ok: true, message: `Connected to Page "${j.name}"`, details: { id: j.id } }
  } catch (e: any) { return { ok: false, message: e.message } }
}

async function testInstagram(scope: any) {
  const igId = await getSetting(scope, "instagram_business_id")
  const token = await getSetting(scope, "facebook_page_token")
  if (!igId || !token) return { ok: false, message: "Missing instagram_business_id or facebook_page_token (Instagram uses Facebook token)" }
  try {
    const r = await fetch(`https://graph.facebook.com/v19.0/${igId}?fields=id,username,name&access_token=${token}`)
    const j: any = await r.json()
    if (j.error) return { ok: false, message: j.error.message }
    return { ok: true, message: `Connected to @${j.username}`, details: { id: j.id, name: j.name } }
  } catch (e: any) { return { ok: false, message: e.message } }
}

async function testGoogleBusiness(scope: any) {
  const accountId = await getSetting(scope, "google_business_account_id")
  const locationId = await getSetting(scope, "google_business_location_id")
  const token = await getSetting(scope, "google_business_oauth_token")
  if (!accountId || !locationId || !token) return { ok: false, message: "Missing account_id, location_id, or oauth_token" }
  try {
    const r = await fetch(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const j: any = await r.json()
    if (j.error) return { ok: false, message: j.error.message }
    return { ok: true, message: `Connected to ${j.title || j.name}`, details: { name: j.name } }
  } catch (e: any) { return { ok: false, message: e.message } }
}

async function testOpenAI(scope: any) {
  const key = await getSetting(scope, "openai_api_key")
  if (!key) return { ok: false, message: "No OpenAI API key set" }
  try {
    const r = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } })
    const j: any = await r.json()
    if (!r.ok) return { ok: false, message: j.error?.message || "OpenAI error" }
    const has4o = (j.data || []).some((m: any) => m.id?.includes("gpt-4o-mini"))
    return { ok: true, message: `Connected — ${(j.data || []).length} models available`, details: { gpt_4o_mini: has4o } }
  } catch (e: any) { return { ok: false, message: e.message } }
}

async function testDataForSEO(scope: any) {
  const login = await getSetting(scope, "dataforseo_login")
  const pass = await getSetting(scope, "dataforseo_password")
  if (!login || !pass) return { ok: false, message: "Missing login or password" }
  try {
    const auth = Buffer.from(`${login}:${pass}`).toString("base64")
    const r = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      headers: { Authorization: `Basic ${auth}` },
    })
    const j: any = await r.json()
    if (!r.ok || j.status_code >= 40000) return { ok: false, message: j.status_message || "DataForSEO error" }
    return { ok: true, message: `Connected — balance $${j.tasks?.[0]?.result?.[0]?.money?.balance || "?"}`, details: { user: login } }
  } catch (e: any) { return { ok: false, message: e.message } }
}

const HANDLERS: Record<Service, (scope: any, ...args: any[]) => Promise<any>> = {
  email: testEmail,
  stripe: testStripe,
  facebook: testFacebook,
  instagram: testInstagram,
  google_business: testGoogleBusiness,
  openai: testOpenAI,
  dataforseo: testDataForSEO,
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as { service: Service; to?: string }
  const fn = HANDLERS[body?.service]
  if (!fn) return res.status(400).json({ ok: false, message: "Unknown service" })
  const result = await fn(req.scope, body.to)
  res.status(result.ok ? 200 : 400).json(result)
}
