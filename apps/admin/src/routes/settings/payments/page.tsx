import { useEffect, useState } from "react"
import { tt } from "../../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge } from "@medusajs/ui"
import { CreditCardSolid } from "@medusajs/icons"
import { API } from "../../../lib/api"

export const config: RouteConfig = { label: tt("Payments", "المدفوعات"), icon: CreditCardSolid, rank: 52 }

type Data = {
  connected: boolean; ok?: boolean; error?: string; provider?: string
  publishable_set?: boolean; webhook_set?: boolean; webhook_url?: string
  account?: { id: string; name: string; country: string; charges_enabled: boolean; mode: string }
}

const Page = () => {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [sk, setSk] = useState("")
  const [pk, setPk] = useState("")
  const [wh, setWh] = useState("")
  const [saving, setSaving] = useState(false)
  // PayPal (Alphabite plugin)
  const [pp, setPp] = useState<any>(null)
  const [ppId, setPpId] = useState("")
  const [ppSecret, setPpSecret] = useState("")
  const [ppWebhook, setPpWebhook] = useState("")
  const [ppSandbox, setPpSandbox] = useState(true)
  const [ppSaving, setPpSaving] = useState(false)
  // BTCPay (Bitcoin)
  const [btc, setBtc] = useState<any>(null)
  const [btcUrl, setBtcUrl] = useState("")
  const [btcKey, setBtcKey] = useState("")
  const [btcStore, setBtcStore] = useState("")
  const [btcWh, setBtcWh] = useState("")
  const [btcSaving, setBtcSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/stripe`, { credentials: "include" })
      .then((r) => r.json()).then(setD).catch(() => setD({ connected: false })).finally(() => setLoading(false))
    fetch(`${API}/admin/paypal`, { credentials: "include" })
      .then((r) => r.json()).then((p) => { setPp(p); setPpSandbox(p?.sandbox !== false) }).catch(() => {})
    fetch(`${API}/admin/btcpay`, { credentials: "include" })
      .then((r) => r.json()).then((x) => { setBtc(x); if (x?.url) setBtcUrl(x.url) }).catch(() => {})
  }
  useEffect(load, [])

  const savePaypal = async () => {
    setPpSaving(true)
    try {
      await fetch(`${API}/admin/paypal`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: ppId.trim(), client_secret: ppSecret.trim(), webhook_id: ppWebhook.trim(), sandbox: ppSandbox }),
      })
      setPpId(""); setPpSecret(""); setPpWebhook("")
      // backend restarts (~15s) to load the plugin — refresh status afterwards.
      setTimeout(load, 17000)
    } finally { setPpSaving(false) }
  }

  const saveBtcpay = async () => {
    setBtcSaving(true)
    try {
      await fetch(`${API}/admin/btcpay`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: btcUrl.trim(), api_key: btcKey.trim(), store_id: btcStore.trim(), webhook_secret: btcWh.trim() }),
      })
      setBtcKey(""); setBtcStore(""); setBtcWh("")
      setTimeout(load, 17000)
    } finally { setBtcSaving(false) }
  }

  const save = async () => {
    if (!sk.trim() && !pk.trim() && !wh.trim()) return
    setSaving(true)
    try {
      await fetch(`${API}/admin/stripe`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripe_secret_key: sk.trim(), stripe_publishable_key: pk.trim(), stripe_webhook_secret: wh.trim(), activate: true }),
      })
      setSk(""); setPk(""); setWh(""); load()
    } finally { setSaving(false) }
  }

  const connectedOk = d?.connected && d?.ok
  const isActive = d?.provider === "stripe"
  const acct = d?.account

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#635bff,#4b45c6)" }}>
            <CreditCardSolid className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Heading level="h1">{tt("Payments (Stripe)", "المدفوعات (Stripe)")}</Heading>
              {connectedOk ? <Badge color={acct?.mode === "live" ? "green" : "orange"}>{acct?.mode === "live" ? "LIVE" : "TEST"}</Badge> : null}
              {connectedOk && isActive ? <Badge color="green">Active provider</Badge> : null}
            </div>
            <Text className="text-ui-fg-subtle mt-1">{tt("Collect real subscription payments from rental companies via Stripe.", "حصّل اشتراكات الشركات فعليًا عبر Stripe.")}</Text>
          </div>
          {d?.connected ? <Button variant="secondary" size="small" onClick={load} disabled={loading}>Refresh</Button> : null}
        </div>
      </Container>

      {loading && !d ? (
        <Container className="p-6"><Text className="text-ui-fg-subtle">Loading…</Text></Container>
      ) : (
        <>
          {connectedOk && (
            <Container className="p-6">
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-card-rest flex flex-col gap-2">
                <div className="flex items-center gap-2"><span className="text-green-500 text-lg">✓</span><Text weight="plus">{tt("Connected to Stripe", "متصل بـ Stripe")}</Text></div>
                <div className="text-sm text-ui-fg-subtle">{tt("Account", "الحساب")}: <b className="text-ui-fg-base">{acct?.name}</b> ({acct?.country}) · {acct?.charges_enabled ? tt("charges enabled ✓", "التحصيل مفعّل ✓") : tt("charges NOT enabled — finish Stripe onboarding", "التحصيل غير مفعّل — أكمل تفعيل حساب Stripe")}</div>
                <div className="text-sm text-ui-fg-subtle">{tt("Publishable key", "المفتاح العام")}: {d?.publishable_set ? "✓" : "—"} · {tt("Webhook secret", "سر الـwebhook")}: {d?.webhook_set ? "✓" : tt("not set", "غير مضبوط")}</div>
                {!isActive && <div className="text-sm text-ui-fg-error">{tt("Stripe is connected but NOT the active provider — current:", "Stripe متصل لكنه ليس المزوّد الفعّال — الحالي:")} {d?.provider || "demo"}</div>}
              </div>
            </Container>
          )}

          {d?.error ? (
            <Container className="p-4"><Text size="small" className="text-ui-fg-error">Stripe: {d.error} — {tt("check the secret key.", "تحقّق من المفتاح السري.")}</Text></Container>
          ) : null}

          <Container className="p-6">
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6 max-w-xl">
              <Heading level="h2">{connectedOk ? tt("Update keys", "تحديث المفاتيح") : tt("Connect Stripe", "اربط Stripe")}</Heading>
              <Text size="small" className="text-ui-fg-subtle mt-1">{tt("Get your keys at dashboard.stripe.com → Developers → API keys. Use live keys (sk_live_, pk_live_) to charge real money.", "جِب مفاتيحك من dashboard.stripe.com ← Developers ← API keys. استخدم مفاتيح live (sk_live_, pk_live_) للتحصيل الحقيقي.")}</Text>
              <div className="flex flex-col gap-3 mt-3">
                <div><Label size="small">{tt("Secret key", "المفتاح السري")} (sk_live_… / sk_test_…)</Label><Input type="password" value={sk} onChange={(e) => setSk(e.target.value)} placeholder="sk_live_…" /></div>
                <div><Label size="small">{tt("Publishable key", "المفتاح العام")} (pk_live_… / pk_test_…)</Label><Input value={pk} onChange={(e) => setPk(e.target.value)} placeholder="pk_live_…" /></div>
                <div><Label size="small">{tt("Webhook signing secret", "سر توقيع الـwebhook")} (whsec_…)</Label><Input type="password" value={wh} onChange={(e) => setWh(e.target.value)} placeholder="whsec_…" /></div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button variant="primary" disabled={saving || (!sk.trim() && !pk.trim() && !wh.trim())} onClick={save}>{saving ? tt("Saving…", "جارٍ الحفظ…") : tt("Save & activate Stripe", "حفظ وتفعيل Stripe")}</Button>
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener"><Button variant="secondary">{tt("Open Stripe", "افتح Stripe")}</Button></a>
              </div>
              <div className="mt-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-3">
                <Text size="xsmall" weight="plus">{tt("Webhook URL (add in Stripe → Developers → Webhooks):", "رابط الـwebhook (أضِفه في Stripe ← Developers ← Webhooks):")}</Text>
                <code className="text-xs font-mono break-all block mt-1">{d?.webhook_url || "https://api.autotorental.com/webhooks/stripe"}</code>
                <Text size="xsmall" className="text-ui-fg-muted mt-1">{tt("Events: checkout.session.completed, invoice.paid. Then paste the signing secret (whsec_…) above.", "الأحداث: checkout.session.completed, invoice.paid. ثم الصق سر التوقيع (whsec_…) فوق.")}</Text>
              </div>
            </div>
          </Container>

          {/* ---- PayPal (Alphabite plugin) ---- */}
          <Container className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#003087,#009cde)" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontStyle: "italic", fontSize: 18 }}>P</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Heading level="h2">PayPal</Heading>
                  {pp?.configured ? <Badge color="green">{tt("Configured", "مُهيّأ")}</Badge> : <Badge color="grey">{tt("Not set up", "غير مُفعّل")}</Badge>}
                  {pp?.configured ? <Badge color={pp?.sandbox ? "orange" : "green"}>{pp?.sandbox ? "SANDBOX" : "LIVE"}</Badge> : null}
                </div>
                <Text className="text-ui-fg-subtle mt-1">{tt("Accept PayPal payments at checkout (Alphabite PayPal plugin).", "اقبل مدفوعات PayPal عند الدفع (إضافة Alphabite PayPal).")}</Text>
              </div>
            </div>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6 max-w-xl">
              <Text size="small" className="text-ui-fg-subtle">{tt("Get your REST API credentials at developer.paypal.com → Apps & Credentials. Turn OFF sandbox to charge real money.", "احصل على بيانات REST API من developer.paypal.com ← Apps & Credentials. أوقِف Sandbox للتحصيل الحقيقي.")}</Text>
              {pp?.client_id_set ? <Text size="xsmall" className="text-ui-fg-muted mt-1 block">{tt("Current client ID", "المعرّف الحالي")}: {pp.client_id_preview}</Text> : null}
              <div className="flex flex-col gap-3 mt-3">
                <div><Label size="small">Client ID</Label><Input value={ppId} onChange={(e) => setPpId(e.target.value)} placeholder={pp?.client_id_set ? "•••••• (set — leave blank to keep)" : "AY…"} /></div>
                <div><Label size="small">Client Secret</Label><Input type="password" value={ppSecret} onChange={(e) => setPpSecret(e.target.value)} placeholder={pp?.secret_set ? "•••••• (set — leave blank to keep)" : "EL…"} /></div>
                <div><Label size="small">{tt("Webhook ID (optional)", "Webhook ID (اختياري)")}</Label><Input value={ppWebhook} onChange={(e) => setPpWebhook(e.target.value)} placeholder="WH-…" /></div>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={ppSandbox} onChange={(e) => setPpSandbox(e.target.checked)} />{tt("Sandbox (test mode — no real money)", "Sandbox (وضع تجريبي — بلا أموال حقيقية)")}</label>
              </div>
              <div className="flex gap-2 mt-3 items-center flex-wrap">
                <Button variant="primary" disabled={ppSaving || (!ppId.trim() && !ppSecret.trim() && !pp?.configured)} onClick={savePaypal}>{ppSaving ? tt("Saving & restarting…", "جارٍ الحفظ وإعادة التشغيل…") : tt("Save & activate PayPal", "حفظ وتفعيل PayPal")}</Button>
                <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener"><Button variant="secondary">{tt("Open PayPal Developer", "افتح PayPal Developer")}</Button></a>
              </div>
              <Text size="xsmall" className="text-ui-fg-muted mt-3 block">⚠️ {tt("Saving restarts the server (~15s) to load the plugin — the site/app may blip briefly.", "الحفظ يعيد تشغيل الخادم (~15 ثانية) لتحميل الإضافة — قد يتقطّع الموقع/التطبيق للحظات.")}</Text>
            </div>
          </Container>

          {/* ---- BTCPay (Bitcoin) ---- */}
          <Container className="p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#f7931a,#b35e00)" }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>₿</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Heading level="h2">{tt("Bitcoin (BTCPay)", "بيتكوين (BTCPay)")}</Heading>
                  {btc?.configured ? <Badge color="green">{tt("Configured", "مُهيّأ")}</Badge> : <Badge color="grey">{tt("Not set up", "غير مُفعّل")}</Badge>}
                </div>
                <Text className="text-ui-fg-subtle mt-1">{tt("Accept Bitcoin / crypto at checkout via your self-hosted BTCPay Server.", "اقبل بيتكوين/عملات رقمية عند الدفع عبر خادم BTCPay الخاص بك.")}</Text>
              </div>
            </div>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-6 max-w-xl">
              <Text size="small" className="text-ui-fg-subtle">{tt("You need a BTCPay Server instance. In BTCPay: Account → Manage Account → API Keys (give store permissions), and copy your Store ID from Store Settings.", "تحتاج خادم BTCPay. في BTCPay: Account ← Manage Account ← API Keys (أعطِه صلاحيات المتجر)، وانسخ Store ID من إعدادات المتجر.")}</Text>
              {btc?.url_set ? <Text size="xsmall" className="text-ui-fg-muted mt-1 block">{tt("Current server", "الخادم الحالي")}: {btc.url}</Text> : null}
              <div className="flex flex-col gap-3 mt-3">
                <div><Label size="small">{tt("BTCPay Server URL", "رابط خادم BTCPay")}</Label><Input value={btcUrl} onChange={(e) => setBtcUrl(e.target.value)} placeholder="https://btcpay.yourdomain.com" /></div>
                <div><Label size="small">API Key</Label><Input type="password" value={btcKey} onChange={(e) => setBtcKey(e.target.value)} placeholder={btc?.api_key_set ? "•••••• (set — leave blank to keep)" : "token …"} /></div>
                <div><Label size="small">Store ID</Label><Input value={btcStore} onChange={(e) => setBtcStore(e.target.value)} placeholder={btc?.store_id_set ? "•••••• (set)" : "store id…"} /></div>
                <div><Label size="small">{tt("Webhook secret", "سر الـwebhook")}</Label><Input type="password" value={btcWh} onChange={(e) => setBtcWh(e.target.value)} placeholder={btc?.webhook_set ? "•••••• (set)" : "secret…"} /></div>
              </div>
              <div className="flex gap-2 mt-3 items-center flex-wrap">
                <Button variant="primary" disabled={btcSaving || (!btcUrl.trim() && !btc?.configured)} onClick={saveBtcpay}>{btcSaving ? tt("Saving & restarting…", "جارٍ الحفظ وإعادة التشغيل…") : tt("Save & activate BTCPay", "حفظ وتفعيل BTCPay")}</Button>
                <a href="https://btcpayserver.org/" target="_blank" rel="noopener"><Button variant="secondary">{tt("About BTCPay", "عن BTCPay")}</Button></a>
              </div>
              {btc?.url_set ? (
                <div className="mt-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-3">
                  <Text size="xsmall" weight="plus">{tt("Webhook URL (add in BTCPay → Store → Webhooks):", "رابط الـwebhook (أضِفه في BTCPay ← Store ← Webhooks):")}</Text>
                  <code className="text-xs font-mono break-all block mt-1">{btc?.webhook_url}</code>
                </div>
              ) : null}
              <Text size="xsmall" className="text-ui-fg-muted mt-3 block">⚠️ {tt("Saving restarts the server (~15s) to load the plugin.", "الحفظ يعيد تشغيل الخادم (~15 ثانية) لتحميل الإضافة.")}</Text>
            </div>
          </Container>
        </>
      )}
    </SingleColumnPage>
  )
}
export default Page
