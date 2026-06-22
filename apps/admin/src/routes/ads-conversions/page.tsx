import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge, toast } from "@medusajs/ui"
import { ChartBar, CheckCircleSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Ads Conversions", "تتبّع الإعلانات"), icon: ChartBar, rank: 33 }

const Page = () => {
  const [pixel, setPixel] = useState("")
  const [capi, setCapi] = useState("")
  const [capiSet, setCapiSet] = useState(false)
  const [testCode, setTestCode] = useState("")
  const [lead, setLead] = useState("")
  const [call, setCall] = useState("")
  const [purchase, setPurchase] = useState("")
  const [adsId, setAdsId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/settings`, { credentials: "include" })
      const d = await r.json()
      const get = (k: string) => (d.settings || []).find((x: any) => x.key === k)
      setPixel(get("meta_pixel_id")?.value || "")
      setCapiSet(!!get("meta_capi_token")?.has_value)
      setTestCode(get("meta_test_event_code")?.value || "")
      setLead(get("google_ads_label_lead")?.value || "")
      setCall(get("google_ads_label_call")?.value || "")
      setPurchase(get("google_ads_label_purchase")?.value || "")
      setAdsId(get("google_ads_id")?.value || "")
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const payload: any = {
        meta_pixel_id: pixel.trim(),
        meta_test_event_code: testCode.trim(),
        google_ads_label_lead: lead.trim(),
        google_ads_label_call: call.trim(),
        google_ads_label_purchase: purchase.trim(),
      }
      if (capi.trim()) payload.meta_capi_token = capi.trim()
      const res = await fetch(`${API}/admin/settings`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (res.ok) { toast.success(tt("Saved — conversions now track on the website", "تم الحفظ — التحويلات تُتتبَّع الآن على الموقع")); if (capi.trim()) { setCapiSet(true); setCapi("") } }
      else toast.error("Save failed")
    } finally { setSaving(false) }
  }

  const Field = ({ label, sub, children }: any) => (
    <div className="mb-4"><Label size="small" weight="plus">{label}</Label>{sub ? <Text size="xsmall" className="text-ui-fg-subtle mb-1">{sub}</Text> : null}<div className="mt-1">{children}</div></div>
  )

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap"><Heading level="h1">📊 {tt("Ads Conversions", "تتبّع تحويلات الإعلانات")}</Heading>{pixel ? <Badge color="green">Meta ✓</Badge> : <Badge color="orange">Meta off</Badge>}</div>
        <Text size="small" className="text-ui-fg-subtle mb-5">{tt("Connect Meta (Facebook + Instagram) Pixel + Conversions API and Google Ads conversion labels. WhatsApp/Call clicks fire as Lead, car views as ViewContent — measured client-side AND server-side (survives ad-blockers & iOS).", "اربط بكسل ميتا (فيسبوك+إنستغرام) + Conversions API + معرّفات تحويلات Google Ads. ضغط واتساب/اتصال = Lead، مشاهدة سيارة = ViewContent — يُقاس من المتصفّح والسيرفر معًا (يتجاوز مانعات الإعلانات و iOS).")}</Text>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1rem", alignItems: "start" }}>
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
        <Heading level="h2" className="text-base mb-2">Meta — Facebook + Instagram</Heading>
        <Field label="Pixel ID" sub={tt("Events Manager → Data sources → your Pixel → Settings", "Events Manager → مصادر البيانات → البكسل → الإعدادات")}><Input value={pixel} onChange={(e) => setPixel(e.target.value)} placeholder="123456789012345" /></Field>
        <Field label={"Conversions API token" + (capiSet ? " — " + tt("saved ✓", "محفوظ ✓") : "")} sub={tt("Events Manager → your Pixel → Settings → Conversions API → Generate access token", "Events Manager → البكسل → الإعدادات → Conversions API → Generate access token")}><Input type="password" value={capi} onChange={(e) => setCapi(e.target.value)} placeholder={capiSet ? "•••••••• (" + tt("leave blank to keep", "اتركه فارغاً للإبقاء") + ")" : "EAAB..."} /></Field>
        <Field label={tt("Test event code (optional)", "رمز اختبار الأحداث (اختياري)")} sub={tt("Used while verifying in Events Manager → Test events", "لاختبار الأحداث في Events Manager → Test events")}><Input value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="TEST12345" /></Field>

        </div>
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
        <Heading level="h2" className="text-base mb-2">Google Ads {adsId ? <Badge size="2xsmall" color="grey">{adsId}</Badge> : <Badge size="2xsmall" color="orange">{tt("set tag in Google Ads page", "اضبط الوسم في صفحة Google Ads")}</Badge>}</Heading>
        <Text size="xsmall" className="text-ui-fg-subtle mb-3">{tt("Google Ads → Goals → Conversions → New action → copy each label (the part after the / in the tag, e.g. AW-123.../AbCdEf).", "Google Ads → Goals → Conversions → إجراء جديد → انسخ كل label (الجزء بعد / في الوسم، مثل AW-123.../AbCdEf).")}</Text>
        <Field label={tt("Lead label (WhatsApp / contact)", "label تحويل Lead (واتساب/تواصل)")}><Input value={lead} onChange={(e) => setLead(e.target.value)} placeholder="AbCdEfGhIj" /></Field>
        <Field label={tt("Call label (phone click)", "label تحويل المكالمة (اتصال)")}><Input value={call} onChange={(e) => setCall(e.target.value)} placeholder="KlMnOpQrSt" /></Field>
        <Field label={tt("Purchase label (subscription)", "label تحويل الشراء (اشتراك)")}><Input value={purchase} onChange={(e) => setPurchase(e.target.value)} placeholder="UvWxYz1234" /></Field>

        </div>
        </div>
        <Button onClick={save} isLoading={saving} disabled={loading} variant="primary" className="mt-5"><CheckCircleSolid /> {tt("Save", "حفظ")}</Button>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
