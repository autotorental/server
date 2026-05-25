import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Select, FocusModal, Textarea, Label } from "@medusajs/ui"
import { HandTruck, CheckCircleSolid, XMark, ExclamationCircle } from "@medusajs/icons"

export const config: RouteConfig = { label: "Vehicles", icon: HandTruck, rank: 1 }

const API = "https://api.autotorental.com"
type Vehicle = any
type Brand = any; type City = any; type Seller = any

const STATUS_COLORS: Record<string, any> = {
  pending_approval: "orange", active: "green", rejected: "red",
  draft: "grey", paused: "grey", unavailable: "red", rented: "blue",
}
const STATUS_LABELS: Record<string, string> = {
  pending_approval: "⏳ Pending Approval", active: "✅ Active", rejected: "❌ Rejected",
  draft: "📝 Draft", paused: "⏸️ Paused", unavailable: "🚫 Unavailable", rented: "🚙 Rented",
}
const REJECT_REASONS: Record<string, string> = {
  wrong_details: "Wrong details / inaccurate info",
  photos_unclear: "Photos are unclear or low quality",
  wrong_price: "Price is unrealistic or wrong",
  missing_info: "Missing required information",
  duplicate: "Duplicate listing",
  inappropriate: "Inappropriate content",
  spam: "Looks like spam",
  fake: "Fake or fraudulent listing",
  other: "Other (see note)",
}

const RejectModal = ({ vehicle, onConfirm, onClose }: any) => {
  const [reason, setReason] = useState("wrong_details")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  return (
    <FocusModal open={!!vehicle} onOpenChange={(o) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header><Heading>Reject Vehicle Listing</Heading></FocusModal.Header>
        <FocusModal.Body>
          <div className="p-6 flex flex-col gap-4" style={{ maxWidth: 600 }}>
            <Text>Why reject "<strong>{vehicle?.title}</strong>"?</Text>
            <div>
              <Label size="small">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  {Object.entries(REJECT_REASONS).map(([k, v]) => <Select.Item key={k} value={k}>{v}</Select.Item>)}
                </Select.Content>
              </Select>
            </div>
            <div>
              <Label size="small">Note (optional, shown to seller)</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. The third photo is blurry — please re-upload" rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="danger" disabled={saving} onClick={async () => {
                setSaving(true)
                try { await onConfirm(reason, note); onClose() }
                finally { setSaving(false) }
              }}>{saving ? "Rejecting..." : "Reject Listing"}</Button>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

const Page = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("pending_approval")
  const [rejectTarget, setRejectTarget] = useState<Vehicle | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const url = statusFilter === "all" ? `${API}/admin/vehicles` : `${API}/admin/vehicles?status=${statusFilter}`
      const [v, b, c, s] = await Promise.all([
        fetch(url, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/catalog/brands`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/locations/cities`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/sellers`, { credentials: "include" }).then(r => r.json()).catch(() => ({ sellers: [] })),
      ])
      setVehicles(v.vehicles || [])
      setBrands(b.brands || [])
      setCities(c.cities || [])
      setSellers(s.sellers || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [statusFilter])

  const approve = async (id: string) => {
    await fetch(`${API}/admin/vehicles/${id}/approve`, { method: "POST", credentials: "include" })
    load()
  }
  const reject = async (id: string, reason: string, note: string) => {
    await fetch(`${API}/admin/vehicles/${id}/reject`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejection_reason: reason, rejection_note: note }),
    })
    load()
  }

  const brandMap = useMemo(() => Object.fromEntries(brands.map(b => [b.id, b])), [brands])
  const cityMap = useMemo(() => Object.fromEntries(cities.map(c => [c.id, c])), [cities])
  const sellerMap = useMemo(() => Object.fromEntries(sellers.map(s => [s.id, s])), [sellers])

  const pendingCount = vehicles.filter(v => v.status === "pending_approval").length

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">🚗 Vehicles</Heading>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && statusFilter !== "pending_approval" && <Badge color="orange">{pendingCount} pending</Badge>}
            <div style={{width: 220}}>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All</Select.Item>
                  <Select.Item value="pending_approval">⏳ Pending Approval</Select.Item>
                  <Select.Item value="active">✅ Active</Select.Item>
                  <Select.Item value="rejected">❌ Rejected</Select.Item>
                  <Select.Item value="paused">⏸️ Paused</Select.Item>
                  <Select.Item value="rented">🚙 Currently Rented</Select.Item>
                  <Select.Item value="unavailable">🚫 Unavailable</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>
        </div>
        <Text className="text-ui-fg-subtle">Review and approve vehicle listings submitted by rental companies.</Text>
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Photo</Table.HeaderCell>
            <Table.HeaderCell>Title</Table.HeaderCell>
            <Table.HeaderCell>Rental Co.</Table.HeaderCell>
            <Table.HeaderCell>Brand</Table.HeaderCell>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Price</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={8}>Loading…</Table.Cell></Table.Row>}
            {!loading && vehicles.length === 0 && (
              <Table.Row><Table.Cell colSpan={8} className="text-center py-8 text-ui-fg-muted">
                {statusFilter === "pending_approval" ? "No pending approvals 🎉" : "No vehicles"}
              </Table.Cell></Table.Row>
            )}
            {vehicles.map(v => (
              <Table.Row key={v.id}>
                <Table.Cell>{v.photos?.[0] ? <img src={v.photos[0]} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4 }} /> : <span style={{ fontSize: 24 }}>🚗</span>}</Table.Cell>
                <Table.Cell>
                  <div className="font-medium">{v.title}</div>
                  {v.rejection_reason && <div className="text-xs text-ui-fg-error">Rejected: {v.rejection_reason}</div>}
                </Table.Cell>
                <Table.Cell className="text-xs">{sellerMap[v.seller_id]?.name || v.seller_id}</Table.Cell>
                <Table.Cell>{brandMap[v.brand_id]?.name || "—"}</Table.Cell>
                <Table.Cell>{cityMap[v.city_id]?.name || "—"}</Table.Cell>
                <Table.Cell>{v.daily_price ? `${v.daily_price} ${(v.currency_code||"aed").toUpperCase()}/day` : "—"}</Table.Cell>
                <Table.Cell><Badge color={STATUS_COLORS[v.status] || "grey"}>{STATUS_LABELS[v.status] || v.status}</Badge></Table.Cell>
                <Table.Cell className="text-right">
                  {v.status === "pending_approval" && (
                    <>
                      <Button size="small" variant="primary" onClick={() => approve(v.id)} className="mr-1"><CheckCircleSolid /> Approve</Button>
                      <Button size="small" variant="danger" onClick={() => setRejectTarget(v)}><XMark /> Reject</Button>
                    </>
                  )}
                  {v.status === "rejected" && <Button size="small" variant="primary" onClick={() => approve(v.id)}>Re-approve</Button>}
                  {v.status === "active" && <Button size="small" variant="secondary" onClick={() => setRejectTarget(v)}>Take down</Button>}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      {rejectTarget && <RejectModal vehicle={rejectTarget} onConfirm={(r: string, n: string) => reject(rejectTarget.id, r, n)} onClose={() => setRejectTarget(null)} />}
    </SingleColumnPage>
  )
}
export default Page
