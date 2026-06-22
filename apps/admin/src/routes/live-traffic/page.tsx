import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Button, Container, Heading, Text, Badge } from "@medusajs/ui"
import { Bolt } from "@medusajs/icons"
import { API } from "../../lib/api"
import LiveTicker from "../../components/live-ticker"
import CastButton from "../../components/cast-button"
import { TrafficGlobe } from "../../components/traffic-globe"
import { SystemHealth } from "../../components/system-health"

// Site origin for opening links + AI helper that hands a pre-filled prompt
// to the AI Assistant via sessionStorage.
const SITE = "https://autotorental.com"
const askAIAboutPath = (path: string, hint: "what-to-edit" | "improve-seo" | "improve-conversion") => {
  const url = `${SITE}${path}`
  const promptMap: Record<typeof hint, string> = {
    "what-to-edit":      `I am looking at this page: ${url}\n\nFetch it (use fetch_url), read its source (use read_file on the matching app/ route), then tell me EXACTLY what to edit to improve it. Be specific: file paths, line ranges, what to change and why. Focus on: content quality, SEO (title/meta/h1/schema), UX, performance.`,
    "improve-seo":       `Audit the SEO of ${url}. Use fetch_url to inspect the HTML head, list issues (missing meta description, weak title, missing schema, no canonical, slow LCP), and propose concrete fixes with file paths.`,
    "improve-conversion":`Visitors arrive at ${url} but few click WhatsApp/Call. Propose 3 concrete on-page changes to lift contact rate (CTA placement, urgency, social proof, trust badges). Give exact file paths + code edits.`,
  }
  try { sessionStorage.setItem("ai_initial_prompt", promptMap[hint]) } catch {}
  window.open("/dashboard/ai-assistant", "_blank", "noopener")
}

export const config: RouteConfig = { label: tt("Live Traffic", "الزيارات المباشرة"), icon: Bolt, rank: 22 }

type Live = {
  active_now: number
  views_30m: number
  views_today: number
  visitors_today: number
  per_minute: { m: string; n: number }[]
  top_pages: { path: string; n: number }[]
  top_countries: { country: string; n: number }[]
  active_countries: { country: string; n: number }[]
  by_device: { device: string; n: number }[]
  recent: { path: string; country: string; device: string; t: string; ago: number }[]
  fetched_at: string
}

const flagEmoji = (code?: string | null) => {
  const cc = (code || "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return "🌐"
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}
const devIcon = (d: string) => (d === "mobile" ? "📱" : d === "tablet" ? "📟" : "💻")
const ago = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`)

function Spark({ data }: { data: { m: string; n: number }[] }) {
  if (!data.length)
    return <div className="h-24 flex items-center justify-center text-sm text-ui-fg-muted">No views in the last 30 minutes</div>
  const max = Math.max(1, ...data.map((d) => d.n))
  return (
    <div>
      <div className="flex items-end gap-0.5 h-24">
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.m} · ${d.n} views`}
            className="flex-1 rounded-t bg-ui-fg-interactive transition-all"
            style={{ height: `${Math.max(4, (d.n / max) * 100)}%`, opacity: 0.4 + 0.6 * (d.n / max) }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ui-fg-muted">
        <span>30 min ago</span>
        <span>now</span>
      </div>
    </div>
  )
}

const Kpi = ({ label, value, color, pulse }: { label: string; value: React.ReactNode; color: string; pulse?: boolean }) => (
  <div className="relative overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base p-5 flex flex-col items-center justify-center text-center">
    <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: color }} />
    <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted flex items-center justify-center gap-1.5">
      {pulse && <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />}
      {label}
    </div>
    <div className="mt-2 text-3xl font-semibold tabular-nums text-ui-fg-base">{value}</div>
  </div>
)

function SectionCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden">
      <div className="px-5 py-4 border-b border-ui-border-base">
        <Heading level="h2" className="text-base font-semibold">{title}</Heading>
        {sub && <Text size="small" className="text-ui-fg-subtle">{sub}</Text>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const Page = () => {
  const [d, setD] = useState<Live | null>(null)
  const [err, setErr] = useState(false)
  const timer = useRef<any>(null)

  const load = async () => {
    try {
      const r = await fetch(`${API}/admin/analytics/live`, { credentials: "include" })
      if (!r.ok) { setErr(true); return }
      setD(await r.json()); setErr(false)
    } catch { setErr(true) }
  }

  useEffect(() => {
    load()
    timer.current = setInterval(load, 5000)
    return () => clearInterval(timer.current)
  }, [])

  return (
    <SingleColumnPage>
      <Container className="p-6"><LiveTicker /></Container>
      {err && (
        <Container className="p-6">
          <div className="rounded-xl border border-ui-border-error bg-ui-bg-base px-4 py-3">
            <Text className="text-ui-fg-error">Couldn’t load live data — retrying…</Text>
          </div>
        </Container>
      )}

      {/* Header */}
      <Container className="p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center rounded-xl text-white shrink-0 shadow-elevation-card-rest" style={{ width: 44, height: 44, backgroundImage: "linear-gradient(135deg,#059669,#0ea5e9)" }}>
              <Bolt />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Heading level="h1" className="text-xl font-semibold tracking-tight">Live Traffic</Heading>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[11px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live · every 5s
                </span>
              </div>
              <Text size="small" className="text-ui-fg-subtle mt-0.5">Real-time visitors on autotorental.com — first-party tracking, instant.</Text>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {d?.fetched_at && <Text size="small" className="text-ui-fg-muted">Updated {new Date(d.fetched_at).toLocaleTimeString()}</Text>}
            <CastButton />
            <a href={`${SITE}/?notrack=1`} target="_blank" rel="noopener noreferrer" title="Open the site on THIS device with tracking OFF so your own visits never show here. Click once per device (phone + computer).">
              <Button variant="secondary" size="small">🙈 Exclude me</Button>
            </a>
          </div>
        </div>
      </Container>

      {/* KPI strip (full width) */}
      <Container className="p-6">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          <Kpi label="Active now" value={d?.active_now ?? "—"} color="#059669" pulse />
          <Kpi label="Visitors today" value={d?.visitors_today ?? "—"} color="#7c3aed" />
          <Kpi label="Views today" value={d?.views_today ?? "—"} color="#d97706" />
        </div>
      </Container>

      {/* Server Health (LEFT) · Live map (RIGHT) */}
      <Container className="p-6">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "1rem", alignItems: "start" }}>
          <SystemHealth />
          <div className="xl:sticky xl:top-4">
            <TrafficGlobe countries={(d?.active_countries || []).map((c: any) => ({ code: c.country, count: c.n }))} />
            <Text size="small" className="text-ui-fg-muted mt-2 text-center">Drag to rotate · Unroll to flatten into a world map · glowing markers = visitors online right now</Text>
          </div>
        </div>
      </Container>

      {/* Sparkline */}
      <Container className="p-6">
        <SectionCard title="Views over time" sub="Per-minute views in the last 30 minutes">
          <Spark data={d?.per_minute || []} />
        </SectionCard>
      </Container>

      {/* Live feed + Top pages */}
      <Container className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <SectionCard title="Live feed" sub="Most recent page views as they happen">
            {!d?.recent?.length ? (
              <div className="py-8 text-center">
                <Text className="text-ui-fg-subtle font-medium">No visits yet</Text>
                <Text size="small" className="text-ui-fg-muted mt-1">Open autotorental.com to watch it light up.</Text>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-ui-border-base max-h-80 overflow-auto -my-1">
                {d.recent.map((r, i) => (
                  <div key={i} className="group py-2.5 flex items-center justify-between gap-2 text-sm hover:bg-ui-bg-subtle rounded-md -mx-2 px-2 transition">
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base leading-none">{flagEmoji(r.country)}</span>
                      <span className="text-base leading-none">{devIcon(r.device)}</span>
                      <a
                        href={`${SITE}${r.path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate font-mono text-xs text-ui-fg-base hover:text-ui-fg-interactive hover:underline"
                        title={`Open ${SITE}${r.path}`}
                      >{r.path}</a>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => askAIAboutPath(r.path, "what-to-edit")}
                        className="opacity-0 group-hover:opacity-100 transition"
                        title="Ask AI: what should I edit on this page?"
                      >🤖 Edit</Button>
                      <span className="text-xs text-ui-fg-muted tabular-nums">{ago(r.ago)} ago</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Top pages today" sub="Most-viewed pages since midnight">
            {!d?.top_pages?.length ? (
              <Text className="text-ui-fg-muted">No data yet.</Text>
            ) : (
              <div className="space-y-2.5">
                {d.top_pages.map((p, i) => {
                  const max = Math.max(1, ...d.top_pages.map((x) => x.n))
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <a
                          href={`${SITE}${p.path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate font-mono text-xs text-ui-fg-base hover:text-ui-fg-interactive hover:underline"
                          title={`Open ${SITE}${p.path}`}
                        >{p.path}</a>
                        <span className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => askAIAboutPath(p.path, "what-to-edit")}
                            className="opacity-0 group-hover:opacity-100 transition"
                            title="What to edit?"
                          >🤖 Edit</Button>
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => askAIAboutPath(p.path, "improve-seo")}
                            className="opacity-0 group-hover:opacity-100 transition"
                            title="SEO audit"
                          >📈 SEO</Button>
                          <span className="text-sm font-semibold tabular-nums">{p.n}</span>
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ui-bg-subtle overflow-hidden">
                        <div className="h-full rounded-full bg-ui-fg-interactive" style={{ width: `${(p.n / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {((d?.top_countries?.length || 0) > 0 || (d?.by_device?.length || 0) > 0) && (
              <div className="mt-5 pt-4 border-t border-ui-border-base flex flex-wrap gap-2">
                {(d?.top_countries || []).map((c, i) => (
                  <Badge key={i} color="grey">{flagEmoji(c.country)} {c.country} · {c.n}</Badge>
                ))}
                {(d?.by_device || []).map((x, i) => (
                  <Badge key={`d${i}`} color="blue">{devIcon(x.device)} {x.device} · {x.n}</Badge>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
