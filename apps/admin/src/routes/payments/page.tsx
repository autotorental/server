import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { CurrencyDollar } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

// One clear place to connect a REAL payment provider (Mollie / Stripe) and switch
// the ad-wallet off demo. Keys are stored via /admin/settings (secrets masked).
export const config: RouteConfig = { label: tt("Payments", "المدفوعات"), icon: CurrencyDollar, rank: 51 }

const Page = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [provider, setProvider] = useState("demo")        // payment_provider (subscriptions)
  const [adMode, setAdMode] = useState("demo")            // payment_mode (ad wallet: demo|live)
  const [mollieKey, setMollieKey] = useState("")
  const [mollieSet, setMollieSet] = useState(false)
  const [mollieTest, setMollieTest] = useState(false)
  const [currency, setCurrency] = useState("EUR")
  const [rate, setRate] = useState("0.25")
  const [stripeKey, setStripeKey] = useState("")
  const [stripeSet, setStripeSet] = useState(false)
  const [stripePub, setStripePub] = useState("")
  const [stripeTestKey, setStripeTestKey] = useState("")
  const [stripeTestSet, setStripeTestSet] = useState(false)
  const [stripeTestPub, setStripeTestPub] = useState("")
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const load = () => fetch(`${API}/admin/settings`, { credentials: "include" }).then((r) => r.json()).then((d) => {
    const m: Record<string, any> = {}; (d.settings || []).forEach((s: any) => { m[s.key] = s })
    setProvider((m.payment_provider?.value) || "demo")
    setAdMode((m.payment_mode?.value) || "demo")
    setMollieSet(!!m.mollie_api_key?.has_value)
    setMollieTest((m.mollie_testmode?.value) === "true")
    setCurrency((m.mollie_currency?.value) || "EUR")
    setRate((m.mollie_aed_to_eur?.value) || "0.25")
    setStripeSet(!!m.stripe_secret_key?.has_value)
    setStripePub((m.stripe_publishable_key?.value) || "")
    setStripeTestSet(!!m.stripe_test_secret_key?.has_value)
    setStripeTestPub((m.stripe_test_publishable_key?.value) || "")
  }).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const body: Record<string, string> = {
        payment_provider: provider, payment_mode: adMode,
        mollie_testmode: mollieTest ? "true" : "false", mollie_currency: currency.trim() || "EUR", mollie_aed_to_eur: rate.trim() || "0.25",
      }
      if (mollieKey.trim()) body.mollie_api_key = mollieKey.trim()
      if (stripeKey.trim()) body.stripe_secret_key = stripeKey.trim()
      if (stripePub.trim()) body.stripe_publishable_key = stripePub.trim()
      if (stripeTestKey.trim()) body.stripe_test_secret_key = stripeTestKey.trim()
      if (stripeTestPub.trim()) body.stripe_test_publishable_key = stripeTestPub.trim()
      const r = await fetch(`${API}/admin/settings`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!r.ok) { toast.error(tt("Save failed", "فشل الحفظ")); return }
      setMollieKey(""); setStripeKey(""); toast.success(tt("Saved ✓", "تم الحفظ ✓")); load()
    } catch { toast.error(tt("Network error", "خطأ في الشبكة")) } finally { setSaving(false) }
  }

  const test = async (which: string) => {
    setTesting(true); setResult(null)
    try {
      const r = await fetch(`${API}/admin/payments/verify?provider=${which}`, { credentials: "include" })
      setResult(await r.json().catch(() => ({ ok: false, message: "Failed" })))
    } catch { setResult({ ok: false, message: tt("Network error", "خطأ في الشبكة") }) } finally { setTesting(false) }
  }

  const input = "w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2.5 text-sm"
  const Choice = ({ id, title, desc }: { id: string; title: string; desc: string }) => (
    <button onClick={() => setProvider(id)} style={{ textAlign: "start", cursor: "pointer", flex: "1 1 200px", borderRadius: 12, padding: 14, border: `2px solid ${provider === id ? "#3b82f6" : "rgba(120,120,140,.22)"}`, background: provider === id ? "rgba(59,130,246,.07)" : "transparent" }}>
      <div className="flex items-center gap-2 mb-1"><span style={{ width: 15, height: 15, borderRadius: 99, border: `5px solid ${provider === id ? "#3b82f6" : "rgba(120,120,140,.4)"}` }} /><span style={{ fontWeight: 700 }}>{title}</span></div>
      <Text size="small" className="text-ui-fg-subtle">{desc}</Text>
    </button>
  )

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">💳 {tt("Payments", "المدفوعات")}</h1>
          {provider === "demo" ? <Badge color="orange">{tt("Demo (no real charges)", "تجريبي (بلا خصم حقيقي)")}</Badge> : <Badge color="green">{tt("Live", "حقيقي")}: {provider}</Badge>}
        </div>
        <p className="text-sm mt-1.5 text-ui-fg-subtle">{tt("Connect a real payment provider for vendor subscriptions and ad-wallet top-ups.", "اربط مزوّد دفع حقيقياً لاشتراكات البائعين وشحن محفظة الإعلانات.")}</p>
      </Container>

      {loading ? <Container className="p-6 pt-0"><Text className="text-ui-fg-muted">{tt("Loading…", "جارٍ التحميل…")}</Text></Container> : (
        <Container className="p-6 pt-0 max-w-2xl flex flex-col gap-5">
          {/* Provider */}
          <div className="rounded-xl border border-ui-border-base p-4">
            <Heading level="h2" className="text-base font-semibold mb-3">{tt("Payment provider", "مزوّد الدفع")}</Heading>
            <div className="flex flex-wrap gap-3">
              <Choice id="mollie" title="Mollie" desc={tt("Card, Klarna, PayPal. Easiest in MENA.", "بطاقة، Klarna، PayPal. الأسهل في المنطقة.")} />
              <Choice id="stripe" title="Stripe" desc={tt("Global cards. Needs Stripe approval.", "بطاقات عالمية. يحتاج موافقة Stripe.")} />
              <Choice id="demo" title={tt("Demo", "تجريبي")} desc={tt("No real charge — for testing only.", "بلا خصم حقيقي — للاختبار فقط.")} />
            </div>
          </div>

          {/* Mollie */}
          {provider === "mollie" && (
            <div className="rounded-xl border border-ui-border-base p-4">
              <div className="flex items-center justify-between mb-3"><Heading level="h2" className="text-base font-semibold">🟦 {tt("Mollie", "Mollie")}</Heading>{mollieSet ? <Badge color="green">{tt("Key set", "المفتاح محفوظ")}</Badge> : <Badge color="orange">{tt("No key", "بلا مفتاح")}</Badge>}</div>
              <Text size="small" weight="plus" className="mb-1.5">{tt("API key / access token", "مفتاح API / access token")}</Text>
              <input value={mollieKey} onChange={(e) => setMollieKey(e.target.value)} type="password" dir="ltr" autoComplete="new-password" placeholder={mollieSet ? tt("•••• set — leave blank to keep", "محفوظ •••• — اتركه فارغاً للإبقاء") : "live_… / test_… / access_…"} className={input} />
              <Text size="small" className="text-ui-fg-muted mt-1.5 mb-3">{tt("Mollie Dashboard → Developers → API keys (or Organization access tokens).", "Mollie Dashboard → Developers → API keys (أو access tokens).")}</Text>
              <div className="flex gap-4 flex-wrap items-end">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={mollieTest} onChange={(e) => setMollieTest(e.target.checked)} />{tt("Test mode (access tokens only)", "وضع الاختبار (access tokens فقط)")}</label>
                <div><Text size="small" weight="plus" className="mb-1">{tt("Currency", "العملة")}</Text><input value={currency} onChange={(e) => setCurrency(e.target.value)} dir="ltr" className={input} style={{ width: 100 }} /></div>
                <div><Text size="small" weight="plus" className="mb-1">{tt("AED → EUR rate", "سعر AED → EUR")}</Text><input value={rate} onChange={(e) => setRate(e.target.value)} dir="ltr" className={input} style={{ width: 100 }} /></div>
              </div>
              <Text size="small" className="text-ui-fg-muted mt-2">{tt("Mollie settles in EUR (not AED). e.g. rate 0.25 → an AED 100 ad top-up charges €25.", "Mollie يسوّي بـEUR لا AED. مثلاً سعر 0.25 → شحن AED 100 يُحصّل €25.")}</Text>
            </div>
          )}

          {/* Stripe */}
          {provider === "stripe" && (
            <div className="rounded-xl border border-ui-border-base p-4">
              <div className="flex items-center justify-between mb-3"><Heading level="h2" className="text-base font-semibold">💳 Stripe</Heading>{stripeSet ? <Badge color="green">{tt("Key set", "المفتاح محفوظ")}</Badge> : <Badge color="orange">{tt("No key", "بلا مفتاح")}</Badge>}</div>
              <Text size="small" weight="plus" className="mb-1.5">{tt("Secret key", "المفتاح السرّي")}</Text>
              <input value={stripeKey} onChange={(e) => setStripeKey(e.target.value)} type="password" dir="ltr" autoComplete="new-password" placeholder={stripeSet ? tt("•••• set — leave blank to keep", "محفوظ •••• — اتركه فارغاً") : "sk_live_…"} className={input} />
              <Text size="small" weight="plus" className="mb-1.5 mt-3">{tt("Publishable key", "المفتاح العام")}</Text>
              <input value={stripePub} onChange={(e) => setStripePub(e.target.value)} dir="ltr" placeholder="pk_live_…" className={input} />

              {/* Sandbox (test) keys — used by the ad wallet when mode = Sandbox. Live keys stay untouched. */}
              <div className="mt-4 pt-3" style={{ borderTop: "1px dashed rgba(120,120,140,.3)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <Text size="small" weight="plus">🧪 {tt("Test (sandbox) keys", "مفاتيح الاختبار (Sandbox)")}</Text>
                  {stripeTestSet ? <Badge color="green">{tt("Set", "محفوظ")}</Badge> : <Badge color="grey">{tt("Optional", "اختياري")}</Badge>}
                </div>
                <Text size="small" className="text-ui-fg-subtle mb-2">{tt("From Stripe → Developers → API keys (Test mode). Lets you try card payments with no real money.", "من Stripe ← Developers ← API keys (وضع الاختبار). تتيح تجربة الدفع بالبطاقة بلا أموال حقيقية.")}</Text>
                <input value={stripeTestKey} onChange={(e) => setStripeTestKey(e.target.value)} type="password" dir="ltr" autoComplete="new-password" placeholder={stripeTestSet ? tt("•••• set — leave blank to keep", "محفوظ •••• — اتركه فارغاً") : "sk_test_…"} className={input} />
                <input value={stripeTestPub} onChange={(e) => setStripeTestPub(e.target.value)} dir="ltr" placeholder="pk_test_…" className={`${input} mt-2`} />
              </div>
            </div>
          )}

          {/* Ad wallet mode */}
          <div className="rounded-xl border border-ui-border-base p-4">
            <Heading level="h2" className="text-base font-semibold mb-1">📣 {tt("Ad-wallet top-ups", "شحن محفظة الإعلانات")}</Heading>
            <Text size="small" className="text-ui-fg-subtle mb-3">{tt("How vendors fund their ad budget.", "كيف يموّل البائعون ميزانية إعلاناتهم.")}</Text>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setAdMode("live")} style={{ cursor: "pointer", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, border: `2px solid ${adMode === "live" ? "#10b981" : "rgba(120,120,140,.25)"}`, background: adMode === "live" ? "rgba(16,185,129,.1)" : "transparent" }}>💰 {tt("Live — real payment", "حقيقي — دفع فعلي")}</button>
              <button onClick={() => setAdMode("test")} style={{ cursor: "pointer", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, border: `2px solid ${adMode === "test" ? "#3b82f6" : "rgba(120,120,140,.25)"}`, background: adMode === "test" ? "rgba(59,130,246,.1)" : "transparent" }}>💳 {tt("Sandbox — Stripe test card", "ساندبوكس — بطاقة Stripe تجريبية")}</button>
              <button onClick={() => setAdMode("demo")} style={{ cursor: "pointer", borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13, border: `2px solid ${adMode === "demo" ? "#f59e0b" : "rgba(120,120,140,.25)"}`, background: adMode === "demo" ? "rgba(245,158,11,.1)" : "transparent" }}>🧪 {tt("Demo — free test credit", "تجريبي — رصيد مجاني")}</button>
            </div>
            {adMode === "live" && (!stripeSet) && <Text size="small" className="mt-2" style={{ color: "#dc2626" }}>{tt("Add your live Stripe keys above to charge real card payments.", "أضف مفاتيح Stripe الحيّة أعلاه لتحصيل مدفوعات حقيقية بالبطاقة.")}</Text>}
            {adMode === "live" && stripeSet && <Text size="small" className="mt-2" style={{ color: "#059669" }}>{tt("✓ Real Stripe card payments (AED) are active for ad-wallet top-ups.", "✓ الدفع الحقيقي بالبطاقة عبر Stripe (بالدرهم) مُفعّل لشحن المحفظة.")}</Text>}
            {adMode === "test" && (!stripeTestSet) && <Text size="small" className="mt-2" style={{ color: "#dc2626" }}>{tt("Paste your Stripe TEST keys (sk_test / pk_test) above, then save.", "ألصق مفاتيح Stripe التجريبية (sk_test / pk_test) أعلاه ثم احفظ.")}</Text>}
            {adMode === "test" && stripeTestSet && <Text size="small" className="mt-2" style={{ color: "#2563eb" }}>{tt("✓ Sandbox active — top up with test card 4242 4242 4242 4242 (any future date / CVC). No real money.", "✓ الساندبوكس مُفعّل — اشحن ببطاقة الاختبار 4242 4242 4242 4242 (أي تاريخ مستقبلي / CVC). بلا أموال حقيقية.")}</Text>}
          </div>

          {result && <div className="rounded-lg px-3 py-2.5 text-sm" style={{ background: result.ok ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${result.ok ? "rgba(16,185,129,.35)" : "rgba(239,68,68,.35)"}`, color: result.ok ? "#059669" : "#dc2626" }}>{result.ok ? "✓ " : "✕ "}{result.message}</div>}

          <div className="flex items-center gap-2 flex-wrap">
            {provider !== "demo" && <Button variant="secondary" isLoading={testing} onClick={() => test(provider)}>{tt("Test connection", "اختبار الاتصال")}</Button>}
            <Button isLoading={saving} onClick={save}>💾 {tt("Save", "حفظ")}</Button>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page
