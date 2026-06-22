import { useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button, Input, Label, Textarea, FocusModal } from "@medusajs/ui"
import { Envelope, ChatBubbleLeftRight, ArrowPath, PencilSquare, ArrowUturnLeft, Trash, XMark, Buildings, Plus } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Inbox", "البريد الوارد"), icon: Envelope, rank: 40 }

const MAILBOX = "info@autotorental.com"

type Acct = {
  id: string
  label: string
  email: string
  from_name: string
  smtp_host: string
  smtp_port: number
  smtp_secure: boolean
  imap_host: string
  imap_port: number
  tls_servername?: string
  password?: string
  has_password?: boolean
  is_default: boolean
}

const blankAcct = (): Acct => ({
  id: "new_" + Math.random().toString(36).slice(2, 8),
  label: "",
  email: "",
  from_name: "",
  smtp_host: "65.108.37.209",
  smtp_port: 465,
  smtp_secure: true,
  imap_host: "65.108.37.209",
  imap_port: 993,
  tls_servername: "litespeed.alkhudarigroup.com",
  password: "",
  has_password: false,
  is_default: false,
})

type Msg = {
  id: string
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  html_message?: string
  status: "unread" | "read" | "replied" | "spam" | "sent"
  source: string
  direction?: "inbound" | "outbound" | null
  mailbox?: string
  to_addr?: string
  country_code?: string
  ip_address?: string
  created_at: string
  replied_at?: string
  deleted_at?: string | null
}

const STATUS_BADGE = { unread: "blue", read: "grey", replied: "green", spam: "red", sent: "purple" } as const

