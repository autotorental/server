import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Switch, Badge } from "@medusajs/ui"
import { Phone } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "App Builder", icon: Phone }

type Cfg = {
  primary_color: string
  announcement: { enabled: boolean; text: string; bg: string; fg: string }
}
const DEFAULTS: Cfg = {
  primary_color: "#1753b0",
  announcement: { enabled: false, text: "", bg: "#1753b0", fg: "#ffffff" },
}

export default function AppBuilderPage() {
  const [cfg, setCfg]       = useState<Cfg>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [loading, setLoading]= useState(true)
  const [error, setError]   = useState("")

  useEffect(() => {
    fetch(`${API}/admin/app-config`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCfg({ ...DEFAULTS, ...d }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (patch: Partial<Cfg>) => setCfg(x => ({ ...x, ...patch }))
  const setAnn = (patch: Partial<Cfg["announcement"]>) => setCfg(x => ({ ...x, announcement: { ...x.announcement, ...patch } }))

  const save = async () => {
    setSaving(true); setSaved(false); setError("")
    try {
      const r = await fetch(`${API}/admin/app-config`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      })
      if (!r.ok) throw new Error("Save failed")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch(e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <SingleColumnPage>
      <Container className="p-8 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-ui-fg-muted border-t-transparent rounded-full animate-spin"/>
        <Text className="text-ui-fg-muted">Loading app config…</Text>
      </Container>
    </SingleColumnPage>
  )

  return (
    <SingleColumnPage>
      {/* Header */}
      <Container className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ui-fg-base flex items-center justify-center shrink-0">
              <Phone className="text-ui-bg-base"/>
            </div>
            <div>
              <Heading level="h1" className="text-xl font-bold">Mobile App Builder</Heading>
              <Text className="text-ui-fg-muted text-sm mt-0.5">Customize the AutoToRental mobile app appearance live</Text>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && <Badge color="green">Saved ✓</Badge>}
            {error && <Text className="text-ui-fg-error text-sm">{error}</Text>}
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Container>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 px-6 pb-6">
        <div className="space-y-4">

          {/* Brand color */}
          <Container className="p-5">
            <Heading level="h2" className="text-base font-semibold mb-4">Brand Color</Heading>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl border border-ui-border-base shrink-0" style={{background: cfg.primary_color}}/>
              <div className="flex-1">
                <Label className="text-xs font-medium text-ui-fg-muted mb-1.5 block">Primary color (hex)</Label>
                <Input value={cfg.primary_color} onChange={e => set({primary_color: e.target.value})} placeholder="#1753b0" className="font-mono" dir="ltr"/>
              </div>
              <div className="flex gap-2">
                {["#1753b0","#0ea5e9","#7c3aed","#059669","#dc2626","#111827"].map(c=>(
                  <button key={c} onClick={()=>set({primary_color:c})}
                    className="w-7 h-7 rounded-full border-2 transition"
                    style={{background:c, borderColor: cfg.primary_color===c ? c : "transparent", opacity: cfg.primary_color===c ? 1 : 0.7}}/>
                ))}
              </div>
            </div>
          </Container>

          {/* Announcement bar */}
          <Container className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Heading level="h2" className="text-base font-semibold">Announcement Bar</Heading>
              <Switch checked={cfg.announcement.enabled} onCheckedChange={v => setAnn({enabled: v})}/>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-ui-fg-muted mb-1.5 block">Message text</Label>
                <Input value={cfg.announcement.text} onChange={e => setAnn({text: e.target.value})}
                  placeholder="🚗 New luxury cars added! Book now →" disabled={!cfg.announcement.enabled}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-ui-fg-muted mb-1.5 block">Background color</Label>
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-lg border border-ui-border-base shrink-0" style={{background: cfg.announcement.bg}}/>
                    <Input value={cfg.announcement.bg} onChange={e => setAnn({bg: e.target.value})} className="font-mono" dir="ltr" disabled={!cfg.announcement.enabled}/>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-ui-fg-muted mb-1.5 block">Text color</Label>
                  <div className="flex gap-2 items-center">
                    <div className="w-8 h-8 rounded-lg border border-ui-border-base shrink-0" style={{background: cfg.announcement.fg}}/>
                    <Input value={cfg.announcement.fg} onChange={e => setAnn({fg: e.target.value})} className="font-mono" dir="ltr" disabled={!cfg.announcement.enabled}/>
                  </div>
                </div>
              </div>
              {cfg.announcement.enabled && cfg.announcement.text && (
                <div className="rounded-lg px-4 py-2.5 text-sm font-semibold text-center" style={{background: cfg.announcement.bg, color: cfg.announcement.fg}}>
                  {cfg.announcement.text}
                </div>
              )}
            </div>
          </Container>

          {/* Info */}
          <Container className="p-5">
            <Heading level="h2" className="text-base font-semibold mb-3">How it works</Heading>
            <div className="space-y-2 text-sm text-ui-fg-subtle">
              <div className="flex gap-2"><span className="shrink-0 text-green-500">✓</span>Changes apply instantly to the mobile app (iOS + Android)</div>
              <div className="flex gap-2"><span className="shrink-0 text-green-500">✓</span>Mobile app fetches config from <code className="text-xs bg-ui-bg-subtle px-1.5 py-0.5 rounded font-mono">/store/app-config</code> on launch</div>
              <div className="flex gap-2"><span className="shrink-0 text-ui-fg-muted">→</span>Primary color changes the app header, buttons, and accent colors</div>
              <div className="flex gap-2"><span className="shrink-0 text-ui-fg-muted">→</span>Announcement bar shows at the top of the home screen</div>
            </div>
          </Container>
        </div>

        {/* Phone Preview */}
        <div className="sticky top-6 self-start">
          <Text size="small" className="text-ui-fg-muted font-medium mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"/>
            Live preview
          </Text>
          <div className="mx-auto rounded-[2.5rem] border-[10px] overflow-hidden shadow-xl" style={{width:260,height:520,borderColor:"#1f2937",background:"#fff"}}>
            <div className="relative h-full flex flex-col">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-24 h-5 rounded-b-xl" style={{background:"#111"}}/>
              <div className="flex justify-between px-4 pt-1.5 pb-1 text-[9px] font-semibold text-gray-600">
                <span>9:41</span><span>5G ⚡</span>
              </div>
              {cfg.announcement.enabled && cfg.announcement.text && (
                <div className="px-3 py-1.5 text-[10px] font-semibold text-center truncate" style={{background:cfg.announcement.bg,color:cfg.announcement.fg}}>
                  {cfg.announcement.text}
                </div>
              )}
              <div className="px-3 py-2.5 flex items-center justify-between" style={{background:cfg.primary_color}}>
                <span className="text-white font-black text-xs tracking-tight">AutoToRental</span>
                <div className="w-6 h-6 rounded-full bg-white/20"/>
              </div>
              <div className="px-3 -mt-2.5">
                <div className="rounded-lg bg-white shadow border border-gray-100 px-2.5 py-1.5 text-[10px] text-gray-400">🔍 Search cars…</div>
              </div>
              <div className="flex-1 p-3 space-y-2">
                <div className="h-20 rounded-xl" style={{background:cfg.primary_color+"22"}}/>
                <div className="grid grid-cols-2 gap-1.5">
                  {[...Array(4)].map((_,i)=><div key={i} className="h-16 rounded-lg bg-gray-100"/>)}
                </div>
              </div>
              <div className="flex justify-around py-2 border-t border-gray-100">
                {["🏠","🚗","❤️","👤"].map((ic,i)=>(
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <span className="text-sm">{ic}</span>
                    <div className="w-1 h-1 rounded-full" style={{background: i===0?cfg.primary_color:"transparent"}}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SingleColumnPage>
  )
}
