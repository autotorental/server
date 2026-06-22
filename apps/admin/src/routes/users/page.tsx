import { useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Input, Tabs, Button, Checkbox } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { Users } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Users & Roles", "المستخدمون والأدوار"), icon: Users, nested: "/settings", rank: 54 }

type U = { id: string; email: string; name: string; phone: string | null; role: "vendor" | "client"; company: string | null; country: string | null; created_at: string; source: string }
type Perm = { key: string; label: string }

const fmt = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) } catch { return "—" } }

const ROLE_META: Record<string, { label: string; color: any; emoji: string }> = {
  root:       { label: "Root",       color: "red",    emoji: "👑" },
  admin:      { label: "Admin",      color: "blue",   emoji: "🛡️" },
  supervisor: { label: "Supervisor", color: "purple", emoji: "🧭" },
  support:    { label: "Support",    color: "green",  emoji: "🎧" },
  client:     { label: "Client",     color: "grey",   emoji: "👤" },
}

const Page = () => {
  const [tab, setTab] = useState("roles")

  // ---- Roles & Permissions ----
  const [roles, setRoles] = useState<string[]>([])
  const [perms, setPerms] = useState<Perm[]>([])
  const [matrix, setMatrix] = useState<Record<string, string[]>>({})
  const [rLoading, setRLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/roles`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setRoles(d.roles || []); setPerms(d.permissions || []); setMatrix(d.matrix || {}) } })
      .catch(() => {})
      .finally(() => setRLoading(false))
  }, [])

  const has = (role: string, key: string) => (matrix[role] || []).includes(key)
  const toggle = (role: string, key: string) => {
    if (role === "root") return // root always has everything
    setSaved(false)
    setMatrix((m) => {
      const cur = new Set(m[role] || [])
      cur.has(key) ? cur.delete(key) : cur.add(key)
      return { ...m, [role]: Array.from(cur) }
    })
  }
  const save = async () => {
    setSaving(true); setSaved(false)
    try {
      const r = await fetch(`${API}/admin/roles`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrix }),
      })
      if (r.ok) { const d = await r.json(); setMatrix(d.matrix || matrix); setSaved(true) }
    } finally { setSaving(false) }
  }

  // ---- Accounts list ----
  const [users, setUsers] = useState<U[]>([])
  const [counts, setCounts] = useState({ all: 0, staff: 0, vendors: 0, clients: 0 })
  const [uLoading, setULoading] = useState(true)
  const [accTab, setAccTab] = useState("all")
  const [q, setQ] = useState("")

  useEffect(() => {
    fetch(`${API}/admin/users-segmented`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setUsers(d.users || []); setCounts(d.counts || { all: 0, staff: 0, vendors: 0, clients: 0 }) } })
      .catch(() => {})
      .finally(() => setULoading(false))
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return users.filter((u) => {
      if (accTab === "staff" && u.role !== "staff") return false
      if (accTab === "vendors" && u.role !== "vendor") return false
      if (accTab === "clients" && u.role !== "client") return false
      if (!s) return true
      return [u.email, u.name, u.company, u.phone].filter(Boolean).some((x) => String(x).toLowerCase().includes(s))
    })
  }, [users, accTab, q])

  return (
    <SingleColumnPage>
      <Container className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: "#2563eb16", color: "#2563eb" }}>
            <Users />
          </div>
          <div>
            <Heading level="h1">Users &amp; Roles</Heading>
            <Text size="small" className="text-ui-fg-subtle">Every account on the platform in one place — staff, vendors, customers, and their permissions.</Text>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginTop: "1.25rem" }}>
          {[
            { label: "Dashboard staff", value: counts.staff, c: "#dc2626", hint: "Can log into this admin" },
            { label: "Vendors", value: counts.vendors, c: "#7c3aed", hint: "Rental companies" },
            { label: "Customers", value: counts.clients, c: "#16a34a", hint: "App & website users" },
            { label: "Total accounts", value: counts.all, c: "#2563eb", hint: "Everyone combined" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full" style={{ background: k.c }} /><span className="text-xs font-medium text-ui-fg-subtle">{k.label}</span></div>
              <div className="text-2xl font-semibold text-ui-fg-base mt-1.5 tabular-nums">{Number(k.value).toLocaleString()}</div>
              <div className="text-[11px] text-ui-fg-muted mt-0.5">{k.hint}</div>
            </div>
          ))}
        </div>
      </Container>

      <Container className="p-0">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="px-6 pt-4">
            <Tabs.List>
              <Tabs.Trigger value="roles">🛡️ Roles & Permissions</Tabs.Trigger>
              <Tabs.Trigger value="accounts">👥 Accounts</Tabs.Trigger>
            </Tabs.List>
          </div>

          {/* ===== Roles & Permissions ===== */}
          <Tabs.Content value="roles" className="p-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {roles.map((r) => {
                const m = ROLE_META[r] || { label: r, color: "grey", emoji: "•" }
                return <Badge key={r} color={m.color}>{m.emoji} {m.label}</Badge>
              })}
            </div>

            {rLoading ? (
              <Text className="text-ui-fg-muted py-6">Loading roles…</Text>
            ) : (
              <div className="rounded-xl border border-ui-border-base overflow-hidden">
                <Table>
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell>Permission</Table.HeaderCell>
                      {roles.map((r) => {
                        const m = ROLE_META[r] || { label: r, emoji: "•" }
                        return <Table.HeaderCell key={r} className="text-center">{m.emoji} {m.label}</Table.HeaderCell>
                      })}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {perms.map((p) => (
                      <Table.Row key={p.key}>
                        <Table.Cell className="font-medium">{p.label}</Table.Cell>
                        {roles.map((r) => (
                          <Table.Cell key={r} className="text-center">
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={has(r, p.key)}
                                disabled={r === "root"}
                                onCheckedChange={() => toggle(r, p.key)}
                              />
                            </div>
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
            )}

            <div className="flex items-center gap-3 mt-4">
              <Button variant="primary" onClick={save} disabled={saving || rLoading}>
                {saving ? "Saving…" : "Save permissions"}
              </Button>
              {saved && <Text className="text-ui-fg-interactive text-sm font-medium">✅ Saved</Text>}
              <Text className="text-ui-fg-muted text-xs ml-auto">Root always has full access and cannot be limited.</Text>
            </div>
          </Tabs.Content>

          {/* ===== Accounts ===== */}
          <Tabs.Content value="accounts" className="p-0">
            <Tabs value={accTab} onValueChange={setAccTab}>
              <div className="px-6 pt-4 flex flex-wrap items-center justify-between gap-3">
                <Tabs.List>
                  <Tabs.Trigger value="all">All ({counts.all})</Tabs.Trigger>
                  <Tabs.Trigger value="staff">👑 Staff ({counts.staff})</Tabs.Trigger>
                  <Tabs.Trigger value="vendors">🏢 Vendors ({counts.vendors})</Tabs.Trigger>
                  <Tabs.Trigger value="clients">🧍 Customers ({counts.clients})</Tabs.Trigger>
                </Tabs.List>
                <div className="w-64 max-w-full"><Input placeholder="Search name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              </div>
              <Tabs.Content value={accTab} className="p-0 pt-3">
                <Table>
                  <Table.Header><Table.Row>
                    <Table.HeaderCell>Type</Table.HeaderCell>
                    <Table.HeaderCell>Name</Table.HeaderCell>
                    <Table.HeaderCell>Email</Table.HeaderCell>
                    <Table.HeaderCell>Phone</Table.HeaderCell>
                    <Table.HeaderCell>Company</Table.HeaderCell>
                    <Table.HeaderCell>Country</Table.HeaderCell>
                    <Table.HeaderCell>Joined</Table.HeaderCell>
                  </Table.Row></Table.Header>
                  <Table.Body>
                    {uLoading ? (
                      <Table.Row><Table.Cell colSpan={7}><Text className="text-ui-fg-muted py-4">Loading…</Text></Table.Cell></Table.Row>
                    ) : filtered.length === 0 ? (
                      <Table.Row><Table.Cell colSpan={7}><Text className="text-ui-fg-muted py-4">No users found.</Text></Table.Cell></Table.Row>
                    ) : filtered.map((u) => (
                      <Table.Row key={u.id}>
                        <Table.Cell>{u.role === "vendor" ? <Badge color="purple">🏢 Vendor</Badge> : <Badge color="blue">👤 Client</Badge>}</Table.Cell>
                        <Table.Cell className="font-medium">{u.id.startsWith("cus_") ? <Link to={`/customers/${u.id}`} className="text-ui-fg-interactive hover:underline">{u.name} →</Link> : u.name}</Table.Cell>
                        <Table.Cell className="text-ui-fg-subtle">{u.email}</Table.Cell>
                        <Table.Cell>{u.phone || "—"}</Table.Cell>
                        <Table.Cell>{u.company || "—"}</Table.Cell>
                        <Table.Cell>{u.country ? u.country.toUpperCase() : "—"}</Table.Cell>
                        <Table.Cell className="text-ui-fg-muted">{fmt(u.created_at)}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </Tabs.Content>
            </Tabs>
          </Tabs.Content>
        </Tabs>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
