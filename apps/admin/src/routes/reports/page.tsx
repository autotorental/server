import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Select, Textarea } from "@medusajs/ui"
import { ExclamationCircle, Trash } from "@medusajs/icons"

export const config: RouteConfig = { label: "Reports", icon: ExclamationCircle }

const API = "https://api.autotorental.com"
type Report = any
const REASON_LABELS: Record<string, string> = {
  wrong_info: "Wrong info", price_wrong: "Wrong price", already_rented: "Already rented out",
  scam: "Scam", duplicate: "Duplicate listing", inappropriate: "Inappropriate",
  spam: "Spam", fake_photos: "Fake photos", stolen_vehicle: "Stolen vehicle", other: "Other",
}
const STATUS_COLORS: Record<string, any> = { open: "red", reviewing: "orange", resolved: "green", dismissed: "grey" }

const Page = () => {
  const [items, setItems] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  const load = () => {
    setLoading(true)
    const url = filter === "all" ? `${API}/admin/reports` : `${API}/admin/reports?status=${filter}`
    fetch(url, { credentials: "include" }).then(r => r.json()).then(d => setItems(d.reports || [])).finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/admin/reports/${id}`, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ status }) })
    load()
  }
  const remove = async (id: string) => { if(!confirm("Delete this report?")) return; await fetch(`${API}/admin/reports/${id}`, { method:"DELETE", credentials:"include" }); load() }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">🚩 Listing Reports</Heading>
          <div style={{width: 200}}>
            <Select value={filter} onValueChange={setFilter}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All reports</Select.Item>
                <Select.Item value="open">🔴 Open</Select.Item>
                <Select.Item value="reviewing">🟡 Reviewing</Select.Item>
                <Select.Item value="resolved">✅ Resolved</Select.Item>
                <Select.Item value="dismissed">⚫ Dismissed</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
        <Text className="text-ui-fg-subtle">Customer reports about wrong/scam/fake listings.</Text>
      </Container>
      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Date</Table.HeaderCell><Table.HeaderCell>Vehicle</Table.HeaderCell>
            <Table.HeaderCell>Reason</Table.HeaderCell><Table.HeaderCell>Reporter</Table.HeaderCell>
            <Table.HeaderCell>Description</Table.HeaderCell><Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={7}>Loading…</Table.Cell></Table.Row>}
            {!loading && items.length === 0 && <Table.Row><Table.Cell colSpan={7} className="text-center py-8 text-ui-fg-muted">No reports — great!</Table.Cell></Table.Row>}
            {items.map(r => (
              <Table.Row key={r.id}>
                <Table.Cell>{new Date(r.created_at).toLocaleDateString()}</Table.Cell>
                <Table.Cell className="font-mono text-xs">{r.vehicle_id}</Table.Cell>
                <Table.Cell><Badge>{REASON_LABELS[r.reason] || r.reason}</Badge></Table.Cell>
                <Table.Cell>
                  {r.reporter_email || r.reporter_phone || "Anonymous"}
                  {r.reporter_name && <div className="text-xs text-ui-fg-muted">{r.reporter_name}</div>}
                </Table.Cell>
                <Table.Cell className="max-w-xs truncate">{r.description || "—"}</Table.Cell>
                <Table.Cell>
                  <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                    <Select.Trigger><Badge color={STATUS_COLORS[r.status] || "grey"}>{r.status}</Badge></Select.Trigger>
                    <Select.Content>
                      <Select.Item value="open">🔴 Open</Select.Item>
                      <Select.Item value="reviewing">🟡 Reviewing</Select.Item>
                      <Select.Item value="resolved">✅ Resolved</Select.Item>
                      <Select.Item value="dismissed">⚫ Dismissed</Select.Item>
                    </Select.Content>
                  </Select>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <Button size="small" variant="transparent" onClick={() => remove(r.id)}><Trash /></Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
