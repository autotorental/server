import { useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge, toast } from "@medusajs/ui"
import { CurrencyDollar } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Profit Calculator", "حاسبة الأرباح"), icon: CurrencyDollar, rank: 29 }

type Cfg = { currency: string; server_cost: number; ai_cost: number; other_cost: number; price_per_sub: number; subscribers_override: number | null; growth_per_month: number }
type Live = { vendors: number; active_subscribers: number; trial_subscribers: number; customers: number }

const SYM: Record<string, string> = { USD: "$", AED: "AED ", EUR: "€", GBP: "£", SAR: "SAR " }

const Page = () => {
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [live, setLive] = useState<Live | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/finance`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setCfg(d.config); setLive(d.live) } })
  }, [])

  const set = (k: keyof Cfg, v: any) => setCfg((c) => (c ? { ...c, [k]: v } : c))
  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v) || 0))

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    try {
      await fetch(`${API}/admin/finance`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) })
      toast.success("Saved", { description: "Your finance assumptions are stored." })
    } finally { setSaving(false) }
  }

  const calc = useMemo(() => {
    if (!cfg || !live) return null
    const sym = SYM[cfg.currency] || "$"
    const subs = cfg.subscribers_override != null && cfg.subscribers_override !== ("" as any) ? Number(cfg.subscribers_override) : live.active_subscribers
    const costs = Number(cfg.server_cost) + Number(cfg.ai_cost) + Number(cfg.other_cost)
    const revenue = subs * Number(cfg.price_per_sub)
    const profit = revenue - costs
    const breakEven = cfg.price_per_sub > 0 ? Math.ceil(costs / Number(cfg.price_per_sub)) : 0
    // 12-month projection: add growth_per_month subscribers each month
    let cum = 0, s = subs
    const months: { m: number; subs: number; profit: number; cum: number }[] = []
    for (let m = 1; m <= 12; m++) {
      const rev = s * Number(cfg.price_per_sub)
      const p = rev - costs
      cum += p
      months.push({ m, subs: s, profit: p, cum })
      s += Number(cfg.growth_per_month)
    }
    const fmt = (n: number) => sym + Math.round(n).toLocaleString()
    return { sym, subs, costs, revenue, profit, breakEven, months, yearProfit: cum, fmt }
  }, [cfg, live])

  if (!cfg || !live || !calc) {
    return <SingleColumnPage><Container className="p-6"><Text className="text-ui-fg-muted">Loading calculator…</Text></Container></SingleColumnPage>
  }

  const f = calc.fmt
  const kpis = [
    { label: "Monthly revenue", value: f(calc.revenue), c: "#2563eb" },
    { label: "Monthly costs", value: f(calc.costs), c: "#ea580c" },
    { label: "Monthly profit", value: f(calc.profit), c: calc.profit >= 0 ? "#16a34a" : "#dc2626" },
    { label: "Yearly profit", value: f(calc.yearProfit), c: calc.yearProfit >= 0 ? "#16a34a" : "#dc2626" },
  ]

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: "#16a34a16", color: "#16a34a" }}><CurrencyDollar /></div>
          <div>
            <Heading level="h1">Profit calculator</Heading>
            <Text size="small" className="text-ui-fg-subtle">Model your monthly &amp; yearly income — costs vs subscriber revenue.</Text>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem", marginTop: "1.25rem" }}>
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full" style={{ background: k.c }} /><span className="text-xs font-medium text-ui-fg-subtle">{k.label}</span></div>
              <div className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color: k.c }}>{k.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-2.5 text-sm text-ui-fg-subtle flex flex-wrap gap-x-5 gap-y-1">
          <span>🏢 Vendors: <strong className="text-ui-fg-base">{live.vendors}</strong></span>
          <span>✅ Active subs: <strong className="text-ui-fg-base">{live.active_subscribers}</strong></span>
          <span>🆓 Trials: <strong className="text-ui-fg-base">{live.trial_subscribers}</strong></span>
          <span>🧍 Customers: <strong className="text-ui-fg-base">{live.customers}</strong></span>
          <span>⚖️ Break-even at <strong className="text-ui-fg-base">{calc.breakEven}</strong> subscribers</span>
        </div>
      </Container>

      <Container className="p-6">
        <Heading level="h2" className="text-base mb-4">Your numbers</Heading>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <div><Label size="small">Subscribers (paying)</Label><Input type="number" value={cfg.subscribers_override ?? calc.subs} onChange={(e) => set("subscribers_override", e.target.value === "" ? null : num(e.target.value))} /><Text size="xsmall" className="text-ui-fg-muted mt-1">Live active = {live.active_subscribers}. Override to project.</Text></div>
          <div><Label size="small">Price / subscriber / month ({calc.sym.trim()})</Label><Input type="number" value={cfg.price_per_sub} onChange={(e) => set("price_per_sub", num(e.target.value))} /></div>
          <div><Label size="small">New subscribers / month (growth)</Label><Input type="number" value={cfg.growth_per_month} onChange={(e) => set("growth_per_month", num(e.target.value))} /></div>
          <div><Label size="small">Server cost / month ({calc.sym.trim()})</Label><Input type="number" value={cfg.server_cost} onChange={(e) => set("server_cost", num(e.target.value))} /></div>
          <div><Label size="small">AI server cost / month ({calc.sym.trim()})</Label><Input type="number" value={cfg.ai_cost} onChange={(e) => set("ai_cost", num(e.target.value))} /></div>
          <div><Label size="small">Other costs / month ({calc.sym.trim()})</Label><Input type="number" value={cfg.other_cost} onChange={(e) => set("other_cost", num(e.target.value))} /></div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={save} isLoading={saving}>Save assumptions</Button>
          <Badge color={calc.profit >= 0 ? "green" : "red"}>{calc.profit >= 0 ? "Profitable" : "Below break-even"}</Badge>
        </div>
      </Container>

      <Container className="p-6">
        <Heading level="h2" className="text-base mb-1">12-month projection</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Adding {cfg.growth_per_month} subscriber{cfg.growth_per_month === 1 ? "" : "s"} each month.</Text>
        <div className="rounded-xl border border-ui-border-base overflow-hidden">
          <div className="grid grid-cols-4 bg-ui-bg-subtle px-4 py-2.5 text-xs font-semibold text-ui-fg-subtle uppercase tracking-wide"><div>Month</div><div className="text-right">Subscribers</div><div className="text-right">Net / month</div><div className="text-right">Cumulative</div></div>
          {calc.months.map((m) => (
            <div key={m.m} className="grid grid-cols-4 px-4 py-2 text-sm border-t border-ui-border-base tabular-nums">
              <div className="text-ui-fg-subtle">Month {m.m}</div>
              <div className="text-right">{m.subs}</div>
              <div className="text-right" style={{ color: m.profit >= 0 ? "#16a34a" : "#dc2626" }}>{f(m.profit)}</div>
              <div className="text-right font-semibold" style={{ color: m.cum >= 0 ? "#16a34a" : "#dc2626" }}>{f(m.cum)}</div>
            </div>
          ))}
          <div className="grid grid-cols-4 px-4 py-3 text-sm border-t-2 border-ui-border-strong bg-ui-bg-subtle tabular-nums font-semibold">
            <div>Year 1 total</div><div className="text-right">{calc.months[11].subs} subs</div><div></div><div className="text-right" style={{ color: calc.yearProfit >= 0 ? "#16a34a" : "#dc2626" }}>{f(calc.yearProfit)}</div>
          </div>
        </div>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
