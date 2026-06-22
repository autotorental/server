import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Select, FocusModal, Textarea, Label, Input } from "@medusajs/ui"
import { HandTruck, CheckCircleSolid, XMark, PencilSquare, Photo, Sparkles } from "@medusajs/icons"
import { VehicleProfileModal } from "../../components/vehicle-profile-modal"
import { Link, useSearchParams } from "react-router-dom"
import { API } from "../../lib/api"
import { rentalCompanyPath } from "../../lib/seller-slug"
import { VehicleVideoPreview } from "../../components/vehicle-video-preview"
import { isAllowedVideoLink, videoLinkLabel } from "../../lib/vehicle-video"

export const config: RouteConfig = { label: tt("Vehicles", "المركبات"), icon: HandTruck, rank: 12 }

type Vehicle = any
type Brand = any
type Model = any
type City = any
type Seller = any
type Feature = { id: string; name: string; category?: string | null; slug?: string | null }

const STATUS_COLORS: Record<string, any> = {
  pending_approval: "orange", active: "green", rejected: "red",
  draft: "grey", paused: "grey", unavailable: "red", rented: "blue",
}
const STATUS_LABELS: Record<string, string> = {
  pending_approval: tt("⏳ Pending Approval", "⏳ بانتظار الموافقة"), active: tt("✅ Active", "✅ نشطة"), rejected: tt("❌ Rejected", "❌ مرفوضة"),
  draft: tt("📝 Draft", "📝 مسودّة"), paused: tt("⏸️ Paused", "⏸️ موقوفة"), unavailable: tt("🚫 Unavailable", "🚫 غير متاحة"), rented: tt("🚙 Rented", "🚙 مؤجّرة"),
}
const REJECT_REASONS: Record<string, string> = {
  wrong_details: "Wrong details / inaccurate info",
  photos_unclear: "Photos are unclear or low quality",
  wrong_price: "Price is unrealistic or wrong",
  missing_info: "Missing required information",
  duplicate: "Duplicate listing",
  inappropriate: "Inappropriate content",
  spam: "Looks like spam",
  fake: "Fake or fraudulent listing",
  other: "Other (see note)",
}

const EDITABLE_STATUSES = ["draft", "pending_approval", "active", "paused", "rented", "unavailable"] as const

const toNumberOrNull = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const toIntegerOrNull = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return null
  const num = Number.parseInt(String(value), 10)
  return Number.isFinite(num) ? num : null
}

const normalizeEditorForm = (vehicle: Vehicle | null) => ({
  id: vehicle?.id || "",
  seller_id: vehicle?.seller_id || "",
  title: vehicle?.title || "",
  description: vehicle?.description || "",
  brand_id: vehicle?.brand_id || "",
  model_id: vehicle?.model_id || "",
  body_type_id: vehicle?.body_type_id || "",
  year: vehicle?.year ?? "",
  mileage_km: vehicle?.mileage_km ?? "",
  color: vehicle?.color || "",
  fuel_type: vehicle?.fuel_type || "petrol",
  transmission: vehicle?.transmission || "automatic",
  seats: vehicle?.seats ?? "",
  doors: vehicle?.doors ?? "",
  city_id: vehicle?.city_id || "",
  status: vehicle?.status || "draft",
  currency_code: (vehicle?.currency_code || "aed").toLowerCase(),
  daily_price: vehicle?.daily_price ?? "",
  weekly_price: vehicle?.weekly_price ?? "",
  monthly_price: vehicle?.monthly_price ?? "",
  phone_number: vehicle?.phone_number || "",
  whatsapp_number: vehicle?.whatsapp_number || "",
  livekit_enabled: !!vehicle?.livekit_enabled,
  feature_ids: Array.isArray(vehicle?.feature_ids) ? vehicle.feature_ids : [],
  supports_photos: true,
  supports_videos: true,
  photos: Array.isArray(vehicle?.photos) ? vehicle.photos : [],
  videos: Array.isArray(vehicle?.videos) ? vehicle.videos : [],
})

