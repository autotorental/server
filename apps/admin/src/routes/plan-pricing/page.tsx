import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { Tag } from "@medusajs/icons"
import { toast } from "@medusajs/ui"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Plans & Pricing", "الباقات والأسعار"), icon: Tag, rank: 52 }

// The price set here is exactly what Stripe charges (the mobile PaymentSheet reads
// the same sub_* settings). Features + prices update in the app instantly, no rebuild.
const parseFeatures = (raw?: string): string[] => {
  if (!raw) return []
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a.map((x) => String(x || "")).filter(Boolean) : [] } catch { return [] }
}

const Page = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currency, setCurrency] = useState("AED")
  const [bm, setBm] = useState(""); const [by, setBy] = useState("")
  const [pm, setPm] = useState(""); const [py, setPy] = useState("")
  const [basicFeats, setBasicFeats] = useState<string[]>([])
  const [plusFeats, setPlusFeats] = useState<string[]>([])

  const load = () => fetch(`${API}/admin/settings`, { credentials: "include" })
    .then((r) => r.json()).then((d) => {
      const m: Record<string, any> = {}; (d.settings || []).forEach((s: any) => { m[s.key] = s })
      setCurrency(m.sub_currency?.value || "AED")
      setBm(m.sub_basic_monthly?.value || "99"); setBy(m.sub_basic_yearly?.value || "990")
      setPm(m.sub_plus_monthly?.value || "150"); setPy(m.sub_plus_yearly?.value || "1500")
      setBasicFeats(parseFeatures(m.sub_basic_features?.value))
      setPlusFeats(parseFeatures(m.sub_plus_features?.value))
    }).catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      const body: Record<string, string> = {
        sub_currency: currency.trim().toUpperCase() || "AED",
        sub_basic_monthly: String(Number(bm) || 0), sub_basic_yearly: String(Number(by) || 0),
        sub_plus_monthly: String(Number(pm) || 0), sub_plus_yearly: String(Number(py) || 0),
        sub_basic_features: JSON.stringify(basicFeats.map((f) => f.trim()).filter(Boolean)),
        sub_plus_features: JSON.stringify(plusFeats.map((f) => f.trim()).filter(Boolean)),
      }
      const r = await fetch(`${API}/admin/settings`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!r.ok) { toast.error(tt("Save failed", "فشل الحفظ")); return }
      toast.success(tt("Saved ✓ — live in the app now", "تم الحفظ ✓ — ظاهر في التطبيق الآن")); load()
    } catch { toast.error(tt("Network error", "خطأ في الشبكة")) } finally { setSaving(false) }
  }

  const input = "w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2.5 text-sm"

  // Editable feature list (add / edit / remove lines).
  const FeatureList = ({ items, set, accent }: { items: string[]; set: (v: string[]) => void; accent: string }) => (
    <div>
      {items.map((f, i) => (
        <div key={i} className="flex items-center gap-2 mb-2">
          <span style={{ width: 7, height: 7, borderRadius: 99, background: accent, flexShrink: 0 }} />
          <input value={f} onChange={(e) => { const a = [...items]; a[i] = e.target.value; set(a) }} placeholder={tt("Feature line", "سطر ميزة")} className={input} />
          <button onClick={() => set(items.filter((_, j) => j !== i))} title={tt("Remove", "حذف")}
            style={{ cursor: "pointer", width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(120,120,140,.25)", color: "#dc2626", background: "transparent", flexShrink: 0 }}>✕</button>
        </div>
      ))}
      <Button size="small" variant="secondary" onClick={() => set([...items, ""])}>＋ {tt("Add feature", "إضافة ميزة")}</Button>
    </div>
  )

  const PlanCard = ({ title, badge, accent, m, setM, y, setY, feats, setFeats, featLabel }: any) => (
    <div className="rounded-xl border border-ui-border-base p-4">
      <div className="flex items-center gap-2 mb-3">
        <Heading level="h2" className="text-base font-semibold">{title}</Heading>
        {badge ? <Badge color="blue" size="2xsmall">{badge}</Badge> : null}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Text size="small" weight="plus" className="mb-1.5">{tt("Monthly price", "السعر الشهري")} ({currency})</Text>
          <input value={m} onChange={(e) => setM(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="99" className={input} />
        </div>
        <div>
          <Text size="small" weight="plus" className="mb-1.5">{tt("Yearly price", "السعر السنوي")} ({currency})</Text>
          <input value={y} onChange={(e) => setY(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="990" className={input} />
        </div>
      </div>
      <Text size="small" weight="plus" className="mb-2">{featLabel}</Text>
      <FeatureList items={feats} set={setFeats} accent={accent} />
    </div>
  )

  return (
    <SingleColumnPage>
      <Container className="p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-ui-border-base">
          <div className="flex items-center gap-2">
            <Heading>{tt("Subscription plans", "باقات الاشتراك")}</Heading>
            <Badge color="green">Stripe</Badge>
          </div>
          <Text className="text-ui-fg-subtle text-sm mt-1.5">
            {tt("Edit the Basic / Plus prices and feature lists shown in the mobile app. The price you set here is exactly what Stripe charges — and changes appear in the app instantly (no rebuild).",
                "عدّل أسعار ومزايا باقتي Basic / Plus الظاهرة في التطبيق. السعر الذي تضعه هنا هو بالضبط ما يخصمه Stripe — والتغييرات تظهر في التطبيق فورًا بلا إعادة بناء.")}
          </Text>
        </div>

        {loading ? (
          <div className="p-6"><Text className="text-ui-fg-subtle text-sm">{tt("Loading…", "جارٍ التحميل…")}</Text></div>
        ) : (
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-end gap-3">
              <div style={{ width: 140 }}>
                <Text size="small" weight="plus" className="mb-1.5">{tt("Currency", "العملة")}</Text>
                <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="AED" className={input} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PlanCard title={tt("Basic", "العادية")} accent="#10b981"
                m={bm} setM={setBm} y={by} setY={setBy} feats={basicFeats} setFeats={setBasicFeats}
                featLabel={tt("Features", "المزايا")} />
              <PlanCard title="Plus" badge={tt("AI", "ذكاء")} accent="#3b82f6"
                m={pm} setM={setPm} y={py} setY={setPy} feats={plusFeats} setFeats={setPlusFeats}
                featLabel={tt("Extra features (shown with ✨, added on top of Basic's)", "مزايا إضافية (تظهر بنجمة ✨ فوق مزايا Basic)")} />
            </div>

            <div>
              <Button isLoading={saving} onClick={save}>💾 {tt("Save plans", "حفظ الباقات")}</Button>
            </div>
          </div>
        )}
      </Container>
    </SingleColumnPage>
  )
}

export default Page
