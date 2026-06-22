import { useState, useEffect, useRef } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Badge } from "@medusajs/ui"
import { Bolt, Sparkles, CheckCircleSolid, XCircleSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("PageSpeed", "سرعة الصفحة"), icon: Bolt, rank: 25 }

type Res = {
  ok: boolean; error?: string; url?: string; strategy?: string; source?: string
  scores?: { performance: number | null; accessibility: number | null; best_practices: number | null; seo: number | null }
  metrics?: { lcp: string | null; fcp: string | null; cls: string | null; tbt: string | null; si: string | null }
  opportunities?: { id?: string; title: string; savingsMs?: number; display?: string; value?: string }[]
  diagnostics?: { id?: string; title: string; value?: string }[]
  issues?: { title: string; score: number }[]
  passed?: number
}

type Fix = {
  issue: string
  action: string
  status: "pending" | "applying" | "done" | "failed" | "manual"
  detail?: string
}

type HistoryRow = {
  id: string
  url: string
  strategy: string
  created_at: string
  scores: { performance?: number | null; accessibility?: number | null; seo?: number | null; best_practices?: number | null } | null
  source: string | null
}

const color = (n: number | null) => (n == null ? "#9ca3af" : n >= 90 ? "#16a34a" : n >= 50 ? "#d97706" : "#dc2626")

const Gauge = ({ label, value }: { label: string; value: number | null }) => (
  <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 flex flex-col items-center">
    <div className="relative w-20 h-20 rounded-full flex items-center justify-center"
      style={{ background: `conic-gradient(${color(value)} ${(value ?? 0) * 3.6}deg, var(--bg-subtle,#e5e7eb) 0deg)` }}>
      <div className="absolute inset-1.5 rounded-full bg-ui-bg-base flex items-center justify-center">
        <span className="text-xl font-bold tabular-nums" style={{ color: color(value) }}>{value ?? "—"}</span>
      </div>
    </div>
    <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-ui-fg-subtle">{label}</div>
  </div>
)

const ScoreBadge = ({ v }: { v: number | null }) => {
  if (v == null) return <span className="text-ui-fg-muted">—</span>
  const col = v >= 90 ? "green" : v >= 50 ? "orange" : "red"
  return <Badge color={col}>{v}</Badge>
}

