import { useEffect, useState, lazy, Suspense } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button, toast } from "@medusajs/ui"
import { GlobeEurope } from "@medusajs/icons"
import { API, PUBLISHABLE_KEY } from "../../lib/api"
// d3-geo/topojson are ESM; lazy-load the globe so the Mercur route-config
// scanner (tsx/esbuild) never evaluates them and silently skips this route.
const TrafficGlobe = lazy(() => import("../../components/traffic-globe"))

// Vendor "Traffic" page — live visitor globe (the user's globe-to-map source)
// + a Google-Analytics-style views report (per-car views + profile views).
export const config: RouteConfig = { label: "Traffic", icon: GlobeEurope }

type Country = { code: string; name?: string; count: number }
type Car = { id: string; title: string; status: string; views: number; photo?: string | null }
type ViewsReport = { profile_views: number; total_car_views: number; car_count: number; contacts: { calls: number; whatsapp: number }; cars: Car[] }

const Kpi = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 flex-1 min-w-[130px]">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted">{label}</div>
    <div className="text-2xl font-semibold tabular-nums mt-1">{value}</div>
  </div>
)

const HStat = ({ icon, label, value, color = "#ffffff" }: { icon: string; label: string; value: any; color?: string }) => (
  <div className="rounded-xl border px-4 py-3.5" style={{ background: color + "14", borderColor: color + "40" }}>
    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-ui-fg-subtle">
      <span className="inline-flex items-center justify-center rounded-lg shrink-0" style={{ width: 26, height: 26, background: color + "2e", fontSize: 14 }}>{icon}</span>{label}
    </div>
    <div className="text-3xl font-extrabold tabular-nums mt-2 text-ui-fg-base">{value}</div>
  </div>
)

const flagEmoji = (code?: string | null) => { const cc = (code || "").toUpperCase(); if (!/^[A-Z]{2}$/.test(cc)) return "🌐"; return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) }
const devIcon = (d?: string | null) => (d === "mobile" ? "📱" : d === "tablet" ? "📟" : "💻")
const agoFmt = (sec: number) => (sec < 60 ? `${sec}s ago` : sec < 3600 ? `${Math.floor(sec / 60)}m ago` : sec < 86400 ? `${Math.floor(sec / 3600)}h ago` : `${Math.floor(sec / 86400)}d ago`)

