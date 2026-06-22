import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Switch, Button, Badge, Select, toast } from "@medusajs/ui"
import { Bolt, Trash } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Cloudflare Speed", "سرعة Cloudflare"), icon: Bolt, rank: 19 }

const META: Record<string, { label: string; desc: string; pro?: boolean; enum?: string[] }> = {
  development_mode: { label: "Development Mode", desc: "Temporarily bypass the cache (auto-off after 3h). Use while editing the site." },
  brotli: { label: "Brotli Compression", desc: "Smaller, faster text responses than gzip." },
  rocket_loader: { label: "Rocket Loader", desc: "Defers JavaScript so pages paint faster." },
  early_hints: { label: "Early Hints (103)", desc: "Tells browsers to preload key assets sooner." },
  http3: { label: "HTTP/3 (QUIC)", desc: "Faster, modern transport protocol." },
  "0rtt": { label: "0-RTT Resumption", desc: "Faster reconnections for returning visitors." },
  always_online: { label: "Always Online", desc: "Serve a cached copy if your server goes down." },
  speed_brain: { label: "Speed Brain", desc: "Predictively prefetches the next page." },
  polish: { label: "Image Polish", desc: "Compress images automatically.", pro: true, enum: ["off", "lossless", "lossy"] },
  mirage: { label: "Mirage", desc: "Optimize images for slow mobile connections.", pro: true },
  webp: { label: "WebP", desc: "Serve images as WebP when supported.", pro: true },
}
const ORDER = ["development_mode", "brotli", "rocket_loader", "early_hints", "http3", "0rtt", "always_online", "speed_brain", "polish", "mirage", "webp"]

export default function CloudflareSpeedPage() {
  const [settings, setSettings] = useState<Record<string, any> | null>(null)
  const [noToken, setNoToken] = useState(false)
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState("")
  const [purging, setPurging] = useState(false)

  const load = async () => {
    setLoading(true); setErr("")
    try {
      const d = await fetch(`${API}/admin/cloudflare`, { credentials: "include" }).then(r => r.json())
      if (d.no_token) { setNoToken(true); setSettings(null) }
      else if (d.ok) { setSettings(d.settings || {}); setNoToken(false) }
      else setErr(d.message || "Failed to load Cloudflare settings")
    } catch (e: any) { setErr(e?.message || "Failed") }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const update = async (id: string, value: any) => {
    setBusy(id)
    setSettings(s => ({ ...(s || {}), [id]: { ...(s?.[id] || {}), value } }))
    try {
      const d = await fetch(`${API}/admin/cloudflare`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, value }) }).then(r => r.json())
      if (!d.ok) { toast.error(d.message || "Update failed"); load() } else toast.success("Updated ✓")
    } catch { toast.error("Update failed"); load() }
    setBusy("")
  }
  const purge = async () => {
    if (!window.confirm("Purge ALL cached files? Cloudflare will re-fetch fresh from your server.")) return
    setPurging(true)
    try {
      const d = await fetch(`${API}/admin/cloudflare/purge`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }).then(r => r.json())
      d.ok ? toast.success("Cache purged ✓") : toast.error(d.message || "Purge failed")
    } catch { toast.error("Purge failed") }
    setPurging(false)
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#f6821f,#fbad41)" }}><Bolt className="text-white" /></div>
            <div>
              <Heading level="h1" className="text-xl">Cloudflare — Speed &amp; Performance</Heading>
              <Text className="text-ui-fg-subtle text-sm">Real Cloudflare settings for autotorental.com — toggle live, no Cloudflare dashboard needed.</Text>
            </div>
          </div>
          {!noToken && !loading && <Button variant="danger" isLoading={purging} onClick={purge}><Trash /> Purge cache</Button>}
        </div>

        {loading && <div className="text-ui-fg-muted p-8 text-center">Loading…</div>}
        {err && <div className="mt-4 rounded-lg border border-ui-border-error bg-ui-bg-error-subtle text-ui-fg-error text-sm px-4 py-3">{err}</div>}

        {noToken && (
          <div className="mt-5 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5">
            <div className="font-semibold text-ui-fg-base mb-2">🔌 Connect Cloudflare to control speed settings</div>
            <ol className="text-sm text-ui-fg-subtle list-decimal ms-5 space-y-1">
              <li>Open <b>dash.cloudflare.com → My Profile → API Tokens → Create Token</b>.</li>
              <li>Pick template <b>&quot;Edit zone settings&quot;</b> (or custom: <b>Zone Settings: Edit</b> + <b>Cache Purge: Purge</b>) scoped to <b>autotorental.com</b>.</li>
              <li>Paste the token in <b>Settings → Integrations → Cloudflare</b>, then refresh this page.</li>
            </ol>
          </div>
        )}

        {!loading && !noToken && settings && (
          <div className="flex flex-col gap-2 mt-5">
            {ORDER.filter(id => settings[id]).map(id => {
              const m = META[id]; const s = settings[id]; const editable = s.editable !== false && !m.pro
              return (
                <div key={id} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ui-fg-base flex items-center gap-2">{m.label}{m.pro && <Badge size="2xsmall" color="grey">Pro plan</Badge>}</div>
                    <div className="text-xs text-ui-fg-subtle mt-0.5">{m.desc}</div>
                  </div>
                  {m.enum ? (
                    <Select value={String(s.value)} disabled={!editable || busy === id} onValueChange={v => update(id, v)}>
                      <Select.Trigger className="w-[150px]"><Select.Value /></Select.Trigger>
                      <Select.Content>{m.enum.map(o => <Select.Item key={o} value={o}>{o}</Select.Item>)}</Select.Content>
                    </Select>
                  ) : (
                    <Switch checked={s.value === "on"} disabled={!editable || busy === id} onCheckedChange={c => update(id, c ? "on" : "off")} />
                  )}
                </div>
              )
            })}
            <Text size="small" className="text-ui-fg-muted mt-2">Changes apply to Cloudflare instantly across the whole site. Some options need the Pro plan.</Text>
          </div>
        )}
      </Container>
    </SingleColumnPage>
  )
}
