import { useEffect, useMemo, useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { Phone, Trash, XMark } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { API } from "../../lib/api"

const PAGE_SIZE = 20

type CallRow = {
  id: string
  status: string
  direction?: string
  client_name?: string | null
  client_phone?: string | null
  seller_name?: string | null
  seller_phone?: string | null
  vehicle_title?: string | null
  client_ip?: string | null
  client_country?: string | null
  recording_url?: string | null
  created_at: string
}

type CallsResponse = {
  calls: CallRow[]
  count: number
  limit: number
  offset: number
}

const statusColor = (
  status: string
): "green" | "orange" | "red" | "grey" => {
  switch (status) {
    case "active":
      return "green"
    case "ringing":
      return "orange"
    case "missed":
      return "red"
    default:
      return "grey"
  }
}

const RecordingCell = ({ url }: { url?: string | null }) => {
  const [src, setSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!url) {
    return (
      <Text size="xsmall" className="text-ui-fg-subtle">
        —
      </Text>
    )
  }

  if (src) {
    return (
      <audio controls preload="none" src={src} style={{ height: 32, maxWidth: 220 }} />
    )
  }

  return (
    <Button
      size="small"
      variant="secondary"
      isLoading={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(`${API}${url}`, { credentials: "include" })
          if (!res.ok) throw new Error("Failed to load recording")
          const blob = await res.blob()
          setSrc(URL.createObjectURL(blob))
        } catch {
          // ignore — recording unavailable
        } finally {
          setLoading(false)
        }
      }}
    >
      ▶ Play
    </Button>
  )
}

