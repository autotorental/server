import { useCallback, useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input } from "@medusajs/ui"
import { MapPin } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Customer Locations", "مواقع العملاء"), icon: MapPin, rank: 16 }

type AnyRec = any
const PAGE_SIZE = 50

const flagEmoji = (code?: string | null) => {
  if (!code || code.length !== 2) return ""
  const cc = code.toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return ""
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

const timeAgo = (input?: string | null) => {
  if (!input) return "—"
  const then = new Date(input).getTime()
  if (Number.isNaN(then)) return "—"
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(input).toLocaleDateString()
}

const CustomerLocationsPage = () => {
  const [customers, setCustomers] = useState<AnyRec[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (query) params.set("q", query)
      const res = await fetch(`${API}/admin/customer-locations?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      const data = await res.json()
      setCustomers(data.customers || [])
      setCount(data.count || 0)
    } catch (e: AnyRec) {
      setLoadError(e?.message || "Failed to load customer locations")
    } finally {
      setLoading(false)
    }
  }, [page, query])

  useEffect(() => { load() }, [load])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: "#dc262616", color: "#dc2626" }}>
            <MapPin />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1">{tt("Customer Locations", "مواقع العملاء")}</Heading>
              <Badge color="grey">{count.toLocaleString()}</Badge>
            </div>
            <Text size="small" className="text-ui-fg-subtle">{tt("Where customers signed in from — IP & country captured on each login.", "من أين سجّل العملاء الدخول — يُلتقط الـ IP والدولة عند كل تسجيل.")}</Text>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "0.75rem", marginTop: "1.25rem" }}>
          {[
            { label: "Total customers", value: count.toLocaleString(), c: "#2563eb" },
            { label: "Countries (page)", value: String(new Set(customers.map((c: any) => (c.last_country || "").toUpperCase()).filter(Boolean)).size), c: "#7c3aed" },
            { label: "Located (page)", value: customers.filter((c: any) => c.last_country).length + " / " + customers.length, c: "#16a34a" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full" style={{ background: k.c }} /><span className="text-xs font-medium text-ui-fg-subtle">{k.label}</span></div>
              <div className="text-2xl font-semibold text-ui-fg-base mt-1.5 tabular-nums">{k.value}</div>
            </div>
          ))}
        </div>
        <form
          className="flex items-center gap-2 mt-4"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(0)
            setQuery(search.trim())
          }}
        >
          <div style={{ width: 320 }}>
            <Input
              placeholder={tt("Search name, email, phone or IP…", "ابحث بالاسم أو البريد أو الهاتف أو الـ IP…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>{tt("Search", "بحث")}</Button>
          {query && (
            <Button
              type="button"
              variant="transparent"
              onClick={() => { setSearch(""); setQuery(""); setPage(0) }}
            >
              Clear
            </Button>
          )}
        </form>
        {loadError && <Text className="text-ui-fg-error mt-2">{loadError}</Text>}
        {customers.length > 0 && (() => {
          const by: Record<string, number> = {}
          customers.forEach((c: any) => { const k = (c.last_country || "").toUpperCase(); if (k) by[k] = (by[k] || 0) + 1 })
          const rows = Object.entries(by).sort((a, b) => b[1] - a[1])
          if (!rows.length) return null
          return (
            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted mb-2">Customers by country (this page)</div>
              <div className="flex flex-wrap gap-2">
                {rows.map(([cc, n]) => (
                  <span key={cc} className="inline-flex items-center gap-1.5 rounded-full border border-ui-border-base bg-ui-bg-subtle px-3 py-1.5 text-sm">
                    <span className="text-base leading-none">{flagEmoji(cc)}</span>
                    <span className="font-semibold">{cc}</span>
                    <span className="text-ui-fg-muted tabular-nums">{n}</span>
                  </span>
                ))}
              </div>
            </div>
          )
        })()}
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Customer</Table.HeaderCell>
            <Table.HeaderCell>Phone</Table.HeaderCell>
            <Table.HeaderCell>Country</Table.HeaderCell>
            <Table.HeaderCell>IP Address</Table.HeaderCell>
            <Table.HeaderCell>Last Seen</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={5}>Loading…</Table.Cell></Table.Row>}
            {!loading && customers.length === 0 && (
              <Table.Row><Table.Cell colSpan={5} className="text-center py-10 text-ui-fg-muted">
                No customers found
              </Table.Cell></Table.Row>
            )}
            {customers.map((c) => (
              <Table.Row key={c.id}>
                <Table.Cell>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center rounded-full text-xs font-bold shrink-0" style={{ width: 30, height: 30, background: "#2563eb14", color: "#2563eb" }}>{String(c.name || c.email || "?").trim().charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="font-medium">{c.name || "—"}</div>
                      <div className="text-xs text-ui-fg-subtle">{c.email}</div>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell className="text-xs">{c.phone || "—"}</Table.Cell>
                <Table.Cell>
                  {c.last_country ? (
                    <span>
                      {flagEmoji(c.last_country)} {c.last_country_name || c.last_country}
                    </span>
                  ) : (
                    <span className="text-ui-fg-muted">—</span>
                  )}
                </Table.Cell>
                <Table.Cell className="text-xs font-mono">{c.last_ip || "—"}</Table.Cell>
                <Table.Cell className="text-xs text-ui-fg-subtle">{timeAgo(c.last_seen_at)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <Container className="flex items-center justify-between p-4">
        <Text size="small" className="text-ui-fg-subtle">
          {count} customer{count === 1 ? "" : "s"}
        </Text>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Text size="small">{page + 1} / {pageCount}</Text>
          <Button
            size="small"
            variant="secondary"
            disabled={page + 1 >= pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default CustomerLocationsPage
