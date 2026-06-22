import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Claude Usage", "استهلاك Claude"), icon: Sparkles, rank: 55 }

type Day = { date: string; spend: number; input: number; output: number }
type Data = { connected: boolean; key_set?: boolean; error?: string; total_spend?: number; total_input?: number; total_output?: number; days?: Day[] }

const money = (v?: any) => "$" + (Number(v) || 0).toFixed(2)
const num = (v?: any) => (Number(v) || 0).toLocaleString("en-US")

const Page = () => {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [keyInput, setKeyInput] = useState("")
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/claude-usage`, { credentials: "include" })
      .then((r) => r.json()).then(setD).catch(() => setD({ connected: false })).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const connect = async () => {
    if (!keyInput.trim()) return
    setSaving(true)
    try {
      await fetch(`${API}/admin/claude-usage`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claude_admin_key: keyInput.trim() }),
      })
      setKeyInput(""); load()
    } finally { setSaving(false) }
  }

  const days = d?.days || []
  const maxSpend = Math.max(0.0001, ...days.map((x) => Number(x.spend) || 0))

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#d97757,#b85c3c)" }}>
            <Sparkles className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Heading level="h1">{tt("Claude Usage", "استهلاك Claude")}</Heading>
              {d?.connected && !d?.error ? <Badge color="green">Live</Badge> : null}
            </div>
            <Text className="text-ui-fg-subtle mt-1">{tt("Official spend & tokens from your Anthropic (Claude) account — last 30 days.", "الصرف والتوكنز الرسمية من حساب Anthropic (Claude) — آخر 30 يومًا.")}</Text>
          </div>
          {d?.connected ? <Button variant="secondary" size="small" onClick={load} disabled={loading}>Refresh</Button> : null}
        </div>
      </Container>

      {loading && !d ? (
        <Container className="p-6"><Text className="text-ui-fg-subtle">Loading…</Text></Container>
      ) : !d?.connected ? (
        <Container className="p-6">
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6 max-w-xl">
            <Heading level="h2">Connect Anthropic billing</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              Reading spend &amp; usage needs an Anthropic <b>Admin Key</b> (<span className="font-mono">sk-ant-admin-…</span>) — your regular Claude key can&apos;t read billing.
            </Text>
            <ol className="text-sm text-ui-fg-subtle mt-3 mb-4 list-decimal pl-5 flex flex-col gap-1">
              <li>Open <a className="text-ui-fg-interactive underline" href="https://console.anthropic.com/settings/admin-keys" target="_blank" rel="noopener">console.anthropic.com → Admin keys</a></li>
              <li>Create an Admin key (<span className="font-mono">sk-ant-admin-…</span>)</li>
              <li>Paste it below &amp; connect</li>
            </ol>
            <Label size="small">Anthropic Admin Key</Label>
            <div className="flex gap-2 mt-1">
              <Input type="password" placeholder="sk-ant-admin-…" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
              <Button onClick={connect} disabled={saving || !keyInput.trim()}>{saving ? "Connecting…" : "Connect"}</Button>
            </div>
            <Text size="xsmall" className="text-ui-fg-muted mt-2">Stored as an encrypted secret, used only to read your usage.</Text>
          </div>
        </Container>
      ) : (
        <>
          {d?.error ? (
            <Container className="p-4"><Text size="small" className="text-ui-fg-error">Anthropic said: {d.error} — check the Admin Key.</Text></Container>
          ) : null}
          <Container className="p-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-card-rest">
              <div className="text-xs text-ui-fg-muted uppercase tracking-wide">Total Spend (30d)</div>
              <div className="text-3xl font-bold mt-1" style={{ color: "#d97757" }}>{money(d.total_spend)}</div>
            </div>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-card-rest">
              <div className="text-xs text-ui-fg-muted uppercase tracking-wide">Input Tokens</div>
              <div className="text-3xl font-bold mt-1 text-ui-fg-base">{num(d.total_input)}</div>
            </div>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-card-rest">
              <div className="text-xs text-ui-fg-muted uppercase tracking-wide">Output Tokens</div>
              <div className="text-3xl font-bold mt-1 text-ui-fg-base">{num(d.total_output)}</div>
            </div>
          </Container>

          <Container className="p-6">
            <Text className="font-semibold mb-3">Daily spend</Text>
            {days.length === 0 ? (
              <Text size="small" className="text-ui-fg-subtle">No Claude usage in the last 30 days.</Text>
            ) : (
              <div>
                <div className="flex items-end gap-1" style={{ height: 180 }}>
                  {days.map((x) => (
                    <div key={x.date} className="flex-1 flex flex-col items-center justify-end" title={`${x.date}: ${money(x.spend)} · ${num(x.input)} in · ${num(x.output)} out`}>
                      <div style={{ width: "100%", maxWidth: 26, height: `${Math.max(2, ((Number(x.spend) || 0) / maxSpend) * 100)}%`, background: "linear-gradient(180deg,#e9a48a,#d97757)", borderRadius: "4px 4px 0 0" }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-ui-fg-muted">
                  <span>{days[0]?.date}</span><span>{days[days.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </Container>
        </>
      )}
    </SingleColumnPage>
  )
}
export default Page