const Page = () => {
  const [items, setItems] = useState<Msg[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [cTo, setCTo] = useState("")
  const [cSubject, setCSubject] = useState("")
  const [cText, setCText] = useState("")
  const [cBusy, setCBusy] = useState(false)
  const [cMsg, setCMsg] = useState("")

  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [view, setView] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Msg | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [filterUnread, setFilterUnread] = useState(false)
  const [filterEmail, setFilterEmail] = useState("")
  const [selectedSig, setSelectedSig] = useState("Professional")
  const [bulkBusy, setBulkBusy] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [replySubject, setReplySubject] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [sendSuccess, setSendSuccess] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState("")

  // Mail accounts
  const [accounts, setAccounts] = useState<Acct[]>([])
  const [cFrom, setCFrom] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draft, setDraft] = useState<Acct[]>([])
  const [savingAccounts, setSavingAccounts] = useState(false)
  const [accountsMsg, setAccountsMsg] = useState("")

  const defaultEmail = useMemo(
    () => (accounts.find((a) => a.is_default) || accounts[0])?.email || MAILBOX,
    [accounts]
  )

  const loadAccounts = () => {
    fetch(`${API}/admin/inbox/accounts`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.accounts) {
          setAccounts(d.accounts)
          setCFrom((prev) => prev || (d.accounts.find((a: Acct) => a.is_default) || d.accounts[0])?.email || "")
        }
      })
  }

  const openSettings = () => {
    setDraft(accounts.length ? accounts.map((a) => ({ ...a, password: "" })) : [{ ...blankAcct(), is_default: true }])
    setAccountsMsg("")
    setSettingsOpen(true)
  }

  const updateDraft = (id: string, patch: Partial<Acct>) =>
    setDraft((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const setDefaultDraft = (id: string) =>
    setDraft((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })))

  const removeDraft = (id: string) =>
    setDraft((prev) => {
      const next = prev.filter((a) => a.id !== id)
      if (next.length && !next.some((a) => a.is_default)) next[0].is_default = true
      return next
    })

  const addDraft = () => setDraft((prev) => [...prev, { ...blankAcct(), is_default: prev.length === 0 }])

  const saveAccounts = async () => {
    if (!draft.some((a) => (a.email || "").trim())) {
      setAccountsMsg("⚠️ Add at least one account with an email address")
      return
    }
    setSavingAccounts(true)
    setAccountsMsg("")
    try {
      const r = await fetch(`${API}/admin/inbox/accounts`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: draft }),
      })
      const d = await r.json()
      if (!r.ok) {
        setAccountsMsg("⚠️ " + (d.message || "Save failed"))
        return
      }
      setAccounts(d.accounts || [])
      setAccountsMsg("✅ Mail accounts saved")
      setTimeout(() => {
        setSettingsOpen(false)
        setAccountsMsg("")
        loadAccounts()
      }, 1200)
    } catch (e: any) {
      setAccountsMsg("⚠️ " + (e.message || "Network error"))
    } finally {
      setSavingAccounts(false)
    }
  }

  const sendCompose = async () => {
    setCBusy(true)
    setCMsg("")
    try {
      const r = await fetch(`${API}/admin/inbox/compose`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: cTo, subject: cSubject, text: cText, from_account: cFrom || undefined, log_in_inbox: true }),
      })
      const d = await r.json()
      if (!r.ok) {
        setCMsg("⚠️ " + (d.message || "Send failed"))
        return
      }
      setCMsg("✅ Email sent")
      setCTo("")
      setCSubject("")
      setCText("")
      load()
      setTimeout(() => {
        setComposeOpen(false)
        setCMsg("")
      }, 1500)
    } catch (e: any) {
      setCMsg("⚠️ " + (e.message || "Network error"))
    } finally {
      setCBusy(false)
    }
  }

  const openReply = (m: Msg) => {
    setReplyOpen(true)
    setReplySubject(`Re: ${m.subject || "Your message"}`)
    setReplyText(`Hi ${m.name},\n\nThanks for reaching out.\n\n`)
    setSendError("")
    setSendSuccess(false)
  }

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return
    setSending(true)
    setSendError("")
    setSendSuccess(false)
    try {
      const r = await fetch(`${API}/admin/inbox/${selected.id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replySubject, text: replyText, from_account: selected.mailbox || undefined, mark_replied: true }),
      })
      const d = await r.json()
      if (!r.ok) {
        setSendError(d.message || "Send failed")
        return
      }
      setSendSuccess(true)
      setTimeout(() => {
        setReplyOpen(false)
        load()
      }, 1500)
    } catch (e: any) {
      setSendError(e.message)
    } finally {
      setSending(false)
    }
  }

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filter !== "all") params.set("status", filter)
    if (view !== "all") params.set("view", view)
    if (search.trim()) params.set("q", search.trim())
    const qs = params.toString() ? `?${params}` : ""
    fetch(`${API}/admin/inbox${qs}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setItems(d.items || [])
          setCounts(d.counts || {})
        }
      })
      .finally(() => setLoading(false))
  }

  const syncMailbox = async (silent = false) => {
    if (!silent) {
      setSyncing(true)
      setSyncMsg("")
    }
    try {
      const r = await fetch(`${API}/admin/inbox/sync`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const ct = r.headers.get("content-type") || ""
      const d = ct.includes("application/json") ? await r.json() : {}
      if (!r.ok) {
        if (!silent) setSyncMsg("⚠️ " + (d.message || d.errors?.[0] || "Sync failed — check mail settings"))
        return
      }
      if (!silent) setSyncMsg(`✅ Synced: ${d.inbox || 0} inbox, ${d.sent || 0} sent`)
      load()
    } catch (e: any) {
      if (!silent) setSyncMsg("⚠️ " + (e.message || "Network error"))
    } finally {
      if (!silent) setSyncing(false)
    }
  }

  useEffect(load, [filter, view])

  // Clear multi-select when switching view/filter
  useEffect(() => setSelectedIds([]), [filter, view])

  useEffect(() => {
    loadAccounts()
    syncMailbox(true)
    const t = setInterval(() => syncMailbox(true), 5 * 60 * 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateStatus = async (id: string, status: string) => {
    // Optimistic local update — DON'T re-fetch the whole list (that caused the list
    // to flicker/"refresh" on every email click). Just patch the row in place.
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, status: status as Msg["status"] } : m)))
    if (selected?.id === id) setSelected((prev) => (prev ? { ...prev, status: status as Msg["status"] } : prev))
    if (status === "read") {
      setCounts((prev) => ({ ...prev, unread: Math.max(0, (prev?.unread || 0) - 1) }))
    }
    try {
      await fetch(`${API}/admin/inbox/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
    } catch {}
  }

  const remove = async (id: string, permanent = false) => {
    const p = permanent || view === "deleted"
    const ask = p
      ? "Permanently delete this message? This cannot be undone."
      : "Move this message to Deleted? (auto-removed after 15 days)"
    if (!confirm(ask)) return
    await fetch(`${API}/admin/inbox/${id}${p ? "?permanent=1" : ""}`, { method: "DELETE", credentials: "include" })
    setSelected(null)
    load()
  }

  const filtered = useMemo(() => {
    let result = items;
    if (filterUnread) result = result.filter((m) => m.status === "unread");
    if (filterEmail) {
      const q = filterEmail.toLowerCase();
      result = result.filter((m) => m.email.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    }
    if (!search) return result;
    const s = search.toLowerCase();
    return result.filter(
      (m) =>
        m.name.toLowerCase().includes(s) ||
        m.email.toLowerCase().includes(s) ||
        m.message.toLowerCase().includes(s) ||
        (m.subject || "").toLowerCase().includes(s)
    );
  }, [items, search, filterUnread, filterEmail])

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const allSelected = filtered.length > 0 && filtered.every((m) => selectedIds.includes(m.id))

  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : filtered.map((m) => m.id))

  const bulkDelete = async () => {
    if (!selectedIds.length) return
    const permanent = view === "deleted"
    const ask = permanent
      ? `Permanently delete ${selectedIds.length} message(s)? This cannot be undone.`
      : `Move ${selectedIds.length} message(s) to Deleted? (auto-removed after 15 days)`
    if (!confirm(ask)) return
    setBulkBusy(true)
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API}/admin/inbox/${id}${permanent ? "?permanent=1" : ""}`, { method: "DELETE", credentials: "include" })
        )
      )
      if (selected && selectedIds.includes(selected.id)) setSelected(null)
      setSelectedIds([])
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  const bulkRestore = async () => {
    if (!selectedIds.length) return
    setBulkBusy(true)
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`${API}/admin/inbox/${id}`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "restore" }),
          })
        )
      )
      if (selected && selectedIds.includes(selected.id)) setSelected(null)
      setSelectedIds([])
      load()
    } finally {
      setBulkBusy(false)
    }
  }

  const restore = async (id: string) => {
    await fetch(`${API}/admin/inbox/${id}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    })
    setSelected(null)
    load()
  }

  const isOutbound = (m: Msg) =>
    m.direction === "outbound" || m.status === "sent" || m.source === "outbound" || m.source === "zoho_imap_sent" || m.source === "imap_sent"

  const colorHash = (email: string): string => {
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#6366f1", "#f43f5e"];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

const initials = (s: string) =>
    (s || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?"

  const total = items.length
  const unread = counts.unread || 0

  const KPIS = [
    { label: "Total", value: total, color: "#1753b0", icon: "📬" },
    { label: "Unread", value: unread, color: "#0ea5e9", icon: "🔵" },
    { label: "Replied", value: counts.replied || 0, color: "#16a34a", icon: "✅" },
    { label: "Sent", value: counts.sent || 0, color: "#a855f7", icon: "📤" },
  ]

  return (
    <SingleColumnPage>
      {/* Header */}
      <Container className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center rounded-xl text-white shrink-0"
              style={{ width: 48, height: 48, backgroundImage: "linear-gradient(135deg, #1753b0, #0ea5e9)" }}
            >
              <Envelope />
            </div>
            <div>
              <Heading level="h1">Inbox</Heading>
              <Text size="small" className="text-ui-fg-subtle max-w-xl">
                {accounts.length > 1 ? (
                  <>Managing <strong className="text-ui-fg-base">{accounts.length} mailboxes</strong> (default <strong className="text-ui-fg-base">{defaultEmail}</strong>)</>
                ) : (
                  <>Full mailbox for <strong className="text-ui-fg-base">{defaultEmail}</strong></>
                )}{" "}
                — read, reply, and send email directly from the dashboard. Use <strong>Mail settings</strong> to add more
                email accounts.
              </Text>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="transparent" onClick={openSettings}>
              <Buildings /> Mail settings
            </Button>
            <Button variant="secondary" onClick={() => syncMailbox(false)} disabled={syncing}>
              <ArrowPath /> {syncing ? "Syncing…" : "Sync mailbox"}
            </Button>
            <Button onClick={() => { setCMsg(""); setComposeOpen(true) }}>
              <PencilSquare /> Compose email
            </Button>
          </div>
        </div>
        {syncMsg && (
          <div
            className={`mt-3 text-sm font-medium px-3 py-2 rounded-lg inline-block border ${
              syncMsg.startsWith("✅")
                ? "bg-ui-tag-green-bg border-ui-tag-green-border text-ui-tag-green-text"
                : "bg-ui-tag-red-bg border-ui-tag-red-border text-ui-fg-error"
            }`}
          >
            {syncMsg}
          </div>
        )}
      </Container>

      {/* KPI cards */}
      <Container className="p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {KPIS.map((c) => (
            <div key={c.label} className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest p-4">
              <div className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 32, height: 32, backgroundColor: c.color + "1A", fontSize: 15 }}
                >
                  {c.icon}
                </span>
                <Text size="xsmall" className="text-ui-fg-muted font-medium">{c.label}</Text>
              </div>
              <div className="text-2xl sm:text-3xl font-semibold tabular-nums mt-2" style={{ color: c.color }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
      </Container>

      <Container className="p-4 sm:p-6">
        {/* View tabs */}
        <div className="flex gap-2 flex-wrap items-center mb-3">
          {[
            { id: "all", label: "All mail" },
            { id: "inbox", label: "Inbox" },
            { id: "sent", label: "Sent" },
            { id: "contact", label: "Contact form" },
            { id: "deleted", label: `Deleted${counts.deleted ? ` (${counts.deleted})` : ""}` },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                view === v.id
                  ? "bg-ui-fg-base border-ui-fg-base text-ui-contrast-fg-primary"
                  : "bg-ui-bg-base border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {/* Status filter + search */}
        <div className="flex gap-2 flex-wrap items-center mb-4">
          {["all", "unread", "read", "replied", "sent", "spam"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === s
                  ? "bg-ui-bg-highlight border-ui-border-strong text-ui-fg-base"
                  : "bg-ui-bg-base border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && counts[s] !== undefined && ` (${counts[s]})`}
            </button>
          ))}
          <div className="flex-1 min-w-[200px] flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search name, email, subject…"
            />
            <Button variant="secondary" size="small" onClick={load}>Search</Button>
          </div>
        </div>

        {view === "deleted" && (
          <div className="mb-4 text-sm px-3 py-2 rounded-lg border bg-ui-tag-orange-bg border-ui-tag-orange-border text-ui-tag-orange-text flex items-center gap-2">
            <Trash />
            Deleted messages are kept here for <strong>15 days</strong>, then permanently removed automatically. Restore a message to move it back to your inbox.
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-ui-fg-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-12 text-center">
            <Envelope className="mx-auto text-ui-fg-muted" />
            <div className="font-semibold text-ui-fg-base mt-2">No messages</div>
            <div className="text-sm text-ui-fg-muted mt-1 max-w-md mx-auto">
              Click <strong>Sync mailbox</strong> to import mail from {MAILBOX}, or compose a new email.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(0, 1.6fr)", gap: "1rem", alignItems: "start" }}>
            {/* List */}
            <div>
              {/* Selection toolbar */}
              <div className="flex items-center gap-3 flex-wrap mb-2 px-1">
                <label className="flex items-center gap-2 text-xs font-medium text-ui-fg-subtle cursor-pointer">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                  Select all
                </label>
                {selectedIds.length > 0 && (
                  <>
                    <span className="text-xs text-ui-fg-muted">{selectedIds.length} selected</span>
                    {view === "deleted" && (
                      <Button variant="secondary" size="small" onClick={bulkRestore} isLoading={bulkBusy} disabled={bulkBusy}>
                        <ArrowUturnLeft /> Restore selected
                      </Button>
                    )}
                    <Button variant="danger" size="small" onClick={bulkDelete} isLoading={bulkBusy} disabled={bulkBusy}>
                      <Trash /> {view === "deleted" ? "Delete permanently" : "Delete selected"}
                    </Button>
                    <Button variant="transparent" size="small" onClick={() => setSelectedIds([])}>
                      Clear
                    </Button>
                  </>
                )}
              </div>

              <div className="bg-ui-bg-base border border-ui-border-base rounded-xl overflow-hidden max-h-[640px] overflow-y-auto">
                {filtered.map((m) => {
                  const out = isOutbound(m)
                  const checked = selectedIds.includes(m.id)
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2 items-start p-3 border-b border-ui-border-base last:border-b-0 transition ${
                        checked ? "bg-ui-bg-highlight" : selected?.id === m.id ? "bg-ui-bg-subtle" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(m.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 shrink-0 cursor-pointer"
                        title="Select message"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(m)
                          if (m.status === "unread") updateStatus(m.id, "read")
                        }}
                        className="flex gap-3 text-left flex-1 min-w-0 rounded-lg hover:bg-ui-bg-subtle -m-1 p-1"
                      >
                        <span
                          className="flex items-center justify-center rounded-full shrink-0 text-white text-xs font-semibold"
                          style={{ width: 38, height: 38, backgroundImage: out ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "linear-gradient(135deg,#1753b0,#0ea5e9)" }}
                        >
                          {out ? "↗" : initials(m.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`font-semibold truncate flex-1 ${m.status === "unread" ? "text-ui-fg-base" : "text-ui-fg-subtle"}`}>
                              {out ? `To: ${m.email}` : m.name}
                            </div>
                            {m.status === "unread" && <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: "#0ea5e9" }} />}
                            <div className="text-[10px] text-ui-fg-muted whitespace-nowrap">
                              {new Date(m.created_at).toLocaleDateString("en-AE", { month: "short", day: "numeric" })}
                            </div>
                          </div>
                          <div className="text-xs text-ui-fg-base font-medium truncate mt-0.5">{m.subject || "(no subject)"}</div>
                          <div className="text-xs text-ui-fg-muted truncate mt-0.5">{m.message.slice(0, 90)}</div>
                        </div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Reading pane */}
            <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-5 min-h-[420px]">
              {!selected ? (
                <div className="text-center text-ui-fg-muted py-20">
                  <ChatBubbleLeftRight className="mx-auto" />
                  <div className="font-semibold text-ui-fg-base mt-2">Select a message</div>
                  <div className="text-sm mt-1">Click any message on the left to read it.</div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <Heading level="h2" className="text-lg">{selected.subject || "(no subject)"}</Heading>
                      <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                        {isOutbound(selected) ? (
                          <>
                            <span className="text-ui-fg-muted">From</span> <strong>{selected.mailbox || defaultEmail}</strong>
                            <span className="text-ui-fg-muted">→</span>
                            <a href={`mailto:${selected.email}`} className="text-ui-fg-interactive">{selected.to_addr || selected.email}</a>
                          </>
                        ) : (
                          <>
                            <strong className="text-ui-fg-base">{selected.name}</strong>
                            <a href={`mailto:${selected.email}`} className="text-ui-fg-interactive">{selected.email}</a>
                            {selected.phone && (<><span className="text-ui-fg-muted">·</span><a href={`tel:${selected.phone}`} className="text-ui-fg-interactive">{selected.phone}</a></>)}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-ui-fg-muted mt-1">
                        {new Date(selected.created_at).toLocaleString("en-AE")}
                        {selected.country_code ? ` · 📍 ${selected.country_code}` : ""}
                      </div>
                    </div>
                    <Badge color={(STATUS_BADGE[selected.status] ?? "grey") as any}>{selected.status}</Badge>
                  </div>

                  {selected.html_message ? (
                    // Untrusted inbound HTML — render inside a fully sandboxed iframe
                    // (no scripts, no same-origin) so it can't run in the admin session.
                    <iframe
                      title="Message content"
                      sandbox=""
                      srcDoc={selected.html_message}
                      className="bg-ui-bg-subtle rounded-lg mt-4 w-full"
                      style={{ height: 420, border: "1px solid var(--border-base, #e5e7eb)" }}
                    />
                  ) : (
                    <div className="bg-ui-bg-subtle rounded-lg p-4 mt-4 whitespace-pre-line text-sm leading-relaxed text-ui-fg-base">
                      {selected.message}
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap mt-4">
                    {view === "deleted" ? (
                      <>
                        <Button onClick={() => restore(selected.id)}><ArrowUturnLeft /> Restore</Button>
                        <Button variant="danger" onClick={() => remove(selected.id, true)}><Trash /> Delete permanently</Button>
                      </>
                    ) : (
                      <>
                        {!isOutbound(selected) && (
                          <Button onClick={() => openReply(selected)}><ArrowUturnLeft /> Reply by email</Button>
                        )}
                        {selected.phone && !isOutbound(selected) && (
                          <a
                            href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${selected.name}, thanks for contacting Auto to Rental.`)}`}
                            target="_blank"
                            rel="noopener"
                          >
                            <Button variant="secondary" onClick={() => updateStatus(selected.id, "replied")}>💬 WhatsApp</Button>
                          </a>
                        )}
                        <Button variant="secondary" onClick={() => updateStatus(selected.id, "spam")}>Mark spam</Button>
                        <Button variant="danger" onClick={() => remove(selected.id)}><Trash /> Delete</Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Container>

      {/* Reply modal */}
      {replyOpen && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setReplyOpen(false)}>
          <div className="bg-ui-bg-base rounded-xl max-w-2xl w-full p-6 shadow-elevation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <Heading level="h2" className="flex items-center gap-2"><ArrowUturnLeft /> Reply to {selected.name}</Heading>
              <Button variant="transparent" size="small" onClick={() => setReplyOpen(false)}><XMark /></Button>
            </div>
            <div className="text-xs text-ui-fg-muted mb-4">
              To <strong>{selected.email}</strong> · from {selected.mailbox || defaultEmail}
            </div>
            <div className="flex flex-col gap-1 mb-3">
              <Label size="small">Subject</Label>
              <Input value={replySubject} onChange={(e) => setReplySubject(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label size="small">Message</Label>
              <Textarea rows={9} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply…" />
            </div>
            {sendError && (
              <div className="bg-ui-tag-red-bg border border-ui-tag-red-border rounded-lg p-2 mt-3 text-sm text-ui-fg-error">{sendError}</div>
            )}
            {sendSuccess && (
              <div className="bg-ui-tag-green-bg border border-ui-tag-green-border rounded-lg p-2 mt-3 text-sm text-ui-tag-green-text">✅ Reply sent successfully</div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" onClick={() => setReplyOpen(false)}>Cancel</Button>
              <Button onClick={sendReply} isLoading={sending} disabled={sending || !replyText.trim()}>Send reply</Button>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      <FocusModal open={composeOpen} onOpenChange={setComposeOpen}>
        <FocusModal.Content style={{ maxWidth: 720 }}>
          <FocusModal.Header><Heading className="flex items-center gap-2"><PencilSquare /> Compose email — {cFrom || defaultEmail}</Heading></FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <div className="p-6 space-y-4">
              {accounts.length > 1 && (
                <div className="flex flex-col gap-1">
                  <Label size="small">From account</Label>
                  <select
                    value={cFrom}
                    onChange={(e) => setCFrom(e.target.value)}
                    className="bg-ui-bg-field border border-ui-border-base rounded-lg px-3 py-2 text-sm text-ui-fg-base"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.email}>
                        {a.label ? `${a.label} — ${a.email}` : a.email}{a.is_default ? " (default)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <Label size="small">To *</Label>
                <Input type="email" dir="ltr" value={cTo} onChange={(e) => setCTo(e.target.value)} placeholder="client@example.com" />
              </div>
              <div className="flex flex-col gap-1">
                <Label size="small">Subject *</Label>
                <Input value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="Welcome to Auto to Rental" />
              </div>
              <div className="flex flex-col gap-1">
                <Label size="small">Message *</Label>
                <Textarea rows={10} value={cText} onChange={(e) => setCText(e.target.value)} placeholder="Hi! Thanks for your interest…" />
                <Text size="xsmall" className="text-ui-fg-muted mt-1">Sent from {cFrom || defaultEmail} via SMTP, wrapped in the branded Auto to Rental template.</Text>
              </div>
              {cMsg && (
                <div className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  cMsg.startsWith("✅")
                    ? "bg-ui-tag-green-bg border-ui-tag-green-border text-ui-tag-green-text"
                    : "bg-ui-tag-red-bg border-ui-tag-red-border text-ui-fg-error"
                }`}>{cMsg}</div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-ui-border-base">
                <Button variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
                <Button onClick={sendCompose} isLoading={cBusy} disabled={cBusy || !cTo || !cSubject || !cText}>Send email</Button>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Mail settings modal */}
      <FocusModal open={settingsOpen} onOpenChange={setSettingsOpen}>
        <FocusModal.Content style={{ maxWidth: 860 }}>
          <FocusModal.Header><Heading className="flex items-center gap-2"><Buildings /> Mail settings — email accounts</Heading></FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <div className="p-6 space-y-4">
              <Text size="small" className="text-ui-fg-subtle">
                Add one or more mailboxes. Each account uses its own incoming (IMAP) and outgoing (SMTP) server, email and
                password. The <strong>default</strong> account is used for new emails and the storefront. Passwords are
                stored on your server and never shown back — leave the password field blank to keep the saved one.
              </Text>

              {draft.map((a, idx) => (
                <div key={a.id} className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center rounded-lg text-white shrink-0" style={{ width: 30, height: 30, backgroundImage: "linear-gradient(135deg,#1753b0,#0ea5e9)", fontSize: 12 }}>
                        {idx + 1}
                      </span>
                      <Text className="font-semibold text-ui-fg-base">{a.label || a.email || "New account"}</Text>
                      {a.is_default ? (
                        <Badge color="green" size="2xsmall">Default</Badge>
                      ) : (
                        <Button type="button" variant="transparent" size="small" onClick={() => setDefaultDraft(a.id)}>Set default</Button>
                      )}
                      {a.has_password && <Badge color="grey" size="2xsmall">Password saved</Badge>}
                    </div>
                    {draft.length > 1 && (
                      <Button type="button" variant="transparent" size="small" onClick={() => removeDraft(a.id)} title="Remove account">
                        <Trash />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <Label size="small">Display name</Label>
                      <Input value={a.label} onChange={(e) => updateDraft(a.id, { label: e.target.value })} placeholder="Support / Sales / Info" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label size="small">Email address *</Label>
                      <Input type="email" dir="ltr" value={a.email} onChange={(e) => updateDraft(a.id, { email: e.target.value })} placeholder="sales@autotorental.com" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label size="small">Sender name (From)</Label>
                      <Input value={a.from_name} onChange={(e) => updateDraft(a.id, { from_name: e.target.value })} placeholder="Auto to Rental" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label size="small">Password</Label>
                      <Input type="password" dir="ltr" autoComplete="new-password" value={a.password || ""} onChange={(e) => updateDraft(a.id, { password: e.target.value })} placeholder={a.has_password ? "•••••••• (unchanged)" : "Mailbox password"} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-3 space-y-2">
                      <Text size="xsmall" className="font-semibold text-ui-fg-base">Outgoing — SMTP</Text>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 flex flex-col gap-1">
                          <Label size="small">Server</Label>
                          <Input dir="ltr" value={a.smtp_host} onChange={(e) => updateDraft(a.id, { smtp_host: e.target.value })} placeholder="mail.autotorental.com" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label size="small">Port</Label>
                          <Input dir="ltr" inputMode="numeric" value={String(a.smtp_port)} onChange={(e) => updateDraft(a.id, { smtp_port: Number(e.target.value) || 0 })} placeholder="465" />
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-ui-fg-subtle">
                        <input type="checkbox" checked={a.smtp_secure} onChange={(e) => updateDraft(a.id, { smtp_secure: e.target.checked })} />
                        Use SSL/TLS (port 465). Uncheck for STARTTLS (port 587).
                      </label>
                    </div>

                    <div className="rounded-lg border border-ui-border-base bg-ui-bg-base p-3 space-y-2">
                      <Text size="xsmall" className="font-semibold text-ui-fg-base">Incoming — IMAP</Text>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 flex flex-col gap-1">
                          <Label size="small">Server</Label>
                          <Input dir="ltr" value={a.imap_host} onChange={(e) => updateDraft(a.id, { imap_host: e.target.value })} placeholder="mail.autotorental.com" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label size="small">Port</Label>
                          <Input dir="ltr" inputMode="numeric" value={String(a.imap_port)} onChange={(e) => updateDraft(a.id, { imap_port: Number(e.target.value) || 0 })} placeholder="993" />
                        </div>
                      </div>
                      <Text size="xsmall" className="text-ui-fg-muted">IMAP over SSL (port 993) is used to sync this mailbox.</Text>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label size="small">TLS certificate name (advanced)</Label>
                    <Input dir="ltr" value={a.tls_servername || ""} onChange={(e) => updateDraft(a.id, { tls_servername: e.target.value })} placeholder="litespeed.alkhudarigroup.com" />
                    <Text size="xsmall" className="text-ui-fg-muted">Only needed when connecting by IP — the name on the mail server's SSL certificate. Leave blank to use the default.</Text>
                  </div>
                </div>
              ))}

              <Button variant="secondary" onClick={addDraft}><Plus /> Add another email account</Button>

              {accountsMsg && (
                <div className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                  accountsMsg.startsWith("✅")
                    ? "bg-ui-tag-green-bg border-ui-tag-green-border text-ui-tag-green-text"
                    : "bg-ui-tag-red-bg border-ui-tag-red-border text-ui-fg-error"
                }`}>{accountsMsg}</div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-ui-border-base">
                <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                <Button onClick={saveAccounts} isLoading={savingAccounts} disabled={savingAccounts}>Save accounts</Button>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}

export default Page
