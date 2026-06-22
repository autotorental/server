import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge } from "@medusajs/ui"
import { Adjustments } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Integrations", "التكاملات"), icon: Adjustments, nested: "/settings", rank: 55 }

type Setting = { key: string; is_secret: boolean; value: string; has_value: boolean; updated_at: string }

const GROUPS: { title: string; emoji: string; desc: string; service: string; keys: { key: string; label: string; placeholder?: string; help?: string }[] }[] = [
  {
    service: "openai", title: "AI", emoji: "🤖", desc: "Powers the 'Generate description with AI' button and SEO optimizer.",
    keys: [
      { key: "openai_api_key", label: "OpenAI API key", placeholder: "sk-proj-…", help: "Get one at platform.openai.com/api-keys" },
    ],
  },
  {
    service: "rapidapi_vin", title: "VIN Decoder (RapidAPI)", emoji: "🔎", desc: "Auto-fills brand, model, year & specs when a vendor enters a car's VIN. Falls back to the free NHTSA database when empty.",
    keys: [
      { key: "rapidapi_key", label: "RapidAPI key", placeholder: "your-rapidapi-key", help: "From rapidapi.com → your subscribed VIN Decoder API → X-RapidAPI-Key header" },
      { key: "rapidapi_vin_url", label: "VIN endpoint URL (use {vin})", placeholder: "https://HOST.p.rapidapi.com/vin/{vin}", help: "Copy the endpoint URL from RapidAPI, put {vin} where the VIN goes. e.g. https://vin-decoder7.p.rapidapi.com/vin/{vin}" },
    ],
  },
  {
    service: "email", title: "Email — cPanel mail (production)", emoji: "✉️", desc: "SMTP + IMAP for info@autotorental.com on your cPanel server (mail.autotorental.com). Used for password resets, inbox sync, and compose.",
    keys: [
      { key: "mail_smtp_host", label: "SMTP / IMAP host", placeholder: "mail.autotorental.com", help: "Usually mail.yourdomain.com from cPanel → Connect Devices" },
      { key: "mail_smtp_port", label: "SMTP port", placeholder: "465" },
      { key: "mail_smtp_secure", label: "SSL (465)", placeholder: "true" },
      { key: "mail_smtp_user", label: "Email (username)", placeholder: "info@autotorental.com" },
      { key: "mail_smtp_pass", label: "Email password (required)", placeholder: "cpanel-mailbox-password", help: "cPanel → Email Accounts → password. Same for SMTP and IMAP." },
      { key: "mail_from_email", label: "From address", placeholder: "Auto to Rental <info@autotorental.com>" },
    ],
  },
  {
    service: "stripe", title: "Stripe — Vendor subscriptions", emoji: "💳", desc: "Charges rental companies a monthly subscription.",
    keys: [
      { key: "stripe_publishable_key", label: "Publishable key", placeholder: "pk_live_…" },
      { key: "stripe_secret_key", label: "Secret key", placeholder: "sk_live_…" },
      { key: "stripe_webhook_secret", label: "Webhook signing secret", placeholder: "whsec_…" },
    ],
  },
  {
    service: "mollie", title: "Mollie — Vendor subscriptions (recommended)", emoji: "🟦", desc: "Charge rental companies a monthly / yearly subscription. Easier to open than Stripe across the Middle East. Checkout shows every method you activate in your Mollie dashboard — card & Klarna now, plus PayPal once you enable it there (Mollie → Settings → Payment methods → PayPal).",
    keys: [
      { key: "payment_provider", label: "Active payment provider", placeholder: "mollie", help: "Type exactly one of: mollie · stripe · demo.  'demo' activates subscriptions instantly with NO real charge (for testing)." },
      { key: "mollie_api_key", label: "Mollie API key / access token", placeholder: "live_xxx · test_xxx · access_xxx", help: "Mollie Dashboard → Developers → API keys (or Organization access tokens). Both work." },
      { key: "mollie_testmode", label: "Test mode (access tokens only)", placeholder: "false", help: "true = Mollie sandbox (no real money) · false = live. Ignored for live_/test_ keys." },
      { key: "mollie_currency", label: "Currency", placeholder: "EUR", help: "Mollie does NOT support AED. Use EUR (recommended) or USD." },
      { key: "mollie_price_monthly", label: "Monthly price", placeholder: "25.00", help: "Amount charged per month, in the currency above." },
      { key: "mollie_price_yearly", label: "Yearly price", placeholder: "250.00", help: "Amount charged per year (offer a discount vs 12× monthly)." },
    ],
  },
  {
    service: "cloudflare", title: "Cloudflare — Speed & CDN", emoji: "🟧", desc: "Control real Cloudflare speed/performance settings + purge cache from the 'Cloudflare Speed' page. Create a scoped API token at dash.cloudflare.com → My Profile → API Tokens.",
    keys: [
      { key: "cloudflare_api_token", label: "Cloudflare API token", placeholder: "scoped token", help: "Create Token → template 'Edit zone settings' (or Zone Settings: Edit + Cache Purge: Purge) for autotorental.com." },
      { key: "cloudflare_zone_id", label: "Zone ID (optional)", placeholder: "auto-resolved", help: "Leave blank — resolved from autotorental.com. Or copy from the Cloudflare Overview page (API section)." },
    ],
  },
  {
    service: "facebook", title: "Facebook + Instagram auto-post", emoji: "📱", desc: "Posts new approved vehicles to your Page + Instagram Business.",
    keys: [
      { key: "facebook_page_id", label: "Facebook Page ID", help: "From Page settings → About → Page ID" },
      { key: "facebook_page_token", label: "Page access token (long-lived)", help: "developers.facebook.com → Graph API Explorer → Generate token" },
      { key: "instagram_business_id", label: "Instagram Business account ID", help: "Linked to the Facebook Page above" },
      { key: "facebook_auto_post_enabled", label: "Auto-publish enabled", help: "Set to 1 to enable, 0 to disable" },
    ],
  },
  {
    service: "google_business", title: "Google Business Profile", emoji: "🗺️", desc: "Posts updates to your Google Business listing.",
    keys: [
      { key: "google_business_account_id", label: "Account ID" },
      { key: "google_business_location_id", label: "Location ID" },
      { key: "google_business_oauth_token", label: "OAuth access token" },
      { key: "google_business_auto_post_enabled", label: "Auto-publish enabled", help: "Set to 1 to enable, 0 to disable" },
    ],
  },
  {
    service: "linkedin", title: "LinkedIn Company Page", emoji: "💼", desc: "Posts new approved vehicles to your LinkedIn company page.",
    keys: [
      { key: "linkedin_company_id", label: "LinkedIn Company ID", help: "From company page URL: linkedin.com/company/XXXXXX" },
      { key: "linkedin_access_token", label: "LinkedIn Access Token", help: "Get from developers.linkedin.com → Access tokens" },
    ],
  },
  {
    service: "pinterest", title: "Pinterest Board", emoji: "📌", desc: "Pins new approved vehicles to your Pinterest board.",
    keys: [
      { key: "pinterest_board_id", label: "Pinterest Board ID", help: "From board URL: pinterest.com/username/board_id/" },
      { key: "pinterest_access_token", label: "Pinterest Access Token", help: "Get from developers.pinterest.com → Access tokens" },
    ],
  },
  {
    service: "google_maps", title: "Google Maps", emoji: "📍", desc: "Powers map embeds and address autocomplete.",
    keys: [
      { key: "google_maps_api_key", label: "Maps API key", placeholder: "AIza…" },
    ],
  },
  {
    service: "firebase", title: "Firebase / GA4 — Website analytics", emoji: "🔥", desc: "Powers the Firebase Analytics dashboard with live visitor metrics from autotorental.com.",
    keys: [
      { key: "google_client_id", label: "Google OAuth Client ID", placeholder: "xxxxxxxx.apps.googleusercontent.com", help: "One-time setup from Google Cloud OAuth credentials." },
      { key: "google_client_secret", label: "Google OAuth Client Secret", placeholder: "GOCSPX-...", help: "One-time setup. Stored encrypted." },
      { key: "google_firebase_redirect_uri", label: "Firebase OAuth redirect URI (optional)", placeholder: "https://admin.autotorental.com/admin/integrations/oauth/firebase/callback", help: "Leave blank to use the default callback URL (must match Google Cloud Console)." },
      { key: "firebase_project_id", label: "Firebase project ID", placeholder: "autotorental-prod", help: "From Firebase console → Project settings" },
      { key: "firebase_app_id", label: "Firebase web app ID", placeholder: "1:123456789:web:abc123", help: "Optional — used for Firebase console deep link" },
      { key: "ga4_property_id", label: "GA4 property ID", placeholder: "123456789", help: "12-digit number from Google Analytics → Admin → Property settings" },
      { key: "ga4_measurement_id", label: "GA4 measurement ID", placeholder: "G-XXXXXXXXXX", help: "Optional — for reference / future site tagging" },
      { key: "ga4_service_account_json", label: "GA4 service account JSON", help: "Full JSON key file — service account needs Viewer on the GA4 property" },
      { key: "ga4_looker_embed_url", label: "Looker Studio embed URL (optional)", placeholder: "https://lookerstudio.google.com/embed/reporting/…", help: "Paste embed link to show the full Google report inside admin" },
      { key: "firebase_console_url", label: "Firebase console URL override", help: "Optional custom link for Open Firebase Console button" },
    ],
  },
  {
    service: "dataforseo", title: "DataForSEO — Keyword research", emoji: "🔎", desc: "Real search volume in SEO Manager.",
    keys: [
      { key: "dataforseo_login", label: "Login email" },
      { key: "dataforseo_password", label: "Password" },
    ],
  },
  {
    service: "twilio", title: "Twilio (optional) — WhatsApp Business API", emoji: "💬", desc: "Send templated WhatsApp messages programmatically.",
    keys: [
      { key: "twilio_account_sid", label: "Account SID" },
      { key: "twilio_auth_token", label: "Auth token" },
      { key: "twilio_whatsapp_from", label: "WhatsApp 'from' number", placeholder: "+14155238886" },
    ],
  },
  {
    service: "clarity", title: "Microsoft Clarity — heatmaps & recordings", emoji: "🟦", desc: "Free session recordings + heatmaps + scroll maps for autotorental.com. Loads automatically on the website once the Project ID is saved.",
    keys: [
      { key: "clarity_project_id", label: "Clarity Project ID", placeholder: "abcdefghij", help: "From clarity.microsoft.com → your project → Settings → Overview → Project ID" },
    ],
  },
]

