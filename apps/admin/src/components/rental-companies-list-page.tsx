import { useEffect, useState } from "react"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Input, Button, FocusModal, Label, DropdownMenu, IconButton } from "@medusajs/ui"
import { Buildings, Users, Trash, Key, PencilSquare, Eye, EllipsisHorizontal } from "@medusajs/icons"
import { Link, useNavigate } from "react-router-dom"
import { API } from "../lib/api"
import { rentalCompanyPath } from "../lib/seller-slug"
import { EditCompanyModal } from "./edit-company-modal"

type Seller = {
  id: string
  name: string
  handle?: string | null
  email?: string | null
  phone?: string | null
  logo?: string | null
  status?: string | null
  trade_license_verified?: boolean
  trade_license_expiry?: string | null
  subscription_status?: string | null
  days_left?: number | null
  created_at: string
}

function daysUntilExpiry(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0)
  if (isNaN(exp.getTime())) return null
  return Math.round((exp.getTime() - today.getTime()) / 86400000)
}

type BadgeColor = "green" | "red" | "orange" | "grey" | "blue"

// Human-friendly account status (Medusa stores "open" = live/active).
function accountStatus(status?: string | null): { label: string; color: BadgeColor } {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "open":
      return { label: "Active", color: "green" }
    case "pending_approval":
    case "pending":
      return { label: "Pending review", color: "orange" }
    case "rejected":
      return { label: "Rejected", color: "red" }
    case "suspended":
    case "closed":
    case "disabled":
      return { label: "Suspended", color: "red" }
    default:
      return { label: status ? status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—", color: "grey" }
  }
}

function licenseStatus(verified?: boolean, expired?: boolean): { label: string; color: BadgeColor } {
  if (verified && !expired) return { label: "Verified", color: "green" }
  if (verified && expired) return { label: "Expired", color: "red" }
  return { label: "Not verified", color: "orange" }
}

function subscriptionStatus(status?: string | null): { label: string; color: BadgeColor } {
  switch ((status || "trial").toLowerCase()) {
    case "active": return { label: "Active", color: "green" }
    case "past_due": return { label: "Past due", color: "red" }
    case "canceled":
    case "cancelled": return { label: "Canceled", color: "grey" }
    default: return { label: "Trial", color: "blue" }
  }
}

