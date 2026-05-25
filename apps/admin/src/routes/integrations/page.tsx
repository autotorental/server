import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge } from "@medusajs/ui"
import { Adjustments } from "@medusajs/icons"

export const config: RouteConfig = { label: "Integrations", icon: Adjustments, nested: "/settings" }

type Setting = { key: string; is_secret: boolean; value: string; has_value: boolean; updated_at: string }

const GROUPS: { title: string; emoji: string; desc: string; service: string; keys: { key: string; label: string; placeholder?: string; help?: string }[] }[] = [
  {
    service: "openai", title: "AI", emoji: "🤖", desc: "Powers the 'Generate description with AI' button and SEO optimizer.",
    keys: [
      { key: "openai_api_key", label: "OpenAI API key", placeholder: "sk-proj-…", help: "Get one at platform.openai.com/api-keys" },
    ],
  },
  {
    service: "resend", title: "Email — Resend (transactional)", emoji: "✉️", desc: "Sends contact replies, password resets, and admin alerts.",
    keys: [
      { key: "resend_api_key", label: "Resend API key", placeholder: "re_…" },
      { key: "resend_from_email", label: "From address", placeholder: "info@autotorental.com" },
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
]

const API = "https://api.autotorental.com"

const Page = () => {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string; running?: boolean }>>({})
  const [testEmail, setTestEmail] = useState("")

  const runTest = async (service: string) => {
    if (service === "google_maps" || service === "twilio") return // not implemented yet
    setTestResults(r => ({ ...r, [service]: { ok: false, message: "Testing…", running: true } }))
    try {
      const body: any = { service }
      if (service === "resend") {
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

  const valueOf = (key: string): string => {
    if (key in dirty) return dirty[key]
    const s = settings.find(x => x.key === key)
    return s?.value || ""
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
      const d = await res.json()
      setMsg(res.ok ? `✓ Saved ${d.updated} key(s)` : "Failed")
      setDirty({})
      await load()
    } finally { setSaving(false); setTimeout(() => setMsg(""), 3500) }
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
            <Input placeholder="your-email@example.com (for Resend test)" value={testEmail} onChange={e => setTestEmail(e.target.value)} dir="ltr" className="w-64"/>
            <Button disabled={saving || Object.keys(dirty).length === 0} onClick={save}>
              {saving ? "Saving…" : Object.keys(dirty).length > 0 ? `💾 Save ${Object.keys(dirty).length} change(s)` : "💾 Save"}
            </Button>
          </div>
        </div>
        {msg && <Text className="mt-2">{msg}</Text>}
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
            </div>
          </div>
          {testResults[group.service] && !testResults[group.service].running && (
            <div className={`mb-3 px-3 py-2 rounded text-sm font-medium ${testResults[group.service].ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {testResults[group.service].ok ? "✅" : "⚠️"} {testResults[group.service].message}
            </div>
          )}
          <Text size="small" className="text-ui-fg-subtle mb-4">{group.desc}</Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.keys.map(k => (
              <div key={k.key} className="col-span-1">
                <Label size="small">{k.label}</Label>
                <Input
                  type={settings.find(s => s.key === k.key)?.is_secret && !(k.key in dirty) ? "password" : "text"}
                  value={valueOf(k.key)}
                  onChange={e => update(k.key, e.target.value)}
                  placeholder={k.placeholder}
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
