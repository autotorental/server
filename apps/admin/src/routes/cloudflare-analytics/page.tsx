import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label } from "@medusajs/ui"
import { ChartBar } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Cloudflare Analytics", "تحليلات Cloudflare"), icon: ChartBar, rank: 19 }
const human = (b: number) => b > 1e9 ? (b / 1e9).toFixed(1) + " GB" : b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.round(b / 1e3) + " KB"
const num = (n: number) => (n || 0).toLocaleString()

function CFChart({ series, field, color, fmt }: { series: any[]; field: string; color: string; fmt?: (n: number) => string }) {
  const W = 920, H = 230, pad = 48
  const vals = series.map((s) => s[field] || 0)
  const max = Math.max(1, ...vals)
  const n = series.length
  const X = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2)
  const Y = (v: number) => H - pad - (v / max) * (H - pad * 2)
  const line = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")
  const area = (a: number[]) => `${line(a)} L${X(n - 1).toFixed(1)},${H - pad} L${X(0).toFixed(1)},${H - pad} Z`
  const hr = (t: string) => { try { return new Date(t).getHours() + ":00" } catch { return "" } }
  const f = fmt || ((x: number) => Math.round(x).toLocaleString())
  const gid = `cfg-${field}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.32" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {[0, 0.5, 1].map((q, i) => (<g key={i}><line x1={pad} x2={W - pad} y1={Y(max * q)} y2={Y(max * q)} stroke="rgba(125,125,125,.15)" /><text x={6} y={Y(max * q) + 3} fontSize="10" fill="#94a3b8">{f(max * q)}</text></g>))}
      <path d={area(vals)} fill={`url(#${gid})`} />
      <path d={line(vals)} fill="none" stroke={color} strokeWidth="2.4" />
      {series.map((s, i) => (i % 4 === 0 ? <text key={i} x={X(i)} y={H - 10} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{hr(s.t)}</text> : null))}
    </svg>
  )
}

