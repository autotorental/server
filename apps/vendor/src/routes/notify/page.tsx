import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { API } from "../../lib/api"

// Vendor → notify your own followers / clients only (never the whole platform).
export const config: RouteConfig = { label: "Notify Followers", icon: ChatBubbleLeftRight }

const isAr = () => typeof document !== "undefined" && (document.documentElement.lang || "").startsWith("ar")
const L = (en: string, ar: string) => (isAr() ? ar : en)

const Page = () => {
  const [reach, setReach] = useState<{ reachable_devices: number; followers: number } | null>(null)
  const [title, setTitle] = useState("")
  const [bodyText, setBodyText] = useState("")
  const [link, setLink] = useState("")
  const [sending, setSending] = useState(false)
  const [last, setLast] = useState<string | null>(null)

  const loadReach = () => fetch(`${API}/vendor/notifications/send`, { credentials: "include" })
    .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) setReach(d) }).catch(() => {})
  useEffect(() => { loadReach() }, [])

  const send = async () => {
    if (!title.trim() || !bodyText.trim()) { toast.error(L("Title and message are required", "العنوان والرسالة مطلوبان")); return }
    setSending(true)
    try {
      const r = await fetch(`${API}/vendor/notifications/send`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: bodyText.trim(), link: link.trim() || undefined }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(d?.message || L("Failed to send", "فشل الإرسال")); return }
      toast.success(d?.message || L("Sent", "تم الإرسال"))
      setLast(d?.message || null); setTitle(""); setBodyText(""); setLink(""); loadReach()
    } catch { toast.error(L("Network error", "خطأ في الشبكة")) } finally { setSending(false) }
  }

  const inputCls = "w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2.5 text-sm"

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">📣 {L("Notify your followers", "أرسِل إشعاراً لمتابعيك")}</h1>
          {reach && <Badge color="blue">{reach.reachable_devices} {L("devices reachable", "جهاز يمكن الوصول إليه")}</Badge>}
        </div>
        <p className="text-sm mt-1.5 text-ui-fg-subtle">
          {L(
            "Send a push notification to people who follow your company or contacted you — only your own audience, never other companies' customers.",
            "أرسل إشعاراً للأشخاص الذين يتابعون شركتك أو تواصلوا معك — جمهورك أنت فقط، لا عملاء الشركات الأخرى.",
          )}
        </p>

        {reach && (
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 flex-1 min-w-[150px]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted">{L("Followers", "المتابعون")}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{reach.followers}</div>
            </div>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 flex-1 min-w-[150px]">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted">{L("Reachable devices", "أجهزة يمكن الوصول إليها")}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{reach.reachable_devices}</div>
            </div>
          </div>
        )}
      </Container>

      <Container className="p-6 pt-0">
        <div className="rounded-xl border border-ui-border-base p-4 max-w-2xl">
          <div style={{ marginBottom: 14 }}>
            <Text size="small" weight="plus" className="mb-1.5">{L("Title", "العنوان")}</Text>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder={L("e.g. New cars just added! 🚗", "مثال: وصلت سيارات جديدة! 🚗")} className={inputCls} />
            <div className="text-right text-ui-fg-muted" style={{ fontSize: 11, marginTop: 2 }}>{title.length}/80</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <Text size="small" weight="plus" className="mb-1.5">{L("Message", "الرسالة")}</Text>
            <textarea value={bodyText} onChange={(e) => setBodyText(e.target.value)} maxLength={300} rows={3} placeholder={L("Tell your followers what's new — an offer, a new car, a discount…", "أخبر متابعيك بالجديد — عرض، سيارة جديدة، خصم…")} className={inputCls} style={{ resize: "vertical" }} />
            <div className="text-right text-ui-fg-muted" style={{ fontSize: 11, marginTop: 2 }}>{bodyText.length}/300</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text size="small" weight="plus" className="mb-1.5">{L("Link (optional)", "رابط (اختياري)")}</Text>
            <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr" placeholder={L("Leave blank to open your store page", "اتركه فارغاً لفتح صفحة متجرك")} className={inputCls} />
          </div>
          <Button onClick={send} isLoading={sending} disabled={!title.trim() || !bodyText.trim()}>
            📣 {L("Send to followers", "أرسِل للمتابعين")}
          </Button>
          {last && <Text size="small" className="text-ui-fg-subtle mt-3 block">{last}</Text>}
          <Text size="small" className="text-ui-fg-muted mt-3 block">
            {L("Your company name is added automatically so followers know it's from you. Please keep it relevant — frequent or spammy notifications make people turn them off.", "يُضاف اسم شركتك تلقائياً ليعرف المتابعون أنه منك. أبقِ المحتوى مفيداً — الإشعارات المتكررة أو المزعجة تدفع الناس لإيقافها.")}
          </Text>
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
