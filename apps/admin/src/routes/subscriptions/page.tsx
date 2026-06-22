import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button, Input, Label, Select, FocusModal } from "@medusajs/ui"
import { CurrencyDollar, PencilSquare } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Subscriptions", "الاشتراكات"), icon: CurrencyDollar, rank: 53 }

type Sub = {
  id: string
  name: string
  handle?: string
  logo?: string
  effective_status: "trial" | "active" | "expired" | "canceled"
  subscription_status: string
  trial_started_at?: string
  trial_ends_at?: string
  subscription_ends_at?: string
  subscription_plan?: string
  days_left: number
  created_at?: string
}

const PLANS = [
  { id: "free", label: "Free", days: 365 },
  { id: "cash", label: "Paid By Cash", days: 365 },
  { id: "link", label: "Paid By Link", days: 365 },
  { id: "owner", label: "Listed By Owner", days: 365 },
  { id: "pos", label: "Paid By POS Machine", days: 365 },
]
const planLabel = (id?: string) => PLANS.find((p) => p.id === id)?.label || "—"

const STATUS_BADGE: Record<string, "green" | "blue" | "red" | "grey" | "orange"> = {
  trial: "blue", active: "green", expired: "red", canceled: "grey",
}
const STATUS_LABEL: Record<string, string> = {
  trial: "On trial", active: "Subscribed", expired: "Expired", canceled: "Canceled",
}

const ManageModal = ({ sub, onClose, onSaved }: { sub: Sub; onClose: () => void; onSaved: () => void }) => {
  const [plan, setPlan] = useState(sub.subscription_plan || "free")
  const [extendDays, setExtendDays] = useState(30)
  const [saving, setSaving] = useState(false)

  const markPaid = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/admin/subscriptions/${sub.id}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_plan: plan, extend_days: extendDays }),
      })
      onSaved()
    } finally { setSaving(false) }
  }

  const cancel = async () => {
    if (!confirm(`Cancel subscription for ${sub.name}? Their cars will be hidden from storefront.`)) return
    setSaving(true)
    try {
      await fetch(`${API}/admin/subscriptions/${sub.id}`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription_status: "canceled" }),
      })
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 flex flex-col gap-5 max-w-lg mx-auto w-full">
      <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 flex items-center gap-3">
        <div className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, background: "white", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          {sub.logo ? <img src={sub.logo} alt="" style={{ width: 48, height: 48, objectFit: "cover" }} /> : <span style={{ fontSize: 22 }}>🏢</span>}
        </div>
        <div className="min-w-0">
          <Heading level="h2" className="truncate">{sub.name}</Heading>
          <div className="flex items-center gap-2 mt-1">
            <Badge size="2xsmall" color={STATUS_BADGE[sub.effective_status] || "grey"}>{STATUS_LABEL[sub.effective_status] || sub.effective_status}</Badge>
            <Text size="small" className="text-ui-fg-subtle">{sub.days_left} days left</Text>
          </div>
        </div>
      </div>

      <div>
        <Label size="small">Plan</Label>
        <Select value={plan} onValueChange={setPlan}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Content>{PLANS.map((p) => <Select.Item key={p.id} value={p.id}>{p.label}</Select.Item>)}</Select.Content>
        </Select>
      </div>
      <div>
        <Label size="small">Extend by (days)</Label>
        <Input type="number" value={extendDays} onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 0)} />
        <Text size="xsmall" className="text-ui-fg-muted mt-1">Adds to current end date if active, or starts from today. Marks as paid + active.</Text>
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-4 border-t border-ui-border-base">
        <Button variant="danger" onClick={cancel} disabled={saving}>Cancel and Delete</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button disabled={saving} onClick={markPaid}>{saving ? "Saving…" : "Mark as Paid & Extend"}</Button>
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  const [rows, setRows] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Sub | null>(null)
  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/subscriptions`, { credentials: "include" })
      .then((r) => r.json()).then((d) => setRows(d.subscriptions || [])).catch(() => setRows([])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const stats = {
    total: rows.length,
    trial: rows.filter((r) => r.effective_status === "trial").length,
    active: rows.filter((r) => r.effective_status === "active").length,
    expired: rows.filter((r) => r.effective_status === "expired").length,
  }

  return (
    <SingleColumnPage>
      {/* Header card — same style as Vehicle Types */}
      <Container className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
              <CurrencyDollar className="text-white" />
            </div>
            <div>
              <Heading level="h1">{tt("Subscriptions", "الاشتراكات")}</Heading>
              <Text className="text-ui-fg-subtle mt-1">{tt("Rental companies get 30 days free, then subscribe to keep their listings live.", "تحصل شركات التأجير على 30 يومًا مجانًا، ثم تشترك لإبقاء إعلاناتها فعّالة.")}</Text>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge color="grey">{stats.total} total</Badge>
                <Badge color="blue">{stats.trial} on trial</Badge>
                <Badge color="green">{stats.active} subscribed</Badge>
                {stats.expired > 0 ? <Badge color="red">{stats.expired} expired</Badge> : null}
              </div>
            </div>
          </div>
          <Button variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
        </div>
      </Container>

      {/* Card list — same style as Vehicle Types */}
      <Container className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-ui-fg-muted">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-10 text-center text-ui-fg-muted">
            {tt("No subscriptions yet", "لا توجد اشتراكات بعد")}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((r) => {
              const dleft = r.days_left
              const dColor = dleft === 0 ? "text-red-500" : dleft < 7 ? "text-orange-500" : "text-ui-fg-base"
              return (
                <div key={r.id} className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden transition-colors">
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-ui-bg-subtle border-b border-ui-border-base">
                    <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, background: "white", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                      {r.logo ? <img src={r.logo} alt={r.name} style={{ width: 40, height: 40, objectFit: "cover" }} /> : <span style={{ fontSize: 18 }}>🏢</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-sans txt-medium font-semibold text-ui-fg-base truncate">{r.name}</p>
                        <Badge size="2xsmall" color={STATUS_BADGE[r.effective_status] || "grey"}>{STATUS_LABEL[r.effective_status] || r.effective_status}</Badge>
                      </div>
                      <p className="font-normal txt-xsmall text-ui-fg-muted font-mono truncate">{r.handle || "—"}</p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end mr-1 shrink-0">
                      <span className="text-xs text-ui-fg-muted">{planLabel(r.subscription_plan)}</span>
                      <span className={`text-sm font-semibold ${dColor}`}>{dleft} {dleft === 1 ? "day" : "days"} left</span>
                    </div>
                    <Button size="small" variant="secondary" onClick={() => setEdit(r)}><PencilSquare /> Manage</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>

      <FocusModal open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>Manage Subscription</Heading></FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            {edit && <ManageModal sub={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