const Page = () => {
  const [url, setUrl] = useState("https://autotorental.com")
  const [strategy, setStrategy] = useState<"mobile" | "desktop">("mobile")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [res, setRes] = useState<Res | null>(null)
  const [aiFixing, setAiFixing] = useState(false)
  const [fixes, setFixes] = useState<Fix[]>([])
  const [aiDone, setAiDone] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [historyScope, setHistoryScope] = useState<"all" | "url">("all")
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchHistory = async (targetUrl?: string, scope?: "all" | "url") => {
    const sc = scope ?? historyScope
    const u = targetUrl ?? url
    setHistoryLoading(true)
    try {
      const qs = sc === "url" && u.trim() ? `?url=${encodeURIComponent(u)}` : ""
      const r = await fetch(`${API}/admin/pagespeed/history${qs}`, { credentials: "include" })
      const d = await r.json()
      setHistory(Array.isArray(d?.history) ? d.history : [])
    } catch { setHistory([]) }
    finally { setHistoryLoading(false) }
  }

  useEffect(() => { fetchHistory(undefined, "all") }, [])

  const startProgress = () => {
    setProgress(0)
    if (progressRef.current) clearInterval(progressRef.current)
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 90) { clearInterval(progressRef.current!); return 90 }
        return p + 2
      })
    }, 800)
  }

  const stopProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(100)
    setTimeout(() => setProgress(0), 600)
  }

  const run = async () => {
    setLoading(true); setRes(null); setFixes([]); setAiDone(false)
    startProgress()
    try {
      const r = await fetch(`${API}/admin/pagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}`, { credentials: "include" })
      setRes(await r.json())
      fetchHistory(url)
    } catch (e: any) {
      setRes({ ok: false, error: e?.message || "Request failed" })
    } finally {
      setLoading(false)
      stopProgress()
    }
  }

  const autoFixWithAI = async () => {
    if (!res?.ok) return
    setAiFixing(true); setFixes([]); setAiDone(false)
    const allIssues = [
      ...(res.opportunities || []).map(o => o.title),
      ...(res.diagnostics || []).map(d => d.title),
      ...(res.issues || []).map(i => i.title),
    ].filter(Boolean)
    try {
      const r = await fetch(`${API}/admin/pagespeed/autofix`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, strategy, issues: allIssues, scores: res.scores }),
      })
      const d = await r.json()
      setFixes(d.fixes || [])
      setAiDone(true)
    } catch (e: any) {
      setFixes([{ issue: "AI Auto-fix", action: "Failed: " + (e?.message || "Unknown error"), status: "failed" }])
    } finally { setAiFixing(false) }
  }

  const toggleHistory = () => {
    if (!showHistory) fetchHistory(url)
    setShowHistory(v => !v)
  }

  const hasIssues = res?.ok && ((res.opportunities?.length ?? 0) + (res.diagnostics?.length ?? 0) + (res.issues?.length ?? 0)) > 0

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bolt /><Heading level="h1" className="text-2xl font-semibold">PageSpeed Tester</Heading>
        </div>
        <Text className="text-ui-fg-subtle">Test any page with Lighthouse (local, unlimited) — performance, accessibility, best practices & SEO.</Text>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[240px]"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://autotorental.com/..." dir="ltr" /></div>
          <div className="flex rounded-lg border border-ui-border-base overflow-hidden">
            <button onClick={() => setStrategy("mobile")} className={`px-3 py-2 text-sm ${strategy === "mobile" ? "bg-ui-bg-base-hover font-semibold" : ""}`}>📱 Mobile</button>
            <button onClick={() => setStrategy("desktop")} className={`px-3 py-2 text-sm ${strategy === "desktop" ? "bg-ui-bg-base-hover font-semibold" : ""}`}>💻 Desktop</button>
          </div>
          <Button onClick={run} disabled={loading || !url.trim()}>{loading ? "Testing…" : "Run test"}</Button>
          <Button variant="secondary" onClick={toggleHistory}>📊 History {showHistory ? "▲" : "▼"}</Button>
        </div>

        {/* Progress bar */}
        {loading && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <Text className="text-ui-fg-muted text-sm">⚙️ Running Lighthouse locally — this takes 20–40 seconds…</Text>
              <span className="text-xs text-ui-fg-muted tabular-nums">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-ui-bg-subtle overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#a855f7)" }}
              />
            </div>
          </div>
        )}
        {res?.source && <Text className="text-ui-fg-muted mt-1 text-xs">Source: {res.source}</Text>}
      </Container>

      {/* History table */}
      {showHistory && (
        <Container className="p-6 pt-0">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <Heading level="h2" className="text-base font-semibold">Test History</Heading>
            <div className="inline-flex rounded-lg border border-ui-border-base bg-ui-bg-subtle p-0.5">
              <button type="button" onClick={() => { setHistoryScope("all"); fetchHistory(undefined, "all") }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${historyScope === "all" ? "bg-ui-bg-base text-ui-fg-base shadow-sm" : "text-ui-fg-muted hover:text-ui-fg-subtle"}`}>All pages</button>
              <button type="button" onClick={() => { setHistoryScope("url"); fetchHistory(undefined, "url") }} className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${historyScope === "url" ? "bg-ui-bg-base text-ui-fg-base shadow-sm" : "text-ui-fg-muted hover:text-ui-fg-subtle"}`}>This page</button>
            </div>
          </div>
          {historyLoading ? (
            <Text className="text-ui-fg-muted text-sm">Loading history…</Text>
          ) : history.length === 0 ? (
            <Text className="text-ui-fg-muted text-sm">No test history yet. Run a PageSpeed test above to start tracking scores over time.</Text>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ui-border-base">
                    <th className="text-left py-2 pr-4 text-ui-fg-subtle font-semibold text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left py-2 pr-4 text-ui-fg-subtle font-semibold text-xs uppercase tracking-wide">URL</th>
                    <th className="text-center py-2 pr-4 text-ui-fg-subtle font-semibold text-xs uppercase tracking-wide">Perf</th>
                    <th className="text-center py-2 pr-4 text-ui-fg-subtle font-semibold text-xs uppercase tracking-wide">SEO</th>
                    <th className="text-center py-2 pr-4 text-ui-fg-subtle font-semibold text-xs uppercase tracking-wide">A11y</th>
                    <th className="text-center py-2 text-ui-fg-subtle font-semibold text-xs uppercase tracking-wide">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-ui-border-base/50 hover:bg-ui-bg-subtle transition-colors">
                      <td className="py-2 pr-4 text-ui-fg-subtle tabular-nums whitespace-nowrap">
                        {new Date(h.created_at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-ui-fg-base truncate max-w-[200px]" title={h.url}>{h.url}</td>
                      <td className="py-2 pr-4 text-center"><ScoreBadge v={h.scores?.performance ?? null} /></td>
                      <td className="py-2 pr-4 text-center"><ScoreBadge v={h.scores?.seo ?? null} /></td>
                      <td className="py-2 pr-4 text-center"><ScoreBadge v={h.scores?.accessibility ?? null} /></td>
                      <td className="py-2 text-center text-xs text-ui-fg-muted">{h.source ?? "lighthouse"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Container>
      )}

      {res && !res.ok && (
        <Container className="p-6"><Text className="text-ui-fg-error">⚠️ {res.error}</Text></Container>
      )}

      {res?.ok && (
        <>
          <Container className="p-6">
            <Text className="text-ui-fg-subtle mb-3 text-sm">{res.strategy?.toUpperCase()} · {res.url}</Text>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
              <Gauge label="Performance" value={res.scores!.performance} />
              <Gauge label="Accessibility" value={res.scores!.accessibility} />
              <Gauge label="Best Practices" value={res.scores!.best_practices} />
              <Gauge label="SEO" value={res.scores!.seo} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {res.metrics?.lcp && <Badge color="grey">LCP {res.metrics.lcp}</Badge>}
              {res.metrics?.fcp && <Badge color="grey">FCP {res.metrics.fcp}</Badge>}
              {res.metrics?.cls && <Badge color="grey">CLS {res.metrics.cls}</Badge>}
              {res.metrics?.tbt && <Badge color="grey">TBT {res.metrics.tbt}</Badge>}
              {res.passed != null && <Badge color="green">✅ {res.passed} passed</Badge>}
            </div>
          </Container>

          {(!!res.opportunities?.length || !!res.diagnostics?.length) && (
            <Container className="p-6">
              {!!res.opportunities?.length && (
                <>
                  <Heading level="h2" className="text-base font-semibold mb-3">⚡ Top opportunities</Heading>
                  <div className="space-y-2 mb-4">
                    {res.opportunities.map((o, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 border-b border-ui-border-base pb-2 text-sm">
                        <span className="text-ui-fg-base">{o.title}</span>
                        {o.value && <span className="text-ui-fg-subtle text-xs">{o.value}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {!!res.diagnostics?.length && (
                <>
                  <Heading level="h2" className="text-base font-semibold mb-3">🔧 Diagnostics</Heading>
                  <div className="space-y-1 mb-4">
                    {res.diagnostics.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm pb-1">
                        <span className="text-amber-500 shrink-0">⚠</span>
                        <span className="text-ui-fg-subtle">{d.title}</span>
                        {d.value && <span className="text-xs text-ui-fg-muted ml-auto">{d.value}</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* AI Auto-fix button */}
              {hasIssues && !aiDone && (
                <div className="mt-2 p-4 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="font-bold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-2">
                        <Sparkles className="text-purple-600"/> 🤖 Auto to Rental AI Auto-fix
                      </div>
                      <Text size="small" className="text-purple-700 dark:text-purple-300 mt-0.5">
                        Our AI (hermes3) analyzes these {(res.opportunities?.length ?? 0) + (res.diagnostics?.length ?? 0)} issues and automatically applies fixes to your codebase.
                      </Text>
                    </div>
                    <Button
                      onClick={autoFixWithAI}
                      disabled={aiFixing}
                      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", border: "none" }}
                    >
                      <Sparkles />
                      {aiFixing ? "🤖 AI analyzing & fixing…" : "✨ Auto-fix with AI"}
                    </Button>
                  </div>
                  {aiFixing && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/>
                      AI is reading the issues and applying optimizations automatically…
                    </div>
                  )}
                </div>
              )}
            </Container>
          )}

          {/* AI Fix results */}
          {fixes.length > 0 && (
            <Container className="p-6">
              <Heading level="h2" className="text-base font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="text-purple-600"/> AI Auto-fix Results
              </Heading>
              <div className="space-y-3">
                {fixes.map((fix, i) => (
                  <div key={i} className={`rounded-xl p-4 border ${
                    fix.status === "done" ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" :
                    fix.status === "failed" ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" :
                    fix.status === "manual" ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" :
                    "bg-ui-bg-subtle border-ui-border-base"
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">
                        {fix.status === "done" ? <CheckCircleSolid className="text-green-600"/> :
                         fix.status === "failed" ? <XCircleSolid className="text-red-600"/> :
                         fix.status === "manual" ? <span>📋</span> : <span>⏳</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-ui-fg-base">{fix.issue}</div>
                        <div className="text-sm text-ui-fg-subtle mt-0.5">{fix.action}</div>
                        {fix.detail && <div className="text-xs text-ui-fg-muted mt-1 font-mono bg-ui-bg-base rounded p-1">{fix.detail}</div>}
                      </div>
                      <Badge color={fix.status === "done" ? "green" : fix.status === "failed" ? "red" : fix.status === "manual" ? "orange" : "grey"}>
                        {fix.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {aiDone && (
                <div className="mt-4 p-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                  ✅ AI auto-fix complete! Run the test again to see the improved scores.
                  <Button variant="secondary" size="small" className="ml-3" onClick={run}>Re-run test</Button>
                </div>
              )}
            </Container>
          )}
        </>
      )}
    </SingleColumnPage>
  )
}
export default Page
