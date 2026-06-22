import { useEffect, useState } from "react"
import { Heading, Text, Table, Badge, Button } from "@medusajs/ui"
import { API } from "../lib/api"
import { tt } from "../lib/lang"

type Ev = { id: string; event_type: string; created_at: string; country_code: string; device: string; seller_name: string; product_title: string; utm_source?: string }

const TYPE: Record<string, { label: string; ar: string; color: any }> = {
  view: { label: "View", ar: "مشاهدة", color: "blue" },
  call: { label: "Call", ar: "اتصال", color: "green" },
  whatsapp: { label: "WhatsApp", ar: "واتساب", color: "green" },
  webrtc: { label: "Free call", ar: "مكالمة مجانية", color: "purple" },
}
const flagOf = (c: string) => {
  try { return /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65, 0x1f1e6 + c.charCodeAt(1) - 65) : "" } catch { return "" }
}

export function AllEvents({ from, to, sellerId, eventType }: { from: string; to: string; sellerId?: string; eventType?: string }) {
  const [events, setEvents] = useState<Ev[]>([])
  const [count, setCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const LIMIT = 50

  const qs = (off: number) => {
    const p = new URLSearchParams()
    if (from) p.set("from", from); if (to) p.set("to", to)
    if (sellerId) p.set("seller_id", sellerId)
    if (eventType && eventType !== "all") p.set("event_type", eventType)
    p.set("limit", String(LIMIT)); p.set("offset", String(off))
    return p.toString()
  }
  const fetchPage = (off: number) => {
    setLoading(true)
    fetch(`${API}/admin/analytics/events?${qs(off)}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setCount(d.count || 0)
        if (off === 0) setEvents(d.events || [])
        else setEvents(e => [...e, ...(d.events || [])])
        setOffset(off)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  // reset + reload whenever the page filters change
  useEffect(() => { setOffset(0); fetchPage(0) /* eslint-disable-next-line */ }, [from, to, sellerId, eventType])

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <Heading level="h2" className="text-base font-semibold">📋 {tt("All events", "كل الأحداث")}</Heading>
        <Badge color="blue">{tt(`${events.length} of ${count}`, `${events.length} من ${count}`)}</Badge>
      </div>
      <Text size="small" className="text-ui-fg-subtle mb-4">
        {tt("Every individual customer action (view, call, WhatsApp, free call) — newest first.",
            "كل إجراء فردي للعميل (مشاهدة، اتصال، واتساب، مكالمة مجانية) — الأحدث أولاً.")}
      </Text>
      <div style={{ overflowX: "auto" }}>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{tt("Time", "الوقت")}</Table.HeaderCell>
              <Table.HeaderCell>{tt("Type", "النوع")}</Table.HeaderCell>
              <Table.HeaderCell>{tt("Car", "السيارة")}</Table.HeaderCell>
              <Table.HeaderCell>{tt("Company", "الشركة")}</Table.HeaderCell>
              <Table.HeaderCell>{tt("Country", "الدولة")}</Table.HeaderCell>
              <Table.HeaderCell>{tt("Device", "الجهاز")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {events.map((e) => {
              const t = TYPE[e.event_type] || { label: e.event_type, ar: e.event_type, color: "grey" as any }
              return (
                <Table.Row key={e.id}>
                  <Table.Cell><Text size="small" className="text-ui-fg-subtle whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</Text></Table.Cell>
                  <Table.Cell><Badge color={t.color} size="small">{tt(t.label, t.ar)}</Badge></Table.Cell>
                  <Table.Cell><Text size="small" className="truncate" style={{ maxWidth: 240 }}>{e.product_title}</Text></Table.Cell>
                  <Table.Cell><Text size="small">{e.seller_name}</Text></Table.Cell>
                  <Table.Cell><Text size="small">{flagOf(e.country_code)} {e.country_code || "—"}</Text></Table.Cell>
                  <Table.Cell><Text size="small" className="text-ui-fg-subtle">{e.device}</Text></Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </div>
      {events.length === 0 && !loading && <Text size="small" className="text-ui-fg-muted mt-3">{tt("No events in this period.", "لا أحداث في هذه الفترة.")}</Text>}
      {events.length < count && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="small" isLoading={loading} onClick={() => fetchPage(offset + LIMIT)}>
            {tt("Load more", "تحميل المزيد")} ({count - events.length})
          </Button>
        </div>
      )}
    </div>
  )
}