const Page = () => {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string; running?: boolean }>>({})
  const [testEmail, setTestEmail] = useState("")
  const [oauthMsg, setOauthMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const runTest = async (service: string) => {
    if (service === "google_maps" || service === "twilio") return // not implemented yet
    setTestResults(r => ({ ...r, [service]: { ok: false, message: "Testing…", running: true } }))
    try {
      const body: any = { service }
      if (service === "email") {
        if (!testEmail) { setTestResults(r => ({ ...r, [service]: { ok: false, message: "Enter your email above to receive the test" } })); return }
        body.to = testEmail
      }
      const res = await fetch(`${API}/admin/settings/test`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await res.json()
      setTestResults(r => ({ ...r, [service]: { ok: !!d.ok, message: d.message || (d.ok ? "OK" : "Failed") } }))
    } catch (e: any) {
      setTestResults(r => ({ ...r, [service]: { ok: false, message: e.message || "Network error" } }))
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/settings`, { credentials: "include" })
      const d = await r.json()
      setSettings(d.settings || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const oauth = params.get("oauth")
    if (!oauth) return
    const message = params.get("message")

    if (oauth.endsWith("_connected")) {
      setOauthMsg({ ok: true, text: "Connected successfully. Settings were filled automatically." })
      load()
    } else if (oauth.endsWith("_error")) {
      setOauthMsg({ ok: false, text: message || "OAuth connection failed" })
    }

    params.delete("oauth")
    params.delete("message")
    const q = params.toString()
    const next = `${window.location.pathname}${q ? `?${q}` : ""}`
    window.history.replaceState({}, "", next)
  }, [])

  const startOauth = (provider: "instagram" | "google_business" | "firebase") => {
    const returnTo = encodeURIComponent(window.location.href.split("?")[0])
    const path = provider === "instagram"
      ? `${API}/admin/integrations/oauth/instagram/start?return_to=${returnTo}`
      : provider === "google_business"
        ? `${API}/admin/integrations/oauth/google-business/start?return_to=${returnTo}`
        : `${API}/admin/integrations/oauth/firebase/start?return_to=${returnTo}`
    window.location.href = path
  }

  const valueOf = (key: string): string => {
    if (key in dirty) return dirty[key]
    const s = settings.find(x => x.key === key)
    // Never put the masked placeholder in the input — it breaks re-save logic.
    if (s?.is_secret && s?.has_value) return ""
    return s?.value || ""
  }
  const placeholderOf = (key: string, fallback?: string): string => {
    const s = settings.find(x => x.key === key)
    if (s?.is_secret && s?.has_value && !(key in dirty)) return "•••••••• saved — paste new value to replace"
    return fallback || ""
  }
  const update = (key: string, v: string) => setDirty({ ...dirty, [key]: v })

  const save = async () => {
    if (Object.keys(dirty).length === 0) return
    setSaving(true); setMsg("")
    try {
      const res = await fetch(`${API}/admin/settings`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dirty),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(res.status === 401 ? "⚠️ Session expired — log in again and retry" : `⚠️ Save failed (${res.status})`)
        return
      }
      if (!d.updated) {
        setMsg("⚠️ Nothing saved — type the full API key (saved keys show as blank)")
        return
      }
      setMsg(`✓ Saved ${d.updated} key(s)`)
      setDirty({})
      await load()
    } finally { setSaving(false); setTimeout(() => setMsg(""), 5000) }
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Heading level="h1">🔌 Integrations</Heading>
            <Text className="text-ui-fg-subtle">All third-party API keys live here. Saved values are encrypted at rest in app_setting.</Text>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Input placeholder="your-email@example.com (for email test)" value={testEmail} onChange={e => setTestEmail(e.target.value)} dir="ltr" className="w-64"/>
            <Button disabled={saving || Object.keys(dirty).length === 0} onClick={save}>
              {saving ? "Saving…" : Object.keys(dirty).length > 0 ? `💾 Save ${Object.keys(dirty).length} change(s)` : "💾 Save"}
            </Button>
          </div>
        </div>
        {msg && <Text className="mt-2">{msg}</Text>}
        {oauthMsg && (
          <div className={`mt-3 px-3 py-2 rounded text-sm font-medium ${oauthMsg.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {oauthMsg.ok ? "✅" : "⚠️"} {oauthMsg.text}
          </div>
        )}
        {loading && <Text className="mt-3">Loading…</Text>}
      </Container>

      {GROUPS.map(group => (
        <Container key={group.title} className="p-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <Heading level="h2">{group.emoji} {group.title}</Heading>
            <div className="flex items-center gap-2 flex-wrap">
              {group.keys.every(k => settings.find(s => s.key === k.key)?.has_value) && <Badge color="green">connected</Badge>}
              {group.keys.some(k => !settings.find(s => s.key === k.key)?.has_value) && <Badge color="grey">not set</Badge>}
              {!["google_maps", "twilio", "linkedin", "pinterest"].includes(group.service) && group.keys.every(k => settings.find(s => s.key === k.key)?.has_value) && (
                <Button size="small" variant="secondary" onClick={() => runTest(group.service)} disabled={testResults[group.service]?.running}>
                  {testResults[group.service]?.running ? "Testing…" : "🧪 Test connection"}
                </Button>
              )}
              {group.service === "facebook" && (
                <Button size="small" variant="secondary" onClick={() => startOauth("instagram")}>
                  Connect Instagram
                </Button>
              )}
              {group.service === "google_business" && (
                <Button size="small" variant="secondary" onClick={() => startOauth("google_business")}>
                  Connect Google Business
                </Button>
              )}
              {group.service === "firebase" && (
                <Button size="small" variant="secondary" onClick={() => startOauth("firebase")}>
                  Connect Firebase / GA4
                </Button>
              )}
            </div>
          </div>
          {testResults[group.service] && !testResults[group.service].running && (
            <div className={`mb-3 px-3 py-2 rounded text-sm font-medium ${testResults[group.service].ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {testResults[group.service].ok ? "✅" : "⚠️"} {testResults[group.service].message}
            </div>
          )}
          <Text size="small" className="text-ui-fg-subtle mb-4">{group.desc}</Text>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
            {group.keys.map(k => (
              <div key={k.key} className="col-span-1">
                <Label size="small">{k.label}</Label>
                <Input
                  type={settings.find(s => s.key === k.key)?.is_secret ? "password" : "text"}
                  value={valueOf(k.key)}
                  onChange={e => update(k.key, e.target.value)}
                  placeholder={placeholderOf(k.key, k.placeholder)}
                  dir="ltr"
                />
                {k.help && <Text size="small" className="text-ui-fg-muted mt-1">{k.help}</Text>}
              </div>
            ))}
          </div>
        </Container>
      ))}

      <Container className="p-6 flex justify-end">
        <Button disabled={saving || Object.keys(dirty).length === 0} onClick={save}>
          {saving ? "Saving…" : "💾 Save changes"}
        </Button>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
