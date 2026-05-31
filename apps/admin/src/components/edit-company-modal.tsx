import { useEffect, useRef, useState, type ReactNode } from "react"
import { FocusModal, Heading, Text, Input, Label, Button, Select, Textarea, Switch, Badge } from "@medusajs/ui"
import { API } from "../lib/api"

export type CompanyForm = {
  id: string
  name: string
  handle: string
  email: string
  phone: string
  company_phone: string
  company_whatsapp: string
  description: string
  website_url: string
  logo: string
  banner: string
  status: string
  is_premium: boolean
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "active", label: "Active" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "terminated", label: "Terminated" },
]

function statusColor(s: string): "green" | "orange" | "red" | "grey" {
  if (s === "open" || s === "active") return "green"
  if (s === "rejected" || s === "terminated") return "red"
  if (s === "suspended") return "grey"
  return "orange"
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-ui-fg-muted mb-3 mt-1">
      {children}
    </div>
  )
}

function emptyForm(id = ""): CompanyForm {
  return {
    id,
    name: "",
    handle: "",
    email: "",
    phone: "",
    company_phone: "",
    company_whatsapp: "",
    description: "",
    website_url: "",
    logo: "",
    banner: "",
    status: "pending_approval",
    is_premium: false,
  }
}

function sellerToForm(s: any): CompanyForm {
  return {
    id: s.id,
    name: s.name || "",
    handle: s.handle || "",
    email: s.email || "",
    phone: s.phone || "",
    company_phone: s.company_phone || "",
    company_whatsapp: s.company_whatsapp || "",
    description: s.description || "",
    website_url: s.website_url || "",
    logo: s.logo || "",
    banner: s.banner || "",
    status: s.status || "pending_approval",
    is_premium: !!s.is_premium,
  }
}

type Props = {
  sellerId: string | null
  sellerName?: string
  onClose: () => void
  onSaved?: () => void
}

