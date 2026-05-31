import { useEffect, useMemo, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, Select, Textarea, FocusModal, Switch } from "@medusajs/ui"
import { Plus, Trash, PencilSquare, Photo, HandTruck } from "@medusajs/icons"
import { VehicleVideoPreview } from "../../components/vehicle-video-preview"
import { isAllowedVideoLink, videoLinkLabel } from "../../lib/vehicle-video"
import { API } from "../../lib/api"
import { TableCell } from "../../lib/table-cell"

export const config: RouteConfig = { label: "Vehicles", icon: HandTruck, rank: 1 }
const STATUS_COLORS: Record<string, any> = { active: "green", draft: "grey", paused: "orange", unavailable: "red", rented: "blue" }

type Brand = { id: string; name: string; logo_url: string|null }
type Model = { id: string; brand_id: string; name: string; body_type_id: string|null; colors: string[]|null }
type BodyType = { id: string; name: string; icon: string|null; icon_url: string|null }
type City = { id: string; country_code: string; name: string }
type Feature = { id: string; name: string; category: string|null; icon: string|null; icon_url: string|null }
type Vehicle = any

const emptyVehicle = (): any => ({
  title: "", description: "", brand_id: "", model_id: "", body_type_id: "", city_id: "",
  year: new Date().getFullYear(), mileage_km: null, color: "",
  fuel_type: "petrol", transmission: "automatic", seats: 5, doors: 4,
  currency_code: "aed", daily_price: null, weekly_price: null, monthly_price: null,
  phone_number: "", whatsapp_number: "", livekit_enabled: false,
  photos: [], videos: [], feature_ids: [], status: "draft",
})

