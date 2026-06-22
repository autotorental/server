import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { Tag } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Vehicle Types", icon: Tag, rank: 2 }

export default function VehicleTypesPage() {
  const [types, setTypes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(`${API}/vendor/vehicle-types`, { credentials: "include" })
      .then((r) => r.json()).then((d) => { setTypes(d.types || []); setTotal(d.total || 0) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Tag className="text-ui-fg-interactive" />
        <div>
          <Heading level="h1">Vehicle Types</Heading>
          <Text size="small" className="text-ui-fg-subtle">Your {total} car{total === 1 ? "" : "s"} grouped by type.</Text>
        </div>
      </div>

      {loading ? (
        <Text className="text-ui-fg-muted">Loading…</Text>
      ) : types.length === 0 ? (
        <Container className="p-8 text-center"><Text className="text-ui-fg-muted">No cars yet — add cars and they'll appear grouped by type here.</Text></Container>
      ) : (
        types.map((t) => (
          <Container key={t.name} className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-ui-border-base bg-ui-bg-subtle">
              <Heading level="h3">{t.name}</Heading>
              <Badge color="blue">{t.count} {t.count === 1 ? "car" : "cars"}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {t.cars.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-ui-border-base p-2.5">
                  {c.photo
                    ? <img src={c.photo} alt="" className="w-16 h-12 rounded object-cover shrink-0" />
                    : <div className="w-16 h-12 rounded bg-ui-bg-subtle flex items-center justify-center shrink-0 text-lg">🚗</div>}
                  <div className="min-w-0 flex-1">
                    <Text size="small" weight="plus" className="truncate">{c.title}</Text>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {c.sale_daily_price
                        ? <><Text size="xsmall" className="text-ui-fg-interactive">{c.sale_daily_price}/day</Text><Text size="xsmall" className="text-ui-fg-muted line-through">{c.daily_price}</Text></>
                        : <Text size="xsmall" className="text-ui-fg-subtle">{c.daily_price ? c.daily_price + "/day" : "No price"}</Text>}
                      <Badge size="2xsmall" color={c.status === "active" ? "green" : "grey"}>{c.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        ))
      )}
    </div>
  )
}
