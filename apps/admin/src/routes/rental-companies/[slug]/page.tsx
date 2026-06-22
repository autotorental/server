import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import {
  Container, Heading, Text, Table, Badge, Button, Input, Label, Select,
  FocusModal, Textarea, Switch,
} from "@medusajs/ui"
import { ArrowLeft, Plus, Key, Trash, Photo, CheckCircleSolid, XMark, PencilSquare } from "@medusajs/icons"
import { API } from "../../../lib/api"
import { publicCompanyPath, rentalCompanyPath, sellerSlug } from "../../../lib/seller-slug"
import { EditCompanyModal } from "../../../components/edit-company-modal"

type Seller = any
type Vehicle = any
type Brand = { id: string; name: string }
type Model = { id: string; brand_id: string; name: string; body_type_id?: string | null; colors?: string[] | null }
type City = { id: string; country_code: string; name: string }

const STATUS_COLORS: Record<string, any> = {
  pending_approval: "orange", active: "green", rejected: "red",
  draft: "grey", paused: "grey", unavailable: "red", rented: "blue",
}

const LICENSE_WARN_DAYS = 7

// Returns expiry status for a trade license date string (date column, YYYY-MM-DD).
// tone: "expired" | "soon" | "ok" | null (no date)
function licenseExpiryInfo(dateStr?: string | null): { days: number; tone: "expired" | "soon" | "ok"; label: string } | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0)
  if (isNaN(exp.getTime())) return null
  const days = Math.round((exp.getTime() - today.getTime()) / 86400000)
  if (days < 0) return { days, tone: "expired", label: `Trade license expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago` }
  if (days === 0) return { days, tone: "expired", label: "Trade license expires today" }
  if (days <= LICENSE_WARN_DAYS) return { days, tone: "soon", label: `Trade license expires in ${days} day${days === 1 ? "" : "s"}` }
  return { days, tone: "ok", label: `Valid — expires in ${days} days` }
}

const emptyVehicle = (seller: Seller | null) => ({
  title: "",
  description: "",
  brand_id: "",
  model_id: "",
  city_id: seller?.default_city_id || "",
  year: new Date().getFullYear(),
  mileage_km: null as number | null,
  color: "",
  vin: "",
  fuel_type: "petrol",
  transmission: "automatic",
  seats: 5,
  doors: 4,
  currency_code: "aed",
  daily_price: null as number | null,
  weekly_price: null as number | null,
  monthly_price: null as number | null,
  phone_number: seller?.company_phone || seller?.phone || "",
  whatsapp_number: seller?.company_whatsapp || seller?.company_phone || seller?.phone || "",
  livekit_enabled: false,
  photos: [] as string[],
  status: "pending_approval",
})

