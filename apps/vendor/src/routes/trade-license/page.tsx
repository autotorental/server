import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Select, Badge } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Trade License", icon: DocumentText, nested: "/settings" }

const Page = () => {
  const [s, setS] = useState<any>(null)
  const [cities, setCities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [p, c] = await Promise.all([
        fetch(`${API}/vendor/profile`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
        fetch(`${API}/vendor/catalog/cities`, { credentials: "include" }).then(r => r.ok ? r.json() : { cities: [] }),
      ])
      setS(p?.seller || null)
      setCities(c.cities || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true); setMsg("")
    try {
      const res = await fetch(`${API}/vendor/profile`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade_license_number: s.trade_license_number,
          trade_license_expiry: s.trade_license_expiry,
          trade_license_url: s.trade_license_url,
          default_city_id: s.default_city_id,
        }),
      })
      const d = await res.json()
      setS(d.seller)
      setMsg(res.ok ? "✓ Saved" : (d.message || "Failed"))
    } finally { setSaving(false); setTimeout(() => setMsg(""), 3000) }
  }

  const upload = async (files: FileList) => {
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append("files", f))
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const d = await res.json()
      const url = d.files?.[0]?.url
      if (url) setS({ ...s, trade_license_url: url })
    } finally { setUploading(false) }
  }

  if (loading) return <SingleColumnPage><Container className="p-6"><Text>Loading…</Text></Container></SingleColumnPage>
  if (!s) return <SingleColumnPage><Container className="p-6"><Text>Could not load your profile.</Text></Container></SingleColumnPage>

  const tlExpiry = s.trade_license_expiry ? new Date(s.trade_license_expiry) : null
  const expired = tlExpiry ? tlExpiry < new Date() : false
  const verifyStatus = s.trade_license_verified && !expired ? "verified" : expired ? "expired" : (s.trade_license_url ? "pending" : "missing")
  const verifyColor: any = verifyStatus === "verified" ? "green" : verifyStatus === "expired" ? "red" : verifyStatus === "pending" ? "orange" : "grey"
  const verifyLabel = { verified: "✅ Verified", expired: "⛔ Expired — re-upload required", pending: "⏳ Pending admin review", missing: "❌ Not uploaded" }[verifyStatus]

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">📜 Trade License</Heading>
        <Text className="text-ui-fg-subtle">Company banner, logo, and details are managed in Settings → Store. Upload your trade license here so admin can verify your listings.</Text>
      </Container>

      <Container className="p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <Heading level="h2">Verification status</Heading>
          <Badge color={verifyColor}>{verifyLabel}</Badge>
        </div>
        {verifyStatus !== "verified" && (
          <div className="bg-ui-tag-orange-bg rounded-lg p-3 mb-4">
            <Text size="small" className="text-ui-fg-base font-medium">⚠️ Your listings stay in DRAFT until an admin verifies a non-expired trade license.</Text>
          </div>
        )}
        {s.trade_license_rejection_reason && (
          <div className="bg-ui-tag-red-bg rounded-lg p-3 mb-4">
            <Text size="small" className="text-ui-fg-error font-medium">Admin rejected: {s.trade_license_rejection_reason}</Text>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><Label size="small">License number</Label><Input value={s.trade_license_number || ""} onChange={e => setS({...s, trade_license_number: e.target.value})} placeholder="CN-1234567" dir="ltr" /></div>
          <div><Label size="small">Expiry date</Label><Input type="date" value={s.trade_license_expiry ? s.trade_license_expiry.substring(0,10) : ""} onChange={e => setS({...s, trade_license_expiry: e.target.value || null})} /></div>
          <div><Label size="small">Issuing city</Label>
            <Select value={s.default_city_id || ""} onValueChange={v => setS({...s, default_city_id: v})}>
              <Select.Trigger><Select.Value placeholder="Pick city" /></Select.Trigger>
              <Select.Content>{cities.map((c: any) => <Select.Item key={c.id} value={c.id}>{c.country_code.toUpperCase()} · {c.name}</Select.Item>)}</Select.Content>
            </Select>
          </div>
        </div>
        <div className="mt-3">
          <Label size="small">Upload trade license (PDF or photo)</Label>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {s.trade_license_url && (
              <a href={s.trade_license_url} target="_blank" rel="noopener" className="text-ui-fg-interactive underline text-sm">View current document →</a>
            )}
            <Button size="small" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? "Uploading..." : (s.trade_license_url ? "Replace" : "Upload")}
            </Button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }}
              onChange={e => { if (e.target.files?.length) upload(e.target.files) }} />
          </div>
        </div>
      </Container>

      <Container className="p-6 flex justify-end items-center gap-3">
        {msg && <Text className="text-ui-fg-subtle">{msg}</Text>}
        <Button disabled={saving} onClick={save}>{saving ? "Saving..." : "💾 Save changes"}</Button>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
