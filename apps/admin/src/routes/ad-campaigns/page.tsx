import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Text, Button, Badge, Input, Label, Textarea, Drawer, toast } from "@medusajs/ui"
import { RocketLaunch } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Ads Manager", "إدارة الإعلانات"), icon: RocketLaunch, rank: 12 }

type Camp = {
  id: string; name: string; seller_name?: string; seller_email?: string; platforms: string[]
  target_type: string; budget: number; spend: number; commission_pct: number; status: string
  impressions: number; clicks: number; reach: number; leads: number
  reject_reason?: string | null; admin_note?: string | null; created_at: string; activated_at?: string | null
}

const STATUS: Record<string, { label: string; color: "grey" | "orange" | "blue" | "green" | "red" | "purple" }> = {
  pending_review: { label: tt("In review", "قيد المراجعة"), color: "orange" },
  approved: { label: tt("Approved", "موافَق"), color: "blue" },
  active: { label: tt("Active", "نشط"), color: "green" },
  paused: { label: tt("Paused", "متوقف"), color: "orange" },
  completed: { label: tt("Completed", "مكتمل"), color: "purple" },
  rejected: { label: tt("Rejected", "مرفوض"), color: "red" },
}
const ORDER = ["pending_review", "approved", "active", "paused", "completed", "rejected"]
const money = (n: number) => `AED ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
const box: React.CSSProperties = { border: "1px solid var(--border-base)", borderRadius: 10, padding: 14 }

export default function Page() {
  const [rows, setRows] = useState<Camp[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Camp | null>(null)
  const [busy, setBusy] = useState(false)
  // edit fields
  const [commission, setCommission] = useState("")
  const [impressions, setImpressions] = useState("")
  const [clicks, setClicks] = useState("")
  const [reach, setReach] = useState("")
  const [leads, setLeads] = useState("")
  const [spend, setSpend] = useState("")
  const [reason, setReason] = useState("")

  const load = async () => {
    setLoading(true)
    const qs = filter ? `?status=${filter}` : ""
    const r = await fetch(`${API}/admin/ad-campaigns${qs}`, { credentials: "include" })
    const d = await r.json()
    setRows(d.campaigns || [])
    setSummary(d.summary || {})
    setLoading(false)
  }
  useEffect(() => { load() }, [filter])

  const openDrawer = (c: Camp) => {
    setSel(c)
    setCommission(String(c.commission_pct || ""))
    setImpressions(String(c.impressions || ""))
    setClicks(String(c.clicks || ""))
    setReach(String(c.reach || ""))
    setLeads(String(c.leads || ""))
    setSpend(String(c.spend || ""))
    setReason("")
  }

  const save = async (status?: string) => {
    if (!sel) return
    if (status === "rejected" && !reason.trim()) { toast.error(tt("Add a reject reason", "اكتب سبب الرفض")); return }
    setBusy(true)
    try {
      const body: any = {
        commission_pct: Number(commission) || 0,
        impressions: Number(impressions) || 0,
        clicks: Number(clicks) || 0,
        reach: Number(reach) || 0,
        leads: Number(leads) || 0,
        spend: Number(spend) || 0,
      }
      if (status) body.status = status
      if (status === "rejected") body.reject_reason = reason.trim()
      const r = await fetch(`${API}/admin/ad-campaigns/${sel.id}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.message || "failed")
      toast.success(status ? tt("Status updated — vendor notified by email + push", "تم تحديث الحالة — أُشعِر البائع بالإيميل + إشعار") : tt("Saved", "تم الحفظ"))
      setSel(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Error")
    } finally { setBusy(false) }
  }

  return (
    <Container className="p-0">
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <RocketLaunch />
          <Heading level="h1">{tt("Ads Manager", "إدارة الإعلانات")}</Heading>
        </div>
        <Text className="text-ui-fg-subtle" size="small">
          {tt("Review vendor ad campaigns, set your commission, run them, and enter results. Every status change emails + pushes the vendor.",
              "راجع حملات البائعين، حدّد عمولتك، شغّلها، وأدخِل النتائج. كل تغيير حالة يرسل إيميل + إشعار للبائع.")}
        </Text>

        {/* Summary + filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
          <Button variant={filter === "" ? "primary" : "secondary"} size="small" onClick={() => setFilter("")}>
            {tt("All", "الكل")} ({Object.values(summary).reduce((a, b) => a + b, 0)})
          </Button>
          {ORDER.map((s) => (
            <Button key={s} variant={filter === s ? "primary" : "secondary"} size="small" onClick={() => setFilter(s)}>
              {STATUS[s].label} ({summary[s] || 0})
            </Button>
          ))}
        </div>

        {loading ? (
          <Text className="text-ui-fg-subtle">{tt("Loading…", "جارٍ التحميل…")}</Text>
        ) : rows.length === 0 ? (
          <div style={{ ...box, textAlign: "center", padding: 40 }}>
            <Text className="text-ui-fg-subtle">{tt("No campaigns", "لا توجد حملات")}</Text>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((c) => {
              const st = STATUS[c.status] || STATUS.pending_review
              const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0"
              return (
                <div key={c.id} style={{ ...box, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }} onClick={() => openDrawer(c)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Text weight="plus" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{c.name}</Text>
                      <Badge color={st.color} size="2xsmall">{st.label}</Badge>
                    </div>
                    <Text size="small" className="text-ui-fg-subtle">{c.seller_name || c.seller_email || "—"} · {(c.platforms || []).join(", ")}</Text>
                  </div>
                  <div style={{ display: "flex", gap: 18, textAlign: "center", flexShrink: 0 }}>
                    <Stat label={tt("Budget", "الميزانية")} value={money(c.budget)} />
                    <Stat label={tt("Spent", "المنفق")} value={money(c.spend)} />
                    <Stat label="Impr." value={c.impressions.toLocaleString()} />
                    <Stat label="CTR" value={`${ctr}%`} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Management drawer */}
      <Drawer open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <Drawer.Content>
          <Drawer.Header><Drawer.Title>{sel?.name}</Drawer.Title></Drawer.Header>
          <Drawer.Body style={{ overflowY: "auto" }}>
            {sel && (
              <div style={{ display: "grid", gap: 16 }}>
                <div>
                  <Text size="small" className="text-ui-fg-subtle">{tt("Vendor", "البائع")}: {sel.seller_name} ({sel.seller_email})</Text>
                  <Text size="small" className="text-ui-fg-subtle">{tt("Platforms", "المنصات")}: {(sel.platforms || []).join(", ")} · {tt("Target", "الهدف")}: {sel.target_type}</Text>
                  <Text size="small" className="text-ui-fg-subtle">{tt("Budget", "الميزانية")}: {money(sel.budget)}</Text>
                </div>

                <div>
                  <Label size="small">{tt("Status actions (notifies vendor)", "إجراءات الحالة (تُشعِر البائع)")}</Label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <Button size="small" variant="secondary" disabled={busy} onClick={() => save("approved")}>✅ {tt("Approve", "موافقة")}</Button>
                    <Button size="small" variant="primary" disabled={busy} onClick={() => save("active")}>🚀 {tt("Run / Activate", "تشغيل")}</Button>
                    <Button size="small" variant="secondary" disabled={busy} onClick={() => save("paused")}>⏸️ {tt("Pause", "إيقاف")}</Button>
                    <Button size="small" variant="secondary" disabled={busy} onClick={() => save("completed")}>🎉 {tt("Complete", "إكمال")}</Button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Field label={tt("Commission %", "العمولة %")} value={commission} onChange={setCommission} />
                  <Field label={tt("Spend (AED)", "المنفق (درهم)")} value={spend} onChange={setSpend} />
                  <Field label={tt("Impressions", "الظهور")} value={impressions} onChange={setImpressions} />
                  <Field label={tt("Clicks", "النقرات")} value={clicks} onChange={setClicks} />
                  <Field label={tt("Reach", "الوصول")} value={reach} onChange={setReach} />
                  <Field label={tt("Leads", "العملاء")} value={leads} onChange={setLeads} />
                </div>

                <div>
                  <Label size="small">{tt("Reject reason (for rejection)", "سبب الرفض (عند الرفض)")}</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tt("Why was this rejected?", "لماذا رُفض؟")} rows={2} />
                  <Button size="small" variant="danger" disabled={busy} onClick={() => save("rejected")} style={{ marginTop: 8 }}>
                    ⛔ {tt("Reject + refund budget", "رفض + إرجاع الميزانية")}
                  </Button>
                </div>
              </div>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Button variant="secondary" onClick={() => setSel(null)}>{tt("Close", "إغلاق")}</Button>
            <Button disabled={busy} onClick={() => save()}>{tt("Save metrics", "حفظ المقاييس")}</Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Text size="small" weight="plus">{value}</Text>
      <Text size="xsmall" className="text-ui-fg-subtle">{label}</Text>
    </div>
  )
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label size="small">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} />
    </div>
  )
}