export function EditCompanyModal({ sellerId, sellerName, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CompanyForm>(() => emptyForm())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!sellerId) return
    setLoading(true)
    setError("")
    fetch(`${API}/admin/sellers/${encodeURIComponent(sellerId)}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Could not load company")))
      .then(d => setForm(sellerToForm(d.seller)))
      .catch((e: any) => setError(e.message || "Could not load company"))
      .finally(() => setLoading(false))
  }, [sellerId])

  const uploadImage = async (files: FileList, field: "logo" | "banner") => {
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append("files", f))
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const d = await res.json()
      const url = d.files?.[0]?.url
      if (url) setForm(f => ({ ...f, [field]: url }))
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!sellerId) return
    if (!form.name.trim()) { setError("Company name is required."); return }
    if (!form.email.trim()) { setError("Email is required."); return }
    setSaving(true)
    setError("")
    try {
      const profileBody = {
        name: form.name.trim(),
        handle: form.handle.trim() || null,
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        description: form.description.trim() || null,
        website_url: form.website_url.trim() || null,
        logo: form.logo.trim() || null,
        banner: form.banner.trim() || null,
        status: form.status,
        is_premium: form.is_premium,
      }
      const contactBody = {
        company_phone: form.company_phone.trim() || null,
        company_whatsapp: form.company_whatsapp.trim() || null,
      }

      const r = await fetch(`${API}/admin/sellers/${encodeURIComponent(sellerId)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileBody),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setError(d.message || "Save failed"); return }

      const contactRes = await fetch(`${API}/admin/sellers/${encodeURIComponent(sellerId)}/contact`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactBody),
      })
      const contactData = await contactRes.json().catch(() => ({}))
      if (!contactRes.ok) { setError(contactData.message || "Save failed"); return }
      onSaved?.()
      onClose()
    } catch (e: any) {
      setError(e.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FocusModal open={!!sellerId} onOpenChange={(open) => { if (!open) onClose() }}>
      <FocusModal.Content style={{ maxWidth: 720 }}>
        <FocusModal.Header>
          <Heading>Edit company{sellerName ? `: ${sellerName}` : ""}</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="p-0">
          {loading ? (
            <div className="p-8 text-center text-ui-fg-muted">Loading…</div>
          ) : (
            <div className="flex flex-col" style={{ maxHeight: "72vh" }}>
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-7">

                {/* Live brand preview */}
                <div className="rounded-xl border border-ui-border-base overflow-hidden bg-ui-bg-subtle">
                  <div
                    style={{
                      height: 96,
                      backgroundImage: form.banner ? `url("${form.banner}")` : "linear-gradient(120deg,#1e293b,#334155)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="px-5 pb-4 flex items-end gap-3" style={{ marginTop: -28 }}>
                    <div
                      style={{ width: 64, height: 64 }}
                      className="shrink-0 rounded-full overflow-hidden bg-ui-bg-base flex items-center justify-center text-ui-fg-muted"
                    >
                      {form.logo ? (
                        <img src={form.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: 24, fontWeight: 700 }}>{(form.name || "?").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-ui-fg-base truncate">{form.name || "Company name"}</span>
                        <Badge size="2xsmall" color={statusColor(form.status)}>
                          {STATUS_OPTIONS.find(o => o.value === form.status)?.label || form.status}
                        </Badge>
                        {form.is_premium && <Badge size="2xsmall" color="purple">Premium</Badge>}
                      </div>
                      {form.handle && <div className="text-xs text-ui-fg-muted truncate">@{form.handle}</div>}
                    </div>
                  </div>
                </div>

                {/* Company identity */}
                <section>
                  <SectionTitle>Company identity</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="sm:col-span-2">
                      <Label size="xsmall" className="text-ui-fg-subtle">Company name *</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1.5" placeholder="e.g. Auto to Rental" />
                    </div>
                    <div>
                      <Label size="xsmall" className="text-ui-fg-subtle">Status</Label>
                      <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                        <Select.Trigger className="mt-1.5"><Select.Value /></Select.Trigger>
                        <Select.Content>
                          {STATUS_OPTIONS.map(o => <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>)}
                        </Select.Content>
                      </Select>
                    </div>
                    <div>
                      <Label size="xsmall" className="text-ui-fg-subtle">Handle (URL slug)</Label>
                      <Input value={form.handle} onChange={e => setForm({ ...form, handle: e.target.value })} placeholder="my-company" dir="ltr" className="mt-1.5" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-4 py-3 mt-4">
                    <div>
                      <div className="text-sm font-medium text-ui-fg-base">Premium company</div>
                      <div className="text-xs text-ui-fg-muted">Highlights this company across the marketplace.</div>
                    </div>
                    <Switch checked={form.is_premium} onCheckedChange={v => setForm({ ...form, is_premium: v })} />
                  </div>
                </section>

                {/* Contact */}
                <section>
                  <SectionTitle>Contact details</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                    <div className="sm:col-span-2">
                      <Label size="xsmall" className="text-ui-fg-subtle">Email *</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} dir="ltr" className="mt-1.5" />
                    </div>
                    <div>
                      <Label size="xsmall" className="text-ui-fg-subtle">Phone</Label>
                      <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} dir="ltr" className="mt-1.5" />
                    </div>
                    <div>
                      <Label size="xsmall" className="text-ui-fg-subtle">Company phone</Label>
                      <Input value={form.company_phone} onChange={e => setForm({ ...form, company_phone: e.target.value })} dir="ltr" className="mt-1.5" />
                    </div>
                    <div>
                      <Label size="xsmall" className="text-ui-fg-subtle">WhatsApp</Label>
                      <Input value={form.company_whatsapp} onChange={e => setForm({ ...form, company_whatsapp: e.target.value })} dir="ltr" className="mt-1.5" />
                    </div>
                    <div>
                      <Label size="xsmall" className="text-ui-fg-subtle">Website</Label>
                      <Input value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://" dir="ltr" className="mt-1.5" />
                    </div>
                  </div>
                </section>

                {/* Branding */}
                <section>
                  <SectionTitle>Branding</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-ui-border-base p-4">
                      <Label size="xsmall" className="text-ui-fg-subtle">Logo</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <div style={{ width: 48, height: 48 }} className="shrink-0 rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center text-ui-fg-muted">
                          {form.logo ? <img src={form.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 11 }}>Logo</span>}
                        </div>
                        <Button size="small" variant="secondary" disabled={uploading} onClick={() => logoRef.current?.click()} className="shrink-0">
                          {uploading ? "Uploading…" : "Upload"}
                        </Button>
                        <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }}
                          onChange={e => { if (e.target.files?.length) uploadImage(e.target.files, "logo") }} />
                      </div>
                      <Input value={form.logo} onChange={e => setForm({ ...form, logo: e.target.value })} dir="ltr" className="mt-3" placeholder="https://… or upload" />
                    </div>
                    <div className="rounded-lg border border-ui-border-base p-4">
                      <Label size="xsmall" className="text-ui-fg-subtle">Banner</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <div style={{ width: 96, height: 48 }} className="shrink-0 rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center text-ui-fg-muted">
                          {form.banner ? <img src={form.banner} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 11 }}>Banner</span>}
                        </div>
                        <Button size="small" variant="secondary" disabled={uploading} onClick={() => bannerRef.current?.click()} className="shrink-0">
                          {uploading ? "Uploading…" : "Upload"}
                        </Button>
                        <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }}
                          onChange={e => { if (e.target.files?.length) uploadImage(e.target.files, "banner") }} />
                      </div>
                      <Input value={form.banner} onChange={e => setForm({ ...form, banner: e.target.value })} dir="ltr" className="mt-3" placeholder="https://… or upload" />
                    </div>
                  </div>
                </section>

                {/* About */}
                <section>
                  <SectionTitle>About</SectionTitle>
                  <Label size="xsmall" className="text-ui-fg-subtle">Description</Label>
                  <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} className="mt-1.5" placeholder="Short description shown on the public company page." />
                </section>

                {error && (
                  <div className="text-ui-fg-error text-sm rounded-lg border border-ui-border-error bg-ui-bg-error-subtle px-3 py-2">
                    {error}
                  </div>
                )}
              </div>

              {/* Sticky footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-ui-border-base bg-ui-bg-base">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" isLoading={saving} onClick={save}>Save changes</Button>
              </div>
            </div>
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
