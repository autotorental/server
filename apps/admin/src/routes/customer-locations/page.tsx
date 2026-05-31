import { useCallback, useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input } from "@medusajs/ui"
import { MapPin } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Customer Locations", icon: MapPin, rank: 2 }

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
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="text-ui-fg-subtle" />
          <Heading level="h1">Customer Locations</Heading>
          <Badge color="grey">{count}</Badge>
        </div>
        <Text className="text-ui-fg-subtle">
          Where customers signed in from. IP and country are captured on each login (older accounts that haven't
          signed in since this was enabled will be blank).
        </Text>
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
              placeholder="Search name, email, phone or IP…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>Search</Button>
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
                  <div className="font-medium">{c.name || "—"}</div>
                  <div className="text-xs text-ui-fg-subtle">{c.email}</div>
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
