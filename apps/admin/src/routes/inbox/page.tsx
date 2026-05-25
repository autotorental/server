import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, Textarea, FocusModal } from "@medusajs/ui"
import { Envelope, ChatBubbleLeftRight, ArrowUpRightOnBox, PencilSquare } from "@medusajs/icons"

export const config: RouteConfig = { label: "Inbox", icon: Envelope }

const API = "https://api.autotorental.com"

type Msg = {
  id: string
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
  status: "unread" | "read" | "replied" | "spam"
  source: string
  country_code?: string
  ip_address?: string
  created_at: string
  replied_at?: string
}

const STATUS_BADGE = { unread: "blue", read: "grey", replied: "green", spam: "red" } as const

const Page = () => {
  const [items, setItems] = useState<Msg[]>([])
  const [composeOpen, setComposeOpen] = useState(false)
  const [cTo, setCTo] = useState("")
  const [cSubject, setCSubject] = useState("")
  const [cText, setCText] = useState("")
  const [cBusy, setCBusy] = useState(false)
  const [cMsg, setCMsg] = useState("")

  const sendCompose = async () => {
    setCBusy(true); setCMsg("")
    try {
      const r = await fetch(`${API}/admin/inbox/compose`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: cTo, subject: cSubject, text: cText, log_in_inbox: true }),
      })
      const d = await r.json()
      if (!r.ok) { setCMsg("⚠️ " + (d.message || "Send failed")); return }
      setCMsg("✅ Email sent")
      setCTo(""); setCSubject(""); setCText("")
      // Reload inbox
      if (typeof load === "function") (load as any)()
      setTimeout(() => { setComposeOpen(false); setCMsg("") }, 1500)
    } catch (e: any) {
      setCMsg("⚠️ " + (e.message || "Network error"))
    } finally { setCBusy(false) }
  }
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Msg | null>(null)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [replySubject, setReplySubject] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState("")
  const [sendSuccess, setSendSuccess] = useState(false)

  const openReply = (m: Msg) => {
    setReplyOpen(true)
    setReplySubject(`Re: ${m.subject || "Your message"}`)
    setReplyText(`Hi ${m.name},\n\nThanks for reaching out.\n\n`)
    setSendError(""); setSendSuccess(false)
  }

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return
    setSending(true); setSendError(""); setSendSuccess(false)
    try {
      const r = await fetch(`${API}/admin/inbox/${selected.id}/reply`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replySubject, text: replyText, mark_replied: true }),
      })
      const d = await r.json()
      if (!r.ok) { setSendError(d.message || "Send failed"); return }
      setSendSuccess(true)
      setTimeout(() => { setReplyOpen(false); load() }, 1500)
    } catch (e: any) { setSendError(e.message) }
    finally { setSending(false) }
  }

  const load = () => {
    setLoading(true)
    const qs = filter !== "all" ? `?status=${filter}` : ""
    fetch(`${API}/admin/inbox${qs}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setItems(d.items || []); setCounts(d.counts || {}) } })
      .finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/admin/inbox/${id}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
    if (selected?.id === id) setSelected({ ...selected, status: status as any })
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this message permanently?")) return
    await fetch(`${API}/admin/inbox/${id}`, { method: "DELETE", credentials: "include" })
    setSelected(null)
    load()
  }

  const filtered = useMemo(() => {
    if (!search) return items
    const s = search.toLowerCase()
    return items.filter(m => m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s) || m.message.toLowerCase().includes(s) || (m.subject || "").toLowerCase().includes(s))
  }, [items, search])

  const total = items.length
  const unread = counts.unread || 0

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Heading level="h2" className="text-2xl flex items-center gap-2"><Envelope/> Inbox</Heading>
            <Text className="text-ui-fg-subtle">Messages from the website contact form. Reply directly via email or WhatsApp.</Text>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setComposeOpen(true)}><PencilSquare /> Compose new email</Button>
            <a href="https://webmail.autotorental.com" target="_blank" rel="noopener">
              <Button variant="secondary"><ArrowUpRightOnBox /> Open webmail</Button>
            </a>
          </div>
        </div>
      </Container>

      <Container className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "📬 Total", value: total },
          { label: "🔵 Unread", value: counts.unread || 0, accent: "blue" },
          { label: "✅ Replied", value: counts.replied || 0, accent: "green" },
          { label: "🗑️ Spam", value: counts.spam || 0, accent: "red" },
        ].map(c => (
          <div key={c.label} className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="text-xs text-ui-fg-muted">{c.label}</div>
            <div className="text-2xl font-bold text-ui-fg-base mt-1">{c.value}</div>
          </div>
        ))}
      </Container>

      <Container className="p-6">
        <div className="flex gap-3 flex-wrap items-center mb-4">
          {["all", "unread", "read", "replied", "spam"].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${filter === s ? "bg-ui-tag-blue-bg-hover border-ui-tag-blue-bg-hover text-white" : "bg-ui-bg-base border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && counts[s] !== undefined && ` (${counts[s]})`}
            </button>
          ))}
          <div className="flex-1 min-w-[200px]"><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, message..."/></div>
        </div>

        {loading ? <div className="p-12 text-center text-ui-fg-muted">Loading…</div>
         : filtered.length === 0 ? (
          <div className="p-12 text-center text-ui-fg-muted">
            <Envelope />
            <div className="font-bold text-ui-fg-base mt-2">No messages yet</div>
            <div className="text-sm mt-1">When visitors submit the <a href="https://autotorental.com/contact" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">contact form</a>, they'll appear here.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-4">
            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
              {filtered.map(m => (
                <button key={m.id} onClick={() => { setSelected(m); if (m.status === "unread") updateStatus(m.id, "read") }}
                  className={`w-full text-left p-3 border-b border-ui-border-base last:border-b-0 hover:bg-ui-bg-subtle transition ${selected?.id === m.id ? "bg-ui-bg-subtle" : ""} ${m.status === "unread" ? "border-l-4 border-l-ui-tag-blue-bg-hover" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`font-bold ${m.status === "unread" ? "text-ui-fg-base" : "text-ui-fg-subtle"} truncate`}>{m.name}</div>
                        <Badge color={STATUS_BADGE[m.status] as any}>{m.status}</Badge>
                      </div>
                      <div className="text-xs text-ui-fg-muted truncate">{m.subject || m.email}</div>
                      <div className="text-xs text-ui-fg-subtle mt-1 truncate">{m.message.slice(0, 80)}</div>
                    </div>
                    <div className="text-[10px] text-ui-fg-muted whitespace-nowrap">{new Date(m.created_at).toLocaleDateString("en-AE", { month: "short", day: "numeric" })}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-5 min-h-[400px]">
              {!selected ? (
                <div className="text-center text-ui-fg-muted py-16">
                  <ChatBubbleLeftRight />
                  <div className="font-bold text-ui-fg-base mt-2">Select a message</div>
                  <div className="text-sm mt-1">Click any message on the left to read.</div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <Heading level="h3">{selected.subject || "(no subject)"}</Heading>
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <strong>{selected.name}</strong> · <a href={`mailto:${selected.email}`} className="text-ui-fg-interactive underline">{selected.email}</a>
                        {selected.phone && <>· <a href={`tel:${selected.phone}`} className="text-ui-fg-interactive underline">{selected.phone}</a></>}
                      </div>
                      <div className="text-xs text-ui-fg-muted mt-1">{new Date(selected.created_at).toLocaleString("en-AE")}</div>
                    </div>
                    <Badge color={STATUS_BADGE[selected.status] as any}>{selected.status}</Badge>
                  </div>

                  <div className="bg-ui-bg-subtle rounded-lg p-4 mt-4 whitespace-pre-line text-sm leading-relaxed">{selected.message}</div>

                  <div className="flex gap-2 flex-wrap mt-4">
                    <Button onClick={() => openReply(selected)}>📧 Reply via Email (Resend)</Button>
                    {selected.phone && (
                      <a href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${selected.name}, thanks for contacting Auto to Rental.`)}`} target="_blank" rel="noopener">
                        <Button variant="secondary" onClick={() => updateStatus(selected.id, "replied")}>💬 Reply via WhatsApp</Button>
                      </a>
                    )}
                    <Button variant="secondary" onClick={() => updateStatus(selected.id, "spam")}>🗑️ Mark spam</Button>
                    <Button variant="danger" onClick={() => remove(selected.id)}>Delete</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Container>

      {replyOpen && selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setReplyOpen(false)}>
          <div className="bg-ui-bg-base rounded-xl max-w-2xl w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <Heading level="h3">📧 Reply to {selected.name}</Heading>
              <button onClick={() => setReplyOpen(false)} className="text-ui-fg-muted hover:text-ui-fg-base text-2xl leading-none">×</button>
            </div>
            <div className="text-xs text-ui-fg-muted mb-2">To: <strong>{selected.email}</strong> · From: info@autotorental.com (via Resend)</div>
            <Label size="small">Subject</Label>
            <Input value={replySubject} onChange={e => setReplySubject(e.target.value)} className="mb-3"/>
            <Label size="small">Message</Label>
            <textarea rows={10} value={replyText} onChange={e => setReplyText(e.target.value)} className="w-full border border-ui-border-base rounded-md p-3 bg-ui-bg-base text-sm font-sans" placeholder="Type your reply…"/>
            <div className="text-xs text-ui-fg-muted mt-1">Will be sent as branded HTML email automatically. Plain text fallback included.</div>
            {sendError && <div className="bg-ui-tag-red-bg border border-ui-tag-red-border rounded p-2 mt-3 text-sm text-ui-fg-error">{sendError}</div>}
            {sendSuccess && <div className="bg-ui-tag-green-bg border border-ui-tag-green-border rounded p-2 mt-3 text-sm">✅ Sent successfully via Resend!</div>}
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" onClick={() => setReplyOpen(false)}>Cancel</Button>
              <Button onClick={sendReply} disabled={sending || !replyText.trim()}>{sending ? "Sending…" : "Send Reply"}</Button>
            </div>
          </div>
        </div>
      )}
    <FocusModal open={composeOpen} onOpenChange={setComposeOpen}>
        <FocusModal.Content style={{ maxWidth: 720 }}>
          <FocusModal.Header><Heading>✉️ Compose new email</Heading></FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <div className="p-6 space-y-4">
              <div>
                <Label size="small">To *</Label>
                <Input type="email" dir="ltr" value={cTo} onChange={e => setCTo(e.target.value)} placeholder="client@example.com"/>
              </div>
              <div>
                <Label size="small">Subject *</Label>
                <Input value={cSubject} onChange={e => setCSubject(e.target.value)} placeholder="Welcome to Auto to Rental"/>
              </div>
              <div>
                <Label size="small">Message *</Label>
                <Textarea rows={10} value={cText} onChange={e => setCText(e.target.value)} placeholder="Hi! Thanks for your interest..."/>
                <Text size="small" className="text-ui-fg-muted mt-1">Will be wrapped in a branded Auto to Rental template. Recipient sees it from <strong>info@autotorental.com</strong> via Resend.</Text>
              </div>
              {cMsg && <div className={`px-3 py-2 rounded text-sm font-medium ${cMsg.startsWith("✅") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{cMsg}</div>}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="secondary" onClick={() => setComposeOpen(false)}>Cancel</Button>
                <Button onClick={sendCompose} disabled={cBusy || !cTo || !cSubject || !cText}>
                  {cBusy ? "Sending…" : "📤 Send"}
                </Button>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}

export default Page
