import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Heading, Text, Badge, StatusBadge, Button, Input, Container } from "@medusajs/ui"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { BoltSolid, Sparkles, ArrowUpRightOnBox, CheckCircleSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Sentry Errors", "أخطاء Sentry"), icon: BoltSolid, rank: 26 }

const SENTRY_ORG = "auto-to-rerntal"
const SENTRY_BASE = `https://sentry.io/organizations/${SENTRY_ORG}`

type Issue = { id: string; title: string; culprit: string; count: string; userCount: number; level: string; firstSeen: string; lastSeen: string; permalink: string; status?: string }
type FixResult = { issue_id: string; title: string; file?: string; status: "fixed"|"manual"|"failed"; recommendation?: string; error?: string }

const LEVEL_COLOR: Record<string, any> = { error: "red", fatal: "red", warning: "orange", info: "blue" }

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`; if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`
}

export default function SentryPage() {
  const [token, setToken]     = useState(() => localStorage.getItem("sentry_token") || "")
  const [issues, setIssues]   = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [fixing, setFixing]   = useState<string|null>(null)
  const [fixAll, setFixAll]   = useState(false)
  const [fixes, setFixes]     = useState<FixResult[]>([])
  const [log, setLog]         = useState<string[]>([])
  const [rebuilding, setRebuilding] = useState(false)
  const [monitors, setMonitors] = useState<any[]>([])
  const [monitorsLoading, setMonitorsLoading] = useState(false)
  const [view, setView] = useState<"issues"|"monitors">("issues")
  const logRef = useRef<HTMLDivElement>(null)

  const fetchIssues = async (tok = token) => {
    if (!tok) return
    setLoading(true); setError(""); setFixes([]); setLog([])
    try {
      const r = await fetch(`${API}/admin/ai/sentry-autofix?token=${encodeURIComponent(tok)}`, { credentials: "include" })
      if (!r.ok) { const d = await r.json(); throw new Error(d.message || "API error") }
      const d = await r.json()
      setIssues(d.issues || [])
      localStorage.setItem("sentry_token", tok)
    } catch(e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchIssues(token); fetchMonitors() }, [])
  useEffect(() => { logRef.current?.scrollIntoView({ behavior: "smooth" }) }, [log])

  const runFix = async (issueId?: string) => {
    if (!token) return
    setFixing(issueId || "all"); setFixes([]); setLog([]); setRebuilding(false)
    try {
      const r = await fetch(`${API}/admin/ai/sentry-autofix`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, issue_id: issueId, fix_all: !issueId }),
      })
      if (!r.body) throw new Error("No stream")
      const reader = r.body.getReader(); const dec = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        const chunk = dec.decode(value, { stream: true })
        for (const line of chunk.split("\n").filter(l => l.startsWith("data: "))) {
          const d = line.slice(6); if (d === "[DONE]") continue
          try {
            const ev = JSON.parse(d)
            if (ev.event === "issue")      setLog(p => [...p, `🔍 Analyzing: ${ev.title}`])
            if (ev.event === "analyzing")  setLog(p => [...p, `📁 Checking files: ${ev.files?.join(", ")}`])
            if (ev.event === "fixed")      setLog(p => [...p, `✅ Fixed: ${ev.file}`])
            if (ev.event === "manual")     setLog(p => [...p, `📋 Manual needed: ${ev.recommendation?.slice(0,100)}`])
            if (ev.event === "failed")     setLog(p => [...p, `❌ Failed: ${ev.error}`])
            if (ev.event === "rebuilding") { setRebuilding(true); setLog(p => [...p, `🔨 Rebuilding storefront...`]) }
            if (ev.event === "rebuilt")    { setRebuilding(false); setLog(p => [...p, `🚀 Deployed! ✅`]) }
            if (ev.event === "done")       { setFixes(ev.fixes || []); setLog(p => [...p, `🏁 Done: ${ev.fixed} fixed, ${ev.manual} manual`]); fetchIssues() }
          } catch {}
        }
      }
    } catch(e: any) { setLog(p => [...p, `❌ Error: ${e.message}`]) }
    finally { setFixing(null) }
  }

  const fetchMonitors = async (tok = token) => {
    if (!tok) return
    setMonitorsLoading(true)
    try {
      const r = await fetch("https://sentry.io/api/0/organizations/auto-to-rerntal/monitors/?project=javascript-nextjs", {
        headers: { "Authorization": `Bearer ${tok}` }
      })
      if (r.ok) { const d = await r.json(); setMonitors(Array.isArray(d) ? d : []) }
    } catch {}
    finally { setMonitorsLoading(false) }
  }

  const hasToken = true  // backend uses the stored Sentry token automatically

  return (
    <SingleColumnPage>
      {/* Header */}
      <Container className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 40, height: 40, background: "#362d59", color: "#fff" }}>
              <svg width="20" height="20" viewBox="0 0 72 66" fill="currentColor"><path d="M29 2.3a5 5 0 0 1 14 0l28.7 49.7a5 5 0 0 1-4.4 7.5H8.7a5 5 0 0 1-4.4-7.5L29 2.3z"/></svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Heading level="h1">Sentry Errors</Heading>
                <StatusBadge color="green">Connected</StatusBadge>
              </div>
              <Text size="small" className="text-ui-fg-subtle">AI auto-fix agent · javascript-nextjs · Qwen2.5-Coder:14b</Text>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="flex rounded-lg border border-ui-border-base overflow-hidden">
              <button onClick={() => setView("issues")} className={`px-3 py-1.5 text-xs font-medium transition ${view==="issues" ? "bg-ui-bg-base-pressed text-ui-fg-base" : "text-ui-fg-subtle hover:bg-ui-bg-base-hover"}`}>Errors</button>
              <button onClick={() => { setView("monitors"); fetchMonitors() }} className={`px-3 py-1.5 text-xs font-medium transition ${view==="monitors" ? "bg-ui-bg-base-pressed text-ui-fg-base" : "text-ui-fg-subtle hover:bg-ui-bg-base-hover"}`}>Monitors</button>
            </div>
            <Button variant="secondary" size="small" onClick={() => fetchIssues()} disabled={loading} isLoading={loading}>Refresh</Button>
            <Button variant="primary" size="small" disabled={!!fixing || issues.length === 0} onClick={() => runFix()} isLoading={fixing === "all"}><Sparkles /> Fix all {issues.length}</Button>
            <a href={`${SENTRY_BASE}/issues/`} target="_blank" rel="noopener"><Button variant="secondary" size="small"><ArrowUpRightOnBox /> Open Sentry</Button></a>
          </div>
        </div>
        {issues.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem", marginTop: "1.25rem" }}>
            {[
              { label: "Errors", value: issues.filter(i=>i.level==="error"||i.level==="fatal").length, c: "#dc2626" },
              { label: "Warnings", value: issues.filter(i=>i.level==="warning").length, c: "#ea580c" },
              { label: "Total unresolved", value: issues.length, c: "#2563eb" },
            ].map(k => (
              <div key={k.label} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
                <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full" style={{ background: k.c }} /><span className="text-xs font-medium text-ui-fg-subtle">{k.label}</span></div>
                <div className="text-2xl font-semibold text-ui-fg-base mt-1.5 tabular-nums">{k.value}</div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {!issues.length && !loading && (
        <Container className="p-6">
          <Text size="small" className="font-medium mb-1.5 block">Sentry API Token</Text>
          <div className="flex items-end gap-3 max-w-2xl">
            <div className="flex-1">
              <Input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="sntrys_… or sntr_…" dir="ltr" onKeyDown={e => e.key === "Enter" && fetchIssues(token)}/>
            </div>
            <Button onClick={() => fetchIssues(token)} disabled={!token || loading} isLoading={loading}>Connect</Button>
          </div>
          {error && <Text size="small" className="text-ui-fg-error mt-2">{error}</Text>}
          <Text size="xsmall" className="text-ui-fg-muted mt-2">Get token: <a href="https://sentry.io/settings/account/api/auth-tokens/" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">sentry.io → Auth Tokens</a> — needs <code className="bg-ui-bg-subtle px-1 rounded text-xs">project:read project:write</code>.</Text>
        </Container>
      )}

      {log.length > 0 && (
        <Container className="p-6">
          <Text size="small" className="font-semibold mb-2 flex items-center gap-2"><Sparkles /> AI Agent Log {rebuilding && <div className="w-4 h-4 border-2 border-ui-border-strong border-t-transparent rounded-full animate-spin"/>}</Text>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
            {log.map((l, i) => <div key={i} className="text-ui-fg-base">{l}</div>)}
            <div ref={logRef}/>
          </div>
        </Container>
      )}

      {view === "issues" && issues.length > 0 && (
        <Container className="divide-y p-0">
          {issues.map(issue => {
            const fixResult = fixes.find(f => f.issue_id === issue.id)
            return (
              <div key={issue.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge color={issue.level==="error"||issue.level==="fatal" ? "red" : issue.level==="warning" ? "orange" : "blue"}>{issue.level}</StatusBadge>
                    {fixResult?.status === "fixed" && <StatusBadge color="green">Fixed by AI</StatusBadge>}
                    {fixResult?.status === "manual" && <StatusBadge color="orange">Manual needed</StatusBadge>}
                    <a href={issue.permalink} target="_blank" rel="noopener" className="font-medium text-sm text-ui-fg-base hover:text-ui-fg-interactive truncate">{issue.title}</a>
                  </div>
                  <Text size="xsmall" className="text-ui-fg-subtle truncate font-mono">{issue.culprit}</Text>
                  {fixResult?.file && <Text size="xsmall" className="text-ui-fg-interactive mt-0.5">{fixResult.file}</Text>}
                  {fixResult?.recommendation && <Text size="xsmall" className="text-ui-fg-subtle mt-1">{fixResult.recommendation.slice(0,150)}</Text>}
                </div>
                <div className="shrink-0 text-right">
                  <Text size="xsmall" className="text-ui-fg-muted tabular-nums">{Number(issue.count).toLocaleString()} events</Text>
                  <Text size="xsmall" className="text-ui-fg-muted">{ago(issue.lastSeen)}</Text>
                </div>
                {!fixResult && (
                  <Button size="small" variant="secondary" disabled={!!fixing} isLoading={fixing === issue.id} onClick={() => runFix(issue.id)}><Sparkles /> Fix</Button>
                )}
              </div>
            )
          })}
        </Container>
      )}

      {view === "issues" && !loading && issues.length === 0 && token && !error && (
        <Container className="p-6">
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <CheckCircleSolid className="text-ui-tag-green-icon" />
            <Text className="font-medium text-ui-fg-base">No unresolved issues</Text>
            <Text size="small" className="text-ui-fg-subtle">Your app is error-free. 🎉</Text>
          </div>
        </Container>
      )}

      {view === "monitors" && (
        <Container className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Heading level="h2" className="text-base">Cron &amp; Uptime Monitors</Heading>
              <Text size="small" className="text-ui-fg-subtle">Scheduled job &amp; uptime checks reported to Sentry.</Text>
            </div>
            <Button variant="secondary" size="small" onClick={() => fetchMonitors()} disabled={monitorsLoading} isLoading={monitorsLoading}>Refresh</Button>
          </div>
          {monitors.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle py-6 text-center">No monitors configured.</Text>
          ) : (
            <div className="divide-y">
              {monitors.map((m) => (
                <div key={m.slug || m.id} className="flex items-center justify-between py-3">
                  <Text size="small" className="font-medium">{m.name || m.slug}</Text>
                  <StatusBadge color={m.status==="ok" ? "green" : m.status==="error" ? "red" : "orange"}>{m.status || "unknown"}</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </Container>
      )}
    </SingleColumnPage>
  )
}
