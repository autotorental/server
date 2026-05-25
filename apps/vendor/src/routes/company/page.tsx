import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Select, Textarea, Badge } from "@medusajs/ui"
import { Buildings } from "@medusajs/icons"

export const config: RouteConfig = { label: "Company Profile", icon: Buildings, nested: "/settings" }

const API = "https://api.autotorental.com"

const Page = () => {
  const [s, setS] = useState<any>(null)
  const [cities, setCities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

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
        body: JSON.stringify(s),
      })
      const d = await res.json()
      setS(d.seller)
      setMsg(res.ok ? "✓ Saved" : (d.message || "Failed"))
    } finally { setSaving(false); setTimeout(() => setMsg(""), 3000) }
  }

  const upload = async (files: FileList, field: "trade_license_url" | "photo") => {
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append("files", f))
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const d = await res.json()
      const url = d.files?.[0]?.url
      if (url) setS({ ...s, [field]: url })
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
        <Heading level="h1">🏢 Company Profile</Heading>
        <Text className="text-ui-fg-subtle">This information is used everywhere on autotorental.com — your storefront, your listings, your default contact buttons.</Text>
      </Container>

      {/* Trade license — gates listings */}
      <Container className="p-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <Heading level="h2">📜 Trade License</Heading>
          <Badge color={verifyColor}>{verifyLabel}</Badge>
        </div>
        {verifyStatus !== "verified" && (
          <div className="bg-ui-tag-orange-bg rounded-lg p-3 mb-4">
            <Text size="small" className="text-ui-fg-base font-medium">⚠️ Your listings stay in DRAFT until an admin verifies a non-expired trade license. Customers won't see your cars on autotorental.com.</Text>
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
              onChange={e => { if (e.target.files?.length) upload(e.target.files, "trade_license_url") }} />
          </div>
        </div>
      </Container>

      {/* Company info */}
      <Container className="p-6">
        <Heading level="h2" className="mb-3">🏷️ Company Details</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label size="small">Company name *</Label><Input value={s.name || ""} onChange={e => setS({...s, name: e.target.value})} /></div>
          <div><Label size="small">URL handle</Label><Input value={s.handle || ""} onChange={e => setS({...s, handle: e.target.value})} placeholder="my-rentals" dir="ltr" /></div>
          <div><Label size="small">Email</Label><Input type="email" value={s.email || ""} onChange={e => setS({...s, email: e.target.value})} dir="ltr" /></div>
          <div><Label size="small">Logo</Label>
            <div className="flex items-center gap-2">
              {s.photo && <img src={s.photo} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />}
              <Button size="small" variant="secondary" disabled={uploading} onClick={() => photoRef.current?.click()}>{s.photo ? "Replace" : "Upload"}</Button>
              <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => { if (e.target.files?.length) upload(e.target.files, "photo") }} />
            </div>
          </div>
          <div className="md:col-span-2"><Label size="small">About your company</Label>
            <Textarea value={s.description || ""} onChange={e => setS({...s, description: e.target.value})} rows={3} placeholder="Family-run rental company since 2010, serving Dubai & Sharjah with premium SUVs and sedans." />
          </div>
        </div>
      </Container>

      {/* Contact + Location */}
      <Container className="p-6">
        <Heading level="h2" className="mb-3">📞 Default Contact</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-3">These auto-fill on every new vehicle listing so customers can call/WhatsApp you instantly.</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label size="small">Phone</Label><Input value={s.company_phone || ""} onChange={e => setS({...s, company_phone: e.target.value})} placeholder="+971501234567" dir="ltr" /></div>
          <div><Label size="small">WhatsApp</Label><Input value={s.company_whatsapp || ""} onChange={e => setS({...s, company_whatsapp: e.target.value})} placeholder="+971501234567" dir="ltr" /></div>
          <div className="md:col-span-2"><Label size="small">Office address</Label>
            <Input value={s.company_address || ""} onChange={e => setS({...s, company_address: e.target.value})} placeholder="Sheikh Zayed Rd, Business Bay, Dubai" />
          </div>
          <div><Label size="small">Latitude (Google Maps)</Label><Input type="number" step="0.000001" value={s.company_location_lat || ""} onChange={e => setS({...s, company_location_lat: e.target.value ? parseFloat(e.target.value) : null})} placeholder="25.197197" dir="ltr" /></div>
          <div><Label size="small">Longitude (Google Maps)</Label><Input type="number" step="0.000001" value={s.company_location_lng || ""} onChange={e => setS({...s, company_location_lng: e.target.value ? parseFloat(e.target.value) : null})} placeholder="55.274376" dir="ltr" /></div>
          <div className="md:col-span-2">
            <Text size="small" className="text-ui-fg-subtle">Tip: right-click your office in Google Maps → first coordinate is latitude, second is longitude.</Text>
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
