import { useEffect, useState } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Select,
  Table,
  Text,
} from "@medusajs/ui"
import { Phone } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { API } from "../../lib/api"

const PAGE_SIZE = 20

type CallRow = {
  id: string
  status: string
  direction?: string
  client_name?: string | null
  client_phone?: string | null
  client_country?: string | null
  vehicle_title?: string | null
  created_at: string
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

const CallLogPage = () => {
  const [calls, setCalls] = useState<CallRow[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [status, setStatus] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    })
    if (status !== "all") params.set("status", status)
    fetch(`${API}/vendor/calls?${params.toString()}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`)
        return r.json()
      })
      .then((d) => {
        if (!active) return
        setCalls(Array.isArray(d.calls) ? d.calls : [])
        setCount(Number(d.count) || 0)
      })
      .catch(() => {
        if (!active) return
        setCalls([])
        setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, status])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Call Log</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Incoming calls from customers about your vehicles.
          </Text>
        </div>
        <div className="w-48">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(0)
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="All statuses" />
            </Select.Trigger>
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

      {error ? (
        <div className="px-6 py-8">
          <Text className="text-ui-fg-subtle">Failed to load call logs.</Text>
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Date</Table.HeaderCell>
              <Table.HeaderCell>Customer</Table.HeaderCell>
              <Table.HeaderCell>Vehicle</Table.HeaderCell>
              <Table.HeaderCell>Direction</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {calls.map((call) => (
              <Table.Row key={call.id}>
                <Table.Cell>
                  {call.created_at
                    ? new Date(call.created_at).toLocaleString()
                    : "-"}
                </Table.Cell>
                <Table.Cell>
                  {call.client_name ?? "-"}
                  {call.client_phone ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {call.client_phone}
                    </Text>
                  ) : null}
                  {call.client_country ? (
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      📍 {call.client_country}
                    </Text>
                  ) : null}
                </Table.Cell>
                <Table.Cell>{call.vehicle_title ?? "-"}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall">{call.direction ?? "inbound"}</Badge>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={statusColor(call.status)}>
                    {call.status}
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
            {!loading && calls.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text className="text-ui-fg-subtle">No calls yet.</Text>
                </Table.Cell>
              </Table.Row>
            ) : null}
          </Table.Body>
        </Table>
      )}

      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle">
          {count} call{count === 1 ? "" : "s"}
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
          <Text size="small">
            {page + 1} / {pageCount}
          </Text>
          <Button
            size="small"
            variant="secondary"
            disabled={page + 1 >= pageCount || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </Container>
  )
}

export default CallLogPage

export const config: RouteConfig = {
  label: "Call Log",
  icon: Phone,
}
