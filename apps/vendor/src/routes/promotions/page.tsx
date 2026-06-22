import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, Select, Checkbox, FocusModal } from "@medusajs/ui"
import { Bolt } from "@medusajs/icons"
import { API } from "../../lib/api"
import { TableCell } from "../../lib/table-cell"

export const config: RouteConfig = { label: "Promotions", icon: Bolt, rank: 3 }
type Vehicle = any

const PromotionsPage = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState<"percent" | "fixed" | "clear">("percent")
  const [percent, setPercent] = useState(20)
  const [saleDaily, setSaleDaily] = useState("")
  const [saleWeekly, setSaleWeekly] = useState("")
  const [saleMonthly, setSaleMonthly] = useState("")
  const [label, setLabel] = useState("Special Offer")
  const [endsAt, setEndsAt] = useState("")
  const [saving, setSaving] = useState(false)
  const [applyError, setApplyError] = useState("")

  const load = () => {
    setLoading(true)
    fetch(`${API}/vendor/promotions`, { credentials: "include" })
      .then(r => r.json()).then(d => setVehicles(d.vehicles || [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggle = (id: string) => {
    const s = new Set(selected)
    if (s.has(id)) s.delete(id); else s.add(id)
    setSelected(s)
  }
  const toggleAll = () => {
    if (selected.size === vehicles.length) setSelected(new Set())
    else setSelected(new Set(vehicles.map(v => v.id)))
  }

  const apply = async () => {
    if (selected.size === 0) return
    setSaving(true)
    setApplyError("")
    try {
      const body: any = { vehicle_ids: Array.from(selected) }
      if (mode === "percent") {
        body.discount_percent = percent
        body.label = label
      } else if (mode === "fixed") {
        if (saleDaily) body.sale_daily_price = parseFloat(saleDaily)
        if (saleWeekly) body.sale_weekly_price = parseFloat(saleWeekly)
        if (saleMonthly) body.sale_monthly_price = parseFloat(saleMonthly)
        body.label = label
      } else if (mode === "clear") {
        body.clear = true
      }
      if (endsAt && mode !== "clear") body.ends_at = new Date(endsAt).toISOString()
      const res = await fetch(`${API}/vendor/promotions`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message || d.hint || `Request failed (${res.status})`)
      }
      setShowModal(false); setSelected(new Set()); load()
    } catch (e: any) {
      setApplyError(e?.message || "Could not apply changes. Please try again.")
    } finally { setSaving(false) }
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">⚡ Promotions & Discounts</Heading>
          <Button disabled={selected.size === 0} onClick={() => setShowModal(true)}>
            <Bolt /> Apply to {selected.size} {selected.size === 1 ? "vehicle" : "vehicles"}
          </Button>
        </div>
        <Text className="text-ui-fg-subtle">Discount your vehicles by %, set custom sale prices, or clear active promotions.</Text>
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>
              <Checkbox checked={selected.size > 0 && selected.size === vehicles.length} onCheckedChange={() => toggleAll()} />
            </Table.HeaderCell>
            <Table.HeaderCell>Vehicle</Table.HeaderCell>
            <Table.HeaderCell>Daily</Table.HeaderCell>
            <Table.HeaderCell>Sale Daily</Table.HeaderCell>
            <Table.HeaderCell>Discount</Table.HeaderCell>
            <Table.HeaderCell>Label</Table.HeaderCell>
            <Table.HeaderCell>Ends</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><TableCell colSpan={7}>Loading…</TableCell></Table.Row>}
            {!loading && vehicles.length === 0 && <Table.Row><TableCell colSpan={7} className="text-center py-8 text-ui-fg-muted">No vehicles yet — add one from the Vehicles page.</TableCell></Table.Row>}
            {vehicles.map((v: any) => (
              <Table.Row key={v.id}>
                <Table.Cell><Checkbox checked={selected.has(v.id)} onCheckedChange={() => toggle(v.id)} /></Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    {v.photos?.[0] && <img src={v.photos[0]} style={{ width: 40, height: 30, objectFit: "cover", borderRadius: 4 }} />}
                    <span className="font-medium">{v.title}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>{v.daily_price ? `${v.daily_price} ${(v.currency_code||"aed").toUpperCase()}` : "—"}</Table.Cell>
                <Table.Cell>{v.sale_daily_price ? <span style={{color:"#10b981",fontWeight:600}}>{v.sale_daily_price}</span> : "—"}</Table.Cell>
                <Table.Cell>{v.discount_percent ? <Badge color="green">-{v.discount_percent}%</Badge> : "—"}</Table.Cell>
                <Table.Cell>{v.discount_label || "—"}</Table.Cell>
                <Table.Cell>{v.discount_ends_at ? new Date(v.discount_ends_at).toLocaleDateString() : "—"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <FocusModal open={showModal} onOpenChange={setShowModal}>
        <FocusModal.Content style={{ maxWidth: 700 }}>
          <FocusModal.Header><Heading>Apply Promotion to {selected.size} vehicle{selected.size === 1 ? "" : "s"}</Heading></FocusModal.Header>
          <FocusModal.Body>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <Label size="small">Mode</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value="percent">💯 Percent discount (auto-calculates sale prices)</Select.Item>
                    <Select.Item value="fixed">💰 Set custom sale prices</Select.Item>
                    <Select.Item value="clear">🗑️ Clear / remove discount</Select.Item>
                  </Select.Content>
                </Select>
              </div>

              {mode === "percent" && (
                <>
                  <div>
                    <Label size="small">Discount %</Label>
                    <Input type="number" min={1} max={99} value={percent} onChange={e => setPercent(parseInt(e.target.value,10)||0)} />
                    <Text size="xsmall" className="text-ui-fg-muted mt-1">e.g. 20% → daily price 100 becomes 80</Text>
                  </div>
                </>
              )}

              {mode === "fixed" && (
                <div className="grid grid-cols-3 gap-3">
                  <div><Label size="small">Sale daily</Label><Input type="number" value={saleDaily} onChange={e => setSaleDaily(e.target.value)} placeholder="80" /></div>
                  <div><Label size="small">Sale weekly</Label><Input type="number" value={saleWeekly} onChange={e => setSaleWeekly(e.target.value)} placeholder="500" /></div>
                  <div><Label size="small">Sale monthly</Label><Input type="number" value={saleMonthly} onChange={e => setSaleMonthly(e.target.value)} placeholder="1800" /></div>
                </div>
              )}

              {mode !== "clear" && (
                <>
                  <div>
                    <Label size="small">Promotion label (shown to customers)</Label>
                    <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Eid Sale, Summer Special, Limited Time..." />
                  </div>
                  <div>
                    <Label size="small">Ends at (optional)</Label>
                    <Input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} />
                  </div>
                </>
              )}

              {applyError && (
                <Text className="text-ui-fg-error text-sm" role="alert">{applyError}</Text>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={apply} disabled={saving}>{saving ? "Applying..." : "Apply"}</Button>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default PromotionsPage