// Platform news ticker — admin-authored news woven with live events (cars added,
// discounts, new companies, "browsing now"), fed by the public /store/ticker feed.
// Same marquee look as the storefront/admin ticker, surfaced inside the vendor dashboard.
const NewsTicker = ({ items }: { items: any[] }) => {
  if (!items?.length) return null
  const isAr = typeof document !== "undefined" && (document.documentElement.lang || "").startsWith("ar")
  const label = isAr ? "أخبار" : "News"
  const loop = [...items, ...items] // duplicate for seamless infinite scroll
  const dur = Math.max(28, items.length * 5) // seconds — longer feed scrolls slower
  const item = (it: any, i: number) => {
    const txt = (isAr && it.text_ar ? it.text_ar : it.text) || ""
    const body = (
      <span className="vt-it">
        <span className="vt-emoji">{it.emoji || "📣"}</span>
        {txt}
        <span className="vt-sep">◆</span>
      </span>
    )
    return it.link
      ? <a key={i} href={`https://autotorental.com${it.link}`} target="_blank" rel="noopener noreferrer" className="vt-link">{body}</a>
      : <span key={i}>{body}</span>
  }
  return (
    <div className="vt-ticker" dir="ltr">
      <style>{`
        .vt-ticker{display:flex;align-items:center;overflow:hidden;border-radius:12px;height:44px;position:relative;
          border:1px solid rgba(130,130,140,.25);background:rgba(130,130,140,.06)}
        .vt-ticker .vt-badge{display:flex;align-items:center;gap:7px;height:100%;padding:0 16px;flex:none;z-index:2;
          background:linear-gradient(90deg,#2563eb,#3b82f6);color:#fff;font-weight:800;font-size:12px;letter-spacing:.05em;text-transform:uppercase}
        .vt-ticker .vt-dot{width:8px;height:8px;border-radius:50%;background:#fff;animation:vt-pulse 1.1s infinite}
        .vt-ticker .vt-marq{flex:1;overflow:hidden;height:100%;position:relative;
          -webkit-mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent);
          mask-image:linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 40px),transparent)}
        .vt-ticker .vt-track{display:flex;align-items:center;height:100%;white-space:nowrap;
          animation:vt-scroll var(--vt-dur,40s) linear infinite;will-change:transform}
        .vt-ticker .vt-track:hover{animation-play-state:paused}
        .vt-ticker .vt-it{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;padding:0 4px;color:inherit}
        .vt-ticker .vt-emoji{font-size:15px}
        .vt-ticker .vt-sep{color:#3b82f6;padding:0 16px;font-size:10px;opacity:.7}
        .vt-ticker .vt-link{text-decoration:none;color:inherit}
        .vt-ticker .vt-link:hover .vt-it{color:#2563eb}
        @keyframes vt-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes vt-pulse{0%,100%{opacity:1}50%{opacity:.25}}
      `}</style>
      <div className="vt-badge"><span className="vt-dot" />📣 {label}</div>
      <div className="vt-marq">
        <div className="vt-track" style={{ ["--vt-dur" as any]: `${dur}s` }}>
          {loop.map(item)}
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  const [countries, setCountries] = useState<Country[]>([])
  const [report, setReport] = useState<ViewsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [ann, setAnn] = useState<any>(null)
  const [live, setLive] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [news, setNews] = useState<any[]>([])
  const [search, setSearch] = useState<any>(null)

  useEffect(() => {
    let alive = true
    const loadData = () => Promise.all([
      fetch(`${API}/vendor/analytics/geography?days=30`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API}/vendor/analytics/views`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API}/vendor/announcement`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API}/vendor/analytics/live`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API}/vendor/profile`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API}/store/ticker`, { headers: { "x-publishable-api-key": PUBLISHABLE_KEY } }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API}/vendor/search-performance?days=30`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([geo, views, annc, lv, prof, tick, srch]) => {
      if (!alive) return
      setCountries(Array.isArray(geo?.countries) ? geo.countries.filter((c: Country) => c.code) : [])
      setReport(views || null)
      setAnn(annc?.active ? annc : null)
      setLive(lv || null)
      setProfile(prof?.seller || null)
      setNews(Array.isArray(tick?.items) ? tick.items : [])
      setSearch(srch || null)
    }).finally(() => { if (alive) setLoading(false) })
    loadData()
    const t = setInterval(loadData, 30000) // keep the numbers genuinely live
    return () => { alive = false; clearInterval(t) }
  }, [])

  const maxViews = Math.max(1, ...((report?.cars || []).map((c) => c.views)))
  const totalViews = (report?.profile_views ?? 0) + (report?.total_car_views ?? 0)
  const totalLeads = (report?.contacts?.calls ?? 0) + (report?.contacts?.whatsapp ?? 0)
  const engagement = totalViews > 0 ? (totalLeads / totalViews) * 100 : 0
  const health = totalViews === 0
    ? { label: "Getting started", color: "#94a3b8" }
    : engagement >= 5 ? { label: "Excellent", color: "#34d399" }
    : engagement >= 2 ? { label: "Strong", color: "#60a5fa" }
    : { label: "Growing", color: "#fbbf24" }

  const storeUrl = `https://autotorental.com/companies/${profile?.handle || profile?.id || ""}`
  const isAr = typeof document !== "undefined" && (document.documentElement.lang || "").startsWith("ar")
  const L = (en: string, ar: string) => (isAr ? ar : en)

  return (
    <SingleColumnPage>
      <Container className="p-0 overflow-hidden">
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">📊 Traffic &amp; Performance</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  Live
                </span>
              </div>
              <p className="text-sm mt-1.5 text-ui-fg-subtle">Your command center — every visitor, view and lead, tracked in real time. Auto-updating every 30s.</p>
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-xl bg-ui-bg-subtle border px-3.5 py-2.5 shrink-0">
              <span style={{ fontSize: 20 }}>⚡</span>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-ui-fg-subtle">Traffic Health</div>
                <div className="text-base font-bold leading-tight" style={{ color: health.color }}>{loading ? "…" : health.label}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <HStat icon="👁️" label="Total views" value={loading ? "—" : totalViews.toLocaleString()} color="#38bdf8" />
            <HStat icon="📞" label="Leads · calls + WhatsApp" value={loading ? "—" : totalLeads.toLocaleString()} color="#34d399" />
            <HStat icon="🌍" label="Countries reached" value={loading ? "—" : countries.length} color="#a78bfa" />
            <HStat icon="📈" label="Engagement rate" value={loading ? "—" : engagement.toFixed(1) + "%"} color="#fbbf24" />
          </div>

          {ann?.active && ann.text && (() => {
            const isAr = typeof document !== "undefined" && (document.documentElement.lang || "").startsWith("ar")
            const msg = isAr && ann.text_ar ? ann.text_ar : ann.text
            const inner = <><span style={{ fontSize: 18 }}>{ann.emoji || "📣"}</span><span className="text-sm font-medium" style={{ color: "#fde68a" }}>{msg}</span></>
            const cls = "mt-4 flex items-center gap-2.5 rounded-xl px-4 py-2.5"
            const sty = { background: "rgba(251,191,36,.14)", border: "1px solid rgba(251,191,36,.3)" } as const
            return ann.link
              ? <a href={ann.link} target="_blank" rel="noopener" className={cls} style={sty}>{inner}</a>
              : <div className={cls} style={sty}>{inner}</div>
          })()}
        </div>
      </Container>

      {/* Platform news — admin announcements woven with live activity */}
      {news.length > 0 && (
        <Container className="p-6 pt-0">
          <NewsTicker items={news} />
        </Container>
      )}

      {/* Your public rental company link */}
      <Container className="p-6 pt-0">
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1"><span style={{ fontSize: 18 }}>🔗</span><Heading level="h3" className="text-base">Your rental company link</Heading></div>
          <Text size="small" className="text-ui-fg-subtle mb-3">Your public storefront on autotorental.com — share it anywhere as your company website.</Text>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="flex-1 min-w-0 truncate rounded-lg bg-ui-bg-subtle border px-3 py-2.5 text-sm">{storeUrl}</code>
            <Button size="small" variant="secondary" disabled={!profile} onClick={() => { try { navigator.clipboard.writeText(storeUrl); toast.success("Link copied") } catch { toast.error("Copy failed") } }}>Copy</Button>
            <a href={storeUrl} target="_blank" rel="noopener noreferrer"><Button size="small" disabled={!profile}>Open ↗</Button></a>
          </div>
          {search?.custom_domain && (
            <div className="flex items-center gap-2 flex-wrap mt-2.5">
              <span style={{ fontSize: 16 }}>🌐</span>
              <Text size="small" className="text-ui-fg-subtle">{L("Your domain", "نطاقك")}:</Text>
              <a href={`https://${search.custom_domain}`} target="_blank" rel="noopener noreferrer" className="text-ui-fg-interactive text-sm font-medium underline">{search.custom_domain}</a>
              {search.custom_domain_status === "live"
                ? <Badge size="2xsmall" color="green">{L("Live", "يعمل")}</Badge>
                : <Badge size="2xsmall" color="orange">{search.custom_domain_status === "dns_ok" ? L("Setting up SSL", "إعداد SSL") : L("Pending DNS", "بانتظار DNS")}</Badge>}
            </div>
          )}
        </div>
      </Container>

      {/* Your store in Google Search */}
      <Container className="p-6 pt-0">
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-1"><span style={{ fontSize: 18 }}>🔎</span><Heading level="h3" className="text-base">{L("Your store in Google Search", "متجرك في بحث جوجل")}</Heading></div>
          <Text size="small" className="text-ui-fg-subtle mb-3">{L("How your company page performs in Google results — last 30 days.", "كيف تظهر صفحة شركتك في نتائج Google — آخر 30 يوماً.")}</Text>
          {search?.connected && search?.totals && (search.totals.impressions > 0 || search.totals.clicks > 0) ? (
            <>
              <div className="flex flex-wrap gap-3">
                <Kpi label={L("Clicks", "النقرات")} value={(search.totals.clicks || 0).toLocaleString()} />
                <Kpi label={L("Impressions", "الظهور")} value={(search.totals.impressions || 0).toLocaleString()} />
                <Kpi label="CTR" value={`${search.totals.ctr || 0}%`} />
                <Kpi label={L("Avg position", "متوسط الترتيب")} value={String(search.totals.position || 0)} />
              </div>
              {Array.isArray(search.top_queries) && search.top_queries.length > 0 && (
                <div className="mt-4">
                  <Text size="xsmall" className="text-ui-fg-muted uppercase tracking-wide mb-2">{L("Top search terms", "أهم كلمات البحث")}</Text>
                  <div className="flex flex-col gap-1.5">
                    {search.top_queries.slice(0, 6).map((qq: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-3 text-sm border-b border-ui-border-base pb-1.5">
                        <span className="truncate">{qq.query}</span>
                        <span className="text-ui-fg-subtle tabular-nums shrink-0">{qq.clicks} {L("clicks", "نقرة")} · {qq.impressions} {L("impr", "ظهور")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Text className="text-ui-fg-muted text-sm">{L("Search data will appear here once Google indexes your store page.", "ستظهر بيانات البحث هنا بمجرد فهرسة Google لصفحة متجرك.")}</Text>
          )}
        </div>
      </Container>

      {/* KPIs */}
      <Container className="p-6 pt-0">
        <div className="flex flex-wrap gap-3">
          <Kpi label="Profile views" value={loading ? "—" : (report?.profile_views ?? 0).toLocaleString()} />
          <Kpi label="Total car views" value={loading ? "—" : (report?.total_car_views ?? 0).toLocaleString()} />
          <Kpi label="Calls" value={loading ? "—" : (report?.contacts?.calls ?? 0).toLocaleString()} />
          <Kpi label="WhatsApp" value={loading ? "—" : (report?.contacts?.whatsapp ?? 0).toLocaleString()} />
          <Kpi label="Countries" value={loading ? "—" : countries.length} />
        </div>
      </Container>

      {/* Live leads feed (real-time, per-vendor) */}
      <Container className="p-6 pt-0">
        <div className="flex items-center justify-between mb-3">
          <Heading level="h2" className="text-base font-semibold">🔴 Live leads</Heading>
          <Badge color="green">{(live?.leads_today ?? 0)} today{live?.leads_30m ? ` · ${live.leads_30m} in 30m` : ""}</Badge>
        </div>
        {!live?.recent?.length ? (
          <Text className="text-ui-fg-muted">No leads yet — when a customer calls or messages you, it appears here instantly.</Text>
        ) : (
          <div className="flex flex-col gap-2">
            {live.recent.map((r: any, i: number) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-ui-border-base p-3">
                <span className="text-xl shrink-0">{r.type === "whatsapp" ? "🟢" : r.type === "webrtc" ? "📲" : "📞"}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{r.type === "whatsapp" ? "WhatsApp message" : r.type === "webrtc" ? "In-app call" : "Phone call"}</div>
                  <div className="text-xs text-ui-fg-muted">{flagEmoji(r.country)} {r.country || "—"} · {devIcon(r.device)} {r.device || "—"}</div>
                </div>
                <span className="text-xs text-ui-fg-muted shrink-0">{agoFmt(r.ago)}</span>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Leads last 14 days + by device */}
      {!loading && ((live?.per_day?.length || 0) > 0 || (live?.by_device?.length || 0) > 0) ? (
        <Container className="p-6 pt-0">
          <Heading level="h2" className="text-base font-semibold mb-3">Leads — last 14 days</Heading>
          <div className="flex items-end gap-1 h-20 mb-4">
            {(live?.per_day || []).map((d: any, i: number) => {
              const mx = Math.max(1, ...(live.per_day || []).map((x: any) => x.n))
              return <div key={i} title={`${d.day}: ${d.n} leads`} className="flex-1 bg-ui-fg-interactive rounded-t" style={{ height: `${(d.n / mx) * 100}%`, minHeight: d.n ? 4 : 2, opacity: d.n ? 1 : 0.25 }} />
            })}
          </div>
          {(live?.by_device || []).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {live.by_device.map((d: any) => (
                <Badge key={d.device} size="small" color="grey">{devIcon(d.device)} {d.device || "other"} · {d.n}</Badge>
              ))}
            </div>
          )}
        </Container>
      ) : null}

      {/* Globe */}
      <Container className="p-6 pt-0">
        <Heading level="h2" className="text-base font-semibold mb-3">Visitor globe — last 30 days</Heading>
        <Suspense fallback={<Text className="text-ui-fg-subtle">Loading map…</Text>}>
          <TrafficGlobe countries={countries.map((c) => ({ code: c.code, count: c.count, name: c.name }))} />
        </Suspense>
      </Container>

      {/* Per-car views report */}
      <Container className="p-6 pt-0">
        <Heading level="h2" className="text-base font-semibold mb-3">Views per car</Heading>
        {loading ? (
          <Text className="text-ui-fg-muted">Loading…</Text>
        ) : !report?.cars?.length ? (
          <Text className="text-ui-fg-muted">No cars listed yet — add cars to start tracking views.</Text>
        ) : (
          <div className="flex flex-col gap-2">
            {report.cars.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-ui-border-base p-3">
                {c.photo
                  ? <img src={c.photo} alt="" className="w-12 h-9 rounded object-cover" />
                  : <div className="w-12 h-9 rounded bg-ui-bg-subtle flex items-center justify-center text-xs">🚗</div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{c.title}</span>
                    <Badge size="2xsmall" color={c.status === "active" ? "green" : "grey"}>{c.status}</Badge>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-ui-bg-subtle overflow-hidden">
                    <div className="h-full bg-ui-fg-interactive rounded-full" style={{ width: `${(c.views / maxViews) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-semibold tabular-nums">{c.views.toLocaleString()}</div>
                  <div className="text-[10px] text-ui-fg-muted uppercase">views</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Top countries list */}
      {!loading && countries.length > 0 && (
        <Container className="p-6 pt-0">
          <Heading level="h2" className="text-base font-semibold mb-3">Top countries</Heading>
          <div className="flex flex-col gap-2">
            {countries.slice(0, 8).map((c) => (
              <div key={c.code} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.name || c.code}</span>
                <span className="text-ui-fg-muted tabular-nums">{c.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page