export default function RentalCompaniesListPage() {
  const navigate = useNavigate()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  // Click a stat card to filter the list to just those companies (e.g. which
  // ones have a license pending). null = show all.
  const [filterMode, setFilterMode] = useState<"license" | "expiring" | null>(null)
  const [resetSeller, setResetSeller] = useState<Seller | null>(null)
  const [customPassword, setCustomPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [resetBusy, setResetBusy] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState("")
  const [editSeller, setEditSeller] = useState<Seller | null>(null)

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/sellers?limit=200`, { credentials: "include" })
      .then(r => r.ok ? r.json() : { sellers: [] })
      .then(async (data) => {
        let list: Seller[] = data.sellers || data.data || []
        // The built-in /admin/sellers list omits our custom trade_license_*
        // columns, so merge them from a dedicated endpoint (one query) — keeps
        // the License + Status badges in sync with the company profile page.
        try {
          const lr = await fetch(`${API}/admin/sellers/licenses`, { credentials: "include" })
          if (lr.ok) {
            const { licenses } = await lr.json()
            list = list.map((s) => {
              const lic = licenses?.[s.id]
              return lic ? { ...s, trade_license_verified: lic.trade_license_verified, trade_license_expiry: lic.trade_license_expiry, status: lic.status ?? s.status } : s
            })
          }
        } catch { /* fall back to list as-is */ }
        setSellers(list)
        // Single batched query for all follower counts (was N+1 per seller).
        try {
          const fr = await fetch(`${API}/admin/sellers/follow-stats`, { credentials: "include" })
          if (fr.ok) {
            const { stats } = await fr.json()
            setCounts(stats || {})
          }
        } catch { /* counts stay empty */ }
        // Merge REAL subscription status + days-left (the built-in /admin/sellers omits these custom columns).
        try {
          const subr = await fetch(`${API}/admin/subscriptions`, { credentials: "include" })
          if (subr.ok) {
            const { subscriptions } = await subr.json()
            const m: Record<string, any> = {}
            for (const x of (subscriptions || [])) m[x.id] = x
            setSellers((prev) => prev.map((s) => (m[s.id] ? { ...s, subscription_status: m[s.id].effective_status, days_left: m[s.id].days_left } : s)))
          }
        } catch { /* subscription stays as-is */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const isExpiringSoon = (s: Seller) => {
    const d = daysUntilExpiry(s.trade_license_expiry)
    return d !== null && d <= 7
  }

  const filtered = sellers.filter(s => {
    // Stat-card filter (license pending / expiring soon).
    if (filterMode === "license" && s.trade_license_verified) return false
    if (filterMode === "expiring" && !isExpiringSoon(s)) return false
    if (!q) return true
    const needle = q.toLowerCase()
    return (s.name || "").toLowerCase().includes(needle) ||
           (s.email || "").toLowerCase().includes(needle) ||
           (s.handle || "").toLowerCase().includes(needle) ||
           (s.phone || "").toLowerCase().includes(needle)
  })

  const totalFollowers = Object.values(counts).reduce((a, b) => a + b, 0)
  const pendingLicense = sellers.filter(s => !s.trade_license_verified).length
  const expiringSoon = sellers.filter(isExpiringSoon).length

  const openReset = (s: Seller) => {
    setResetSeller(s)
    setCustomPassword("")
    setNewPassword("")
    setLoginEmail("")
    setResetDone(false)
    setResetError("")
  }

  const doResetPassword = async () => {
    if (!resetSeller) return
    if (customPassword && customPassword.length < 8) {
      setResetError("Custom password must be at least 8 characters.")
      return
    }
    setResetBusy(true)
    setResetError("")
    try {
      const r = await fetch(`${API}/admin/sellers/${resetSeller.id}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customPassword ? { password: customPassword } : {}),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setResetError(d.message || "Failed to reset password"); return }
      setNewPassword(d.new_password)
      setLoginEmail(d.login_email || resetSeller.email || "")
      setResetDone(true)
    } catch (e: any) { setResetError(e.message || "Failed to reset password") }
    finally { setResetBusy(false) }
  }

  const doDelete = async (s: Seller) => {
    const ok = window.confirm(`Delete "${s.name}" (${s.email})?\n\nAll their vehicles will also be deleted. This cannot be undone.`)
    if (!ok) return
    try {
      const r = await fetch(`${API}/admin/sellers/${s.id}/delete-account`, {
        method: "POST", credentials: "include",
      })
      const d = await r.json()
      if (!r.ok) { alert(d.message || "Delete failed"); return }
      alert(`Deleted "${s.name}"\n${d.vehicles_deleted} vehicles removed`)
      load()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        {/* Header — clean, professional */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center rounded-lg bg-ui-bg-subtle border border-ui-border-base shrink-0" style={{ width: 40, height: 40 }}>
            <Buildings className="text-ui-fg-subtle" />
          </div>
          <div className="min-w-0">
            <Heading level="h1">Rental Companies</Heading>
            <Text size="small" className="text-ui-fg-subtle">Manage all rental companies — edit, reset vendor password, or delete account.</Text>
          </div>
        </div>

        {/* Stat cards — clean */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Buildings className="text-ui-fg-muted" />
              <span className="text-xs font-medium text-ui-fg-subtle">Companies</span>
            </div>
            <div className="text-2xl font-semibold text-ui-fg-base mt-1.5 tabular-nums">{sellers.length}</div>
          </div>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Users className="text-ui-fg-muted" />
              <span className="text-xs font-medium text-ui-fg-subtle">Followers</span>
            </div>
            <div className="text-2xl font-semibold text-ui-fg-base mt-1.5 tabular-nums">{totalFollowers.toLocaleString()}</div>
          </div>
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === "license" ? null : "license")}
            className={`text-left rounded-xl border bg-ui-bg-base px-4 py-3.5 transition-colors hover:border-ui-border-strong ${filterMode === "license" ? "border-ui-fg-interactive ring-1 ring-ui-fg-interactive" : "border-ui-border-base"}`}
            title="Click to show only companies with a pending license"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#d97706" }} />
              <span className="text-xs font-medium text-ui-fg-subtle">License pending</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color: pendingLicense ? "#b45309" : undefined }}>{pendingLicense}</div>
              {pendingLicense > 0 && <span className="text-xs text-ui-fg-interactive">{filterMode === "license" ? "Showing" : "View"}</span>}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode(filterMode === "expiring" ? null : "expiring")}
            className={`text-left rounded-xl border bg-ui-bg-base px-4 py-3.5 transition-colors hover:border-ui-border-strong ${filterMode === "expiring" ? "border-ui-fg-interactive ring-1 ring-ui-fg-interactive" : "border-ui-border-base"}`}
            title="Click to show only companies whose license expires within 7 days"
          >
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#dc2626" }} />
              <span className="text-xs font-medium text-ui-fg-subtle">Expiring ≤ 7d</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-semibold mt-1.5 tabular-nums" style={{ color: expiringSoon ? "#dc2626" : undefined }}>{expiringSoon}</div>
              {expiringSoon > 0 && <span className="text-xs text-ui-fg-interactive">{filterMode === "expiring" ? "Showing" : "View"}</span>}
            </div>
          </button>
        </div>

        {filterMode && (
          <div className="flex items-center justify-between gap-3 mb-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
            <Text size="small" className="text-ui-fg-subtle">
              Showing {filtered.length} {filterMode === "license" ? "company(ies) with a pending license" : "company(ies) expiring within 7 days"}
            </Text>
            <Button size="small" variant="secondary" onClick={() => setFilterMode(null)}>Show all</Button>
          </div>
        )}

        <Input placeholder="Search name, email, handle, or phone…" value={q} onChange={e => setQ(e.target.value)} />
      </Container>

      <Container className="p-6">
        <div className="flex flex-col gap-3">
          {loading && <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-ui-fg-muted">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-ui-fg-muted">No companies match your search</div>
          )}
          {!loading && filtered.map(s => {
            const expired = s.trade_license_expiry ? new Date(s.trade_license_expiry) < new Date() : false
            const acct = accountStatus(s.status)
            const lic = licenseStatus(s.trade_license_verified, expired)
            const sub = subscriptionStatus(s.subscription_status)
            return (
              <div key={s.id} className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden transition-colors hover:border-ui-border-strong">
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-ui-bg-subtle border-b border-ui-border-base">
                  <div className="flex items-center justify-center shrink-0 overflow-hidden" style={{ width: 36, height: 36, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    {s.logo
                      ? <img src={s.logo} alt={s.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{(s.name || "?").charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span title={acct.label} style={{ width: 11, height: 11, borderRadius: 999, flexShrink: 0, display: "inline-block", background: acct.color === "green" ? "#22c55e" : acct.color === "orange" ? "#f59e0b" : acct.color === "red" ? "#ef4444" : "#9ca3af", boxShadow: `0 0 6px ${acct.color === "green" ? "#22c55e" : acct.color === "orange" ? "#f59e0b" : acct.color === "red" ? "#ef4444" : "#9ca3af"}` }} />
                      <Link to={rentalCompanyPath(s)} className="font-sans txt-medium font-semibold text-ui-fg-base truncate hover:text-ui-fg-interactive transition-colors">{s.name}</Link>
                      {s.handle && <span className="text-ui-fg-muted text-sm truncate">/{s.handle}</span>}
                    </div>
                    <p className="font-normal txt-xsmall text-ui-fg-muted font-mono truncate">{s.email || "—"}</p>
                  </div>
                  <span className="hidden lg:flex items-center gap-1 text-ui-fg-muted txt-compact-small whitespace-nowrap" style={{ marginInlineEnd: 4 }}><Users style={{ width: 14, height: 14 }} />{(counts[s.id] || 0).toLocaleString()}</span>
                  <Badge color={acct.color} className="hidden sm:inline-flex">{acct.label}</Badge>
                  {/* License badge: ALWAYS visible when not verified/expired so the
                      owner can spot pending companies at any screen width. */}
                  <Badge color={lic.color} className={lic.color === "green" ? "hidden md:inline-flex" : "inline-flex"}>{lic.label}</Badge>
                  <button type="button" title="Manage subscription" onClick={() => navigate("/subscriptions")} className="hidden lg:inline-flex"><Badge color={sub.color}>{sub.label}{(s.subscription_status === "trial" || s.subscription_status === "active") && (s.days_left ?? 0) > 0 ? ` \u00b7 ${s.days_left}d` : ""}</Badge></button>
                  <Button size="small" variant="transparent" title="View details" onClick={() => navigate(rentalCompanyPath(s))}><Eye /></Button>
                  <Button size="small" variant="transparent" title="Edit company" onClick={() => setEditSeller(s)}><PencilSquare /></Button>
                  <Button size="small" variant="transparent" title="Reset password" onClick={() => openReset(s)}><Key /></Button>
                  <Button size="small" variant="transparent" title="Delete company" onClick={() => doDelete(s)}><Trash /></Button>
                </div>
              </div>
            )
          })}
        </div>
      </Container>

      <FocusModal open={!!resetSeller} onOpenChange={(open) => { if (!open) setResetSeller(null) }}>
        <FocusModal.Content style={{ maxWidth: 520 }}>
          <FocusModal.Header><Heading>Reset password</Heading></FocusModal.Header>
          <FocusModal.Body className="p-6 space-y-4">
            {!resetDone ? (
              <>
                <Text>
                  Reset login for <strong>{resetSeller?.name}</strong>
                  {resetSeller?.email ? ` (${resetSeller.email})` : ""}.
                </Text>
                <Text size="small" className="text-ui-fg-muted">
                  Vendor login: partner.autotorental.com
                </Text>
                <div>
                  <Label size="small">Custom password (optional)</Label>
                  <Input
                    type="text"
                    value={customPassword}
                    onChange={e => setCustomPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="mt-1"
                  />
                </div>
                {resetError && <div className="text-ui-fg-error text-sm rounded-lg border border-ui-border-error bg-ui-bg-error-subtle px-3 py-2">{resetError}</div>}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setResetSeller(null)}>Cancel</Button>
                  <Button variant="primary" isLoading={resetBusy} onClick={doResetPassword}>Reset password</Button>
                </div>
              </>
            ) : (
              <>
                <Text className="font-medium">Password reset successfully</Text>
                <div className="bg-ui-bg-base border rounded-lg p-4 space-y-2">
                  {loginEmail && (
                    <div>
                      <Label size="small">Login email</Label>
                      <Input value={loginEmail} readOnly className="mt-1" onClick={(e: any) => e.target.select()} />
                    </div>
                  )}
                  <div>
                    <Label size="small">New password</Label>
                    <Input value={newPassword} readOnly onClick={(e: any) => e.target.select()} className="font-mono mt-1" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(newPassword).catch(() => {})}>Copy password</Button>
                  <Button variant="primary" onClick={() => setResetSeller(null)}>Done</Button>
                </div>
              </>
            )}
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <EditCompanyModal
        sellerId={editSeller?.id || null}
        sellerName={editSeller?.name}
        onClose={() => setEditSeller(null)}
        onSaved={load}
      />
    </SingleColumnPage>
  )
}
