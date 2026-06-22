import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Badge } from "@medusajs/ui"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Messages", icon: ChatBubbleLeftRight }

type Convo = { session_id: string; name?: string; last_text: string; last_sender: string; last_at: string; unread: number }
type Msg = { id: number; sender: string; name?: string; text: string; created_at: string }

const ago = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s / 60)}m`; if (s < 86400) return `${Math.floor(s / 3600)}h`; return `${Math.floor(s / 86400)}d`
}

const Page = () => {
  const [convos, setConvos] = useState<Convo[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState("")
  const boxRef = useRef<HTMLDivElement>(null)

  const loadConvos = () => {
    fetch(`${API}/vendor/chat`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setConvos(d?.conversations || [])).catch(() => {})
  }
  const loadMsgs = (sid: string) => {
    fetch(`${API}/vendor/chat/${sid}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null)).then((d) => setMsgs(d?.messages || [])).catch(() => {})
  }

  useEffect(() => { loadConvos(); const t = setInterval(loadConvos, 6000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (!active) return
    loadMsgs(active)
    const t = setInterval(() => loadMsgs(active), 4000)
    return () => clearInterval(t)
  }, [active])
  useEffect(() => { boxRef.current?.scrollTo({ top: 9e9 }) }, [msgs])

  const send = async () => {
    const t = text.trim()
    if (!t || !active) return
    setText("")
    await fetch(`${API}/vendor/chat/${active}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) }).catch(() => {})
    loadMsgs(active); loadConvos()
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2">
          <Heading level="h1" className="text-2xl font-semibold tracking-tight">Messages</Heading>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
        <Text className="text-ui-fg-subtle mt-1">Chat directly with customers who message your company — answer right here, no third party.</Text>
      </Container>

      <Container className="p-0 overflow-hidden">
        <div className="grid md:grid-cols-[300px_1fr]" style={{ height: 540 }}>
          <div className="border-r border-ui-border-base overflow-y-auto">
            {convos.length === 0 ? (
              <div className="p-6 text-ui-fg-muted text-sm">No messages yet. They appear when a customer messages your company from the website or app.</div>
            ) : convos.map((c) => (
              <button key={c.session_id} onClick={() => setActive(c.session_id)}
                className={`w-full text-left px-4 py-3 border-b border-ui-border-base hover:bg-ui-bg-base-hover ${active === c.session_id ? "bg-ui-bg-base-hover" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm truncate">{c.name || `Customer ${c.session_id.slice(-4)}`}</span>
                  {c.unread > 0 && <Badge size="2xsmall" color="red">{c.unread}</Badge>}
                </div>
                <div className="text-xs text-ui-fg-muted truncate mt-0.5">{c.last_sender === "vendor" ? "You: " : ""}{c.last_text}</div>
                <div className="text-[10px] text-ui-fg-muted mt-0.5">{ago(c.last_at)} ago</div>
              </button>
            ))}
          </div>

          <div className="flex flex-col">
            {!active ? (
              <div className="flex-1 flex items-center justify-center text-ui-fg-muted text-sm">Select a conversation</div>
            ) : (
              <>
                <div ref={boxRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-ui-bg-subtle">
                  {msgs.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "vendor" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === "vendor" ? "bg-ui-fg-interactive text-white rounded-br-sm" : "bg-ui-bg-base border border-ui-border-base rounded-bl-sm"}`}>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-ui-border-base flex items-center gap-2">
                  <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send() }} placeholder="Type your reply…" />
                  <Button onClick={send} disabled={!text.trim()}>Send</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
