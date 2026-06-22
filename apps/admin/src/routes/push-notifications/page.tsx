import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Text, Button, Input, Textarea } from "@medusajs/ui"
import { BellAlert } from "@medusajs/icons"
import { tt } from "../../lib/lang"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Push Notifications", "الإشعارات"), icon: BellAlert, rank: 18 }

export default function PushPage() {
  const [counts, setCounts] = useState<any>({})
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [link, setLink] = useState("")
  const [image, setImage] = useState("")
  const [audience, setAudience] = useState("all")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [topic, setTopic] = useState("")
  const [lang, setLang] = useState<"ar" | "en">("ar")
  const [withImage, setWithImage] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState("")

  useEffect(() => {
    fetch(`${API}/admin/notifications/send`, { credentials: "include" })
      .then((r) => r.json()).then((d) => setCounts(d.counts || {})).catch(() => {})
  }, [])

  const aiGenerate = async () => {
    if (!topic.trim()) return
    setAiBusy(true); setAiErr("")
    try {
      const r = await fetch(`${API}/admin/notifications/ai-generate`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic, language: lang, with_image: withImage }),
      })
      const d = await r.json()
      if (!r.ok) { setAiErr(d.message || tt("AI failed", "فشل التوليد")); return }
      if (d.title) setTitle(d.title)
      if (d.body) setBody(d.body)
      if (typeof d.link === "string") setLink(d.link)
      if (d.image_url) setImage(d.image_url)
      if (d.image_error) setAiErr((lang === "ar" ? "الصورة: " : "Image: ") + d.image_error)
    } catch (e: any) { setAiErr(e?.message || "error") } finally { setAiBusy(false) }
  }

  const send = async () => {
    if (!title.trim() || !body.trim()) return
    setSending(true); setResult(null)
    try {
      const r = await fetch(`${API}/admin/notifications/send`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, link, audience, image }),
      })
      const d = await r.json(); setResult(d)
      if (r.ok && d.sent != null) { setTitle(""); setBody(""); setLink(""); setImage(""); setTopic("") }
    } catch (e: any) { setResult({ message: e?.message }) } finally { setSending(false) }
  }

  const AUD: Array<[string, string, number]> = [
    ["all", tt("Everyone", "الجميع"), counts.all || 0],
    ["vendors", tt("Rental companies", "شركات التأجير"), counts.vendors || 0],
    ["customers", tt("Customers", "العملاء"), counts.customers || 0],
    ["ios", "iOS", counts.ios || 0],
    ["android", "Android", counts.android || 0],
    ["web", "🌐 Web", counts.web || 0],
  ]
  const Label = ({ children }: any) => <Text size="small" weight="plus" className="mb-1">{children}</Text>

  return (
    <Container className="p-0">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-ui-border-base">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ui-bg-subtle shrink-0"><BellAlert className="text-ui-fg-interactive" /></div>
        <div>
          <Heading level="h2">{tt("Push Notifications", "الإشعارات")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">{tt("Send a push to your app users — write it yourself or let AI compose it.", "أرسل إشعاراً لمستخدمي تطبيقك — اكتبه بنفسك أو خلّ الذكاء يكتبه لك.")}</Text>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 px-6 py-5 items-start">
        {/* LEFT — compose */}
        <div className="flex flex-col gap-5" style={{ flex: "2 1 380px", minWidth: 320 }}>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2"><span className="text-lg">✨</span><Text weight="plus">{tt("AI composer", "المولّد الذكي")}</Text></div>
            <Text size="small" className="text-ui-fg-subtle -mt-1">{tt("Describe the idea — AI writes the title, message, link and a banner image.", "اكتب الفكرة — الذكاء يكتب العنوان والنص والرابط وصورة بانر.")}</Text>
            <Textarea rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={tt("e.g. Weekend 20% off Lamborghini rentals in Dubai", "مثال: خصم 20% نهاية الأسبوع على إيجار لمبرغيني في دبي")} />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg border border-ui-border-base overflow-hidden">
                {(["ar", "en"] as const).map((l) => (
                  <button key={l} type="button" onClick={() => setLang(l)} className={"px-3 py-1.5 text-sm " + (lang === l ? "bg-ui-bg-base font-medium" : "text-ui-fg-subtle")}>{l === "ar" ? "عربي" : "English"}</button>
                ))}
              </div>
              <button type="button" onClick={() => setWithImage(!withImage)} className={"px-3 py-1.5 text-sm rounded-lg border transition " + (withImage ? "border-ui-fg-interactive bg-ui-bg-base" : "border-ui-border-base text-ui-fg-subtle")}>🖼️ {tt("with image", "مع صورة")}</button>
              <div className="flex-1" />
              <Button variant="primary" onClick={aiGenerate} isLoading={aiBusy} disabled={!topic.trim()}>✨ {tt("Generate", "توليد")}</Button>
            </div>
            {aiBusy && withImage && <Text size="xsmall" className="text-ui-fg-muted">{tt("Generating image can take ~15s…", "توليد الصورة ياخذ ~15 ثانية…")}</Text>}
            {aiErr && <Text size="small" className="text-ui-fg-error">{aiErr}</Text>}
          </div>

          <div>
            <Label>{tt("Audience", "الجمهور")}</Label>
            <div className="flex flex-wrap gap-2">
              {AUD.map(([id, label, n]) => (
                <button key={id} type="button" onClick={() => setAudience(id)} className={"rounded-lg border px-3 py-2 text-sm transition " + (audience === id ? "border-ui-fg-interactive bg-ui-bg-base shadow-sm" : "border-ui-border-base hover:border-ui-border-strong")}>{label} <span className="text-ui-fg-muted">· {n}</span></button>
              ))}
            </div>
          </div>

          <div><Label>{tt("Title", "العنوان")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tt("e.g. New luxury cars added!", "مثال: سيارات فخمة جديدة!")} /></div>
          <div><Label>{tt("Message", "الرسالة")}</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={tt("Your notification text…", "نص الإشعار…")} /></div>
          <div><Label>{tt("Open link (optional)", "رابط الفتح (اختياري)")}</Label><Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="/cars/123" /></div>
        </div>

        {/* RIGHT — preview + send (sticky) */}
        <div className="flex flex-col gap-4" style={{ flex: "1 1 320px", minWidth: 300, maxWidth: 460, position: "sticky", top: 16 }}>
          {image && (
            <div>
              <div className="flex items-center justify-between mb-1"><Label>{tt("Banner image", "صورة البانر")}</Label><button type="button" onClick={() => setImage("")} className="text-xs text-ui-fg-error">{tt("Remove", "حذف")}</button></div>
              <img src={image} alt="" className="w-full rounded-lg border border-ui-border-base" style={{ maxHeight: 200, objectFit: "cover" }} />
            </div>
          )}
          <div>
            <Label>{tt("Live preview", "معاينة حيّة")}</Label>
            <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-3 shadow-elevation-card-rest">
              {image && <img src={image} alt="" className="w-full rounded-lg mb-2" style={{ maxHeight: 150, objectFit: "cover" }} />}
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-ui-bg-subtle flex items-center justify-center shrink-0">🚗</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-ui-fg-muted">Auto to Rental · {tt("now", "الآن")}</div>
                  <div className="font-semibold text-sm">{title || tt("Title appears here", "العنوان يظهر هنا")}</div>
                  <div className="text-sm text-ui-fg-subtle" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{body || tt("Message appears here", "النص يظهر هنا")}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 flex flex-col gap-2">
            <Button onClick={send} isLoading={sending} variant="primary" disabled={!title.trim() || !body.trim()} className="w-full">{tt("Send notification", "إرسال الإشعار")}</Button>
            {result && (result.sent != null
              ? <Text size="small" className={result.apns_failed ? "text-ui-fg-subtle" : "text-ui-fg-interactive"}>{result.message || `${tt("Sent to", "أُرسل إلى")} ${result.sent} ${tt("devices", "جهاز")}`}</Text>
              : <Text size="small" className="text-ui-fg-error">{result.message || tt("Failed", "فشل")}</Text>)}
            <Text size="xsmall" className="text-ui-fg-muted">{tt("Audience", "الجمهور")}: {AUD.find(([id]) => id === audience)?.[1]} · {AUD.find(([id]) => id === audience)?.[2]} {tt("devices", "جهاز")}</Text>
          </div>
        </div>
      </div>
    </Container>
  )
}