const RejectModal = ({ vehicle, onConfirm, onClose }: any) => {
  const [reason, setReason] = useState("wrong_details")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  return (
    <FocusModal open={!!vehicle} onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header><Heading>Reject Vehicle Listing</Heading></FocusModal.Header>
        <FocusModal.Body>
          <div className="p-6 flex flex-col gap-4" style={{ maxWidth: 600 }}>
            <Text>Why reject "<strong>{vehicle?.title}</strong>"?</Text>
            <div>
              <Label size="small">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  {Object.entries(REJECT_REASONS).map(([k, v]) => <Select.Item key={k} value={k}>{v}</Select.Item>)}
                </Select.Content>
              </Select>
            </div>
            <div>
              <Label size="small">Note (optional, shown to seller)</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. The third photo is blurry — please re-upload" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" disabled={saving} onClick={async () => {
                setSaving(true)
                try { await onConfirm(reason, note); onClose() }
                finally { setSaving(false) }
              }}>{saving ? "Rejecting..." : "Reject Listing"}</Button>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

const EditVehicleModal = ({ open, vehicle, brands, models, cities, features, sellers, bodyTypes = [], onClose, onSaved }: any) => {
  const [form, setForm] = useState<any>(() => normalizeEditorForm(vehicle))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null)
  const [videoLink, setVideoLink] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)
  const [videoGenerating, setVideoGenerating] = useState(false)
  const [videoStatus, setVideoStatus] = useState<string | null>(null)
  const [videoProgress, setVideoProgress] = useState<{ pct: number; phase: string; elapsed: number }>({ pct: 0, phase: "", elapsed: 0 })
  const photoRef = useRef<HTMLInputElement>(null)

  const generateVideoAd = async () => {
    if (!vehicle?.id) return
    setVideoGenerating(true)
    setVideoStatus(null)
    setVideoProgress({ pct: 1, phase: "Starting…", elapsed: 0 })
    try {
      const r = await fetch(`${API}/admin/ai/generate-video-ad`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle_id: vehicle.id }),
      })
      if (!r.body) throw new Error("No stream")
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() || ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") continue
          try {
            const ev = JSON.parse(data)
            if (ev.event === "progress") {
              setVideoProgress({ pct: ev.pct || 0, phase: ev.phase || "", elapsed: ev.elapsed_s || 0 })
            } else if (ev.event === "done") {
              setVideoProgress({ pct: 100, phase: "Done!", elapsed: 0 })
              setVideoStatus("✅ AI video ready & saved — your real car + music!")
              if (ev.video_url) {
                setForm((prev: any) => {
                  const cur = Array.isArray(prev.videos) ? prev.videos : []
                  if (cur.includes(ev.video_url)) return prev
                  return { ...prev, videos: [ev.video_url, ...cur].slice(0, 3) }
                })
              }
              setTimeout(() => setVideoProgress({ pct: 0, phase: "", elapsed: 0 }), 2500)
            } else if (ev.event === "error") {
              setVideoStatus(`❌ ${ev.message || "Failed"}`)
              setVideoProgress({ pct: 0, phase: "", elapsed: 0 })
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setVideoStatus(`❌ ${e?.message || "Network error"}`)
      setVideoProgress({ pct: 0, phase: "", elapsed: 0 })
    } finally { setVideoGenerating(false) }
  }
  const videoRef = useRef<HTMLInputElement>(null)

  const generateWithAI = async () => {
    setAiGenerating(true)
    setFeedback(null)
    try {
      const brandName = brands.find((b: any) => b.id === form.brand_id)?.name || ""
      const modelName = modelsForBrand.find((m: any) => m.id === form.model_id)?.name || ""
      const cityName = cities.find((c: any) => c.id === form.city_id)?.name || ""
      const bodyName = bodyTypes.find((b: any) => b.id === form.body_type_id)?.name || ""
      const [descRes, featRes] = await Promise.all([
        fetch(`${API}/admin/ai/generate-description`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: brandName, model: modelName, year: form.year,
            body_type: bodyName, transmission: form.transmission,
            fuel_type: form.fuel_type, seats: form.seats, color: form.color,
            price_daily: form.daily_price, city: cityName, currency: form.currency_code?.toUpperCase() || "AED",
          }),
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/admin/ai/suggest-features`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brand: brandName, model: modelName, year: form.year, body_type: bodyName, transmission: form.transmission }),
        }).then(r => r.ok ? r.json() : null).catch(() => null),
      ])
      const patch: any = {}
      if (descRes?.title) patch.title = descRes.title
      if (descRes?.description) patch.description = descRes.description
      if (featRes?.feature_ids?.length) patch.feature_ids = featRes.feature_ids
      // Auto-select the Model from the generated title/description (match against this brand's models)
      if (!form.model_id && Array.isArray(modelsForBrand) && modelsForBrand.length) {
        const hay = `${patch.title || form.title || ""} ${patch.description || ""}`.toLowerCase()
        const matched = [...modelsForBrand]
          .sort((a: any, b: any) => (b.name?.length || 0) - (a.name?.length || 0))
          .find((m: any) => m.name && hay.includes(String(m.name).toLowerCase()))
        if (matched) patch.model_id = matched.id
      }
      setForm((prev: any) => ({ ...prev, ...patch }))
      setFeedback({ type: "success", message: `AI generated: title${descRes?.description ? " + description" : ""}${featRes?.feature_ids?.length ? ` + ${featRes.feature_ids.length} features` : ""}` })
    } catch (e: any) {
      setFeedback({ type: "error", message: e?.message || "AI generation failed" })
    } finally { setAiGenerating(false) }
  }

  useEffect(() => {
    if (!open) return
    setForm(normalizeEditorForm(vehicle))
    setFeedback(null)
    setVideoLink("")
  }, [open, vehicle?.id])

  const modelsForBrand = useMemo(
    () => models.filter((m: Model) => !form.brand_id || m.brand_id === form.brand_id),
    [models, form.brand_id]
  )
  const sortedSellers = useMemo(
    () => [...(sellers || [])].sort((a: Seller, b: Seller) => (a.name || "").localeCompare(b.name || "")),
    [sellers]
  )
  const supportsPhotos = !!form.supports_photos
  const supportsVideos = !!form.supports_videos
  const selectedFeatures = Array.isArray(form.feature_ids) ? form.feature_ids : []
  const featuresByCategory = useMemo(() => {
    const grouped: Record<string, Feature[]> = {}
    ;(features || []).forEach((feature: Feature) => {
      const category = (feature.category || "other").trim() || "other"
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(feature)
    })
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => a.name.localeCompare(b.name))
    }
    return grouped
  }, [features])

  const toggleFeature = (featureId: string) => {
    const ids = new Set(selectedFeatures)
    if (ids.has(featureId)) ids.delete(featureId)
    else ids.add(featureId)
    setForm({ ...form, feature_ids: Array.from(ids) })
  }

  const setCategoryFeatures = (categoryFeatures: Feature[], selected: boolean) => {
    const ids = new Set(selectedFeatures)
    for (const feature of categoryFeatures) {
      if (selected) ids.add(feature.id)
      else ids.delete(feature.id)
    }
    setForm({ ...form, feature_ids: Array.from(ids) })
  }

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ""))
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })

  const uploadMedia = async (file: File, mediaKind: "image" | "video") => {
    const content_base64 = await fileToBase64(file)
    const response = await fetch(`${API}/admin/vehicles/media`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        content_base64,
        media_kind: mediaKind,
        mime_type: file.type || undefined,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.message || "Upload failed")
    }
    return data?.file?.url as string
  }

  const addUploadedMedia = async (files: FileList, mediaKind: "image" | "video") => {
    setUploading(true)
    setFeedback(null)
    try {
      const currentVideos = Array.isArray(form.videos) ? form.videos.length : 0
      const allowedFiles =
        mediaKind === "video" ? Array.from(files).slice(0, Math.max(0, 3 - currentVideos)) : Array.from(files)
      if (mediaKind === "video" && allowedFiles.length === 0) {
        setFeedback({ type: "error", message: "Maximum 3 videos per vehicle." })
        return
      }

      const urls = (await Promise.all(allowedFiles.map((file) => uploadMedia(file, mediaKind)))).filter(Boolean)
      setForm((prev: any) => {
        if (mediaKind === "image") return { ...prev, photos: [...(prev.photos || []), ...urls] }
        return { ...prev, videos: [...(prev.videos || []), ...urls] }
      })
      setFeedback({
        type: "success",
        message: mediaKind === "image" ? "Photos uploaded successfully." : "Videos uploaded successfully.",
      })
    } catch (e: any) {
      setFeedback({ type: "error", message: e?.message || "Upload failed" })
    } finally {
      setUploading(false)
    }
  }

  const addVideoLink = () => {
    const url = videoLink.trim()
    if (!url) {
      setFeedback({ type: "error", message: "Paste a video link first." })
      return
    }
    if (!isAllowedVideoLink(url)) {
      setFeedback({ type: "error", message: "Enter a valid http(s) video link." })
      return
    }
    if ((form.videos || []).length >= 3) {
      setFeedback({ type: "error", message: "Maximum 3 videos per vehicle." })
      return
    }
    if ((form.videos || []).includes(url)) {
      setFeedback({ type: "error", message: "This video link is already added." })
      return
    }
    setForm((prev: any) => ({ ...prev, videos: [...(prev.videos || []), url] }))
    setVideoLink("")
    setFeedback({ type: "success", message: `${videoLinkLabel(url)} link added.` })
  }

  const submit = async () => {
    const payload: any = {
      seller_id: form.seller_id || null,
      title: String(form.title || "").trim(),
      description: String(form.description || "").trim() || null,
      brand_id: form.brand_id || null,
      model_id: form.model_id || null,
      year: toIntegerOrNull(form.year),
      mileage_km: toIntegerOrNull(form.mileage_km),
      color: String(form.color || "").trim() || null,
      fuel_type: form.fuel_type || null,
      transmission: form.transmission || null,
      seats: toIntegerOrNull(form.seats),
      doors: toIntegerOrNull(form.doors),
      city_id: form.city_id || null,
      status: EDITABLE_STATUSES.includes(form.status) ? form.status : "draft",
      currency_code: String(form.currency_code || "aed").toLowerCase(),
      daily_price: toNumberOrNull(form.daily_price),
      weekly_price: toNumberOrNull(form.weekly_price),
      monthly_price: toNumberOrNull(form.monthly_price),
      phone_number: String(form.phone_number || "").trim() || null,
      whatsapp_number: String(form.whatsapp_number || "").trim() || null,
      livekit_enabled: !!form.livekit_enabled,
      feature_ids: Array.isArray(form.feature_ids) ? form.feature_ids.filter(Boolean) : [],
    }
    if (supportsPhotos) payload.photos = Array.isArray(form.photos) ? form.photos.filter(Boolean) : []
    payload.videos = Array.isArray(form.videos) ? form.videos.filter(Boolean) : []

    if (!payload.title || !payload.brand_id || !payload.city_id || !payload.seller_id) {
      setFeedback({ type: "error", message: "Title, rental company, brand, and city are required." })
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetch(`${API}/admin/vehicles/${form.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback({ type: "error", message: data?.message || "Failed to update vehicle." })
        return
      }

      setFeedback({ type: "success", message: "Vehicle updated successfully." })
      onSaved(data?.vehicle || { ...vehicle, ...payload, id: form.id })
      onClose()
    } catch (e: any) {
      setFeedback({ type: "error", message: e?.message || "Failed to update vehicle." })
    } finally {
      setSaving(false)
    }
  }

  if (!vehicle && !open) return null
  return (
    <FocusModal open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <FocusModal.Content style={{ maxWidth: 980 }}>
        <FocusModal.Header><Heading>Edit Vehicle</Heading></FocusModal.Header>
        <FocusModal.Body className="overflow-y-auto">
          <div className="p-6 flex flex-col gap-6" style={{ maxWidth: 920, margin: "0 auto" }}>
            <div>
              <Heading level="h2" className="mb-3">Basic Details</Heading>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label size="small">Rental company *</Label>
                  <Select value={form.seller_id || ""} onValueChange={(value) => setForm({ ...form, seller_id: value })}>
                    <Select.Trigger><Select.Value placeholder="Select rental company" /></Select.Trigger>
                    <Select.Content>
                      {sortedSellers.map((s: Seller) => (
                        <Select.Item key={s.id} value={s.id}>{s.name}{s.handle ? ` (${s.handle})` : ""}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  {vehicle?.seller_id && form.seller_id && form.seller_id !== vehicle.seller_id && (
                    <Text size="small" className="text-ui-fg-subtle mt-1">
                      This vehicle will move from the current company to the selected one when you save.
                    </Text>
                  )}
                </div>
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label size="small">Title / Name *</Label>
                    <Button
                      size="small" variant="secondary"
                      disabled={aiGenerating || !form.brand_id}
                      onClick={generateWithAI}
                      title="Generate title, description & features with AI"
                    >
                      <Sparkles className="text-purple-600"/>
                      {aiGenerating ? "Generating…" : "✨ Optimize with AI"}
                    </Button>
                  </div>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="2024 Toyota Camry Hybrid"
                  />
                  {feedback && (
                    <Text size="xsmall" className={feedback.type === "success" ? "text-ui-fg-interactive mt-1" : "text-ui-fg-error mt-1"}>
                      {feedback.message}
                    </Text>
                  )}
                </div>
                <div>
                  <Label size="small">Brand *</Label>
                  <Select value={form.brand_id} onValueChange={(value) => setForm({ ...form, brand_id: value, model_id: "" })}>
                    <Select.Trigger><Select.Value placeholder="Select brand" /></Select.Trigger>
                    <Select.Content>
                      {brands.map((b: Brand) => <Select.Item key={b.id} value={b.id}>{b.name}</Select.Item>)}
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Model</Label>
                  <Select
                    value={form.model_id || ""}
                    onValueChange={(value) => setForm({ ...form, model_id: value })}
                    disabled={!form.brand_id}
                  >
                    <Select.Trigger><Select.Value placeholder={form.brand_id ? "Select model" : "Pick a brand first"} /></Select.Trigger>
                    <Select.Content>
                      {modelsForBrand.map((m: Model) => <Select.Item key={m.id} value={m.id}>{m.name}</Select.Item>)}
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Year</Label>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label size="small">City / Location *</Label>
                  <Select value={form.city_id} onValueChange={(value) => setForm({ ...form, city_id: value })}>
                    <Select.Trigger><Select.Value placeholder="Select city" /></Select.Trigger>
                    <Select.Content>
                      {cities.map((c: City) => (
                        <Select.Item key={c.id} value={c.id}>{c.country_code?.toUpperCase?.() || ""} {c.name}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label size="small">Description</Label>
                  <Textarea
                    rows={4}
                    value={form.description || ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Vehicle details, features, and rental notes."
                  />
                </div>
              </div>
            </div>

            <div>
              <Heading level="h2" className="mb-3">Pricing & Availability</Heading>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label size="small">Currency</Label>
                  <Select value={form.currency_code || "aed"} onValueChange={(value) => setForm({ ...form, currency_code: value })}>
                    <Select.Trigger><Select.Value /></Select.Trigger>
                    <Select.Content>
                      <Select.Item value="aed">AED</Select.Item>
                      <Select.Item value="usd">USD</Select.Item>
                      <Select.Item value="sar">SAR</Select.Item>
                      <Select.Item value="syp">SYP</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Status / Availability</Label>
                  <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                    <Select.Trigger><Select.Value /></Select.Trigger>
                    <Select.Content>
                      <Select.Item value="draft">Draft</Select.Item>
                      <Select.Item value="pending_approval">Pending Approval</Select.Item>
                      <Select.Item value="active">Active</Select.Item>
                      <Select.Item value="paused">Paused</Select.Item>
                      <Select.Item value="rented">Rented</Select.Item>
                      <Select.Item value="unavailable">Unavailable</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Daily Price</Label>
                  <Input
                    type="number"
                    value={form.daily_price}
                    onChange={(e) => setForm({ ...form, daily_price: e.target.value })}
                    placeholder="150"
                  />
                </div>
                <div>
                  <Label size="small">Weekly Price</Label>
                  <Input
                    type="number"
                    value={form.weekly_price}
                    onChange={(e) => setForm({ ...form, weekly_price: e.target.value })}
                    placeholder="900"
                  />
                </div>
                <div>
                  <Label size="small">Monthly Price</Label>
                  <Input
                    type="number"
                    value={form.monthly_price}
                    onChange={(e) => setForm({ ...form, monthly_price: e.target.value })}
                    placeholder="3000"
                  />
                </div>
              </div>
            </div>

            <div>
              <Heading level="h2" className="mb-3">Specs & Contact</Heading>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label size="small">Mileage (km)</Label>
                  <Input
                    type="number"
                    value={form.mileage_km}
                    onChange={(e) => setForm({ ...form, mileage_km: e.target.value })}
                    placeholder="35000"
                  />
                </div>
                <div>
                  <Label size="small">Color</Label>
                  <Input
                    value={form.color || ""}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="White"
                  />
                </div>
                <div>
                  <Label size="small">Fuel type</Label>
                  <Select value={form.fuel_type || "petrol"} onValueChange={(value) => setForm({ ...form, fuel_type: value })}>
                    <Select.Trigger><Select.Value /></Select.Trigger>
                    <Select.Content>
                      <Select.Item value="petrol">Petrol</Select.Item>
                      <Select.Item value="diesel">Diesel</Select.Item>
                      <Select.Item value="hybrid">Hybrid</Select.Item>
                      <Select.Item value="plugin_hybrid">Plug-in Hybrid</Select.Item>
                      <Select.Item value="electric">Electric</Select.Item>
                      <Select.Item value="other">Other</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Transmission</Label>
                  <Select value={form.transmission || "automatic"} onValueChange={(value) => setForm({ ...form, transmission: value })}>
                    <Select.Trigger><Select.Value /></Select.Trigger>
                    <Select.Content>
                      <Select.Item value="automatic">Automatic</Select.Item>
                      <Select.Item value="manual">Manual</Select.Item>
                      <Select.Item value="cvt">CVT</Select.Item>
                      <Select.Item value="semi_automatic">Semi-Automatic</Select.Item>
                    </Select.Content>
                  </Select>
                </div>
                <div>
                  <Label size="small">Seats</Label>
                  <Input
                    type="number"
                    value={form.seats}
                    onChange={(e) => setForm({ ...form, seats: e.target.value })}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label size="small">Doors</Label>
                  <Input
                    type="number"
                    value={form.doors}
                    onChange={(e) => setForm({ ...form, doors: e.target.value })}
                    placeholder="4"
                  />
                </div>
                <div>
                  <Label size="small">Phone</Label>
                  <Input
                    value={form.phone_number || ""}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="+971501234567"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label size="small">WhatsApp</Label>
                  <Input
                    value={form.whatsapp_number || ""}
                    onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                    placeholder="+971501234567"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <Heading level="h2">Vehicle Features</Heading>
                {selectedFeatures.length > 0 && (
                  <Badge color="blue">{selectedFeatures.length} selected</Badge>
                )}
              </div>
              <Text className="text-ui-fg-subtle mb-4 text-sm">
                Tick every feature this vehicle has (GPS, alloy wheels, Bluetooth, reverse camera, cruise control, CarPlay, and more).
              </Text>
              {Object.keys(featuresByCategory).length === 0 && (
                <Text className="text-ui-fg-subtle text-sm">No catalog features found.</Text>
              )}
              {Object.entries(featuresByCategory)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([category, list]) => {
                  const selectedCount = list.filter((feature) => selectedFeatures.includes(feature.id)).length
                  const allSelected = selectedCount === list.length && list.length > 0
                  return (
                    <div key={category} className="mb-4 rounded-lg border border-ui-border-base overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-ui-bg-subtle border-b border-ui-border-base">
                        <Label size="small" className="uppercase tracking-wide">{category}</Label>
                        <div className="flex items-center gap-2">
                          <Text size="xsmall" className="text-ui-fg-muted">
                            {selectedCount}/{list.length}
                          </Text>
                          <Button
                            type="button"
                            size="small"
                            variant="secondary"
                            onClick={() => setCategoryFeatures(list, !allSelected)}
                          >
                            {allSelected ? "Clear all" : "Select all"}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 p-2">
                        {list.map((feature) => {
                          const selected = selectedFeatures.includes(feature.id)
                          const inputId = `vehicle-feature-${feature.id}`
                          return (
                            <label
                              key={feature.id}
                              htmlFor={inputId}
                              className={`flex items-start gap-x-3 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-ui-bg-subtle ${
                                selected ? "bg-ui-bg-interactive-subtle" : ""
                              }`}
                            >
                              <input
                                id={inputId}
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleFeature(feature.id)}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-ui-border-base accent-ui-fg-interactive cursor-pointer"
                              />
                              <span className="text-sm leading-snug text-ui-fg-base">{feature.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>

            {supportsPhotos && <div>
              <div className="flex items-center justify-between mb-2">
                <Heading level="h2">Photos ({(form.photos || []).length})</Heading>
                <Button variant="secondary" size="small" onClick={() => photoRef.current?.click()} disabled={uploading}>
                  <Photo /> {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {(form.photos || []).map((url: string, index: number) => (
                  <div key={`${url}-${index}`} className="relative" style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                    <img src={url} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setForm({ ...form, photos: form.photos.filter((_: string, i: number) => i !== index) })
                      }}
                      style={{ position: "absolute", top: 4, right: 4, zIndex: 30, background: "rgba(0,0,0,0.6)", color: "#fff", border: 0, borderRadius: 20, width: 24, height: 24, cursor: "pointer" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.length && addUploadedMedia(e.target.files, "image")}
              />
            </div>}

            {supportsVideos && <div>
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <Heading level="h2">Videos ({(form.videos || []).length}/3)</Heading>
                <div className="flex gap-2 flex-wrap">
                  {/* 🎬 AI Video Ad generation */}
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={videoGenerating || !vehicle?.id}
                    onClick={generateVideoAd}
                    title="Generate a cinematic AI video ad from this car's photos using Kling AI"
                    style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", border: "none" }}
                  >
                    <Sparkles /> {videoGenerating ? `Generating ${videoProgress.pct}%…` : "🎬 Generate AI Video Ad"}
                  </Button>
                  <Button variant="secondary" size="small" onClick={() => videoRef.current?.click()} disabled={uploading || (form.videos || []).length >= 3}>
                    <Photo /> {uploading ? "Uploading..." : "Upload Video"}
                  </Button>
                </div>
              </div>
              {videoGenerating && videoProgress.pct > 0 && (
                <div className="mb-3 p-4 rounded-xl border border-ui-border-base bg-ui-bg-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-ui-fg-base">🎬 {videoProgress.phase || "Generating…"}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color: "#6366f1" }}>{videoProgress.pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-ui-bg-base overflow-hidden border border-ui-border-base">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${videoProgress.pct}%`, background: "linear-gradient(90deg,#6366f1,#a855f7)" }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-ui-fg-muted">{videoProgress.elapsed > 0 ? `${Math.floor(videoProgress.elapsed/60)}:${String(videoProgress.elapsed%60).padStart(2,"0")} elapsed` : "Rendering your video… (~1–3 min)"}</span>
                    <span className="text-xs text-ui-fg-muted">AI generates your real car + music (~3 min)</span>
                  </div>
                </div>
              )}
              {videoStatus && (
                <div className={`mb-3 p-3 rounded-lg text-sm border ${videoStatus.startsWith("❌") ? "bg-ui-tag-red-bg border-ui-tag-red-border text-ui-tag-red-text" : videoStatus.startsWith("⚙️") ? "bg-ui-tag-orange-bg border-ui-tag-orange-border text-ui-tag-orange-text" : "bg-ui-tag-green-bg border-ui-tag-green-border text-ui-tag-green-text"}`}>
                  {videoStatus}
                  {videoStatus.includes("fal.ai/dashboard") && (
                    <div className="mt-2 font-semibold">
                      Steps: 1) Sign up at <a href="https://fal.ai" target="_blank" rel="noopener" className="underline">fal.ai</a> → 2) Get API key → 3) Go to <strong>Admin → AI Settings</strong> → add FAL API Key → 4) Try again.
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2 mb-3 sm:flex-row">
                <Input
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="Paste YouTube, Instagram, or direct video link"
                  dir="ltr"
                  disabled={(form.videos || []).length >= 3}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoLink() } }}
                />
                <Button
                  variant="secondary"
                  size="small"
                  onClick={addVideoLink}
                  disabled={(form.videos || []).length >= 3}
                  className="shrink-0"
                >
                  Add Link
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(form.videos || []).map((url: string, index: number) => (
                  <div key={`${url}-${index}`} className="relative" style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                    <div className="absolute top-1 left-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      {videoLinkLabel(url)}
                    </div>
                    <VehicleVideoPreview url={url} />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setForm({ ...form, videos: form.videos.filter((_: string, i: number) => i !== index) })
                      }}
                      style={{ position: "absolute", top: 4, right: 4, zIndex: 30, background: "rgba(0,0,0,0.6)", color: "#fff", border: 0, borderRadius: 20, width: 24, height: 24, cursor: "pointer" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <Text size="small" className="text-ui-fg-subtle mt-2">
                Upload MP4/WEBM/MOV (50MB each) or paste YouTube, Instagram, or any direct video URL. Up to 3 videos.
              </Text>
              <input
                ref={videoRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,application/ogg"
                multiple
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.length && addUploadedMedia(e.target.files, "video")}
              />
            </div>}

            {feedback?.message && (
              <Text className={feedback.type === "error" ? "text-ui-fg-error" : "text-ui-fg-success"}>
                {feedback.message}
              </Text>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
              <Button onClick={submit} disabled={saving || uploading}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

const Page = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [bodyTypes, setBodyTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const PAGE_SIZE = 20
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const [loadError, setLoadError] = useState("")
  const [flash, setFlash] = useState<{ type: "error" | "success"; message: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState("")
  const [rejectTarget, setRejectTarget] = useState<Vehicle | null>(null)
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null)
  const [profileTarget, setProfileTarget] = useState<Vehicle | null>(null)
  const dismissedEditIdRef = useRef<string | null>(null)
  const sellerFilter = searchParams.get("seller_id") || ""
  const requestedEditId = searchParams.get("edit_id") || ""

  const closeEditModal = useCallback(() => {
    const editId = searchParams.get("edit_id")
    if (editId) {
      dismissedEditIdRef.current = editId
      const next = new URLSearchParams(searchParams)
      next.delete("edit_id")
      setSearchParams(next, { replace: true })
    }
    setEditTarget(null)
  }, [searchParams, setSearchParams])

  const load = async (targetPage = page) => {
    setLoading(true)
    setLoadError("")
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (sellerFilter) params.set("seller_id", sellerFilter)
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim())
      if (brandFilter) params.set("brand_id", brandFilter)
      params.set("limit", String(PAGE_SIZE))
      params.set("offset", String((targetPage - 1) * PAGE_SIZE))
      const url = `${API}/admin/vehicles?${params.toString()}`
      // Load ONLY the vehicle list here so the table appears instantly. Catalog
      // metadata loads separately (loadCatalog) and never blocks the list.
      const v = await fetch(url, { credentials: "include" }).then(r => r.json())
      setVehicles(v.vehicles || [])
      setTotal(v.count || v.vehicles?.length || 0)
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load vehicles list.")
    } finally { setLoading(false) }
  }

  // Filters + add/edit form data. Fetched ONCE, in the background — never blocks
  // the vehicle list and is not refetched on every filter / page change.
  const loadCatalog = async () => {
    const j = (path: string, fb: any) => fetch(`${API}${path}`, { credentials: "include" }).then(r => r.json()).catch(() => fb)
    const [b, c, s, f, bt] = await Promise.all([
      j("/admin/catalog/brands", { brands: [] }),
      j("/admin/locations/cities", { cities: [] }),
      j("/admin/sellers", { sellers: [] }),
      j("/admin/catalog/features", { features: [] }),
      j("/admin/catalog/body-types", { body_types: [] }),
    ])
    setBrands(b.brands || [])
    setCities(c.cities || [])
    setSellers(s.sellers || [])
    setFeatures(f.features || [])
    setBodyTypes(bt.body_types || [])
  }
  // Defer ALL filter/editor metadata so the 20-row list paints first, uncontended.
  // The list rows already include brand/seller/city names from the list query, so
  // none of this blocks the table. Models (937 rows) load last of all.
  useEffect(() => {
    const a = setTimeout(loadCatalog, 250)
    const b = setTimeout(() => { fetch(`${API}/admin/catalog/models`, { credentials: "include" }).then((r) => r.json()).then((m: any) => setModels(m.models || [])).catch(() => {}) }, 1200)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [])
  useEffect(() => { setPage(1); load(1) }, [statusFilter, sellerFilter, appliedSearch, brandFilter])
  useEffect(() => { if (page > 1) load(page) }, [page])

  useEffect(() => {
    dismissedEditIdRef.current = null
  }, [requestedEditId])

  useEffect(() => {
    if (!requestedEditId || vehicles.length === 0) return
    if (dismissedEditIdRef.current === requestedEditId) return
    const target = vehicles.find((vehicle) => vehicle.id === requestedEditId)
    if (target) setEditTarget(target)
  }, [requestedEditId, vehicles])

  const approve = async (id: string) => {
    await fetch(`${API}/admin/vehicles/${id}/approve`, { method: "POST", credentials: "include" })
    load()
  }
  const reject = async (id: string, reason: string, note: string) => {
    await fetch(`${API}/admin/vehicles/${id}/reject`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejection_reason: reason, rejection_note: note }),
    })
    load()
  }

  const brandMap = useMemo(() => Object.fromEntries(brands.map(b => [b.id, b])), [brands])
  const cityMap = useMemo(() => Object.fromEntries(cities.map(c => [c.id, c])), [cities])
  const sellerMap = useMemo(() => Object.fromEntries(sellers.map(s => [s.id, s])), [sellers])

  const pendingCount = vehicles.filter(v => v.status === "pending_approval").length
  const filteredSeller = sellers.find((seller) => seller.id === sellerFilter)
  const updateVehicleInList = (updated: Vehicle) => {
    setVehicles((prev) => prev.map((vehicle) => (vehicle.id === updated.id ? { ...vehicle, ...updated } : vehicle)))
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">🚗 {tt("Vehicles", "المركبات")}</Heading>
          <div className="flex items-center gap-2">
            {sellerFilter && (
              <Badge color="blue">
                {tt("Store", "المتجر")}: {filteredSeller?.name || sellerFilter}
              </Badge>
            )}
            {pendingCount > 0 && statusFilter !== "pending_approval" && <Badge color="orange">{pendingCount} {tt("pending", "بانتظار الموافقة")}</Badge>}
            <Badge color="blue">{total} {tt("vehicles", "مركبة")}</Badge>
            <form onSubmit={(e) => { e.preventDefault(); setAppliedSearch(search) }} style={{ width: 240 }}>
              <Input placeholder={tt("Search title / brand / company…", "ابحث بالعنوان / الماركة / الشركة…")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </form>
            <div style={{ width: 190 }}>
              <Select value={brandFilter || "__all__"} onValueChange={(val) => setBrandFilter(val === "__all__" ? "" : val)}>
                <Select.Trigger><Select.Value placeholder={tt("All brands", "كل الماركات")} /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="__all__">{tt("All brands", "كل الماركات")}</Select.Item>
                  {brands.map((br) => <Select.Item key={br.id} value={br.id}>{br.name}</Select.Item>)}
                </Select.Content>
              </Select>
            </div>
            <div style={{width: 220}}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All</Select.Item>
                  <Select.Item value="pending_approval">⏳ Pending Approval</Select.Item>
                  <Select.Item value="active">✅ Active</Select.Item>
                  <Select.Item value="rejected">❌ Rejected</Select.Item>
                  <Select.Item value="paused">⏸️ Paused</Select.Item>
                  <Select.Item value="rented">🚙 Currently Rented</Select.Item>
                  <Select.Item value="unavailable">🚫 Unavailable</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
        </div>
        {sellerFilter && (
          <div className="flex items-center gap-2 mb-2">
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.delete("seller_id")
                next.delete("edit_id")
                setSearchParams(next)
              }}
            >
              Clear store filter
            </Button>
            {filteredSeller && (
              <Link to={rentalCompanyPath(filteredSeller)} className="text-ui-fg-interactive text-sm">
                Open store page →
              </Link>
            )}
          </div>
        )}
        <Text className="text-ui-fg-subtle">{tt("Review and approve vehicle listings submitted by rental companies.", "راجع واعتمد إعلانات المركبات المقدّمة من شركات التأجير.")}</Text>
        {loadError && <Text className="text-ui-fg-error mt-2">{loadError}</Text>}
        {flash?.message && (
          <Text className={`mt-2 ${flash.type === "error" ? "text-ui-fg-error" : "text-ui-fg-success"}`}>
            {flash.message}
          </Text>
        )}
      </Container>


        <Container className="p-0 divide-y">
          {loading && <div className="p-6 text-center text-ui-fg-muted">Loading…</div>}
          {!loading && vehicles.length === 0 && (
            <div className="p-10 text-center">
              <Photo className="mx-auto mb-2 text-ui-fg-muted" />
              <Text className="text-ui-fg-base font-medium">{statusFilter === "pending_approval" ? tt("No pending approvals 🎉", "لا توجد طلبات بانتظار الموافقة 🎉") : tt("No vehicles", "لا توجد مركبات")}</Text>
            </div>
          )}
          {!loading && vehicles.length > 0 && (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>{tt("Vehicle", "المركبة")}</Table.HeaderCell>
                  <Table.HeaderCell>{tt("Brand · City", "الماركة · المدينة")}</Table.HeaderCell>
                  <Table.HeaderCell>{tt("Company", "الشركة")}</Table.HeaderCell>
                  <Table.HeaderCell>{tt("Price", "السعر")}</Table.HeaderCell>
                  <Table.HeaderCell>{tt("Status", "الحالة")}</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">{tt("Actions", "إجراءات")}</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {vehicles.map(v => (
                  <Table.Row key={v.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 shrink-0 rounded-md bg-ui-bg-subtle overflow-hidden flex items-center justify-center">
                          {v.photos?.[0] ? <img src={v.photos[0]} alt={v.title} className="h-full w-full object-cover" /> : <Photo className="text-ui-fg-muted" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-ui-fg-base truncate max-w-[260px]">{v.title}</div>
                          {v.rejection_reason && <div className="text-xs text-ui-fg-error truncate max-w-[260px]">{tt("Rejected", "مرفوضة")}: {v.rejection_reason}</div>}
                        </div>
                      </div>
                    </Table.Cell>
                    <Table.Cell><span className="text-ui-fg-base">{brandMap[v.brand_id]?.name || "—"}</span> <span className="text-ui-fg-muted">· {cityMap[v.city_id]?.name || "—"}</span></Table.Cell>
                    <Table.Cell>{sellerMap[v.seller_id] ? <Link to={rentalCompanyPath(sellerMap[v.seller_id])} className="text-ui-fg-interactive hover:underline">{sellerMap[v.seller_id]?.name}</Link> : (v.seller_id || "—")}</Table.Cell>
                    <Table.Cell className="whitespace-nowrap">{v.daily_price ? `${v.daily_price} ${(v.currency_code||"aed").toUpperCase()}/${tt("day", "يوم")}` : "—"}</Table.Cell>
                    <Table.Cell><Badge color={STATUS_COLORS[v.status] || "grey"}>{STATUS_LABELS[v.status] || v.status}</Badge></Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center justify-end gap-2">
                        <Button size="small" variant="transparent" onClick={() => setProfileTarget(v)}>👁 {tt("Profile", "الملف")}</Button><Button size="small" variant="secondary" onClick={() => setEditTarget(v)}><PencilSquare /> {tt("Edit", "تعديل")}</Button>
                        {v.status === "pending_approval" && (<><Button size="small" variant="primary" onClick={() => approve(v.id)}><CheckCircleSolid /> {tt("Approve", "اعتماد")}</Button><Button size="small" variant="danger" onClick={() => setRejectTarget(v)}><XMark /> {tt("Reject", "رفض")}</Button></>)}
                        {v.status === "rejected" && <Button size="small" variant="primary" onClick={() => approve(v.id)}>{tt("Re-approve", "إعادة اعتماد")}</Button>}
                        {v.status === "active" && <Button size="small" variant="secondary" onClick={() => setRejectTarget(v)}>{tt("Take down", "إيقاف")}</Button>}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </Container>

      {!loading && total > PAGE_SIZE && (
        <Container className="flex items-center justify-between p-4">
          <Text size="small" className="text-ui-fg-subtle">
            {tt("Showing", "عرض")} {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} {tt("of", "من")} {total}
          </Text>
          <div className="flex items-center gap-2">
            <Button size="small" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((x) => Math.max(1, x - 1))}>{tt("Previous", "السابق")}</Button>
            <Text size="small" className="tabular-nums">{page} / {totalPages}</Text>
            <Button size="small" variant="secondary" disabled={page >= totalPages || loading} onClick={() => setPage((x) => Math.min(totalPages, x + 1))}>{tt("Next", "التالي")}</Button>
          </div>
        </Container>
      )}
      {profileTarget && <VehicleProfileModal vehicle={profileTarget} brands={brands} models={models} cities={cities} features={features} sellers={sellers} bodyTypes={bodyTypes} onClose={() => setProfileTarget(null)} onEdit={(vv: any) => { setProfileTarget(null); setEditTarget(vv) }} />}
      {rejectTarget && <RejectModal vehicle={rejectTarget} onConfirm={(r: string, n: string) => reject(rejectTarget.id, r, n)} onClose={() => setRejectTarget(null)} />}
      <EditVehicleModal
        open={!!editTarget}
        vehicle={editTarget}
        brands={brands}
        models={models}
        cities={cities}
        features={features}
        sellers={sellers}
        bodyTypes={bodyTypes}
        onClose={closeEditModal}
        onSaved={(updatedVehicle: Vehicle) => {
          updateVehicleInList(updatedVehicle)
          setFlash({ type: "success", message: "Vehicle changes saved." })
          closeEditModal()
          load()
        }}
      />
    </SingleColumnPage>
  )
}
export default Page
