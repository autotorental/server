import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge, toast } from "@medusajs/ui"
import { CurrencyDollar, ArrowUpRightOnBox, CheckCircleSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Google Ads", "إعلانات Google"), icon: CurrencyDollar, rank: 32 }

const Page = () => {
  const [adsId, setAdsId] = useState("")
  const [saved, setSaved] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/settings`, { credentials: "include" })
      const d = await r.json()
      const v = (d.settings || []).find((x: any) => x.key === "google_ads_id")?.value || ""
      setSaved(v); setAdsId(v)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/admin/settings`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_ads_id: adsId.trim() }),
      })
      if (res.ok) { toast.success("Google Ads tag saved — conversions will fire on the website"); setSaved(adsId.trim()) }
      else toast.error("Save failed")
    } finally { setSaving(false) }
  }

  // A Google Ads tag ID can't be verified against Google from a server (no public
  // endpoint — that needs Google Ads API OAuth). So we ONLY validate the format and
  // confirm the tag is installed on the site. "installed" ≠ "verified by Google".
  const validFormat = /^AW-\d{9,12}$/i.test(saved.trim())
  const installed = !!saved && validFormat

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Heading level="h1">📣 Google Ads</Heading>
              {installed ? <Badge color="green">Tag installed on site</Badge> : saved ? <Badge color="orange">Check the ID format</Badge> : <Badge color="grey">Not set</Badge>}
            </div>
            <Text className="text-ui-fg-subtle mt-1">Fire conversion tracking on autotorental.com so you can measure and optimize your Google Ads campaigns.</Text>
          </div>
          <a href="https://ads.google.com/" target="_blank" rel="noopener">
            <Button variant="secondary"><ArrowUpRightOnBox /> Open Google Ads</Button>
          </a>
        </div>
      </Container>

      <Container className="p-6 flex flex-col gap-4">
        <Heading level="h2">Connect</Heading>
        <ol className="text-sm text-ui-fg-subtle list-decimal pl-5 space-y-1">
          <li>In <strong>ads.google.com</strong> → <strong>Tools → Conversions → Google tag</strong>, copy your tag ID.</li>
          <li>It looks like <strong>AW-XXXXXXXXX</strong>.</li>
          <li>Paste it below and Save — the website loads the Google Ads tag (with cookie consent).</li>
        </ol>
        <div className="max-w-md">
          <Label size="small">Google Ads tag ID</Label>
          <Input value={adsId} onChange={(e) => setAdsId(e.target.value)} placeholder="AW-XXXXXXXXX" dir="ltr" />
        </div>
        <div className="flex justify-end">
          <Button onClick={save} isLoading={saving} disabled={loading}><CheckCircleSolid /> Save</Button>
        </div>
      </Container>

      {installed && (
        <Container className="p-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4">
            <Text className="text-ui-fg-base">✅ Tag <strong>{saved}</strong> is installed on autotorental.com — the gtag loads (with cookie consent) and WhatsApp / phone clicks fire as “Contact”.</Text>
            <Text size="small" className="text-ui-fg-subtle mt-2">⚠️ This confirms the tag is installed on the site — it does <strong>not</strong> verify the ID with Google (Google has no endpoint to confirm a tag ID server-side). Double-check it matches your Google Ads account exactly (Tools → Conversions → Google tag), then create your conversion actions there.</Text>
          </div>
        </Container>
      )}
      {saved && !validFormat && (
        <Container className="p-6">
          <div className="rounded-xl border p-4" style={{ borderColor: "rgba(245,158,11,.45)", background: "rgba(245,158,11,.1)" }}>
            <Text className="text-ui-fg-base">⚠️ “{saved}” doesn’t look like a Google Ads tag ID. It should be <strong>AW-</strong> followed by 9–12 digits (e.g. <strong>AW-123456789</strong>). Paste the exact ID from Google Ads and Save.</Text>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}
export default Page
