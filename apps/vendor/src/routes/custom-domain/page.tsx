import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { Link } from "@medusajs/icons"
import { API } from "../../lib/api"

// Vendor "Custom Domain" page — connect your own domain so it opens your
// company page on autotorental.com, with an auto-issued SSL certificate.
// Backed by /vendor/custom-domain; SSL is provisioned by the server cron.
export const config: RouteConfig = { label: "Custom Domain", icon: Link }

const isAr = () => typeof document !== "undefined" && (document.documentElement.lang || "").startsWith("ar")
const tt = (en: string, ar: string) => (isAr() ? ar : en)

type Rec = { type: string; host: string; value: string }
type State = {
  domain: string | null
  status: string | null
  error?: string | null
  handle?: string | null
  live_url?: string | null
  instructions?: { server_ip: string; records: Rec[] }
}

const Page = () => {
  const [state, setState] = useState<State | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState("")

  const load = () =>
    fetch(`${API}/vendor/custom-domain`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setState(d); setInput(d.domain || "") } })
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const post = async (payload: any, okMsg?: string) => {
    setBusy(true)
    try {
      const r = await fetch(`${API}/vendor/custom-domain`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(d?.message || tt("Something went wrong", "حدث خطأ")); return }
      setState(d); setInput(d.domain || "")
      if (okMsg) toast.success(okMsg)
    } catch { toast.error(tt("Network error", "خطأ في الشبكة")) } finally { setBusy(false) }
  }

  const copy = (txt: string) => { try { navigator.clipboard.writeText(txt); toast.success(tt("Copied", "تم النسخ")) } catch {} }

  const status = state?.status || null
  const ip = state?.instructions?.server_ip || "76.13.184.134"
  const statusBadge = () => {
    if (status === "live") return <Badge color="green">{tt("Live", "يعمل")}</Badge>
    if (status === "dns_ok") return <Badge color="blue">{tt("DNS verified — setting up SSL", "تم التحقق — جارٍ إعداد SSL")}</Badge>
    if (status === "pending") return <Badge color="orange">{tt("Awaiting DNS", "بانتظار DNS")}</Badge>
    if (status === "error") return <Badge color="red">{tt("Needs attention", "يحتاج مراجعة")}</Badge>
    return null
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">🌐 {tt("Custom Domain", "نطاقك الخاص")}</h1>
          {statusBadge()}
        </div>
        <p className="text-sm mt-1.5 text-ui-fg-subtle">
          {tt(
            "Connect your own domain (e.g. yourcompany.com) so it opens your company page on Auto to Rental — with a free SSL certificate.",
            "اربط نطاقك الخاص (مثل yourcompany.com) ليفتح صفحة شركتك على Auto to Rental — مع شهادة SSL مجانية.",
          )}
        </p>

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="yourcompany.com"
            dir="ltr"
            className="flex-1 min-w-[220px] rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2.5 text-sm"
          />
          <Button disabled={busy || loading || !input.trim()} onClick={() => post({ domain: input.trim() }, tt("Domain saved", "تم حفظ النطاق"))}>
            {state?.domain ? tt("Update", "تحديث") : tt("Connect", "ربط")}
          </Button>
          {state?.domain && (
            <Button variant="secondary" disabled={busy} onClick={() => post({ action: "remove" }, tt("Disconnected", "تم الفصل"))}>
              {tt("Remove", "إزالة")}
            </Button>
          )}
        </div>

        {state?.error && <Text size="small" className="mt-2" style={{ color: "#ef4444" }}>{state.error}</Text>}
        {status === "live" && state?.live_url && (
          <a href={state.live_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-3">
            <Button size="small">{tt("Open", "فتح")} {state.live_url} ↗</Button>
          </a>
        )}
      </Container>

      {state?.domain && (
        <Container className="p-6 pt-0">
          <Heading level="h2" className="text-base font-semibold mb-1">{tt("Step 1 — Point your DNS", "الخطوة 1 — وجّه الـDNS")}</Heading>
          <Text size="small" className="text-ui-fg-subtle mb-3">
            {tt("At your domain registrar (GoDaddy, Namecheap, etc.) add these two records:", "في مزوّد نطاقك (GoDaddy، Namecheap، إلخ) أضف هذين السجلّين:")}
          </Text>
          <div className="rounded-xl border border-ui-border-base overflow-hidden">
            <div className="grid grid-cols-[64px_64px_1fr_auto] gap-2 px-3 py-2 bg-ui-bg-subtle text-[11px] font-bold uppercase tracking-wider text-ui-fg-muted">
              <span>{tt("Type", "النوع")}</span><span>{tt("Host", "المضيف")}</span><span>{tt("Value", "القيمة")}</span><span />
            </div>
            {(state.instructions?.records || []).map((rec, i) => (
              <div key={i} className="grid grid-cols-[64px_64px_1fr_auto] gap-2 px-3 py-2.5 items-center border-t border-ui-border-base text-sm">
                <span className="font-semibold">{rec.type}</span>
                <code>{rec.host}</code>
                <code className="truncate">{rec.value}</code>
                <Button size="small" variant="transparent" onClick={() => copy(rec.value)}>{tt("Copy", "نسخ")}</Button>
              </div>
            ))}
          </div>
          <Text size="small" className="text-ui-fg-muted mt-2">
            {tt(`Both records point to our server IP ${ip}.`, `كلا السجلّين يشيران إلى عنوان خادمنا ${ip}.`)}
          </Text>

          <Heading level="h2" className="text-base font-semibold mb-1 mt-5">{tt("Step 2 — Verify", "الخطوة 2 — تحقّق")}</Heading>
          <Text size="small" className="text-ui-fg-subtle mb-3">
            {tt("After adding the records, click below. Once verified, your SSL certificate is issued automatically within ~10 minutes and your site goes live.", "بعد إضافة السجلّين اضغط أدناه. بعد التحقق تُصدَر شهادة SSL تلقائياً خلال ~10 دقائق ويصبح موقعك مباشراً.")}
          </Text>
          <Button disabled={busy} isLoading={busy} onClick={() => post({ action: "verify" })}>
            {tt("Check DNS now", "تحقّق من الـDNS الآن")}
          </Button>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page