const SOCIAL_NETWORKS = [
  { k: "website", label: "Website", placeholder: "https://yourcompany.com" },
  { k: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { k: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { k: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle" },
  { k: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { k: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/971501234567" },
  { k: "twitter", label: "X / Twitter", placeholder: "https://x.com/yourhandle" },
]

const Page = () => {
  const { slug: slugParam } = useParams()
  const slug = slugParam || ""
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [seller, setSeller] = useState<Seller | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [socials, setSocials] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<any>(() => emptyVehicle(null))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [socialSaving, setSocialSaving] = useState(false)
  const [licenseBusy, setLicenseBusy] = useState(false)
  const [licEdit, setLicEdit] = useState(false)
  const [licForm, setLicForm] = useState<{ number: string; expiry: string }>({ number: "", expiry: "" })
  const [resetBusy, setResetBusy] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const modelsForBrand = useMemo(
    () => models.filter(m => m.brand_id === form.brand_id),
    [models, form.brand_id],
  )

  const load = async () => {
    if (!slug) return
    setLoading(true)
    try {
      const sRes = await fetch(`${API}/admin/sellers/${encodeURIComponent(slug)}`, { credentials: "include" })
      const sData = sRes.ok ? await sRes.json() : {}
      const s = sData.seller || null
      setSeller(s)
      if (!s) {
        setVehicles([])
        return
      }

      const sellerId = s.id
      const [vRes, bRes, mRes, cRes, socRes] = await Promise.all([
        fetch(`${API}/admin/vehicles?seller_id=${sellerId}&limit=50&offset=0`, { credentials: "include" }),
        fetch(`${API}/admin/catalog/brands`, { credentials: "include" }),
        fetch(`${API}/admin/catalog/models`, { credentials: "include" }),
        fetch(`${API}/admin/locations/cities`, { credentials: "include" }),
        fetch(`${API}/admin/sellers/${encodeURIComponent(slug)}/socials`, { credentials: "include" }),
      ])
      const vData = vRes.ok ? await vRes.json() : { vehicles: [] }
      const bData = bRes.ok ? await bRes.json() : { brands: [] }
      const mData = mRes.ok ? await mRes.json() : { models: [] }
      const cData = cRes.ok ? await cRes.json() : { cities: [] }
      const socData = socRes.ok ? await socRes.json() : { social: {} }

      setVehicles(vData.vehicles || [])
      setBrands(bData.brands || [])
      setModels(mData.models || [])
      setCities(cData.cities || [])
      setSocials(socData.social || {})
      setForm(emptyVehicle(s))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [slug])

  useEffect(() => {
    if (searchParams.get("edit") === "1" && seller) {
      setShowEdit(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, seller, setSearchParams])

  useEffect(() => {
    if (!seller || !slug) return
    const canonical = sellerSlug(seller)
    if (canonical && slug !== canonical) {
      navigate(rentalCompanyPath(seller), { replace: true })
    }
  }, [seller, slug, navigate])

  const uploadPhotos = async (files: FileList) => {
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach(f => fd.append("files", f))
      const r = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const d = await r.json()
      const urls = (d.files || []).map((x: any) => x.url).filter(Boolean)
      setForm((x: any) => ({ ...x, photos: [...(x.photos || []), ...urls] }))
    } finally {
      setUploading(false)
    }
  }

  const saveVehicle = async () => {
    if (!seller) return
    if (!form.title?.trim() || !form.brand_id || !form.city_id) {
      alert("Title, brand, and city are required.")
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`${API}/admin/vehicles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, seller_id: seller.id }),
      })
      const d = await r.json()
      if (!r.ok) {
        alert(d.message || "Could not create vehicle")
        return
      }
      setShowAdd(false)
      setForm(emptyVehicle(seller))
      await load()
    } finally {
      setSaving(false)
    }
  }

  const approve = async (vehicleId: string) => {
    await fetch(`${API}/admin/vehicles/${vehicleId}/approve`, { method: "POST", credentials: "include" })
    load()
  }

  const reject = async (vehicleId: string) => {
    const reason = window.prompt("Rejection reason code (e.g. wrong_details):") || "other"
    const note = window.prompt("Note for vendor (optional):") || ""
    await fetch(`${API}/admin/vehicles/${vehicleId}/reject`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejection_reason: reason, rejection_note: note }),
    })
    load()
  }

  const openLicenseEdit = () => {
    setLicForm({
      number: seller?.trade_license_number || "",
      expiry: seller?.trade_license_expiry ? String(seller.trade_license_expiry).slice(0, 10) : "",
    })
    setLicEdit(true)
  }
  const saveLicense = async () => {
    if (!seller) return
    setLicenseBusy(true)
    try {
      const r = await fetch(`${API}/admin/sellers/${encodeURIComponent(slug)}/license`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade_license_number: licForm.number.trim() || null, trade_license_expiry: licForm.expiry || null }),
      })
      if (!r.ok) { const j = await r.json().catch(() => ({})); window.alert(j.message || `Failed (${r.status})`); return }
      setLicEdit(false)
      await load()
    } finally {
      setLicenseBusy(false)
    }
  }
  const verifyLicense = async (action: "approve" | "reject") => {
    let reason = ""
    if (action === "reject") {
      reason = window.prompt("Reason for rejecting the trade license:") || "Trade license invalid or expired"
    }
    setLicenseBusy(true)
    try {
      const r = await fetch(`${API}/admin/sellers/${encodeURIComponent(slug)}/verify-license`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        window.alert(j.message || `Failed (${r.status})`)
        return
      }
      await load()
    } finally {
      setLicenseBusy(false)
    }
  }

  const saveSocials = async () => {
    setSocialSaving(true)
    try {
      const r = await fetch(`${API}/admin/sellers/${encodeURIComponent(slug)}/socials`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(socials),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d.message || "Could not save social links")
      }
    } finally {
      setSocialSaving(false)
    }
  }

  const resetPassword = async () => {
    if (!window.confirm(`Generate a new password for ${seller?.name || "this company"}?`)) return
    setResetBusy(true)
    try {
      const r = await fetch(`${API}/admin/sellers/${encodeURIComponent(slug)}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const d = await r.json()
      if (!r.ok) {
        alert(d.message || "Password reset failed")
        return
      }
      const msg = `Login: ${d.login_email || seller?.email || ""}\nPassword: ${d.new_password}`
      window.prompt("Copy this password for the vendor:", msg)
    } finally {
      setResetBusy(false)
    }
  }

  const deleteCompany = async () => {
    if (!window.confirm(`Delete "${seller?.name}" and ALL their vehicles?\n\nThis cannot be undone.`)) return
    const r = await fetch(`${API}/admin/sellers/${encodeURIComponent(slug)}/delete-account`, {
      method: "POST",
      credentials: "include",
    })
    const d = await r.json()
    if (!r.ok) {
      alert(d.message || "Delete failed")
      return
    }
    alert(`Deleted "${d.seller_name}" — ${d.vehicles_deleted} vehicle(s) removed.`)
    window.location.href = "/dashboard/sellers"
  }

  const wa = seller?.company_whatsapp || seller?.company_phone || seller?.phone || ""
  const waClean = wa.replace(/[^0-9]/g, "")

  if (loading && !seller) {
    return (
      <SingleColumnPage>
        <Container className="p-6"><Text>Loading rental company…</Text></Container>
      </SingleColumnPage>
    )
  }

  if (!seller) {
    return (
      <SingleColumnPage>
        <Container className="p-6">
          <Heading level="h1">Company not found</Heading>
          <Link to="/sellers" className="text-ui-fg-interactive">← Back to rental companies</Link>
        </Container>
      </SingleColumnPage>
    )
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Link to="/sellers" className="text-ui-fg-subtle text-sm inline-flex items-center gap-1 mb-3 hover:text-ui-fg-interactive">
          <ArrowLeft /> Rental companies
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {seller.logo ? (
              <img
                src={seller.logo}
                alt=""
                className="rounded-full object-cover border border-ui-border-base"
                style={{ width: 64, height: 64 }}
              />
            ) : (
              <div
                className="rounded-full bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center text-ui-fg-muted"
                style={{ width: 64, height: 64, fontSize: 24, fontWeight: 700 }}
              >
                {(seller.name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Heading level="h1">{seller.name}</Heading>
              <div className="flex items-center gap-2 flex-wrap">
                {seller.handle && <Text size="small" className="text-ui-fg-muted">@{seller.handle}</Text>}
                <Badge size="2xsmall" color={seller.status === "active" || seller.status === "open" ? "green" : seller.status === "rejected" ? "red" : "orange"}>
                  {seller.status || "—"}
                </Badge>
                <Badge size="2xsmall" color={seller.trade_license_verified ? "green" : "orange"}>
                  {seller.trade_license_verified ? "License verified" : "License pending"}
                </Badge>
                {(() => {
                  const info = licenseExpiryInfo(seller.trade_license_expiry)
                  if (!info || info.tone === "ok") return null
                  return (
                    <Badge size="2xsmall" color={info.tone === "expired" ? "red" : "orange"}>
                      {info.tone === "expired" ? (info.days === 0 ? "Expires today" : "License expired") : `Expires in ${info.days}d`}
                    </Badge>
                  )
                })()}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="small" variant="secondary" onClick={() => setShowEdit(true)}>
              <PencilSquare /> Edit
            </Button>
            <Button size="small" variant="secondary" isLoading={resetBusy} onClick={resetPassword}>
              <Key /> Reset password
            </Button>
            <Button size="small" variant="primary" onClick={() => { setForm(emptyVehicle(seller)); setShowAdd(true) }}>
              <Plus /> Add vehicle
            </Button>
            <Button size="small" variant="danger" onClick={deleteCompany}>
              <Trash /> Delete
            </Button>
          </div>
        </div>
      </Container>

      <Container className="p-6 flex flex-col gap-6">
        {seller.banner && (
          <div
            className="rounded-xl border border-ui-border-base bg-ui-bg-subtle"
            style={{ height: 240, backgroundImage: `url("${seller.banner}")`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        )}

        <div>
          <Text size="small" weight="plus" className="text-ui-fg-subtle mb-3">Company details</Text>
          <div className="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <div className="flex flex-col gap-1">
              <Label size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">Email</Label>
              <Text size="small">{seller.email || "—"}</Text>
            </div>
            <div className="flex flex-col gap-1">
              <Label size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">Phone</Label>
              <Text size="small" dir="ltr">{seller.company_phone || seller.phone || "—"}</Text>
            </div>
            <div className="flex flex-col gap-1">
              <Label size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">WhatsApp</Label>
              {waClean ? (
                <a href={`https://wa.me/${waClean}`} target="_blank" rel="noopener" className="text-[#25d366] text-sm font-medium" dir="ltr">
                  {wa} ↗
                </a>
              ) : <Text size="small">—</Text>}
            </div>
            <div className="flex flex-col gap-1">
              <Label size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">Public page</Label>
              <a href={`https://autotorental.com${publicCompanyPath(seller)}`} target="_blank" rel="noopener" className="text-ui-fg-interactive text-sm truncate">
                autotorental.com{publicCompanyPath(seller)} ↗
              </a>
            </div>
            <div className="flex flex-col gap-1">
              <Label size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">Joined</Label>
              <Text size="small">{seller.created_at ? new Date(seller.created_at).toLocaleDateString() : "—"}</Text>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ui-border-base p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Text size="small" weight="plus">Trade license</Text>
              <Badge size="2xsmall" color={seller.trade_license_verified ? "green" : "orange"}>
                {seller.trade_license_verified ? "Verified" : "Pending"}
              </Badge>
            </div>
            <div className="flex gap-2">
              {!seller.trade_license_verified && (
                <Button size="small" variant="primary" isLoading={licenseBusy} onClick={() => verifyLicense("approve")}>
                  <CheckCircleSolid /> Approve
                </Button>
              )}
              {(seller.trade_license_verified || seller.trade_license_url) && (
                <Button size="small" variant="secondary" isLoading={licenseBusy} onClick={() => verifyLicense("reject")}>
                  <XMark /> {seller.trade_license_verified ? "Revoke" : "Reject"}
                </Button>
              )}
            </div>
          </div>
          {(() => {
            const info = licenseExpiryInfo(seller.trade_license_expiry)
            if (!info || info.tone === "ok") return null
            const isExpired = info.tone === "expired"
            return (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{
                  background: isExpired ? "rgba(220,38,38,0.10)" : "rgba(217,119,6,0.10)",
                  border: `1px solid ${isExpired ? "rgba(220,38,38,0.35)" : "rgba(217,119,6,0.35)"}`,
                  color: isExpired ? "#dc2626" : "#b45309",
                }}
              >
                <span style={{ fontSize: 15 }}>{isExpired ? "⛔" : "⏰"}</span>
                <span style={{ fontWeight: 600 }}>{info.label}</span>
              </div>
            )
          })()}
          <div className="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            <div className="flex flex-col gap-0.5">
              <Label size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">License No.</Label>
              <Text size="small">{seller.trade_license_number || "—"}</Text>
            </div>
            <div className="flex flex-col gap-0.5">
              <Label size="xsmall" className="text-ui-fg-muted uppercase tracking-wide">Expiry</Label>
              {(() => {
                const info = licenseExpiryInfo(seller.trade_license_expiry)
                const color = info?.tone === "expired" ? "#dc2626" : info?.tone === "soon" ? "#b45309" : undefined
                return (
                  <Text size="small" style={color ? { color, fontWeight: 600 } : undefined}>
                    {seller.trade_license_expiry ? new Date(seller.trade_license_expiry).toLocaleDateString() : "—"}
                  </Text>
                )
              })()}
            </div>
          </div>
          {licEdit ? (
            <div className="flex flex-col gap-2 rounded-lg border border-ui-border-base p-3">
              <div className="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
                <div className="flex flex-col gap-0.5">
                  <Label size="xsmall" className="text-ui-fg-subtle">License No.</Label>
                  <Input value={licForm.number} onChange={e => setLicForm({ ...licForm, number: e.target.value })} dir="ltr" className="mt-1" placeholder="e.g. 123456" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <Label size="xsmall" className="text-ui-fg-subtle">Expiry date</Label>
                  <Input type="date" value={licForm.expiry} onChange={e => setLicForm({ ...licForm, expiry: e.target.value })} dir="ltr" className="mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="small" variant="primary" isLoading={licenseBusy} onClick={saveLicense}>Save license</Button>
                <Button size="small" variant="secondary" onClick={() => setLicEdit(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button size="small" variant="secondary" className="w-fit" onClick={openLicenseEdit}>✎ Edit / Renew license</Button>
          )}
          {seller.trade_license_rejection_reason && (
            <Text size="small" className="text-ui-fg-error">Rejected: {seller.trade_license_rejection_reason}</Text>
          )}
          {seller.trade_license_url ? (
            /\.pdf($|\?)/i.test(seller.trade_license_url) ? (
              <a href={seller.trade_license_url} target="_blank" rel="noopener" className="text-ui-fg-interactive text-sm inline-flex items-center gap-1 w-fit">
                📄 Open uploaded license (PDF) ↗
              </a>
            ) : (
              <a href={seller.trade_license_url} target="_blank" rel="noopener" className="inline-block w-fit">
                <img
                  src={seller.trade_license_url}
                  alt="Trade license"
                  className="rounded-lg border border-ui-border-base"
                  style={{ maxWidth: 280, maxHeight: 200, objectFit: "cover" }}
                />
              </a>
            )
          ) : (
            <Text size="small" className="text-ui-fg-muted">No license document uploaded.</Text>
          )}
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4 flex items-center justify-between border-b border-ui-border-base">
          <div className="flex items-center gap-2">
            <Heading level="h2">Vehicles</Heading>
            <Badge size="2xsmall" color="grey">{vehicles.length}</Badge>
          </div>
          <Link to={`/vehicles?seller_id=${seller.id}`} className="text-sm text-ui-fg-interactive">Manage in Vehicles →</Link>
        </div>

        {vehicles.length === 0 ? (
          <div className="px-6 py-12 text-center text-ui-fg-muted text-sm">
            No vehicles yet — click <span className="text-ui-fg-base font-medium">Add vehicle</span> to list a car for this company.
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {vehicles.map(v => (
              <div key={v.id} className="flex items-center gap-4 px-6 py-3 hover:bg-ui-bg-base-hover transition-colors">
                <div style={{ width: 80, height: 56 }} className="shrink-0 rounded-lg overflow-hidden border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center">
                  {v.photos?.[0]
                    ? <img src={v.photos[0]} alt="" className="w-full h-full object-cover" />
                    : <span style={{ fontSize: 22 }}>🚗</span>}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-medium text-ui-fg-base truncate">{v.title}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Button size="small" variant="secondary" onClick={() => window.open(`https://autotorental.com/cars/${v.id}`, "_blank", "noopener")}>View listing ↗</Button>
                    <Button size="small" variant="secondary" onClick={() => navigate(`/vehicles?seller_id=${seller.id}&edit_id=${v.id}`)}>Edit in admin →</Button>
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge size="2xsmall" color={STATUS_COLORS[v.status] || "grey"}>{v.status}</Badge>
                </div>

                <div style={{ width: 112 }} className="shrink-0 text-right">
                  {v.daily_price ? (
                    <>
                      <span className="font-medium text-ui-fg-base">{(v.currency_code || "aed").toUpperCase()} {v.daily_price}</span>
                      <span className="text-ui-fg-muted text-xs"> /day</span>
                    </>
                  ) : <span className="text-ui-fg-muted">—</span>}
                </div>

                <div style={{ width: 176 }} className="shrink-0 flex justify-end gap-2">
                  {v.status === "pending_approval" && (
                    <>
                      <Button size="small" variant="primary" onClick={() => approve(v.id)}><CheckCircleSolid /> Approve</Button>
                      <Button size="small" variant="danger" onClick={() => reject(v.id)}><XMark /> Reject</Button>
                    </>
                  )}
                  {v.status === "active" && (
                    <Button size="small" variant="secondary" onClick={() => reject(v.id)}>Take down</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      <Container className="p-6 mt-2">
        <Heading level="h2" className="mb-2">🔗 Social media</Heading>
        <Text className="text-ui-fg-subtle mb-4 text-sm">Links shown on the public company page.</Text>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {SOCIAL_NETWORKS.map(n => (
            <div key={n.k}>
              <Label size="small">{n.label}</Label>
              <Input
                value={socials[n.k] || ""}
                onChange={e => setSocials({ ...socials, [n.k]: e.target.value })}
                placeholder={n.placeholder}
                dir="ltr"
                className="mt-1"
              />
            </div>
          ))}
        </div>
        <Button variant="secondary" isLoading={socialSaving} onClick={saveSocials}>Save social links</Button>
      </Container>

      <FocusModal open={showAdd} onOpenChange={setShowAdd}>
        <FocusModal.Content style={{ maxWidth: 720 }}>
          <FocusModal.Header><Heading>Add vehicle for {seller.name}</Heading></FocusModal.Header>
          <FocusModal.Body>
            <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label size="small">Title *</Label>
                  <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="2024 Toyota Camry" className="mt-1" />
                </div>
                <div>
                  <Label size="small">Brand *</Label>
                  <Select value={form.brand_id} onValueChange={v => setForm({ ...form, brand_id: v, model_id: "" })}>
                    <Select.Trigger className="mt-1"><Select.Value placeholder="Brand" /></Select.Trigger>
                    <Select.Content>{brands.map(b => <Select.Item key={b.id} value={b.id}>{b.name}</Select.Item>)}</Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Model</Label>
                  <Select value={form.model_id || ""} onValueChange={v => setForm({ ...form, model_id: v })} disabled={!form.brand_id}>
                    <Select.Trigger className="mt-1"><Select.Value placeholder="Model" /></Select.Trigger>
                    <Select.Content>{modelsForBrand.map(m => <Select.Item key={m.id} value={m.id}>{m.name}</Select.Item>)}</Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">City *</Label>
                  <Select value={form.city_id} onValueChange={v => setForm({ ...form, city_id: v })}>
                    <Select.Trigger className="mt-1"><Select.Value placeholder="City" /></Select.Trigger>
                    <Select.Content>{cities.map(c => <Select.Item key={c.id} value={c.id}>{c.country_code.toUpperCase()} · {c.name}</Select.Item>)}</Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Year</Label>
                  <Input type="number" value={form.year || ""} onChange={e => setForm({ ...form, year: parseInt(e.target.value, 10) || null })} className="mt-1" />
                </div>
                <div>
                  <Label size="small">VIN (chassis no.)</Label>
                  <Input value={form.vin || ""} onChange={e => setForm({ ...form, vin: e.target.value.toUpperCase() })} placeholder="Optional — e.g. JTDBR32E..." maxLength={17} className="mt-1" />
                </div>
                <div>
                  <Label size="small">Daily price (AED)</Label>
                  <Input type="number" value={form.daily_price ?? ""} onChange={e => setForm({ ...form, daily_price: parseFloat(e.target.value) || null })} className="mt-1" />
                </div>
                <div>
                  <Label size="small">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                    <Select.Trigger className="mt-1"><Select.Value /></Select.Trigger>
                    <Select.Content>
                      <Select.Item value="pending_approval">Pending approval</Select.Item>
                      <Select.Item value="draft">Draft</Select.Item>
                      <Select.Item value="active">Active (publish now)</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label size="small">Description</Label>
                  <Textarea value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" />
                </div>
                <div>
                  <Label size="small">Phone</Label>
                  <Input value={form.phone_number || ""} onChange={e => setForm({ ...form, phone_number: e.target.value })} dir="ltr" className="mt-1" />
                </div>
                <div>
                  <Label size="small">WhatsApp</Label>
                  <Input value={form.whatsapp_number || ""} onChange={e => setForm({ ...form, whatsapp_number: e.target.value })} dir="ltr" className="mt-1" />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={!!form.livekit_enabled} onCheckedChange={v => setForm({ ...form, livekit_enabled: v })} />
                  <Label size="small">Enable in-app free calls (LiveKit)</Label>
                </div>
              </div>

              <div>
                <Label size="small">Photos ({(form.photos || []).length})</Label>
                <div className="flex flex-wrap gap-2 my-2">
                  {(form.photos || []).map((url: string, i: number) => (
                    <div key={i} className="relative border rounded overflow-hidden" style={{ width: 88, height: 66 }}>
                      <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, photos: form.photos.filter((_: any, j: number) => j !== i) })}
                        className="absolute top-0 right-0 bg-black/60 text-white text-xs px-1"
                      >×</button>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" size="small" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Photo /> {uploading ? "Uploading…" : "Upload photos"}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { if (e.target.files?.length) uploadPhotos(e.target.files) }} />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                <Button variant="primary" isLoading={saving} onClick={saveVehicle}>Create vehicle</Button>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <EditCompanyModal
        sellerId={showEdit ? (seller?.id || slug) : null}
        sellerName={seller?.name}
        onClose={() => setShowEdit(false)}
        onSaved={load}
      />
    </SingleColumnPage>
  )
}

export default Page