export default function Page() {
  const [d, setD] = useState<any>(null)
  const [noToken, setNoToken] = useState(false)
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(true)
  const [cfTok, setCfTok] = useState("")
  const [cfEmail, setCfEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [cfMetric, setCfMetric] = useState("requests")

  const load = async () => {
    setLoading(true); setErr("")
    try {
      const j = await fetch(`${API}/admin/cloudflare/analytics`, { credentials: "include" }).then(r => r.json())
      if (j.no_token) { setNoToken(true); setD(null) }
      else if (j.ok) { setD(j); setNoToken(false) }
      else { setErr(j.message || "Failed"); setD(null) }
    } catch (e: any) { setErr(e?.message || "Failed") }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!cfTok.trim() && !cfEmail.trim()) return
    setSaving(true)
    try {
      const payload: any = { cloudflare_email: cfEmail.trim() }
      if (cfTok.trim()) payload.cloudflare_api_token = cfTok.trim()
      await fetch(`${API}/admin/settings`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
      setCfTok("")
      await load()
    } finally { setSaving(false) }
  }

  const t = d?.totals || {}
  const cards = [
    { l: "Requests (24h)", v: num(t.requests), c: "#f6821f" },
    { l: "Bandwidth", v: human(t.bytes || 0), c: "#3b82f6" },
    { l: "Cached", v: (t.cached_pct || 0) + "%", c: "#10b981" },
    { l: "Threats blocked", v: num(t.threats), c: "#dc2626" },
    { l: "Page views", v: num(t.pageViews), c: "#8b5cf6" },
  ]
  const connected = !loading && !noToken && !err && d
  const showConnect = !loading && (noToken || !!err)

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#f6821f,#fbad41)" }}><ChartBar className="text-white" /></div>
            <div><Heading level="h1" className="text-xl">Cloudflare — Analytics (last 24h)</Heading><Text className="text-ui-fg-subtle text-sm">Edge traffic for autotorental.com.</Text></div>
          </div>
          {connected && <Button variant="secondary" onClick={load}>↻ Refresh</Button>}
        </div>

        {loading && <div className="text-ui-fg-muted p-8 text-center">Loading…</div>}

        {showConnect && (
          <div className="mt-5 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5 max-w-2xl">
            <Text size="base" weight="plus" className="mb-1">🔌 {tt("Connect Cloudflare", "اربط Cloudflare")}</Text>
            {err && <div className="my-2 rounded-lg border border-ui-border-error bg-ui-bg-error-subtle text-ui-fg-error text-sm px-3 py-2">Cloudflare: {err}</div>}

            <Text size="small" weight="plus" className="mt-3">{tt("Option A — easiest (Global API Key)", "الخيار أ — الأسهل (Global API Key)")}</Text>
            <Text size="small" className="text-ui-fg-subtle mb-2">{tt("Enter your Cloudflare login email + Global API Key (dash.cloudflare.com → My Profile → API Tokens → Global API Key → View).", "أدخل إيميل دخولك على Cloudflare + Global API Key (dash.cloudflare.com ← My Profile ← API Tokens ← Global API Key ← View).")}</Text>
            <div className="flex flex-col gap-2">
              <div><Label size="small">{tt("Cloudflare email", "إيميل Cloudflare")}</Label><Input type="email" value={cfEmail} onChange={e => setCfEmail(e.target.value)} placeholder="you@example.com" /></div>
              <div><Label size="small">{tt("API Token or Global API Key", "API Token أو Global API Key")}</Label><Input type="password" value={cfTok} onChange={e => setCfTok(e.target.value)} placeholder={tt("paste key/token (blank = keep saved)", "الصق المفتاح/التوكن (فارغ = إبقاء المحفوظ)")} /></div>
            </div>

            <Text size="xsmall" className="text-ui-fg-muted mt-3">{tt("Option B — more secure: create a scoped API Token (Zone:Read, Analytics:Read, Cache Purge, Zone Settings:Edit, DNS:Edit for autotorental.com) and paste it above, leaving the email empty.", "الخيار ب — أكثر أمانًا: أنشئ API Token مُنطاقي (Zone:Read, Analytics:Read, Cache Purge, Zone Settings:Edit, DNS:Edit لـ autotorental.com) وألصقه فوق مع ترك الإيميل فارغًا.")}</Text>

            <div className="flex gap-2 mt-3">
              <Button variant="primary" isLoading={saving} disabled={!cfTok.trim() && !cfEmail.trim()} onClick={save}>{tt("Save & connect", "حفظ وربط")}</Button>
              <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener"><Button variant="secondary">{tt("Open Cloudflare", "افتح Cloudflare")}</Button></a>
            </div>
          </div>
        )}

        {connected && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
            {cards.map(c => (<div key={c.l} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted">{c.l}</div>
              <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: c.c }}>{c.v}</div>
            </div>))}
          </div>
        )}
        {connected && d?.series?.length > 0 && (() => {
          const METRICS = [
            { k: "requests", label: tt("Requests", "الطلبات"), color: "#f6821f" },
            { k: "bytes", label: tt("Bandwidth", "البيانات"), color: "#3b82f6", fmt: human },
            { k: "cached", label: tt("Cached", "المخزّن"), color: "#10b981" },
            { k: "pageViews", label: tt("Page views", "المشاهدات"), color: "#8b5cf6" },
            { k: "threats", label: tt("Threats", "التهديدات"), color: "#ef4444" },
          ]
          const m = METRICS.find((x) => x.k === cfMetric) || METRICS[0]
          return (
            <div className="mt-4 rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <Text weight="plus">{m.label} — {tt("last 24h", "آخر 24 ساعة")}</Text>
                <div className="flex gap-1.5 flex-wrap">
                  {METRICS.map((x) => (
                    <button key={x.k} onClick={() => setCfMetric(x.k)} style={{ padding: "4px 11px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid var(--border-base)", background: cfMetric === x.k ? "var(--bg-subtle)" : "transparent", color: cfMetric === x.k ? x.color : "var(--fg-subtle)" }}>{x.label}</button>
                  ))}
                </div>
              </div>
              <CFChart series={d.series} field={m.k} color={m.color} fmt={(m as any).fmt} />
            </div>
          )
        })()}
      </Container>
    </SingleColumnPage>
  )
}
