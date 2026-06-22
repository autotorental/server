import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { Envelope } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

// Admin "Mail Server" — view / rotate the cPanel API credentials used to create
// company mailboxes (name@autotorental.com). Token is stored in the DB
// (app_setting.cpanel_mail) and never shown in plaintext.
export const config: RouteConfig = { label: tt("Mail Server", "خادم البريد"), icon: Envelope }

type State = { host?: string; user?: string; domain?: string; token_masked?: string; token_set?: boolean }

const Page = () => {
  const [host, setHost] = useState("")
  const [user, setUser] = useState("")
  const [domain, setDomain] = useState("")
  const [token, setToken] = useState("")
  const [meta, setMeta] = useState<State>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch(`${API}/admin/settings/cpanel-mail`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setMeta(d); setHost(d.host || ""); setUser(d.user || ""); setDomain(d.domain || "") } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const payload = () => ({ host: host.trim(), user: user.trim(), domain: domain.trim(), ...(token.trim() ? { token: token.trim() } : {}) })

  const save = async () => {
    setBusy(true)
    try {
      const r = await fetch(`${API}/admin/settings/cpanel-mail`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(d?.message || tt("Save failed", "فشل الحفظ")); return }
      setMeta(d); setToken("")
      toast.success(tt("Saved", "تم الحفظ"))
    } catch { toast.error(tt("Network error", "خطأ في الشبكة")) } finally { setBusy(false) }
  }

  const test = async () => {
    setTesting(true); setResult(null)
    try {
      const r = await fetch(`${API}/admin/settings/cpanel-mail`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", ...payload() }) })
      const d = await r.json().catch(() => ({ ok: false, message: "Failed" }))
      setResult(d)
    } catch { setResult({ ok: false, message: tt("Network error", "خطأ في الشبكة") }) } finally { setTesting(false) }
  }

  const field = (label: string, value: string, set: (v: string) => void, opts?: { placeholder?: string; type?: string; ltr?: boolean }) => (
    <div style={{ marginBottom: 14 }}>
      <Text size="small" weight="plus" className="mb-1.5">{label}</Text>
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={opts?.placeholder}
        type={opts?.type || "text"}
        dir={opts?.ltr === false ? undefined : "ltr"}
        className="w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2.5 text-sm"
        autoComplete="off"
      />
    </div>
  )

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">✉️ {tt("Mail Server", "خادم البريد")}</h1>
          {meta.token_set ? <Badge color="green">{tt("Configured", "مهيّأ")}</Badge> : <Badge color="orange">{tt("Not configured", "غير مهيّأ")}</Badge>}
        </div>
        <p className="text-sm mt-1.5 text-ui-fg-subtle">
          {tt(
            "cPanel API credentials used to create company mailboxes (name@autotorental.com). Rotate the API token here anytime — it's stored securely and never shown again.",
            "بيانات cPanel API المستخدمة لإنشاء صناديق بريد الشركات (name@autotorental.com). يمكنك تدوير المفتاح هنا في أي وقت — يُخزَّن بأمان ولا يُعرض مجدداً.",
          )}
        </p>

        <div className="mt-6 max-w-xl">
          {loading ? (
            <Text className="text-ui-fg-muted">{tt("Loading…", "جارٍ التحميل…")}</Text>
          ) : (
            <>
              {field(tt("cPanel host", "مضيف cPanel"), host, setHost, { placeholder: "litespeed.example.com" })}
              {field(tt("cPanel username", "اسم مستخدم cPanel"), user, setUser, { placeholder: "autotorental" })}
              {field(tt("Mail domain", "نطاق البريد"), domain, setDomain, { placeholder: "autotorental.com" })}
              <div style={{ marginBottom: 6 }}>
                <Text size="small" weight="plus" className="mb-1.5">
                  {tt("API token", "مفتاح API")}{" "}
                  <span className="text-ui-fg-muted">{meta.token_set ? `(${tt("current", "الحالي")}: ${meta.token_masked})` : ""}</span>
                </Text>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={meta.token_set ? tt("Leave blank to keep current", "اتركه فارغاً للإبقاء على الحالي") : tt("Paste your cPanel API token", "الصق مفتاح cPanel API")}
                  type="password"
                  dir="ltr"
                  className="w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2.5 text-sm"
                  autoComplete="new-password"
                />
              </div>

              {result && (
                <div className="mt-3 rounded-lg px-3 py-2.5 text-sm" style={{ background: result.ok ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${result.ok ? "rgba(16,185,129,.35)" : "rgba(239,68,68,.35)"}`, color: result.ok ? "#059669" : "#dc2626" }}>
                  {result.ok ? "✓ " : "✕ "}{result.message}
                </div>
              )}

              <div className="flex items-center gap-2 mt-5 flex-wrap">
                <Button variant="secondary" isLoading={testing} disabled={busy} onClick={test}>{tt("Test connection", "اختبار الاتصال")}</Button>
                <Button isLoading={busy} disabled={testing} onClick={save}>{tt("Save", "حفظ")}</Button>
              </div>

              <div className="mt-6 rounded-xl border border-ui-border-base p-4 bg-ui-bg-subtle">
                <Heading level="h3" className="text-sm mb-1">{tt("How to get a token", "كيف تحصل على المفتاح")}</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  {tt(
                    "In cPanel → Security → Manage API Tokens → Create. Give it full access (or at least Email). Do NOT set an IP restriction (or whitelist this server's IP). Paste the token above and click Test.",
                    "في cPanel → Security → Manage API Tokens → Create. امنحه صلاحية كاملة (أو على الأقل Email). لا تضع قيد IP (أو أضف عنوان هذا الخادم). الصق المفتاح أعلاه واضغط اختبار.",
                  )}
                </Text>
              </div>
            </>
          )}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
