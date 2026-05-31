import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, Select, FocusModal } from "@medusajs/ui"
import { CurrencyDollar, Clock, CheckCircle, XCircleSolid, PencilSquare } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Subscriptions", icon: CurrencyDollar }

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
  { id: "basic", label: "Basic — AED 99/mo", days: 30 },
  { id: "pro", label: "Pro — AED 249/mo", days: 30 },
  { id: "annual", label: "Annual — AED 999/yr (save 17%)", days: 365 },
]

const STATUS_BADGE: Record<string, "green" | "blue" | "red" | "grey" | "orange"> = {
  trial: "blue",
  active: "green",
  expired: "red",
  canceled: "grey",
}

const ManageModal = ({ sub, onClose, onSaved }: { sub: Sub; onClose: () => void; onSaved: () => void }) => {
  const [plan, setPlan] = useState(sub.subscription_plan || "basic")
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
    <div className="p-6 flex flex-col gap-5">
      <div className="bg-ui-bg-subtle rounded-lg p-4 flex items-center gap-3">
        {sub.logo && <img src={sub.logo} alt="" className="w-12 h-12 rounded-lg object-cover"/>}
        <div>
          <Heading level="h2">{sub.name}</Heading>
          <Text size="small" className="text-ui-fg-subtle">Status: {sub.effective_status} · {sub.days_left} days left</Text>
        </div>
      </div>

      <div>
        <Label size="small">Plan</Label>
        <Select value={plan} onValueChange={setPlan}>
          <Select.Trigger><Select.Value /></Select.Trigger>
          <Select.Content>{PLANS.map(p => <Select.Item key={p.id} value={p.id}>{p.label}</Select.Item>)}</Select.Content>
        </Select>
      </div>
      <div>
        <Label size="small">Extend by (days)</Label>
        <Input type="number" value={extendDays} onChange={e => setExtendDays(parseInt(e.target.value, 10) || 0)} />
        <Text size="xsmall" className="text-ui-fg-muted mt-1">Adds to current end date if active, or starts from today. Marks as paid + active.</Text>
      </div>

      <div className="flex flex-wrap justify-between gap-2 pt-4 border-t">
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
      .then(r => r.json()).then(d => setRows(d.subscriptions || [])).catch(() => setRows([])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const stats = {
    total: rows.length,
    trial: rows.filter(r => r.effective_status === "trial").length,
    active: rows.filter(r => r.effective_status === "active").length,
    expired: rows.filter(r => r.effective_status === "expired").length,
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">💳 Subscriptions</Heading>
        <Text className="text-ui-fg-subtle">Rental companies get 30 days free. After that they subscribe to keep their listings active.</Text>
      </Container>

      <Container className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total companies", value: stats.total, color: "text-ui-fg-base" },
          { label: "🆓 On trial", value: stats.trial, color: "text-blue-500" },
          { label: "✅ Subscribed", value: stats.active, color: "text-green-500" },
          { label: "⛔ Expired", value: stats.expired, color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="text-xs text-ui-fg-muted">{s.label}</div>
            <div className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </Container>

      <Container className="p-0">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Plan</Table.HeaderCell>
              <Table.HeaderCell>Trial Ends</Table.HeaderCell>
              <Table.HeaderCell>Sub Ends</Table.HeaderCell>
              <Table.HeaderCell>Days Left</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map(r => (
              <Table.Row key={r.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    {r.logo && <img src={r.logo} alt="" className="w-7 h-7 rounded object-cover"/>}
                    <div>
                      <div className="font-medium text-ui-fg-base">{r.name}</div>
                      <div className="text-xs text-ui-fg-muted">{r.handle}</div>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell><Badge color={STATUS_BADGE[r.effective_status] || "grey"}>{r.effective_status}</Badge></Table.Cell>
                <Table.Cell>{r.subscription_plan || "—"}</Table.Cell>
                <Table.Cell className="text-xs">{r.trial_ends_at ? new Date(r.trial_ends_at).toLocaleDateString() : "—"}</Table.Cell>
                <Table.Cell className="text-xs">{r.subscription_ends_at ? new Date(r.subscription_ends_at).toLocaleDateString() : "—"}</Table.Cell>
                <Table.Cell>
                  <span className={`font-semibold ${r.days_left === 0 ? "text-red-500" : r.days_left < 7 ? "text-orange-500" : ""}`}>
                    {r.days_left} {r.days_left === 1 ? "day" : "days"}
                  </span>
                </Table.Cell>
                <Table.Cell><Button size="small" variant="secondary" onClick={() => setEdit(r)}><PencilSquare /> Manage</Button></Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
      {loading && <Container><Text>Loading…</Text></Container>}

      <FocusModal open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>Manage Subscription</Heading></FocusModal.Header>
          <FocusModal.Body>
            {edit && <ManageModal sub={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }}/>}
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