const VehicleForm = ({ vehicle, brands, models, bodyTypes, cities, features, onSave, onClose }: any) => {
  const [f, setF] = useState<any>(vehicle || emptyVehicle())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [videoLink, setVideoLink] = useState("")
  const [autoNote, setAutoNote] = useState("")
  const [featBusy, setFeatBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const lastSpecsKey = useRef<string>("")

  // Ask the AI which features this car likely has, and tick them. Suggestions
  // only — the vendor reviews and edits. `info` carries the freshest car data
  // (specs just applied may not be in `f` yet). When `force` is false we skip
  // if features are already selected (don't clobber the vendor's choices).
  const runSuggestFeatures = async (
    info: { brand_id?: string; model_id?: string; year?: any; body_type_id?: string; transmission?: string; fuel_type?: string; seats?: any },
    force: boolean
  ) => {
    if (!info.brand_id) return
    if (!force && (f.feature_ids || []).length > 0) return
    setFeatBusy(true)
    try {
      const brand = brands.find((b: any) => b.id === info.brand_id)
      const model = models.find((m: any) => m.id === info.model_id)
      const body = bodyTypes.find((b: any) => b.id === info.body_type_id)
      const res = await fetch(`${API}/vendor/ai/suggest-features`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand?.name, model: model?.name, year: info.year,
          body_type: body?.name, transmission: info.transmission,
          fuel_type: info.fuel_type, seats: info.seats,
        }),
      })
      if (!res.ok) return
      const { feature_ids } = await res.json()
      if (Array.isArray(feature_ids) && feature_ids.length) {
        setF((x: any) => {
          const merged = new Set([...(x.feature_ids || []), ...feature_ids])
          return { ...x, feature_ids: Array.from(merged) }
        })
        setAutoNote("✨ Specs & features auto-filled — review and edit anything.")
      }
    } catch {
      // best-effort
    } finally {
      setFeatBusy(false)
    }
  }

  // Auto-fill suggested specs (body type, seats, doors, fuel, transmission)
  // from the shared backend catalog when brand + model (+ year) are chosen,
  // then ask the AI to tick the likely features. All values are SUGGESTIONS —
  // the vendor can edit any field below.
  useEffect(() => {
    if (!f.brand_id || !f.model_id) return
    const key = `${f.brand_id}|${f.model_id}|${f.year || ""}`
    if (lastSpecsKey.current === key) return
    lastSpecsKey.current = key
    let cancelled = false
    ;(async () => {
      try {
        const params = new URLSearchParams({ brand_id: f.brand_id, model_id: f.model_id })
        if (f.year) params.set("year", String(f.year))
        const res = await fetch(`${API}/vendor/catalog/specs?${params.toString()}`, { credentials: "include" })
        let specs: any = null
        if (res.ok) specs = (await res.json()).specs
        if (cancelled) return
        const next = {
          body_type_id: specs?.body_type_id || f.body_type_id,
          seats: specs?.seats ?? f.seats,
          doors: specs?.doors ?? f.doors,
          fuel_type: specs?.fuel_type || f.fuel_type,
          transmission: specs?.transmission || f.transmission,
        }
        if (specs) {
          setF((x: any) => ({ ...x, ...next }))
          setAutoNote("✨ Specs auto-filled from catalog — edit any field if needed.")
        }
        // Then auto-suggest features (only if none picked yet).
        await runSuggestFeatures(
          { brand_id: f.brand_id, model_id: f.model_id, year: f.year, ...next },
          false
        )
      } catch {
        // best-effort; vendor fills manually
      }
    })()
    return () => { cancelled = true }
  }, [f.brand_id, f.model_id, f.year])

  const generateWithAi = async () => {
    setAiBusy(true); setAiError("")
    try {
      const brand = brands.find((b: any) => b.id === f.brand_id)
      const model = models.find((m: any) => m.id === f.model_id)
      const body = bodyTypes.find((b: any) => b.id === f.body_type_id)
      const city = cities.find((c: any) => c.id === f.city_id)
      const featureNames = (f.feature_ids || []).map((id: string) => features.find((x: any) => x.id === id)?.name).filter(Boolean)
      const res = await fetch(`${API}/vendor/ai/generate-description`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brand?.name, model: model?.name, year: f.year,
          body_type: body?.name, transmission: f.transmission, fuel_type: f.fuel_type,
          seats: f.seats, color: f.color, mileage_km: f.mileage_km,
          features: featureNames, price_daily: f.daily_price, city: city?.name,
          currency: (f.currency_code || "AED").toUpperCase(),
        }),
      })
      const d = await res.json()
      if (!res.ok) { setAiError(d.message || "AI failed"); return }
      setF((x: any) => ({ ...x, title: d.title || x.title, description: d.description || x.description }))
    } catch (e: any) {
      setAiError(e.message || "AI failed")
    } finally { setAiBusy(false) }
  }

  const modelsForBrand = useMemo(() => models.filter((m: Model) => m.brand_id === f.brand_id), [models, f.brand_id])

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })

  const uploadMedia = async (file: File, media_kind: "image" | "video") => {
    const content_base64 = await fileToBase64(file)
    const res = await fetch(`${API}/vendor/vehicles/media`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, content_base64, media_kind, mime_type: file.type || undefined }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || "Upload failed")
    return data.file?.url as string
  }

  const uploadPhoto = async (files: FileList) => {
    setUploading(true)
    try {
      const urls = (await Promise.all(Array.from(files).map((file) => uploadMedia(file, "image")))).filter(Boolean)
      // Add raw URLs first so user sees previews immediately
      setF((x: any) => ({ ...x, photos: [...(x.photos || []), ...urls] }))
      // Then optimize each in the background (resize + webp), swap URL when ready
      setOptimizing(true)
      try {
        const optimized = await Promise.all(urls.map(async (u: string) => {
          try {
            const r = await fetch(`${API}/admin/ai/optimize-image`, {
              method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: u, target: "card" }),
            })
            if (!r.ok) return u
            const j = await r.json()
            return j.url || u
          } catch { return u }
        }))
        setF((x: any) => {
          const photos = [...(x.photos || [])]
          urls.forEach((orig: string, i: number) => {
            const idx = photos.indexOf(orig)
            if (idx >= 0 && optimized[i]) photos[idx] = optimized[i]
          })
          return { ...x, photos }
        })
      } finally { setOptimizing(false) }
    } catch (e: any) {
      alert(e?.message || "Image upload failed")
    } finally { setUploading(false) }
  }

  const uploadVideo = async (files: FileList) => {
    const current = (f.videos || []).length
    if (current >= 3) {
      alert("Maximum 3 videos per vehicle")
      return
    }
    const allowed = Array.from(files).slice(0, 3 - current)
    setUploading(true)
    try {
      const urls = (await Promise.all(allowed.map((file) => uploadMedia(file, "video")))).filter(Boolean)
      setF((x: any) => ({ ...x, videos: [...(x.videos || []), ...urls] }))
    } catch (e: any) {
      alert(e?.message || "Video upload failed")
    } finally {
      setUploading(false)
    }
  }

  const addVideoLink = () => {
    const url = videoLink.trim()
    if (!url) {
      alert("Paste a video link first.")
      return
    }
    if (!isAllowedVideoLink(url)) {
      alert("Enter a valid http(s) video link.")
      return
    }
    if ((f.videos || []).length >= 3) {
      alert("Maximum 3 videos per vehicle")
      return
    }
    if ((f.videos || []).includes(url)) {
      alert("This video link is already added.")
      return
    }
    setF((x: any) => ({ ...x, videos: [...(x.videos || []), url] }))
    setVideoLink("")
  }

  const toggleFeature = (id: string) => {
    const ids = new Set(f.feature_ids || [])
    if (ids.has(id)) ids.delete(id); else ids.add(id)
    setF({ ...f, feature_ids: Array.from(ids) })
  }

  const setCategoryFeatures = (categoryFeatures: Feature[], selected: boolean) => {
    const ids = new Set(f.feature_ids || [])
    for (const feat of categoryFeatures) {
      if (selected) ids.add(feat.id); else ids.delete(feat.id)
    }
    setF({ ...f, feature_ids: Array.from(ids) })
  }

  const submit = async () => {
    if (!f.title || !f.brand_id || !f.city_id) return alert("Title, Brand, City are required")
    setSaving(true)
    setSaveError("")
    try {
      await onSave(f)
      onClose()
    } catch (e: any) {
      setSaveError(e?.message || "Could not save the vehicle. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const featuresByCategory: Record<string, Feature[]> = {}
  features.forEach((feat: Feature) => {
    const c = feat.category || "other"
    if (!featuresByCategory[c]) featuresByCategory[c] = []
    featuresByCategory[c].push(feat)
  })

  return (
    <div className="flex flex-col gap-6 p-6" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Basic info */}
      <div>
        <Heading level="h2" className="mb-3">Basic Info</Heading>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label size="small">Listing title *</Label>
            <Input value={f.title} onChange={e => setF({...f, title: e.target.value})} placeholder="2024 Toyota Camry Hybrid" />
          </div>
          <div><Label size="small">Brand *</Label>
            <Select value={f.brand_id} onValueChange={v => setF({...f, brand_id: v, model_id: ""})}>
              <Select.Trigger><Select.Value placeholder="Select brand" /></Select.Trigger>
              <Select.Content>{brands.map((b: Brand) => <Select.Item key={b.id} value={b.id}>{b.name}</Select.Item>)}</Select.Content>
            </Select>
          </div>
          <div><Label size="small">Model</Label>
            <Select value={f.model_id} onValueChange={v => {
              const m = models.find((x: Model) => x.id === v)
              setF({
                ...f,
                model_id: v,
                body_type_id: m?.body_type_id || f.body_type_id,
                color: m?.colors && m.colors.length > 0 && !m.colors.includes(f.color) ? "" : f.color,
              })
            }} disabled={!f.brand_id}>
              <Select.Trigger><Select.Value placeholder={f.brand_id ? "Select model" : "Pick a brand first"} /></Select.Trigger>
              <Select.Content>{modelsForBrand.map((m: Model) => <Select.Item key={m.id} value={m.id}>{m.name}</Select.Item>)}</Select.Content>
            </Select>
          </div>
          <div><Label size="small">Body Type</Label>
            <Select value={f.body_type_id} onValueChange={v => setF({...f, body_type_id: v})}>
              <Select.Trigger><Select.Value placeholder="Sedan, SUV, etc." /></Select.Trigger>
              <Select.Content>{bodyTypes.map((b: BodyType) => <Select.Item key={b.id} value={b.id}>{b.icon || "🚗"} {b.name}</Select.Item>)}</Select.Content>
            </Select>
          </div>
          <div><Label size="small">City *</Label>
            <Select value={f.city_id} onValueChange={v => setF({...f, city_id: v})}>
              <Select.Trigger><Select.Value placeholder="Where is the car?" /></Select.Trigger>
              <Select.Content>{cities.map((c: City) => <Select.Item key={c.id} value={c.id}>{c.country_code.toUpperCase()} · {c.name}</Select.Item>)}</Select.Content>
            </Select>
          </div>
          <div><Label size="small">Year</Label><Input type="number" value={f.year || ""} onChange={e => setF({...f, year: parseInt(e.target.value,10) || null})} /></div>
          <div><Label size="small">Mileage (km)</Label><Input type="number" value={f.mileage_km || ""} onChange={e => setF({...f, mileage_km: parseInt(e.target.value,10) || null})} /></div>
          <div><Label size="small">Color</Label>{(() => {
            const m = models.find((x: Model) => x.id === f.model_id)
            const opts = m?.colors && m.colors.length > 0 ? m.colors : null
            if (opts) {
              return <Select value={f.color || ""} onValueChange={v => setF({...f, color: v})}>
                <Select.Trigger><Select.Value placeholder="Choose color" /></Select.Trigger>
                <Select.Content>{opts.map((c: string) => <Select.Item key={c} value={c}>{c}</Select.Item>)}</Select.Content>
              </Select>
            }
            return <Input value={f.color || ""} onChange={e => setF({...f, color: e.target.value})} placeholder="White, Black, Red..." />
          })()}</div>
          <div><Label size="small">Seats</Label><Input type="number" value={f.seats || ""} onChange={e => setF({...f, seats: parseInt(e.target.value,10) || null})} /></div>
          <div><Label size="small">Doors</Label><Input type="number" value={f.doors || ""} onChange={e => setF({...f, doors: parseInt(e.target.value,10) || null})} /></div>
          <div><Label size="small">Fuel</Label>
            <Select value={f.fuel_type || "petrol"} onValueChange={v => setF({...f, fuel_type: v})}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="petrol">⛽ Petrol</Select.Item>
                <Select.Item value="diesel">🛢️ Diesel</Select.Item>
                <Select.Item value="hybrid">🔋 Hybrid</Select.Item>
                <Select.Item value="plugin_hybrid">🔌 Plug-in Hybrid</Select.Item>
                <Select.Item value="electric">⚡ Electric</Select.Item>
                <Select.Item value="other">Other</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div><Label size="small">Transmission</Label>
            <Select value={f.transmission || "automatic"} onValueChange={v => setF({...f, transmission: v})}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="automatic">Automatic</Select.Item>
                <Select.Item value="manual">Manual</Select.Item>
                <Select.Item value="cvt">CVT</Select.Item>
                <Select.Item value="semi_automatic">Semi-Automatic</Select.Item>
              </Select.Content>
            </Select>
          </div>
          {autoNote && (
            <div className="col-span-2">
              <Text size="small" className="text-ui-fg-interactive">{autoNote}</Text>
            </div>
          )}
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <Label size="small">Description</Label>
              <Button size="small" variant="secondary" disabled={aiBusy || !f.brand_id} onClick={generateWithAi}>
                {aiBusy ? "Generating…" : "✨ Generate with AI"}
              </Button>
            </div>
            {aiError && <Text size="small" className="text-ui-fg-error mb-2">{aiError}</Text>}
            <Textarea value={f.description || ""} onChange={e => setF({...f, description: e.target.value})} placeholder="Type a description, or click Generate with AI to auto-write from your specs." rows={5} />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <Heading level="h2" className="mb-3">Pricing</Heading>
        <div className="grid grid-cols-4 gap-3">
          <div><Label size="small">Currency</Label>
            <Select value={f.currency_code || "aed"} onValueChange={v => setF({...f, currency_code: v})}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="aed">AED 🇦🇪</Select.Item>
                <Select.Item value="syp">SYP 🇸🇾</Select.Item>
                <Select.Item value="usd">USD 🇺🇸</Select.Item>
                <Select.Item value="sar">SAR 🇸🇦</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div><Label size="small">Daily price</Label><Input type="number" value={f.daily_price || ""} onChange={e => setF({...f, daily_price: parseFloat(e.target.value) || null})} placeholder="150" /></div>
          <div><Label size="small">Weekly price</Label><Input type="number" value={f.weekly_price || ""} onChange={e => setF({...f, weekly_price: parseFloat(e.target.value) || null})} placeholder="900" /></div>
          <div><Label size="small">Monthly price</Label><Input type="number" value={f.monthly_price || ""} onChange={e => setF({...f, monthly_price: parseFloat(e.target.value) || null})} placeholder="3000" /></div>
        </div>
      </div>

      {/* Contact */}
      <div>
        <Heading level="h2" className="mb-3">Contact Customers</Heading>
        <Text className="text-ui-fg-subtle mb-3" size="small">When a customer clicks Call/WhatsApp/Free Call on your listing, they reach YOU directly. Make sure these are right.</Text>
        <div className="grid grid-cols-2 gap-3">
          <div><Label size="small">📞 Phone number</Label><Input value={f.phone_number || ""} onChange={e => setF({...f, phone_number: e.target.value})} placeholder="+971501234567" dir="ltr" /></div>
          <div><Label size="small">💬 WhatsApp number</Label><Input value={f.whatsapp_number || ""} onChange={e => setF({...f, whatsapp_number: e.target.value})} placeholder="+971501234567" dir="ltr" /></div>
          <div className="col-span-2 flex items-center gap-3 pt-2">
            <Switch checked={f.livekit_enabled} onCheckedChange={v => setF({...f, livekit_enabled: v})} />
            <Label>🎙️ Allow free WebRTC calls (LiveKit) — customers can call you in-app, no phone bill</Label>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Heading level="h2">Photos ({(f.photos || []).length})</Heading>
          {optimizing && <Text size="small" className="text-ui-fg-subtle">⚡ Optimizing for fast loading…</Text>}
        </div>
        <div className="grid grid-cols-4 gap-3 mb-3">
          {(f.photos || []).map((url: string, i: number) => (
            <div key={i} className="relative" style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              <img src={url} style={{ width: "100%", height: 120, objectFit: "cover" }} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setF({ ...f, photos: f.photos.filter((_: any, j: number) => j !== i) })
                }}
                style={{ position: "absolute", top: 4, right: 4, zIndex: 30, background: "rgba(0,0,0,0.6)", color: "white", border: 0, borderRadius: 20, width: 24, height: 24, cursor: "pointer" }}
              >×</button>
            </div>
          ))}
        </div>
        <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <Photo /> {uploading ? "Uploading..." : "Upload photos (multiple)"}
        </Button>
        <Text size="small" className="text-ui-fg-subtle mt-2">Images: PNG, JPG, JPEG, WEBP, GIF, HEIC. Max 8MB each.</Text>
        <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) uploadPhoto(e.target.files) }} />
      </div>

      {/* Videos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Heading level="h2">Videos ({(f.videos || []).length}/3)</Heading>
        </div>
        <div className="flex flex-col gap-2 mb-3 sm:flex-row">
          <Input
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            placeholder="Paste YouTube, Instagram, or direct video link"
            dir="ltr"
            disabled={(f.videos || []).length >= 3}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVideoLink() } }}
          />
          <Button variant="secondary" disabled={(f.videos || []).length >= 3} onClick={addVideoLink} className="shrink-0">
            Add Link
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {(f.videos || []).map((url: string, i: number) => (
            <div key={i} className="relative" style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
              <div className="absolute top-1 left-1 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                {videoLinkLabel(url)}
              </div>
              <VehicleVideoPreview url={url} />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setF({ ...f, videos: f.videos.filter((_: any, j: number) => j !== i) })
                }}
                style={{ position: "absolute", top: 4, right: 4, zIndex: 30, background: "rgba(0,0,0,0.6)", color: "white", border: 0, borderRadius: 20, width: 24, height: 24, cursor: "pointer" }}
              >×</button>
            </div>
          ))}
        </div>
        <Button variant="secondary" disabled={uploading || (f.videos || []).length >= 3} onClick={() => videoRef.current?.click()}>
          <Photo /> {uploading ? "Uploading..." : "Upload video file"}
        </Button>
        <Text size="small" className="text-ui-fg-subtle mt-2">Upload MP4/WEBM/MOV (50MB each) or paste YouTube, Instagram, or any direct video URL. Up to 3 videos.</Text>
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg,application/ogg"
          multiple
          style={{ display: "none" }}
          onChange={e => { if (e.target.files?.length) uploadVideo(e.target.files) }}
        />
      </div>

      {/* Features */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <Heading level="h2">Features</Heading>
          <div className="flex items-center gap-2">
            {(f.feature_ids || []).length > 0 && (
              <Badge color="blue">{(f.feature_ids || []).length} selected</Badge>
            )}
            <Button size="small" variant="secondary" disabled={featBusy || !f.brand_id}
              onClick={() => runSuggestFeatures({
                brand_id: f.brand_id, model_id: f.model_id, year: f.year,
                body_type_id: f.body_type_id, transmission: f.transmission,
                fuel_type: f.fuel_type, seats: f.seats,
              }, true)}>
              {featBusy ? "Suggesting…" : "✨ Suggest with AI"}
            </Button>
          </div>
        </div>
        <Text className="text-ui-fg-subtle mb-4 text-sm">
          Tick every feature this vehicle has (GPS, alloy wheels, Bluetooth, reverse camera, cruise control, CarPlay, and more).
        </Text>
        {Object.keys(featuresByCategory).length === 0 && (
          <Text className="text-ui-fg-subtle text-sm">No catalog features found.</Text>
        )}
        {Object.entries(featuresByCategory)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([cat, list]) => {
            const selectedCount = list.filter((feat) => (f.feature_ids || []).includes(feat.id)).length
            const allSelected = selectedCount === list.length && list.length > 0
            return (
              <div key={cat} className="mb-4 rounded-lg border border-ui-border-base overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-ui-bg-subtle border-b border-ui-border-base">
                  <Label size="small" className="uppercase tracking-wide">{cat}</Label>
                  <div className="flex items-center gap-2">
                    <Text size="xsmall" className="text-ui-fg-muted">{selectedCount}/{list.length}</Text>
                    <Button type="button" size="small" variant="secondary" onClick={() => setCategoryFeatures(list, !allSelected)}>
                      {allSelected ? "Clear all" : "Select all"}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 p-2">
                  {list.map((feat) => {
                    const selected = (f.feature_ids || []).includes(feat.id)
                    const inputId = `vehicle-feature-${feat.id}`
                    return (
                      <label key={feat.id} htmlFor={inputId}
                        className={`flex items-start gap-x-3 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-ui-bg-subtle ${selected ? "bg-ui-bg-interactive-subtle" : ""}`}>
                        <input id={inputId} type="checkbox" checked={selected} onChange={() => toggleFeature(feat.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-ui-border-base accent-ui-fg-interactive cursor-pointer" />
                        <span className="text-sm leading-snug text-ui-fg-base">{feat.icon ? `${feat.icon} ` : ""}{feat.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>

      {/* Status */}
      <div>
        <Heading level="h2" className="mb-3">Status</Heading>
        <Select value={f.status || "draft"} onValueChange={v => setF({...f, status: v})}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Content>
            <Select.Item value="draft">📝 Draft (not visible)</Select.Item>
            <Select.Item value="active">✅ Active (visible to customers)</Select.Item>
            <Select.Item value="paused">⏸️ Paused</Select.Item>
            <Select.Item value="rented">🚙 Currently Rented Out</Select.Item>
            <Select.Item value="unavailable">🚫 Temporarily Unavailable</Select.Item>
          </Select.Content>
        </Select>
      </div>

      {saveError && <Text size="small" className="text-ui-fg-error pt-2 text-right">{saveError}</Text>}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving || !f.title || !f.brand_id || !f.city_id}>{saving ? "Saving..." : (f.id ? "Update Vehicle" : "Create Vehicle")}</Button>
      </div>
    </div>
  )
}

const VehiclesPage = () => {
  // Auto-open create modal when /rental/vehicles?new=1
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Vehicle|null>(null)
  const [open, setOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [v, b, m, bt, ct, f] = await Promise.all([
        fetch(`${API}/vendor/vehicles`, { credentials: "include" }).then(r => r.json()).catch(() => ({ vehicles: [] })),
        fetch(`${API}/vendor/catalog/brands`, { credentials: "include" }).then(r => r.json()).catch(() => ({ brands: [] })),
        fetch(`${API}/vendor/catalog/models`, { credentials: "include" }).then(r => r.json()).catch(() => ({ models: [] })),
        fetch(`${API}/vendor/catalog/body-types`, { credentials: "include" }).then(r => r.json()).catch(() => ({ body_types: [] })),
        fetch(`${API}/vendor/catalog/cities`, { credentials: "include" }).then(r => r.json()).catch(() => ({ cities: [] })),
        fetch(`${API}/vendor/catalog/features`, { credentials: "include" }).then(r => r.json()).catch(() => ({ features: [] })),
      ])
      setVehicles(v.vehicles || [])
      setBrands(b.brands || [])
      setModels(m.models || [])
      setBodyTypes(bt.body_types || [])
      setCities(ct.cities || [])
      setFeatures(f.features || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      setEdit(null); setOpen(true)
    }
  }, [])

  const save = async (data: any) => {
    const url = data.id ? `${API}/vendor/vehicles/${data.id}` : `${API}/vendor/vehicles`
    const res = await fetch(url, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) })
    if (!res.ok) {
      let message = `Save failed (${res.status})`
      try { const d = await res.json(); message = d?.message || d?.hint || message } catch {}
      throw new Error(message)
    }
    load()
  }
  const remove = async (id: string) => {
    if (!confirm("Delete this vehicle listing?")) return
    const res = await fetch(`${API}/vendor/vehicles/${id}`, { method: "DELETE", credentials: "include" })
    if (!res.ok) {
      let message = `Delete failed (${res.status})`
      try { const d = await res.json(); message = d?.message || message } catch {}
      alert(message)
      return
    }
    load()
  }

  const brandMap = useMemo(() => Object.fromEntries(brands.map(b => [b.id, b])), [brands])
  const cityMap = useMemo(() => Object.fromEntries(cities.map(c => [c.id, c])), [cities])
  const modelMap = useMemo(() => Object.fromEntries(models.map(m => [m.id, m])), [models])

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">🚗 Your Vehicles</Heading>
          <Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> Add Vehicle</Button>
        </div>
        <Text className="text-ui-fg-subtle">Add your fleet here. Each listing shows on autotorental.com with Call/WhatsApp/Free Call buttons.</Text>
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Photo</Table.HeaderCell>
            <Table.HeaderCell>Title</Table.HeaderCell>
            <Table.HeaderCell>Brand / Model</Table.HeaderCell>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Daily</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Views</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><TableCell colSpan={8}>Loading…</TableCell></Table.Row>}
            {!loading && vehicles.length === 0 && <Table.Row><TableCell colSpan={8} className="text-center py-8 text-ui-fg-muted">No vehicles yet — click "Add Vehicle" above to list your first car.</TableCell></Table.Row>}
            {vehicles.map(v => (
              <Table.Row key={v.id}>
                <Table.Cell>
                  {v.photos?.[0] ? <img src={v.photos[0]} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4 }} /> : <span style={{ fontSize: 24 }}>🚗</span>}
                </Table.Cell>
                <Table.Cell className="font-medium">{v.title}</Table.Cell>
                <Table.Cell>{brandMap[v.brand_id]?.name || v.brand_id} {modelMap[v.model_id]?.name ? `· ${modelMap[v.model_id].name}` : ""}</Table.Cell>
                <Table.Cell>{cityMap[v.city_id]?.name || "—"}</Table.Cell>
                <Table.Cell>{v.daily_price ? `${v.daily_price} ${(v.currency_code||"aed").toUpperCase()}` : "—"}</Table.Cell>
                <Table.Cell><Badge color={STATUS_COLORS[v.status] || "grey"}>{v.status}</Badge></Table.Cell>
                <Table.Cell>{v.view_count || 0}</Table.Cell>
                <Table.Cell className="text-right">
                  <Button size="small" variant="transparent" onClick={() => { setEdit(v); setOpen(true) }}><PencilSquare /></Button>
                  <Button size="small" variant="transparent" onClick={() => remove(v.id)}><Trash /></Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content style={{ maxWidth: 1100 }}>
          <FocusModal.Header><Heading>{edit?.id ? "Edit Vehicle" : "Add Vehicle"}</Heading></FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <VehicleForm vehicle={edit} brands={brands} models={models} bodyTypes={bodyTypes} cities={cities} features={features}
              onSave={save} onClose={() => setOpen(false)} />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default VehiclesPage
