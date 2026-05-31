import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Select, FocusModal, Textarea, Label, Input } from "@medusajs/ui"
import { HandTruck, CheckCircleSolid, XMark, PencilSquare, Photo } from "@medusajs/icons"
import { Link, useSearchParams } from "react-router-dom"
import { API } from "../../lib/api"
import { rentalCompanyPath } from "../../lib/seller-slug"
import { VehicleVideoPreview } from "../../components/vehicle-video-preview"
import { isAllowedVideoLink, videoLinkLabel } from "../../lib/vehicle-video"

export const config: RouteConfig = { label: "Vehicles", icon: HandTruck, rank: 1 }

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
  pending_approval: "⏳ Pending Approval", active: "✅ Active", rejected: "❌ Rejected",
  draft: "📝 Draft", paused: "⏸️ Paused", unavailable: "🚫 Unavailable", rented: "🚙 Rented",
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

const EditVehicleModal = ({ open, vehicle, brands, models, cities, features, sellers, onClose, onSaved }: any) => {
  const [form, setForm] = useState<any>(() => normalizeEditorForm(vehicle))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null)
  const [videoLink, setVideoLink] = useState("")
  const photoRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

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
                  <Label size="small">Title / Name *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="2024 Toyota Camry Hybrid"
                  />
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
              <div className="flex items-center justify-between mb-2">
                <Heading level="h2">Videos ({(form.videos || []).length}/3)</Heading>
                <Button variant="secondary" size="small" onClick={() => videoRef.current?.click()} disabled={uploading || (form.videos || []).length >= 3}>
                  <Photo /> {uploading ? "Uploading..." : "Upload Video File"}
                </Button>
              </div>
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
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [flash, setFlash] = useState<{ type: "error" | "success"; message: string } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [rejectTarget, setRejectTarget] = useState<Vehicle | null>(null)
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null)
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

  const load = async () => {
    setLoading(true)
    setLoadError("")
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (sellerFilter) params.set("seller_id", sellerFilter)
      const url = `${API}/admin/vehicles${params.toString() ? `?${params.toString()}` : ""}`
      const [v, b, m, c, s, f] = await Promise.all([
        fetch(url, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/catalog/brands`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/catalog/models`, { credentials: "include" }).then(r => r.json()).catch(() => ({ models: [] })),
        fetch(`${API}/admin/locations/cities`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/sellers`, { credentials: "include" }).then(r => r.json()).catch(() => ({ sellers: [] })),
        fetch(`${API}/admin/catalog/features`, { credentials: "include" }).then(r => r.json()).catch(() => ({ features: [] })),
      ])
      setVehicles(v.vehicles || [])
      setBrands(b.brands || [])
      setModels(m.models || [])
      setCities(c.cities || [])
      setSellers(s.sellers || [])
      setFeatures(f.features || [])
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load vehicles list.")
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [statusFilter, sellerFilter])

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
          <Heading level="h1">🚗 Vehicles</Heading>
          <div className="flex items-center gap-2">
            {sellerFilter && (
              <Badge color="blue">
                Store: {filteredSeller?.name || sellerFilter}
              </Badge>
            )}
            {pendingCount > 0 && statusFilter !== "pending_approval" && <Badge color="orange">{pendingCount} pending</Badge>}
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
        <Text className="text-ui-fg-subtle">Review and approve vehicle listings submitted by rental companies.</Text>
        {loadError && <Text className="text-ui-fg-error mt-2">{loadError}</Text>}
        {flash?.message && (
          <Text className={`mt-2 ${flash.type === "error" ? "text-ui-fg-error" : "text-ui-fg-success"}`}>
            {flash.message}
          </Text>
        )}
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Photo</Table.HeaderCell>
            <Table.HeaderCell>Title</Table.HeaderCell>
            <Table.HeaderCell>Rental Co.</Table.HeaderCell>
            <Table.HeaderCell>Brand</Table.HeaderCell>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Price</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={8}>Loading…</Table.Cell></Table.Row>}
            {!loading && vehicles.length === 0 && (
              <Table.Row><Table.Cell colSpan={8} className="text-center py-8 text-ui-fg-muted">
                {statusFilter === "pending_approval" ? "No pending approvals 🎉" : "No vehicles"}
              </Table.Cell></Table.Row>
            )}
            {vehicles.map(v => (
              <Table.Row key={v.id}>
                <Table.Cell>{v.photos?.[0] ? <img src={v.photos[0]} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4 }} /> : <span style={{ fontSize: 24 }}>🚗</span>}</Table.Cell>
                <Table.Cell>
                  <div className="font-medium">{v.title}</div>
                  {v.rejection_reason && <div className="text-xs text-ui-fg-error">Rejected: {v.rejection_reason}</div>}
                </Table.Cell>
                <Table.Cell className="text-xs">
                  {sellerMap[v.seller_id] ? (
                    <Link to={rentalCompanyPath(sellerMap[v.seller_id])} className="text-ui-fg-interactive">
                      {sellerMap[v.seller_id]?.name}
                    </Link>
                  ) : (v.seller_id || "—")}
                </Table.Cell>
                <Table.Cell>{brandMap[v.brand_id]?.name || "—"}</Table.Cell>
                <Table.Cell>{cityMap[v.city_id]?.name || "—"}</Table.Cell>
                <Table.Cell>{v.daily_price ? `${v.daily_price} ${(v.currency_code||"aed").toUpperCase()}/day` : "—"}</Table.Cell>
                <Table.Cell><Badge color={STATUS_COLORS[v.status] || "grey"}>{STATUS_LABELS[v.status] || v.status}</Badge></Table.Cell>
                <Table.Cell className="text-right">
                  <Button size="small" variant="secondary" className="mr-1" onClick={() => setEditTarget(v)}>
                    <PencilSquare /> Edit
                  </Button>
                  {v.status === "pending_approval" && (
                    <>
                      <Button size="small" variant="primary" onClick={() => approve(v.id)} className="mr-1"><CheckCircleSolid /> Approve</Button>
                      <Button size="small" variant="danger" onClick={() => setRejectTarget(v)}><XMark /> Reject</Button>
                    </>
                  )}
                  {v.status === "rejected" && <Button size="small" variant="primary" onClick={() => approve(v.id)}>Re-approve</Button>}
                  {v.status === "active" && <Button size="small" variant="secondary" onClick={() => setRejectTarget(v)}>Take down</Button>}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      {rejectTarget && <RejectModal vehicle={rejectTarget} onConfirm={(r: string, n: string) => reject(rejectTarget.id, r, n)} onClose={() => setRejectTarget(null)} />}
      <EditVehicleModal
        open={!!editTarget}
        vehicle={editTarget}
        brands={brands}
        models={models}
        cities={cities}
        features={features}
        sellers={sellers}
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
