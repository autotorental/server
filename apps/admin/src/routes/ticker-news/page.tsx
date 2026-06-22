import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Input, Button, Switch, Badge, IconButton } from "@medusajs/ui"
import { BellAlert, Trash, Plus } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("News Ticker", "شريط الأخبار"), icon: BellAlert, rank: 37 }

type Item = { id: string; emoji: string; text: string; text_ar?: string; link?: string; active: boolean; sort: number }

export default function TickerNewsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [emoji, setEmoji] = useState("📣")
  const [text, setText] = useState("")
  const [textAr, setTextAr] = useState("")
  const [link, setLink] = useState("")
  const [busy, setBusy] = useState(false)
  const [ann, setAnn] = useState<{ emoji: string; text: string; text_ar: string; link: string; active: boolean }>({ emoji: "📣", text: "", text_ar: "", link: "", active: false })
  const [annBusy, setAnnBusy] = useState(false)
  const [annSaved, setAnnSaved] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/ticker-news`, { credentials: "include" })
      const d = await r.json()
      setItems(d.items || [])
    } catch { /* ignore */ }
    setLoading(false)
  }
  const loadAnn = async () => {
    try {
      const r = await fetch(`${API}/admin/vendor-announcement`, { credentials: "include" })
      const d = await r.json()
      if (d?.announcement) setAnn({ emoji: d.announcement.emoji || "📣", text: d.announcement.text || "", text_ar: d.announcement.text_ar || "", link: d.announcement.link || "", active: !!d.announcement.active })
    } catch { /* ignore */ }
  }
  const saveAnn = async (patch?: Partial<typeof ann>) => {
    const next = { ...ann, ...(patch || {}) }
    setAnn(next); setAnnBusy(true); setAnnSaved(false)
    try {
      await fetch(`${API}/admin/vendor-announcement`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) })
      setAnnSaved(true); setTimeout(() => setAnnSaved(false), 2000)
    } catch { /* ignore */ }
    setAnnBusy(false)
  }
  useEffect(() => { load(); loadAnn() }, [])

  const add = async () => {
    if (!text.trim()) return
    setBusy(true)
    try {
      await fetch(`${API}/admin/ticker-news`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji, text, text_ar: textAr, link }),
      })
      setText(""); setTextAr(""); setLink(""); setEmoji("📣")
      await load()
    } catch { /* ignore */ }
    setBusy(false)
  }
  const toggle = async (it: Item) => {
    await fetch(`${API}/admin/ticker-news/${it.id}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !it.active }),
    })
    load()
  }
  const remove = async (id: string) => {
    if (!window.confirm("Delete this ticker message?")) return
    await fetch(`${API}/admin/ticker-news/${id}`, { method: "DELETE", credentials: "include" })
    load()
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#3b82f6,#60a5fa)" }}>
            <BellAlert className="text-white" />
          </div>
          <div>
            <Heading level="h1" className="text-xl">News Ticker</Heading>
            <Text className="text-ui-fg-subtle text-sm">Your custom messages scroll in the live ticker on the homepage — blended automatically with real activity (cars added, discounts, new companies, people browsing now).</Text>
          </div>
        </div>

        {/* Vendor banner announcement — shown to all rental companies on their Traffic page */}
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 mt-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="font-semibold text-ui-fg-base">🏢 Vendor Banner Announcement</div>
              <div className="text-ui-fg-subtle text-xs mt-0.5">Shown to ALL rental companies inside their Traffic page banner. Great for &quot;🎉 New feature…&quot; or important notices.</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge color={ann.active ? "green" : "grey"}>{ann.active ? "Live" : "Off"}</Badge>
              <Switch checked={ann.active} onCheckedChange={(v) => saveAnn({ active: v })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Input value={ann.emoji} onChange={e => setAnn({ ...ann, emoji: e.target.value })} placeholder="🎉" style={{ width: 70, textAlign: "center", fontSize: 18 }} />
            <Input value={ann.text} onChange={e => setAnn({ ...ann, text: e.target.value })} placeholder="Message to your vendors — e.g. New: 0% commission + Mollie payments are now live!" className="flex-1" />
          </div>
          <div className="flex gap-2 mt-2">
            <Input value={ann.text_ar} onChange={e => setAnn({ ...ann, text_ar: e.target.value })} placeholder="النص بالعربية (اختياري)" dir="rtl" className="flex-1" />
            <Input value={ann.link} onChange={e => setAnn({ ...ann, link: e.target.value })} placeholder="Link (optional)" style={{ width: 180 }} />
            <Button variant="primary" isLoading={annBusy} onClick={() => saveAnn()}>{annSaved ? "Saved ✓" : "Save"}</Button>
          </div>
        </div>

        <div className="mt-7 mb-1 text-sm font-semibold text-ui-fg-base">📣 Storefront News Ticker <span className="text-ui-fg-muted font-normal text-xs">— scrolls on the public homepage</span></div>
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 mt-5 flex flex-col gap-3">
          <div className="flex gap-2">
            <Input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="📣" style={{ width: 70, textAlign: "center", fontSize: 18 }} />
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Message (English) — e.g. Eid offer: 20% off all SUVs this week!" className="flex-1" onKeyDown={e => { if (e.key === "Enter") add() }} />
          </div>
          <div className="flex gap-2">
            <Input value={textAr} onChange={e => setTextAr(e.target.value)} placeholder="النص بالعربية (اختياري)" dir="rtl" className="flex-1" />
            <Input value={link} onChange={e => setLink(e.target.value)} placeholder="Link (optional) — /cars" style={{ width: 200 }} />
            <Button variant="primary" isLoading={busy} onClick={add}><Plus /> Add</Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-5">
          {loading && <div className="text-ui-fg-muted p-6 text-center">Loading…</div>}
          {!loading && items.length === 0 && <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-8 text-center text-ui-fg-muted">No custom messages yet — add one above. Real activity still shows automatically on the homepage.</div>}
          {items.map(it => (
            <div key={it.id} className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden">
              <div className="flex items-center gap-3 p-3 sm:p-4 bg-ui-bg-subtle border-b border-ui-border-base">
                <span style={{ fontSize: 22 }}>{it.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ui-fg-base truncate">{it.text}</div>
                  {it.text_ar && <div className="text-ui-fg-muted text-sm truncate" dir="rtl">{it.text_ar}</div>}
                  {it.link && <div className="text-ui-fg-muted text-xs font-mono truncate">{it.link}</div>}
                </div>
                <Badge color={it.active ? "green" : "grey"}>{it.active ? "Live" : "Hidden"}</Badge>
                <Switch checked={it.active} onCheckedChange={() => toggle(it)} />
                <IconButton variant="transparent" onClick={() => remove(it.id)} title="Delete"><Trash /></IconButton>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}
