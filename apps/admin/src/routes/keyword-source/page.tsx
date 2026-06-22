import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { MagnifyingGlass } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

// Choose which provider powers keyword search-volume / difficulty lookups.
export const config: RouteConfig = { label: tt("Keyword Source", "مصدر الكلمات"), icon: MagnifyingGlass, rank: 26 }

type State = { provider: string; semrush_set?: boolean; semrush_masked?: string; dataforseo_set?: boolean }

const Page = () => {
  const [st, setSt] = useState<State | null>(null)
  const [provider, setProvider] = useState("dataforseo")
  const [key, setKey] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => {
    fetch(`${API}/admin/seo/keyword-source`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setSt(d); setProvider(d.provider || "dataforseo") } }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const payload = () => ({ provider, ...(key.trim() ? { semrush_api_key: key.trim() } : {}) })
  const save = async () => {
    setBusy(true)
    try {
      const r = await fetch(`${API}/admin/seo/keyword-source`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { toast.error(d?.message || tt("Save failed", "فشل الحفظ")); return }
      setSt((s) => ({ ...(s || {}), ...d })); setKey("")
      toast.success(tt("Saved ✓", "تم الحفظ ✓"))
    } catch { toast.error(tt("Network error", "خطأ في الشبكة")) } finally { setBusy(false) }
  }
  const test = async () => {
    setTesting(true); setResult(null)
    try {
      const r = await fetch(`${API}/admin/seo/keyword-source`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", ...payload() }) })
      setResult(await r.json().catch(() => ({ ok: false, message: "Failed" })))
    } catch { setResult({ ok: false, message: tt("Network error", "خطأ في الشبكة") }) } finally { setTesting(false) }
  }

  const Choice = ({ id, title, desc, installed }: { id: string; title: string; desc: string; installed?: boolean }) => (
    <button onClick={() => setProvider(id)} style={{ textAlign: "start", cursor: "pointer", flex: "1 1 240px", borderRadius: 14, padding: 16, border: `2px solid ${provider === id ? "#3b82f6" : "rgba(120,120,140,.22)"}`, background: provider === id ? "rgba(59,130,246,.07)" : "transparent" }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ width: 16, height: 16, borderRadius: 99, border: `5px solid ${provider === id ? "#3b82f6" : "rgba(120,120,140,.4)"}` }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{title}</span>
        {installed && <Badge size="2xsmall" color="green">{tt("installed", "مثبّت")}</Badge>}
      </div>
      <Text size="small" className="text-ui-fg-subtle">{desc}</Text>
    </button>
  )

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">🔑 {tt("Keyword Data Source", "مصدر بيانات الكلمات")}</h1>
          {st && <Badge color="blue">{st.provider === "semrush" ? "SEMrush" : "DataForSEO"}</Badge>}
        </div>
        <p className="text-sm mt-1.5 text-ui-fg-subtle">
          {tt("Choose which provider powers keyword search-volume, CPC & difficulty across the SEO tools your clients use.", "اختر المزوّد الذي يُشغّل حجم البحث والتكلفة والصعوبة للكلمات في أدوات SEO التي يستخدمها عملاؤك.")}
        </p>

        {loading ? <Text className="text-ui-fg-muted mt-4">{tt("Loading…", "جارٍ التحميل…")}</Text> : (
          <>
            <div className="flex flex-wrap gap-3 mt-5">
              <Choice id="dataforseo" title="DataForSEO" desc={tt("Google Ads volumes + exact 12-month history. Currently installed & active.", "أحجام Google Ads + تاريخ 12 شهراً دقيق. مثبّت ونشط حالياً.")} installed={st?.dataforseo_set} />
              <Choice id="semrush" title="SEMrush" desc={tt("SEMrush database (volume, CPC, competition, trend). Needs your SEMrush API key.", "قاعدة SEMrush (الحجم، التكلفة، المنافسة، الاتجاه). تحتاج مفتاح SEMrush API.")} installed={st?.semrush_set} />
            </div>

            {provider === "semrush" && (
              <div className="mt-4 max-w-lg">
                <Text size="small" weight="plus" className="mb-1.5">
                  {tt("SEMrush API key", "مفتاح SEMrush API")} {st?.semrush_set ? <span className="text-ui-fg-muted">({tt("current", "الحالي")}: {st.semrush_masked})</span> : null}
                </Text>
                <input value={key} onChange={(e) => setKey(e.target.value)} type="password" dir="ltr" autoComplete="new-password"
                  placeholder={st?.semrush_set ? tt("Leave blank to keep current", "اتركه فارغاً للإبقاء على الحالي") : tt("Paste your SEMrush API key", "الصق مفتاح SEMrush API")}
                  className="w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2.5 text-sm" />
                <Text size="small" className="text-ui-fg-muted mt-1.5">{tt("Get it from SEMrush → Profile → Subscription info → API units.", "احصل عليه من SEMrush → Profile → Subscription info → API units.")}</Text>
              </div>
            )}

            {result && (
              <div className="mt-4 rounded-lg px-3 py-2.5 text-sm max-w-lg" style={{ background: result.ok ? "rgba(16,185,129,.12)" : "rgba(239,68,68,.12)", border: `1px solid ${result.ok ? "rgba(16,185,129,.35)" : "rgba(239,68,68,.35)"}`, color: result.ok ? "#059669" : "#dc2626" }}>
                {result.ok ? "✓ " : "✕ "}{result.message}
              </div>
            )}

            <div className="flex items-center gap-2 mt-5 flex-wrap">
              <Button variant="secondary" isLoading={testing} disabled={busy} onClick={test}>{tt("Test", "اختبار")}</Button>
              <Button isLoading={busy} disabled={testing} onClick={save}>{tt("Save & activate", "حفظ وتفعيل")}</Button>
            </div>
          </>
        )}
      </Container>
    </SingleColumnPage>
  )
}

export default Page
