import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Text, Button, Badge, Input, Label, toast } from "@medusajs/ui"
import { RocketLaunch } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Ads", icon: RocketLaunch, rank: 6 }

type Camp = {
  id: string; name: string; platforms: string[]; target_type: string; budget: number; spend: number
  commission_pct: number; status: string; impressions: number; clicks: number; reach: number; leads: number
  reject_reason?: string | null; created_at: string
}
const PLATFORMS = [
  { k: "instagram", n: "Instagram" }, { k: "facebook", n: "Facebook" }, { k: "tiktok", n: "TikTok" },
  { k: "snapchat", n: "Snapchat" }, { k: "google", n: "Google" },
]
const STATUS: Record<string, { label: string; color: "grey" | "orange" | "blue" | "green" | "red" | "purple" }> = {
  pending_review: { label: "In review", color: "orange" }, approved: { label: "Approved", color: "blue" },
  active: { label: "Active", color: "green" }, paused: { label: "Paused", color: "orange" },
  completed: { label: "Completed", color: "purple" }, rejected: { label: "Rejected", color: "red" },
}
const money = (n: number) => `AED ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const box: React.CSSProperties = { border: "1px solid var(--border-base)", borderRadius: 12, padding: 16 }
const PRESETS = [100, 250, 500, 1000]

export default function Page() {
  const [balance, setBalance] = useState(0)
  const [camps, setCamps] = useState<Camp[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  // create form
  const [name, setName] = useState("")
  const [sel, setSel] = useState<string[]>(["instagram"])
  const [target, setTarget] = useState("store")
  const [budget, setBudget] = useState("")
  const [topup, setTopup] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/vendor/ads`, { credentials: "include" })
      const d = await r.json()
      setBalance(d.wallet?.balance || 0); setCamps(d.campaigns || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (typeof window !== "undefined" && /[?&]topup=done/.test(window.location.search)) {
      toast.success("Payment received — updating your balance…")
      const t = setTimeout(load, 2500) // wallet is credited by the Mollie webhook
      try { window.history.replaceState({}, "", window.location.pathname) } catch {}
      return () => clearTimeout(t)
    }
  }, [])

  const addFunds = async (amt: number) => {
    if (!amt || amt < 1) return
    setBusy(true)
    try {
      const r = await fetch(`${API}/vendor/ads/wallet`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.message || "failed")
      if (d.checkout_url) { toast.success("Redirecting to secure payment…"); window.location.href = d.checkout_url; return }
      setBalance(d.balance); setTopup(""); toast.success("Funds added")
    } catch (e: any) { toast.error(e?.message || "Top-up failed") } finally { setBusy(false) }
  }

  const create = async () => {
    const b = Math.round(Number(budget) || 0)
    if (!name.trim()) return toast.error("Enter a campaign name")
    if (!sel.length) return toast.error("Pick at least one platform")
    if (b < 50) return toast.error("Minimum budget is AED 50")
    if (b > balance) return toast.error(`Add funds first — balance ${money(balance)}`)
    setBusy(true)
    try {
      const r = await fetch(`${API}/vendor/ads`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), platforms: sel, target_type: target, budget: b }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.message || "failed")
      setName(""); setBudget(""); toast.success("Ad submitted — our team will review & activate it. You'll be notified on every update.")
      await load()
    } catch (e: any) { toast.error(e?.message || "Could not create ad") } finally { setBusy(false) }
  }

  const action = async (id: string, act: "pause" | "resume") => {
    setBusy(true)
    try {
      const r = await fetch(`${API}/vendor/ads/${id}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: act }) })
      if (!r.ok) throw new Error((await r.json())?.message || "failed")
      await load()
    } catch (e: any) { toast.error(e?.message || "Action failed") } finally { setBusy(false) }
  }

  return (
    <Container className="p-0">
      <div style={{ padding: 20, display: "grid", gap: 18, maxWidth: 920 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RocketLaunch />
          <Heading level="h1">Advertise your cars</Heading>
        </div>

        {/* Wallet */}
        <div style={{ ...box, background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "#fff", border: "none" }}>
          <Text style={{ color: "rgba(255,255,255,.85)", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>Ad balance</Text>
          <div style={{ fontSize: 30, fontWeight: 900, margin: "6px 0 12px" }}>{money(balance)}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {PRESETS.map((p) => <Button key={p} size="small" variant="secondary" disabled={busy} onClick={() => addFunds(p)}>+{p}</Button>)}
            <Input value={topup} onChange={(e) => setTopup(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Custom" style={{ width: 110 }} />
            <Button size="small" disabled={busy} onClick={() => addFunds(Math.round(Number(topup) || 0))}>Add funds</Button>
          </div>
        </div>

        {/* Create */}
        <div style={box}>
          <Heading level="h3" className="mb-3">Create a campaign</Heading>
          <div style={{ display: "grid", gap: 12 }}>
            <div><Label size="small">Campaign name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer offers" /></div>
            <div>
              <Label size="small">Where to advertise</Label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {PLATFORMS.map((p) => {
                  const on = sel.includes(p.k)
                  return <Button key={p.k} size="small" variant={on ? "primary" : "secondary"} onClick={() => setSel((s) => on ? s.filter((x) => x !== p.k) : [...s, p.k])}>{p.n}</Button>
                })}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <Label size="small">Ad drives to</Label>
                <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full mt-1.5 px-3 py-2 rounded-lg border border-ui-border-base bg-ui-bg-field text-sm">
                  <option value="store">My store</option><option value="car">A specific car</option><option value="whatsapp">WhatsApp</option>
                </select>
              </div>
              <div><Label size="small">Budget (AED)</Label><Input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))} placeholder="500" /></div>
            </div>
            <Text size="small" className="text-ui-fg-subtle">Charged from your wallet on submit · fully refunded if rejected · our team activates it.</Text>
            <Button disabled={busy} onClick={create}>🚀 Launch ad</Button>
          </div>
        </div>

        {/* My ads */}
        <div>
          <Heading level="h3" className="mb-3">My ads</Heading>
          {loading ? <Text className="text-ui-fg-subtle">Loading…</Text> : camps.length === 0 ? (
            <div style={{ ...box, textAlign: "center", padding: 36 }}><Text className="text-ui-fg-subtle">No ads yet — create your first campaign above.</Text></div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {camps.map((c) => {
                const st = STATUS[c.status] || STATUS.pending_review
                const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0"
                return (
                  <div key={c.id} style={box}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Text weight="plus">{c.name}</Text><Badge color={st.color} size="2xsmall">{st.label}</Badge>
                      </div>
                      {c.status === "active" && <Button size="small" variant="secondary" disabled={busy} onClick={() => action(c.id, "pause")}>Pause</Button>}
                      {c.status === "paused" && <Button size="small" disabled={busy} onClick={() => action(c.id, "resume")}>Resume</Button>}
                    </div>
                    <Text size="small" className="text-ui-fg-subtle mt-1">{(c.platforms || []).join(", ")} · {money(c.budget)} budget</Text>
                    {c.status === "rejected" && c.reject_reason && <Text size="small" style={{ color: "#b91c1c", marginTop: 4 }}>Reason: {c.reject_reason} (budget refunded)</Text>}
                    <div style={{ display: "flex", gap: 20, marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-base)" }}>
                      <Stat label="Impressions" value={c.impressions.toLocaleString()} />
                      <Stat label="Clicks" value={c.clicks.toLocaleString()} />
                      <Stat label="CTR" value={`${ctr}%`} />
                      <Stat label="Reach" value={c.reach.toLocaleString()} />
                      <Stat label="Spend" value={money(c.spend)} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return <div><div style={{ fontWeight: 800, fontSize: 15 }}>{value}</div><Text size="xsmall" className="text-ui-fg-subtle">{label}</Text></div>
}
