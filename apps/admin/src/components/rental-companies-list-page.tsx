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
  created_at: string
}

function daysUntilExpiry(dateStr?: string | null): number | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr); exp.setHours(0, 0, 0, 0)
  if (isNaN(exp.getTime())) return null
  return Math.round((exp.getTime() - today.getTime()) / 86400000)
}

export default function RentalCompaniesListPage() {
  const navigate = useNavigate()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
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
        const list: Seller[] = data.sellers || data.data || []
        setSellers(list)
        const entries = await Promise.all(
          list.map(async (s) => {
            try {
              const r = await fetch(`${API}/admin/sellers/${s.id}/follow-stats`, { credentials: "include" })
              if (!r.ok) return [s.id, 0]
              const j = await r.json()
              return [s.id, j.total || 0]
            } catch { return [s.id, 0] }
          })
        )
        setCounts(Object.fromEntries(entries))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = sellers.filter(s => {
    if (!q) return true
    const needle = q.toLowerCase()
    return (s.name || "").toLowerCase().includes(needle) ||
           (s.email || "").toLowerCase().includes(needle) ||
           (s.handle || "").toLowerCase().includes(needle) ||
           (s.phone || "").toLowerCase().includes(needle)
  })

  const totalFollowers = Object.values(counts).reduce((a, b) => a + b, 0)
  const pendingLicense = sellers.filter(s => !s.trade_license_verified).length
  const expiringSoon = sellers.filter(s => {
    const d = daysUntilExpiry(s.trade_license_expiry)
    return d !== null && d <= 7
  }).length

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
        <div className="flex items-start gap-3 mb-5">
          <div style={{ width: 44, height: 44 }} className="shrink-0 rounded-xl bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center text-ui-fg-subtle">
            <Buildings />
          </div>
          <div className="min-w-0">
            <Heading level="h1">Rental Companies</Heading>
            <Text className="text-ui-fg-subtle">
              Manage all rental companies — edit, reset vendor password, or delete account.
            </Text>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="rounded-xl border border-ui-border-base px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ui-fg-muted">Companies</div>
            <div className="text-2xl font-semibold text-ui-fg-base mt-0.5">{sellers.length}</div>
          </div>
          <div className="rounded-xl border border-ui-border-base px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ui-fg-muted">Followers</div>
            <div className="text-2xl font-semibold text-ui-fg-base mt-0.5 flex items-center gap-1.5">
              <Users className="text-ui-fg-muted" />{totalFollowers.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border border-ui-border-base px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ui-fg-muted">License pending</div>
            <div className="text-2xl font-semibold mt-0.5" style={{ color: pendingLicense ? "#b45309" : undefined }}>{pendingLicense}</div>
          </div>
          <div className="rounded-xl border border-ui-border-base px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-ui-fg-muted">Expiring ≤ 7d</div>
            <div className="text-2xl font-semibold mt-0.5" style={{ color: expiringSoon ? "#dc2626" : undefined }}>{expiringSoon}</div>
          </div>
        </div>

        <Input placeholder="Search name, email, handle, or phone…" value={q} onChange={e => setQ(e.target.value)} />
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Phone</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>License</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Followers</Table.HeaderCell>
              <Table.HeaderCell>Subscription</Table.HeaderCell>
              <Table.HeaderCell>Joined</Table.HeaderCell>
              <Table.HeaderCell className="w-[52px] text-right"> </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={9}>Loading…</Table.Cell></Table.Row>}
            {!loading && filtered.length === 0 && (
              <Table.Row><Table.Cell colSpan={9} className="text-center py-8 text-ui-fg-muted">No companies match your search</Table.Cell></Table.Row>
            )}
            {filtered.map(s => {
              const expired = s.trade_license_expiry ? new Date(s.trade_license_expiry) < new Date() : false
              const licStatus = !s.trade_license_verified ? "pending" : expired ? "expired" : "verified"
              const licColor: "green" | "red" | "orange" = licStatus === "verified" ? "green" : licStatus === "expired" ? "red" : "orange"
              return (
                <Table.Row key={s.id}>
                  <Table.Cell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div style={{ width: 36, height: 36 }} className="shrink-0 rounded-full overflow-hidden border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center text-ui-fg-muted">
                        {s.logo
                          ? <img src={s.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <span style={{ fontSize: 13, fontWeight: 700 }}>{(s.name || "?").charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="min-w-0">
                        <Link to={rentalCompanyPath(s)} className="text-ui-fg-base hover:text-ui-fg-interactive">{s.name}</Link>
                        {s.handle && <div className="text-xs text-ui-fg-muted">/{s.handle}</div>}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-xs">{s.email || "—"}</Table.Cell>
                  <Table.Cell className="text-xs">{s.phone || "—"}</Table.Cell>
                  <Table.Cell><Badge color={s.status === "active" ? "green" : s.status === "rejected" ? "red" : "orange"}>{s.status || "—"}</Badge></Table.Cell>
                  <Table.Cell><Badge color={licColor}>{licStatus}</Badge></Table.Cell>
                  <Table.Cell className="text-right font-bold">{(counts[s.id] || 0).toLocaleString()}</Table.Cell>
                  <Table.Cell><Badge color={s.subscription_status === "active" ? "green" : "grey"}>{s.subscription_status || "trial"}</Badge></Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-muted">{new Date(s.created_at).toLocaleDateString()}</Table.Cell>
                  <Table.Cell className="text-right">
                    <DropdownMenu>
                      <DropdownMenu.Trigger asChild>
                        <IconButton
                          variant="transparent"
                          size="small"
                          aria-label={`Actions for ${s.name}`}
                        >
                          <EllipsisHorizontal />
                        </IconButton>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end" className="min-w-[200px]">
                        <DropdownMenu.Item
                          className="flex items-center gap-x-2"
                          onClick={() => navigate(rentalCompanyPath(s))}
                        >
                          <Eye className="text-ui-fg-subtle" />
                          View details
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="flex items-center gap-x-2"
                          onClick={() => setEditSeller(s)}
                        >
                          <PencilSquare className="text-ui-fg-subtle" />
                          Edit company
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="flex items-center gap-x-2"
                          onClick={() => openReset(s)}
                        >
                          <Key className="text-ui-fg-subtle" />
                          Reset password
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Item
                          className="flex items-center gap-x-2 text-ui-fg-error focus:text-ui-fg-error"
                          onClick={() => doDelete(s)}
                        >
                          <Trash />
                          Delete company
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
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
                  Vendor login: seller.autotorental.com
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