const CallLogsPage = () => {
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<string>("all")
  const [sellerId, setSellerId] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([])
  const prompt = usePrompt()

  useEffect(() => {
    fetch(`${API}/admin/sellers?limit=500`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.sellers && setSellers(d.sellers.map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => {})
  }, [])

  const { data, isLoading, isError, refetch } = useQuery<CallsResponse>({
    queryKey: ["admin_call_logs", page, status, sellerId, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      })
      if (status !== "all") params.set("status", status)
      if (sellerId !== "all") params.set("seller_id", sellerId)
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      const res = await fetch(`${API}/admin/calls?${params.toString()}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error(`Failed to load call logs (${res.status})`)
      return res.json()
    },
    placeholderData: keepPreviousData,
  })

  const calls = data?.calls ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const hasFilters = status !== "all" || sellerId !== "all" || !!dateFrom || !!dateTo
  const clearFilters = () => {
    setStatus("all"); setSellerId("all"); setDateFrom(""); setDateTo(""); setPage(0)
  }
  const onFilter = (fn: () => void) => { fn(); setPage(0) }

  const allOnPageSelected = useMemo(
    () => calls.length > 0 && calls.every((c) => selected.has(c.id)),
    [calls, selected]
  )

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllOnPage = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) calls.forEach((c) => next.delete(c.id))
      else calls.forEach((c) => next.add(c.id))
      return next
    })
  }

  const deleteSelected = async () => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    const ok = await prompt({
      title: "Delete call logs",
      description: `Permanently delete ${ids.length} call log${ids.length === 1 ? "" : "s"} and their recordings? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!ok) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/admin/calls`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error(`Failed (${res.status})`)
      const d = await res.json()
      toast.success(`Deleted ${d.deleted ?? ids.length} call log${(d.deleted ?? ids.length) === 1 ? "" : "s"}`)
      setSelected(new Set())
      await refetch()
    } catch {
      toast.error("Failed to delete call logs")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl text-white"
            style={{ width: 44, height: 44, backgroundImage: "linear-gradient(135deg, #1753b0, #0ea5e9)" }}
          >
            <Phone />
          </div>
          <div>
            <Heading level="h1">Call Logs</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Every call between customers and your rental companies — filter by company and date.
            </Text>
          </div>
        </div>
        {selected.size > 0 ? (
          <Button size="small" variant="danger" isLoading={deleting} onClick={deleteSelected}>
            <Trash /> Delete ({selected.size})
          </Button>
        ) : null}
      </div>

      {/* Filter bar */}
      <div className="bg-ui-bg-subtle px-4 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">Rental company</Label>
            <Select value={sellerId} onValueChange={(v) => onFilter(() => setSellerId(v))}>
              <Select.Trigger><Select.Value placeholder="All companies" /></Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All companies</Select.Item>
                {sellers.map((s) => (
                  <Select.Item key={s.id} value={s.id}>{s.name}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">From date</Label>
            <Input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => onFilter(() => setDateFrom(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">To date</Label>
            <Input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => onFilter(() => setDateTo(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1">
            <Label size="xsmall" weight="plus" className="text-ui-fg-subtle">Status</Label>
            <Select value={status} onValueChange={(v) => onFilter(() => setStatus(v))}>
              <Select.Trigger><Select.Value placeholder="All statuses" /></Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All statuses</Select.Item>
                <Select.Item value="ringing">Ringing</Select.Item>
                <Select.Item value="active">Active</Select.Item>
                <Select.Item value="ended">Ended</Select.Item>
                <Select.Item value="missed">Missed</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
        {hasFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Text size="small" className="text-ui-fg-subtle">
              Showing <span className="font-semibold text-ui-fg-base">{count}</span> matching call{count === 1 ? "" : "s"}
            </Text>
            {sellerId !== "all" && <Badge size="2xsmall" color="blue">{sellers.find((s) => s.id === sellerId)?.name || "Company"}</Badge>}
            {dateFrom && <Badge size="2xsmall" color="grey">From {dateFrom}</Badge>}
            {dateTo && <Badge size="2xsmall" color="grey">To {dateTo}</Badge>}
            {status !== "all" && <Badge size="2xsmall" color={statusColor(status)}>{status}</Badge>}
            <Button size="small" variant="transparent" onClick={clearFilters}><XMark /> Clear</Button>
          </div>
        ) : null}
      </div>

      {isError ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Failed to load call logs.</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell className="w-8">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleAllOnPage}
                  disabled={calls.length === 0}
                />
              </Table.HeaderCell>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Rental company</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Vehicle</Table.HeaderCell>
              <Table.HeaderCell>Direction</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Recording</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {calls.map((call) => (
              <Table.Row key={call.id}>
                <Table.Cell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(call.id)}
                    onCheckedChange={() => toggleOne(call.id)}
                  />
                </Table.Cell>
                <Table.Cell>
                  {call.created_at ? (
                    <div>
                      <div className="text-ui-fg-base">{new Date(call.created_at).toLocaleDateString()}</div>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {new Date(call.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </div>
                  ) : "—"}
                </Table.Cell>
                <Table.Cell>
                  <span className="font-medium text-ui-fg-base">{call.seller_name ?? "—"}</span>
                  {call.seller_phone ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">{call.seller_phone}</Text>
                  ) : null}
                </Table.Cell>
                <Table.Cell>
                  {call.client_name ?? "—"}
                  {call.client_phone ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">{call.client_phone}</Text>
                  ) : null}
                  {call.client_country || call.client_ip ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      📍 {[call.client_country, call.client_ip].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                </Table.Cell>
                <Table.Cell>{call.vehicle_title ?? "—"}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall">{call.direction ?? "inbound"}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={statusColor(call.status)}>{call.status}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <RecordingCell url={call.recording_url} />
                </Table.Cell>
              </Table.Row>
            ))}
            {!isLoading && calls.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={8}>
                  <div className="py-6 text-center">
                    <Text className="text-ui-fg-subtle">
                      {hasFilters ? "No calls match these filters." : "No calls yet."}
                    </Text>
                    {hasFilters ? (
                      <Button size="small" variant="secondary" className="mt-2" onClick={clearFilters}>Clear filters</Button>
                    ) : null}
                  </div>
                </Table.Cell>
              </Table.Row>
            ) : null}
          </Table.Body>
        </Table>
      )}

      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Text size="small" className="text-ui-fg-subtle">
          {count} call{count === 1 ? "" : "s"}
          {selected.size > 0 ? ` · ${selected.size} selected` : ""}
        </Text>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            disabled={page === 0 || isLoading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Text size="small">{page + 1} / {pageCount}</Text>
          <Button
            size="small"
            variant="secondary"
            disabled={page + 1 >= pageCount || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default CallLogsPage

export const config: RouteConfig = {
  label: "Call Logs",
  icon: Phone,
}
