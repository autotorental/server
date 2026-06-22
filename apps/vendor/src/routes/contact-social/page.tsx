import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label } from "@medusajs/ui"
import { Phone } from "@medusajs/icons"
import { API } from "../../lib/api"

// Replaces the unused "Payment Details" with what this marketplace actually
// needs: a WhatsApp number + social links editor. Saves to the seller via
// POST /vendor/profile (company_whatsapp column + metadata.social), so the
// links show on the public storefront company page and car listings.
export const config: RouteConfig = { label: "Contact & Social", icon: Phone, nested: "/settings" }

type Social = {
  website?: string; whatsapp?: string; instagram?: string; facebook?: string
  tiktok?: string; youtube?: string; snapchat?: string; telegram?: string; twitter?: string
}

const FIELDS: { key: keyof Social; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourpage" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourpage" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { key: "snapchat", label: "Snapchat", placeholder: "https://snapchat.com/add/username" },
  { key: "telegram", label: "Telegram", placeholder: "https://t.me/username" },
  { key: "twitter", label: "X (Twitter)", placeholder: "https://x.com/yourpage" },
]

const digits = (s: string) => (s || "").replace(/[^0-9]/g, "")

const Page = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [whatsapp, setWhatsapp] = useState("")
  const [website, setWebsite] = useState("")
  const [social, setSocial] = useState<Social>({})

  const load = async () => {
    setLoading(true)
    try {
      const p = await fetch(`${API}/vendor/profile`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null))
      const s = p?.seller || {}
      setWhatsapp(s.company_whatsapp || "")
      setWebsite(s.website_url || s.metadata?.social?.website || "")
      setSocial({ ...(s.metadata?.social || {}) })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      const wa = digits(whatsapp)
      const socialOut: Social = {
        website: website.trim() || undefined,
        whatsapp: wa ? `https://wa.me/${wa}` : undefined,
        instagram: social.instagram?.trim() || undefined,
        facebook: social.facebook?.trim() || undefined,
        tiktok: social.tiktok?.trim() || undefined,
        youtube: social.youtube?.trim() || undefined,
        snapchat: social.snapchat?.trim() || undefined,
        telegram: social.telegram?.trim() || undefined,
        twitter: social.twitter?.trim() || undefined,
      }
      const res = await fetch(`${API}/vendor/profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_whatsapp: whatsapp.trim() || null,
          website_url: website.trim() || null,
          metadata: { social: socialOut },
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.message || "Save failed")
      setMsg({ type: "ok", text: "Saved — your WhatsApp and social links are now live on your public page." })
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Save failed" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SingleColumnPage><Container className="p-6"><Text>Loading…</Text></Container></SingleColumnPage>

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">📱 Contact & Social</Heading>
        <Text className="text-ui-fg-subtle">Your WhatsApp number and social links. These appear on your public company page and help customers reach you directly.</Text>
      </Container>

      <Container className="p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label size="small">WhatsApp number</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+9715XXXXXXXX" dir="ltr" className="mt-1.5" />
            <Text size="xsmall" className="text-ui-fg-muted mt-1">Include country code (e.g. +971 for UAE).</Text>
          </div>
          <div>
            <Label size="small">Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourcompany.com" dir="ltr" className="mt-1.5" />
          </div>
          {FIELDS.map((f) => (
            <div key={f.key}>
              <Label size="small">{f.label}</Label>
              <Input
                value={social[f.key] || ""}
                onChange={(e) => setSocial((x) => ({ ...x, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                dir="ltr"
                className="mt-1.5"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
          {msg
            ? <Text size="small" className={msg.type === "ok" ? "text-ui-fg-interactive" : "text-ui-fg-error"}>{msg.text}</Text>
            : <span />}
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
