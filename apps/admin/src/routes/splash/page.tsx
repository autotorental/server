import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Label, Input, Button, Switch } from "@medusajs/ui"
import { Photo } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Splash Screen", icon: Photo, rank: 8 }

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

  useEffect(() => {
    load()
  }, [])

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
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
      if (!r.ok) {
        alert(d?.message || "Upload failed")
        return
      }
      setData((x) => ({ ...x, media_url: d.url, media_type: d.media_type || x.media_type }))
    } catch (err: any) {
      alert(err?.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
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
      alert("Splash screen saved")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">Splash Screen</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          Control the launch splash shown in the mobile app. Upload a video or image, set how long it
          shows, and toggle it on or off — changes apply remotely the next time the app launches.
        </Text>
      </Container>

      {loading ? (
        <Container className="p-6">Loading…</Container>
      ) : (
        <Container className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label size="small">Enabled</Label>
              <Text className="text-ui-fg-subtle text-sm">
                When off, the app uses its built-in default splash.
              </Text>
            </div>
            <Switch
              checked={data.enabled}
              onCheckedChange={(v) => setData((x) => ({ ...x, enabled: !!v }))}
            />
          </div>

          <div>
            <Label size="small">Splash media (video or image)</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,image/*"
                onChange={onPickFile}
                disabled={uploading}
              />
              {uploading && <Text className="text-ui-fg-subtle text-sm">Uploading…</Text>}
            </div>
          </div>

          <div>
            <Label size="small">Media URL</Label>
            <Input
              value={data.media_url}
              onChange={(e) => setData((x) => ({ ...x, media_url: e.target.value }))}
              placeholder="https://api.autotorental.com/static/splash_....mp4"
            />
          </div>

          {data.media_url ? (
            <div>
              <Label size="small">Preview</Label>
              {data.media_type === "video" ? (
                <video
                  src={data.media_url}
                  style={{ maxWidth: 280, borderRadius: 12, marginTop: 8 }}
                  controls
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={data.media_url}
                  style={{ maxWidth: 280, borderRadius: 12, marginTop: 8 }}
                  alt="Splash preview"
                />
              )}
            </div>
          ) : null}

          <div>
            <Label size="small">Display duration (seconds)</Label>
            <Input
              type="number"
              min={1}
              max={60}
              step={1}
              value={Math.round(data.duration_ms / 1000)}
              onChange={(e) =>
                setData((x) => ({
                  ...x,
                  duration_ms: Math.min(
                    60000,
                    Math.max(1000, (Number(e.target.value) || 5) * 1000)
                  ),
                }))
              }
            />
            <Text className="text-ui-fg-subtle text-sm mt-1">
              How many seconds the splash shows before the app continues (videos also stop when they finish).
            </Text>
          </div>

          {data.updated_at ? (
            <Text className="text-ui-fg-subtle text-sm">
              Last saved: {new Date(data.updated_at).toLocaleString()}
            </Text>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={save} isLoading={saving} disabled={saving || uploading}>
              Save
            </Button>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}
