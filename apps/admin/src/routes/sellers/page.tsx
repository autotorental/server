import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Input, Button, FocusModal, Label } from "@medusajs/ui"
import { Buildings, Users, Trash, Key } from "@medusajs/icons"
import { Link } from "react-router-dom"

export const config: RouteConfig = { label: "Rental Companies", icon: Buildings, rank: 3 }

const API = "https://api.autotorental.com"

type Seller = {
  id: string
  name: string
  handle?: string | null
  email?: string | null
  phone?: string | null
  status?: string | null
  trade_license_verified?: boolean
  trade_license_expiry?: string | null
  subscription_status?: string | null
  created_at: string
}

const Page = () => {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [resetSeller, setResetSeller] = useState<Seller | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [resetBusy, setResetBusy] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [resetError, setResetError] = useState("")

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
           (s.handle || "").toLowerCase().includes(needle)
  })

  const totalFollowers = Object.values(counts).reduce((a, b) => a + b, 0)

  const openReset = (s: Seller) => {
    setResetSeller(s)
    setNewPassword("")
    setResetDone(false)
    setResetError("")
  }

  const doResetPassword = async () => {
    if (!resetSeller) return
    setResetBusy(true)
    setResetError("")
    try {
      const r = await fetch(`${API}/admin/sellers/${resetSeller.id}/reset-password`, {
        method: "POST", credentials: "include",
      })
      const d = await r.json()
      if (!r.ok) { setResetError(d.message || "Failed"); return }
      setNewPassword(d.new_password)
      setResetDone(true)
    } catch (e: any) { setResetError(e.message) }
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
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <Heading level="h1">🏢 Rental Companies</Heading>
          <div className="flex items-center gap-2">
            <Badge color="blue">{sellers.length} companies</Badge>
            <Badge color="purple"><Users className="inline-block mr-1"/>{totalFollowers.toLocaleString()} total followers</Badge>
          </div>
        </div>
        <Text className="text-ui-fg-subtle mb-4">All registered rental companies — verify trade licenses, view followers, manage subscriptions.</Text>
        <Input placeholder="Search by name, email, or handle…" value={q} onChange={e => setQ(e.target.value)} />
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Company</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>License</Table.HeaderCell>
              <Table.HeaderCell className="text-right">👥 Followers</Table.HeaderCell>
              <Table.HeaderCell>Subscription</Table.HeaderCell>
              <Table.HeaderCell>Joined</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={8}>Loading…</Table.Cell></Table.Row>}
            {!loading && filtered.length === 0 && (
              <Table.Row><Table.Cell colSpan={8} className="text-center py-8 text-ui-fg-muted">No companies match your search</Table.Cell></Table.Row>
            )}
            {filtered.map(s => {
              const expired = s.trade_license_expiry ? new Date(s.trade_license_expiry) < new Date() : false
              const licStatus = !s.trade_license_verified ? "pending" : expired ? "expired" : "verified"
              const licColor: any = licStatus === "verified" ? "green" : licStatus === "expired" ? "red" : "orange"
              return (
                <Table.Row key={s.id}>
                  <Table.Cell className="font-medium">
                    <Link to={`/stores/${s.id}`} className="text-ui-fg-base hover:text-ui-fg-interactive">{s.name}</Link>
                    {s.handle && <div className="text-xs text-ui-fg-muted">{s.handle}</div>}
                  </Table.Cell>
                  <Table.Cell className="text-xs">{s.email || "—"}</Table.Cell>
                  <Table.Cell><Badge color={s.status === "active" ? "green" : s.status === "rejected" ? "red" : "orange"}>{s.status || "—"}</Badge></Table.Cell>
                  <Table.Cell><Badge color={licColor}>{licStatus}</Badge></Table.Cell>
                  <Table.Cell className="text-right font-bold">{(counts[s.id] || 0).toLocaleString()}</Table.Cell>
                  <Table.Cell><Badge color={s.subscription_status === "active" ? "green" : "grey"}>{s.subscription_status || "trial"}</Badge></Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-muted">{new Date(s.created_at).toLocaleDateString()}</Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openReset(s)}
                        className="text-ui-fg-interactive hover:text-ui-fg-error text-xs flex items-center gap-0.5"
                        title="Reset password"
                      >
                        <Key className="inline-block" /> Reset PW
                      </button>
                      <button
                        onClick={() => doDelete(s)}
                        className="text-ui-fg-error hover:text-red-700 text-xs flex items-center gap-0.5 ml-1"
                        title="Delete account"
                      >
                        <Trash className="inline-block" /> Delete
                      </button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table>
      </Container>

      <FocusModal open={!!resetSeller} onOpenChange={(open) => { if (!open) setResetSeller(null) }}>
        <FocusModal.Content style={{ maxWidth: 520 }}>
          <FocusModal.Header><Heading>🔑 Reset Password</Heading></FocusModal.Header>
          <FocusModal.Body className="p-6 space-y-4">
            {!resetDone ? (
              <>
                <Text>
                  Reset password for <strong>{resetSeller?.name}</strong> ({resetSeller?.email})?
                </Text>
                {resetError && <div className="text-ui-fg-error text-sm">{resetError}</div>}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="secondary" onClick={() => setResetSeller(null)}>Cancel</Button>
                  <Button variant="primary" isLoading={resetBusy} onClick={doResetPassword}>Generate New Password</Button>
                </div>
              </>
            ) : (
              <>
                <Text>✅ Password reset successfully!</Text>
                <div className="bg-ui-bg-base border rounded-lg p-4 space-y-2">
                  <div>
                    <Label size="small">New password for {resetSeller?.name}</Label>
                    <Input
                      value={newPassword}
                      readOnly
                      onClick={(e: any) => e.target.select()}
                      className="font-mono text-base mt-1"
                    />
                  </div>
                  <Text size="small" className="text-ui-fg-muted">Share this password with the vendor. They can change it after logging in.</Text>
                </div>
                <div className="flex justify-end pt-4">
                  <Button variant="primary" onClick={() => setResetSeller(null)}>Done</Button>
                </div>
              </>
            )}
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
