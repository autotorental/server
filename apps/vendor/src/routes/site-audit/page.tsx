import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { ShieldCheck } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Site Audit", icon: ShieldCheck }

type Issue = { severity: "error" | "warning" | "notice"; category: string; title: string; detail: string; fix: string }
type Audit = { score: number; grade: string; counts: { error: number; warning: number; notice: number }; cars_total: number; cars_active: number; issues: Issue[]; generated_at: string }

const sevMeta: Record<string, { label: string; color: string; dot: string }> = {
  error: { label: "Error", color: "#dc2626", dot: "🔴" },
  warning: { label: "Warning", color: "#d97706", dot: "🟠" },
  notice: { label: "Notice", color: "#2563eb", dot: "🔵" },
}
const scoreColor = (n: number) => (n >= 85 ? "#16a34a" : n >= 65 ? "#65a30d" : n >= 40 ? "#d97706" : "#dc2626")

const Page = () => {
  const [data, setData] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "error" | "warning" | "notice">("all")

  const load = () => {
    setLoading(true); setErr(null)
    fetch(`${API}/vendor/audit`, { credentials: "include" })
      .then(async (r) => { if (!r.ok) { setErr(`HTTP ${r.status}`); return null } return r.json() })
      .then((d) => { if (d) setData(d) }).catch((e) => setErr(String((e && e.message) || e))).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const shown = useMemo(() => (data?.issues || []).filter((i) => filter === "all" || i.severity === filter), [data, filter])

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck /><Heading level="h1" className="text-2xl font-semibold">Site Audit</Heading>
          </div>
          <Button variant="secondary" size="small" onClick={load} disabled={loading}>{loading ? "Scanning…" : "Re-scan"}</Button>
        </div>
        <Text className="text-ui-fg-subtle mt-1">Your private listing & SEO health report — fix these to rank higher and get more leads.</Text>
      </Container>

      {loading && !data ? (
        <Container className="p-6"><Text className="text-ui-fg-muted">Scanning your profile and listings…</Text></Container>
      ) : !data ? (
        <Container className="p-6">
          <Text className="text-ui-fg-error">Could not load your audit{err ? ` (${err})` : ""}. If you just signed in, please retry.</Text>
          <Button variant="secondary" size="small" className="mt-3" onClick={load} disabled={loading}>{loading ? "Retrying\u2026" : "Retry"}</Button>
        </Container>
      ) : (
        <>
          <Container className="p-6">
            <div className="grid md:grid-cols-[200px_1fr] gap-6 items-center">
              {/* score gauge */}
              <div className="flex flex-col items-center">
                <div className="relative w-36 h-36 rounded-full flex items-center justify-center"
                  style={{ background: `conic-gradient(${scoreColor(data.score)} ${data.score * 3.6}deg, var(--bg-subtle,#e5e7eb) 0deg)` }}>
                  <div className="absolute inset-2.5 rounded-full bg-ui-bg-base flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold tabular-nums" style={{ color: scoreColor(data.score) }}>{data.score}</span>
                    <span className="text-[11px] text-ui-fg-muted">/ 100</span>
                  </div>
                </div>
                <div className="mt-2 font-semibold" style={{ color: scoreColor(data.score) }}>{data.grade}</div>
              </div>
              {/* severity cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["error", "warning", "notice"] as const).map((sev) => (
                  <button key={sev} onClick={() => setFilter(sev)}
                    className={`rounded-xl border p-4 text-center transition ${filter === sev ? "border-ui-border-interactive" : "border-ui-border-base"}`}>
                    <div className="text-2xl font-bold tabular-nums" style={{ color: sevMeta[sev].color }}>{data.counts[sev]}</div>
                    <div className="text-xs text-ui-fg-subtle mt-0.5">{sevMeta[sev].dot} {sevMeta[sev].label}s</div>
                  </button>
                ))}
                <div className="rounded-xl border border-ui-border-base p-4 text-center">
                  <div className="text-2xl font-bold tabular-nums">{data.cars_active}/{data.cars_total}</div>
                  <div className="text-xs text-ui-fg-subtle mt-0.5">🚗 Active cars</div>
                </div>
              </div>
            </div>
          </Container>

          <Container className="p-6">
            <div className="flex items-center gap-2 mb-4">
              {(["all", "error", "warning", "notice"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === f ? "bg-ui-bg-base-hover" : "text-ui-fg-subtle"}`}>
                  {f === "all" ? `All (${data.issues.length})` : `${sevMeta[f].label}s (${data.counts[f]})`}
                </button>
              ))}
            </div>

            {shown.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-3xl mb-2">🎉</div>
                <Text weight="plus">All clear here!</Text>
                <Text size="small" className="text-ui-fg-muted">No issues in this category. Great job.</Text>
              </div>
            ) : (
              <div className="space-y-2.5">
                {shown.map((it, i) => (
                  <div key={i} className="rounded-xl border border-ui-border-base p-4 flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5">{sevMeta[it.severity].dot}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text weight="plus">{it.title}</Text>
                        <Badge size="2xsmall" color="grey">{it.category}</Badge>
                      </div>
                      <Text size="small" className="text-ui-fg-subtle mt-0.5">{it.detail}</Text>
                      <Text size="small" className="mt-1.5" style={{ color: "var(--fg-interactive,#2563eb)" }}>✅ Fix: {it.fix}</Text>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Text size="small" className="text-ui-fg-muted mt-5 block">Last scanned: {new Date(data.generated_at).toLocaleString()}</Text>
          </Container>
        </>
      )}
    </SingleColumnPage>
  )
}
export default Page
