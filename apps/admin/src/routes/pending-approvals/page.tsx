import { useCallback, useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import {
  Container,
  Heading,
  Text,
  Table,
  Badge,
  Button,
  FocusModal,
  Textarea,
  Label,
  Select,
  IconButton,
} from "@medusajs/ui"
import { BellAlert, CheckCircleSolid, XMark, ArrowPath, Clock } from "@medusajs/icons"
import { Link } from "react-router-dom"
import { API, resolveMediaUrl } from "../../lib/api"
import { rentalCompanyPath } from "../../lib/seller-slug"

export const config: RouteConfig = { label: "Pending Approvals", icon: BellAlert, rank: 0 }

type AnyRec = any
type TabKey = "pending" | "approved" | "rejected"

const STATUS_BY_TAB: Record<TabKey, string> = {
  pending: "pending_approval",
  approved: "active",
  rejected: "rejected",
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

const timeAgo = (input?: string) => {
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

const fullDate = (input?: string) => {
  if (!input) return "—"
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

const RejectModal = ({ vehicle, onConfirm, onClose }: AnyRec) => {
  const [reason, setReason] = useState("wrong_details")
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  return (
    <FocusModal open onOpenChange={(o: boolean) => !o && onClose()}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading level="h2">Reject "{vehicle.title}"</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4 p-6">
          <Text className="text-ui-fg-subtle">
            The rental company will see this reason. Be clear so they can fix and resubmit.
          </Text>
          <div className="flex flex-col gap-1">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                {Object.entries(REJECT_REASONS).map(([k, label]) => (
                  <Select.Item key={k} value={k}>{label}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add details to help the company correct the listing…"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              variant="danger"
              isLoading={saving}
              onClick={async () => {
                setSaving(true)
                try {
                  await onConfirm(reason, note)
                } finally {
                  setSaving(false)
                }
              }}
            >
              Reject listing
            </Button>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

const TabButton = ({ active, onClick, color, children, count }: AnyRec) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-ui-bg-base shadow-elevation-card-rest text-ui-fg-base"
        : "text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-base-hover"
    }`}
  >
    {children}
    {count != null && count > 0 && <Badge size="2xsmall" color={color}>{count}</Badge>}
  </button>
)

const PendingApprovalsPage = () => {
  const [tab, setTab] = useState<TabKey>("pending")
  const [vehicles, setVehicles] = useState<AnyRec[]>([])
  const [brands, setBrands] = useState<AnyRec[]>([])
  const [cities, setCities] = useState<AnyRec[]>([])
  const [sellers, setSellers] = useState<AnyRec[]>([])
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ type: "error" | "success"; message: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AnyRec | null>(null)

  // Load the lookup maps once.
  const loadMaps = useCallback(async () => {
    try {
      const [b, c, s] = await Promise.all([
        fetch(`${API}/admin/catalog/brands`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ brands: [] })),
        fetch(`${API}/admin/locations/cities`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ cities: [] })),
        fetch(`${API}/admin/sellers`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ sellers: [] })),
      ])
      setBrands(b.brands || [])
      setCities(c.cities || [])
      setSellers(s.sellers || [])
    } catch { /* maps are best-effort */ }
  }, [])

  const refreshPendingCount = useCallback(async () => {
    try {
      const v = await fetch(`${API}/admin/vehicles?status=pending_approval`, { credentials: "include" }).then((r) => r.json())
      setPendingCount((v.vehicles || []).length)
    } catch { /* ignore */ }
  }, [])

  const loadList = useCallback(async (t: TabKey) => {
    setLoading(true)
    setLoadError(null)
    try {
      const v = await fetch(`${API}/admin/vehicles?status=${STATUS_BY_TAB[t]}`, { credentials: "include" }).then((r) => r.json())
      setVehicles(v.vehicles || [])
      if (t === "pending") setPendingCount((v.vehicles || []).length)
    } catch (e: AnyRec) {
      setLoadError(e?.message || "Failed to load vehicles")
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMaps(); refreshPendingCount() }, [loadMaps, refreshPendingCount])
  useEffect(() => { loadList(tab) }, [tab, loadList])

  const brandMap = useMemo(() => Object.fromEntries(brands.map((b) => [b.id, b])), [brands])
  const cityMap = useMemo(() => Object.fromEntries(cities.map((c) => [c.id, c])), [cities])
  const sellerMap = useMemo(() => Object.fromEntries(sellers.map((s) => [s.id, s])), [sellers])

  const approve = async (id: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`${API}/admin/vehicles/${id}/approve`, { method: "POST", credentials: "include" })
      if (!res.ok) throw new Error(`Approve failed (${res.status})`)
      setVehicles((prev) => prev.filter((v) => v.id !== id))
      refreshPendingCount()
      setFlash({ type: "success", message: "Vehicle approved and published." })
    } catch (e: AnyRec) {
      setFlash({ type: "error", message: e?.message || "Approve failed" })
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (id: string, reason: string, note: string) => {
    setBusyId(id)
    try {
      const res = await fetch(`${API}/admin/vehicles/${id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejection_reason: reason, rejection_note: note }),
      })
      if (!res.ok) throw new Error(`Reject failed (${res.status})`)
      setVehicles((prev) => prev.filter((v) => v.id !== id))
      setRejectTarget(null)
      refreshPendingCount()
      setFlash({ type: "success", message: "Vehicle rejected. The company was notified." })
    } catch (e: AnyRec) {
      setFlash({ type: "error", message: e?.message || "Reject failed" })
    } finally {
      setBusyId(null)
    }
  }

  const count = vehicles.length
  const colCount = tab === "pending" ? 8 : tab === "approved" ? 7 : 7

  const photoOf = (v: AnyRec) => {
    const p = v.photos?.[0]
    return p ? resolveMediaUrl(p) : null
  }

  const cellVehicle = (v: AnyRec) => (
    <div className="flex items-center gap-3">
      {photoOf(v)
        ? <img src={photoOf(v)!} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 6 }} className="border border-ui-border-base" />
        : <div className="flex items-center justify-center rounded-md bg-ui-bg-subtle border border-ui-border-base" style={{ width: 56, height: 42, fontSize: 22 }}>🚗</div>}
      <div className="min-w-0">
        <div className="font-medium text-ui-fg-base truncate">{v.title}</div>
        <div className="text-xs text-ui-fg-subtle">
          {[brandMap[v.brand_id]?.name, v.year].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
    </div>
  )

  const cellSeller = (v: AnyRec) => {
    const seller = sellerMap[v.seller_id]
    return (
      <div className="text-xs">
        {seller ? (
          <Link to={rentalCompanyPath(seller)} className="text-ui-fg-interactive font-medium">{seller.name}</Link>
        ) : (v.seller_id || "—")}
        {seller?.company_phone && <div className="text-ui-fg-subtle">{seller.company_phone}</div>}
      </div>
    )
  }

  const cellPrice = (v: AnyRec) =>
    v.daily_price ? `${v.daily_price} ${(v.currency_code || "aed").toUpperCase()}/day` : "—"

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <BellAlert className="text-ui-fg-subtle" />
            <Heading level="h1">Listing Moderation</Heading>
            {pendingCount > 0 && <Badge color="orange">{pendingCount} waiting</Badge>}
          </div>
          <IconButton onClick={() => { loadList(tab); refreshPendingCount() }} disabled={loading} aria-label="Refresh">
            <ArrowPath />
          </IconButton>
        </div>
        <Text className="text-ui-fg-subtle">
          Vehicles submitted by rental companies. Approve to publish, or reject with a reason. Switch tabs to review what was already approved or rejected.
        </Text>

        {/* Tabs */}
        <div className="mt-4 inline-flex items-center gap-1 rounded-xl bg-ui-bg-subtle p-1">
          <TabButton active={tab === "pending"} onClick={() => setTab("pending")} color="orange" count={pendingCount}>
            Pending
          </TabButton>
          <TabButton active={tab === "approved"} onClick={() => setTab("approved")} color="green">
            Approved
          </TabButton>
          <TabButton active={tab === "rejected"} onClick={() => setTab("rejected")} color="red">
            Rejected
          </TabButton>
        </div>

        {loadError && <Text className="text-ui-fg-error mt-2">{loadError}</Text>}
        {flash?.message && (
          <Text className={`mt-2 ${flash.type === "error" ? "text-ui-fg-error" : "text-ui-fg-success"}`}>
            {flash.message}
          </Text>
        )}
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Vehicle</Table.HeaderCell>
            <Table.HeaderCell>Rental Co.</Table.HeaderCell>
            <Table.HeaderCell>City</Table.HeaderCell>
            <Table.HeaderCell>Price</Table.HeaderCell>
            {tab === "pending" && <Table.HeaderCell>Submitted</Table.HeaderCell>}
            {tab === "approved" && <Table.HeaderCell>Approved</Table.HeaderCell>}
            {tab === "rejected" && <Table.HeaderCell>Reason</Table.HeaderCell>}
            {tab === "rejected" && <Table.HeaderCell>Rejected</Table.HeaderCell>}
            {tab === "pending" && <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>}
            {tab === "approved" && <Table.HeaderCell className="text-right">Status</Table.HeaderCell>}
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={colCount}>Loading…</Table.Cell></Table.Row>}
            {!loading && count === 0 && (
              <Table.Row><Table.Cell colSpan={colCount} className="text-center py-10 text-ui-fg-muted">
                {tab === "pending" ? "No pending approvals 🎉" : tab === "approved" ? "No approved vehicles yet." : "No rejected vehicles."}
              </Table.Cell></Table.Row>
            )}
            {!loading && vehicles.map((v) => {
              const isBusy = busyId === v.id
              return (
                <Table.Row key={v.id}>
                  <Table.Cell>{cellVehicle(v)}</Table.Cell>
                  <Table.Cell>{cellSeller(v)}</Table.Cell>
                  <Table.Cell>{cityMap[v.city_id]?.name || "—"}</Table.Cell>
                  <Table.Cell>{cellPrice(v)}</Table.Cell>

                  {tab === "pending" && (
                    <Table.Cell className="text-xs text-ui-fg-subtle">{timeAgo(v.created_at)}</Table.Cell>
                  )}

                  {tab === "approved" && (
                    <Table.Cell>
                      <div className="flex items-center gap-1.5 text-ui-fg-base">
                        <CheckCircleSolid className="text-ui-tag-green-icon" />
                        <span className="text-sm">{fullDate(v.approved_at)}</span>
                      </div>
                      <div className="text-xs text-ui-fg-subtle">{timeAgo(v.approved_at)}</div>
                    </Table.Cell>
                  )}

                  {tab === "rejected" && (
                    <Table.Cell>
                      <Badge color="red">{REJECT_REASONS[v.rejection_reason] || v.rejection_reason || "—"}</Badge>
                      {v.rejection_note && <div className="text-xs text-ui-fg-subtle mt-1 max-w-xs truncate">{v.rejection_note}</div>}
                    </Table.Cell>
                  )}
                  {tab === "rejected" && (
                    <Table.Cell className="text-xs text-ui-fg-subtle">
                      <div className="flex items-center gap-1"><Clock /> {timeAgo(v.rejected_at)}</div>
                    </Table.Cell>
                  )}

                  {tab === "pending" && (
                    <Table.Cell className="text-right">
                      <Button size="small" variant="primary" className="mr-1" isLoading={isBusy} onClick={() => approve(v.id)}>
                        <CheckCircleSolid /> Approve
                      </Button>
                      <Button size="small" variant="danger" disabled={isBusy} onClick={() => setRejectTarget(v)}>
                        <XMark /> Reject
                      </Button>
                    </Table.Cell>
                  )}
                  {tab === "approved" && (
                    <Table.Cell className="text-right">
                      <Badge color="green">Published</Badge>
                    </Table.Cell>
                  )}
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </Container>

      {rejectTarget && (
        <RejectModal
          vehicle={rejectTarget}
          onConfirm={(r: string, n: string) => reject(rejectTarget.id, r, n)}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </SingleColumnPage>
  )
}

export default PendingApprovalsPage
