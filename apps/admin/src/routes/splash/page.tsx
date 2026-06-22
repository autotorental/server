import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Label, Input, Button, Switch, Badge } from "@medusajs/ui"
import { Photo } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Splash Screen", "شاشة البداية"), icon: Photo, rank: 57 }

type SplashData = {
  enabled: boolean
  media_url: string
  media_type: "video" | "image"
  duration_ms: number
  updated_at: string | null
}

const DEFAULTS: SplashData = {
  enabled: false,
  media_url: "",
  media_type: "video",
  duration_ms: 5000,
  updated_at: null,
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SplashPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [data, setData] = useState<SplashData>(DEFAULTS)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/splash`, { credentials: "include" })
      const d = await r.json()
      setData({
        enabled: !!d?.splash?.enabled,
        media_url: d?.splash?.media_url || "",
        media_type: d?.splash?.media_type === "image" ? "image" : "video",
        duration_ms: Number(d?.splash?.duration_ms) || 5000,
        updated_at: d?.splash?.updated_at || null,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const content_base64 = await fileToBase64(file)
      const r = await fetch(`${API}/admin/splash-upload`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, content_base64 }),
      })
      const d = await r.json()
      if (!r.ok) { alert(d?.message || "Upload failed"); return }
      setData((x) => ({ ...x, media_url: d.url, media_type: d.media_type || x.media_type }))
    } catch (err: any) {
      alert(err?.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(`${API}/admin/splash`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: data.enabled,
          media_url: data.media_url,
          media_type: data.media_type,
          duration_ms: data.duration_ms,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        alert(d?.message || "Save failed")
        return
      }
      await load()
    } finally {
      setSaving(false)
    }
  }

  const durationSec = Math.round(data.duration_ms / 1000)

  return (
    <SingleColumnPage>
      {/* Header */}
      <Container className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-ui-bg-component flex items-center justify-center text-xl flex-shrink-0">📱</div>
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h1" className="text-xl font-semibold">Splash Screen</Heading>
                <Badge size="2xsmall" color={data.enabled ? "green" : "grey"}>
                  {data.enabled ? "Active" : "Disabled"}
                </Badge>
              </div>
              <Text className="text-ui-fg-subtle text-sm mt-0.5">
                Control the launch splash shown in the mobile app. Changes apply the next time the app launches.
              </Text>
              {data.updated_at && (
                <Text className="text-ui-fg-muted text-xs mt-1">
                  Last saved: {new Date(data.updated_at).toLocaleString()}
                </Text>
              )}
            </div>
          </div>
          <Button onClick={save} isLoading={saving} disabled={saving || uploading || loading}>
            Save changes
          </Button>
        </div>
      </Container>

      {loading ? (
        <Container className="p-6"><Text className="text-ui-fg-muted">Loading…</Text></Container>
      ) : (
        <Container className="p-6 pt-0">
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            {/* Left: Settings */}
            <div className="space-y-6">
              {/* Enable toggle */}
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-medium">Enable Splash Screen</Label>
                    <Text className="text-ui-fg-subtle text-sm mt-0.5">
                      When off, the app skips the splash and launches directly.
                    </Text>
                  </div>
                  <Switch
                    checked={data.enabled}
                    onCheckedChange={(v) => setData((x) => ({ ...x, enabled: !!v }))}
                  />
                </div>
              </div>

              {/* Upload area */}
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Splash Media</Label>
                  <Text className="text-ui-fg-subtle text-sm mt-0.5">Upload a video (MP4/WebM) or image for the splash screen.</Text>
                </div>

                {/* Drag-and-drop zone */}
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-ui-border-interactive bg-ui-bg-component"
                      : "border-ui-border-base hover:border-ui-border-strong hover:bg-ui-bg-subtle"
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,image/*"
                    onChange={onPickFile}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-ui-border-interactive border-t-transparent rounded-full animate-spin" />
                      <Text className="text-ui-fg-subtle text-sm">Uploading…</Text>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-3xl">☁️</div>
                      <Text className="text-ui-fg-base text-sm font-medium">Drop file here or click to upload</Text>
                      <Text className="text-ui-fg-muted text-xs">MP4, WebM, MOV, PNG, JPG — max 50 MB</Text>
                    </div>
                  )}
                </div>

                {/* Manual URL */}
                <div>
                  <Label className="text-xs text-ui-fg-subtle">Or paste a URL</Label>
                  <Input
                    className="mt-1"
                    value={data.media_url}
                    onChange={(e) => setData((x) => ({ ...x, media_url: e.target.value }))}
                    placeholder="https://api.autotorental.com/static/splash_....mp4"
                  />
                </div>
              </div>

              {/* Type selector */}
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
                <Label className="text-sm font-medium">Media Type</Label>
                <Text className="text-ui-fg-subtle text-sm mt-0.5 mb-3">Select what kind of media you uploaded.</Text>
                <div className="flex gap-3">
                  {(["video", "image"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setData((x) => ({ ...x, media_type: t }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        data.media_type === t
                          ? "border-ui-border-interactive bg-ui-bg-component text-ui-fg-base"
                          : "border-ui-border-base bg-ui-bg-base text-ui-fg-subtle hover:bg-ui-bg-subtle"
                      }`}
                    >
                      {t === "video" ? "🎬 Video" : "🖼 Image"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration slider */}
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Display Duration</Label>
                  <span className="text-sm font-semibold text-ui-fg-base px-2.5 py-1 rounded-lg bg-ui-bg-component border border-ui-border-base">
                    {durationSec}s
                  </span>
                </div>
                <Text className="text-ui-fg-subtle text-sm mb-4">
                  How long to show the splash before the app continues. Videos also stop when finished.
                </Text>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={durationSec}
                  onChange={(e) =>
                    setData((x) => ({ ...x, duration_ms: Number(e.target.value) * 1000 }))
                  }
                  className="w-full accent-ui-border-interactive"
                />
                <div className="flex justify-between text-xs text-ui-fg-muted mt-1">
                  <span>1s</span>
                  <span>15s</span>
                  <span>30s</span>
                </div>
              </div>
            </div>

            {/* Right: Phone mockup preview */}
            <div className="flex flex-col items-center gap-3">
              <Text className="text-sm font-medium text-ui-fg-subtle self-start">Preview</Text>
              {/* Phone frame */}
              <div className="relative rounded-[2.5rem] border-[10px] border-ui-bg-component bg-black shadow-2xl overflow-hidden"
                style={{ width: 220, height: Math.round(220 * (19.5 / 9)) }}>
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-b-2xl z-10" />
                {/* Content */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden bg-black">
                  {data.media_url ? (
                    data.media_type === "video" ? (
                      <video
                        key={data.media_url}
                        src={data.media_url}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={data.media_url}
                        className="w-full h-full object-cover"
                        alt="Splash preview"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-ui-bg-component flex items-center justify-center text-2xl">🚗</div>
                      <Text className="text-white text-xs font-medium opacity-70">AutoRental</Text>
                      <Text className="text-white text-[10px] opacity-40">No media uploaded</Text>
                    </div>
                  )}
                </div>
                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-white rounded-full opacity-40" />
              </div>

              {/* Status info */}
              <div className="w-full rounded-xl border border-ui-border-base bg-ui-bg-base p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ui-fg-subtle">Status</span>
                  <Badge size="2xsmall" color={data.enabled ? "green" : "grey"}>
                    {data.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ui-fg-subtle">Duration</span>
                  <span className="font-medium text-ui-fg-base">{durationSec}s</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ui-fg-subtle">Type</span>
                  <span className="font-medium text-ui-fg-base capitalize">{data.media_type}</span>
                </div>
                {data.media_url && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ui-fg-subtle">Media</span>
                    <span className="text-ui-fg-muted truncate max-w-[120px]">
                      {data.media_url.split("/").pop()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}
