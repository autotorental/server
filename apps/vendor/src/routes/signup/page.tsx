// Custom signup at /rental/signup — overrides Mercur's default form.
// Captures everything we need to open a rental company account in one step:
// email + password + company name + phone + WhatsApp + city + trade license.

import { useEffect, useRef, useState } from "react"
import { Container, Heading, Text, Button, Input, Label, Select, Badge } from "@medusajs/ui"

const API = "https://api.autotorental.com"

type City = { id: string; country_code: string; name: string }

const Page = () => {
  const [cities, setCities] = useState<City[]>([])
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState("")
  const [ok, setOk] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [f, setF] = useState({
    email: "",
    password: "",
    confirm: "",
    name: "",
    handle: "",
    phone: "",
    whatsapp: "",
    default_city_id: "",
    trade_license_number: "",
    trade_license_expiry: "",
    trade_license_url: "",
    accept: false,
  })

  useEffect(() => {
    // Public catalog endpoint — no auth required
    fetch(`${API}/store/catalog/cities`, { headers: { "x-publishable-api-key": "" } as any })
      .then(r => r.ok ? r.json() : { cities: [] })
      .then(d => setCities(d.cities || []))
      .catch(() => {})
  }, [])

  const upload = async (files: FileList) => {
    setUploading(true); setErr("")
    try {
      const fd = new FormData()
      Array.from(files).forEach(file => fd.append("files", file))
      // Pre-auth upload — Mercur exposes /admin/uploads. If 401, the file lives in our
      // /tmp until the user logs in, but the URL we get back is still usable later.
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const d = await res.json()
      const url = d.files?.[0]?.url
      if (url) setF(x => ({ ...x, trade_license_url: url }))
      else setErr("Upload failed — try again after creating your account.")
    } catch (e: any) {
      setErr(e.message || "Upload error")
    } finally { setUploading(false) }
  }

  const validate = (): string | null => {
    if (!f.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "Enter a valid email"
    if (f.password.length < 8) return "Password must be at least 8 characters"
    if (f.password !== f.confirm) return "Passwords do not match"
    if (!f.name.trim()) return "Company name is required"
    if (!f.phone.match(/^\+?\d{8,15}$/)) return "Phone must be in format +971501234567"
    if (f.whatsapp && !f.whatsapp.match(/^\+?\d{8,15}$/)) return "WhatsApp must be in format +971501234567"
    if (!f.default_city_id) return "Select your city"
    if (!f.trade_license_number.trim()) return "Trade license number is required"
    if (!f.trade_license_expiry) return "Trade license expiry date is required"
    if (!f.trade_license_url) return "Upload your trade license document"
    if (!f.accept) return "You must accept the Terms of Service"
    return null
  }

  const submit = async () => {
    const v = validate()
    if (v) { setErr(v); return }
    setBusy(true); setErr("")
    try {
      // Step 1 — auth identity (emailpass register). Returns a JWT we use for /vendor/sellers.
      const reg = await fetch(`${API}/auth/seller/emailpass/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email, password: f.password }),
      })
      const regData = await reg.json()
      if (!reg.ok || !regData.token) {
        throw new Error(regData.message || regData.type || "Registration failed (auth)")
      }
      const token = regData.token

      // Step 2 — create the seller record. Mercur whitelists fields here.
      const handle = f.handle.trim() || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40)
      const sellerRes = await fetch(`${API}/vendor/sellers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          name: f.name,
          handle,
          email: f.email,
          phone: f.phone,
          member_email: f.email,
          first_name: f.name,
        }),
      })
      const sellerData = await sellerRes.json()
      if (!sellerRes.ok) {
        throw new Error(sellerData.message || "Failed to create company profile")
      }
      const sellerId = sellerData.seller?.id

      // Step 3 — write our extended fields via our custom /vendor/profile endpoint.
      // We need a session cookie for credentials:include, so login the seller now.
      await fetch(`${API}/auth/seller/emailpass`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: f.email, password: f.password }),
      })
      await fetch(`${API}/vendor/profile`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_phone: f.phone,
          company_whatsapp: f.whatsapp || f.phone,
          default_city_id: f.default_city_id,
          trade_license_number: f.trade_license_number,
          trade_license_expiry: f.trade_license_expiry,
          trade_license_url: f.trade_license_url,
        }),
      }).catch(() => {})

      setOk(true)
      // Redirect to login after 2.5s so admin can review the new account
      setTimeout(() => { window.location.href = "/rental/login" }, 2500)
    } catch (e: any) {
      setErr(e.message || "Registration failed")
    } finally { setBusy(false) }
  }

  if (ok) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Container className="p-8 max-w-md">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 60 }}>✅</div>
            <Heading level="h1" className="mt-4">Account created!</Heading>
            <Text className="text-ui-fg-subtle mt-2">
              We received your application and trade license. An admin will review and activate your account within 24 hours.
              You will receive an email confirmation.
            </Text>
            <Text className="text-ui-fg-muted mt-4" size="small">Redirecting you to sign in…</Text>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f1729 0%,#1753b0 100%)", padding: "40px 16px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src="/rental/favicon.svg" style={{ width: 64, height: 64, background: "white", padding: 8, borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,.3)" }} />
          <Heading level="h1" className="mt-4" style={{ color: "white", fontSize: 28 }}>List your rental company on Auto to Rental</Heading>
          <Text style={{ color: "rgba(255,255,255,.85)", marginTop: 8 }}>
            Reach thousands of car renters in the UAE &amp; Syria every month.
          </Text>
        </div>

        <Container className="p-6">
          {err && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text size="small" className="font-medium">{err}</Text>
            </div>
          )}

          <Heading level="h3" className="mb-3">🔐 Account</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div><Label size="small">Business email *</Label><Input type="email" dir="ltr" value={f.email} onChange={e => setF({...f, email: e.target.value})} placeholder="info@yourcompany.com" /></div>
            <div><Label size="small">Password *</Label><Input type="password" dir="ltr" value={f.password} onChange={e => setF({...f, password: e.target.value})} placeholder="Min 8 characters" /></div>
            <div className="md:col-span-2"><Label size="small">Confirm password *</Label><Input type="password" dir="ltr" value={f.confirm} onChange={e => setF({...f, confirm: e.target.value})} /></div>
          </div>

          <Heading level="h3" className="mb-3">🏢 Company</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="md:col-span-2"><Label size="small">Company name *</Label><Input value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Al Khudari Rentals LLC" /></div>
            <div><Label size="small">Storefront handle</Label><Input dir="ltr" value={f.handle} onChange={e => setF({...f, handle: e.target.value})} placeholder="al-khudari-rentals" /><Text size="small" className="text-ui-fg-muted mt-1">Optional — used in your URL: autotorental.com/companies/<strong>handle</strong></Text></div>
            <div><Label size="small">City *</Label>
              <Select value={f.default_city_id} onValueChange={v => setF({...f, default_city_id: v})}>
                <Select.Trigger><Select.Value placeholder="Pick your city" /></Select.Trigger>
                <Select.Content>{cities.map(c => <Select.Item key={c.id} value={c.id}>{c.country_code.toUpperCase()} · {c.name}</Select.Item>)}</Select.Content>
              </Select>
            </div>
            <div><Label size="small">📞 Phone *</Label><Input dir="ltr" value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="+971501234567" /></div>
            <div><Label size="small">💬 WhatsApp</Label><Input dir="ltr" value={f.whatsapp} onChange={e => setF({...f, whatsapp: e.target.value})} placeholder="+971501234567 (same as phone if blank)" /></div>
          </div>

          <Heading level="h3" className="mb-3">📜 Trade License</Heading>
          <Text size="small" className="text-ui-fg-subtle mb-3">
            Required to publish vehicle listings. Admin will verify within 24 hours. Listings remain in DRAFT until verified.
          </Text>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div><Label size="small">License number *</Label><Input dir="ltr" value={f.trade_license_number} onChange={e => setF({...f, trade_license_number: e.target.value})} placeholder="CN-1234567" /></div>
            <div><Label size="small">Expiry date *</Label><Input type="date" dir="ltr" value={f.trade_license_expiry} onChange={e => setF({...f, trade_license_expiry: e.target.value})} /></div>
            <div className="md:col-span-2">
              <Label size="small">Upload trade license (PDF or photo) *</Label>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {f.trade_license_url ? (
                  <>
                    <Badge color="green">✓ Uploaded</Badge>
                    <a href={f.trade_license_url} target="_blank" rel="noopener" className="text-ui-fg-interactive underline text-sm">View</a>
                  </>
                ) : <Badge color="grey">Not uploaded</Badge>}
                <Button size="small" variant="secondary" type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? "Uploading…" : (f.trade_license_url ? "Replace" : "Choose file")}
                </Button>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.length) upload(e.target.files) }} />
              </div>
            </div>
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", marginBottom: 16 }}>
            <input type="checkbox" checked={f.accept} onChange={e => setF({...f, accept: e.target.checked})} style={{ marginTop: 3 }} />
            <Text size="small">I agree to the <a href="/terms" target="_blank" className="text-ui-fg-interactive underline">Terms of Service</a> and <a href="/privacy" target="_blank" className="text-ui-fg-interactive underline">Privacy Policy</a>, and confirm the trade license belongs to my company.</Text>
          </label>

          <Button onClick={submit} disabled={busy} size="large" style={{ width: "100%" }}>
            {busy ? "Creating your account…" : "🚀 Create my rental company account"}
          </Button>

          <Text size="small" className="text-ui-fg-subtle mt-4 text-center">
            Already have an account? <a href="/rental/login" className="text-ui-fg-interactive underline">Sign in</a>
          </Text>
        </Container>
      </div>
    </div>
  )
}

export default Page
