import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button } from "@medusajs/ui"
import { House, Sparkles, ChartBar } from "@medusajs/icons"
import { VisitorGlobe } from "../../components/visitor-globe"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Home", icon: House, nested: "/" }

const isAr = typeof document !== "undefined" && (document.documentElement.lang || "").startsWith("ar")
const L = (en: string, ar: string) => (isAr ? ar : en)
const fmt = (n: number) => Number(n || 0).toLocaleString()

// Compact hand-rolled area chart (no chart dependency) — mirrors the admin
// Command Center look, scaled for the vendor home.
function AreaChart({ series, labels, height = 170 }: { series: { name: string; color: string; data: number[] }[]; labels: string[]; height?: number }) {
  const W = 760, H = height, P = { l: 6, r: 6, t: 12, b: 18 }
  const n = Math.max(1, ...series.map((s) => s.data.length))
  const max = Math.max(1, ...series.flatMap((s) => s.data))
  const x = (i: number) => P.l + (i * (W - P.l - P.r)) / Math.max(1, n - 1)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const line = (d: number[]) => d.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const area = (d: number[]) => `${line(d)} L${x(n - 1)},${H - P.b} L${x(0)},${H - P.b} Z`
  if (!series.length || n < 2) return <Text className="text-ui-fg-muted text-sm py-8 text-center block">{L("No data yet", "لا توجد بيانات بعد")}</Text>
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`vg${i}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={P.l} x2={W - P.r} y1={P.t + g * (H - P.t - P.b)} y2={P.t + g * (H - P.t - P.b)} stroke="currentColor" strokeOpacity="0.08" />)}
        {series.map((s, i) => <path key={`a${i}`} d={area(s.data)} fill={`url(#vg${i}-${s.name})`} />)}
        {series.map((s, i) => <path key={`l${i}`} d={line(s.data)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />)}
      </svg>
      <div className="flex justify-between text-[10px] opacity-55 mt-1">
        <span>{labels[0]}</span><span>{labels[Math.floor(labels.length / 2)]}</span><span>{labels[labels.length - 1]}</span>
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs text-ui-fg-subtle">
            <span style={{ width: 9, height: 9, borderRadius: 9, background: s.color, display: "inline-block" }} />{s.name}
          </span>
        ))}
      </div>
    </div>
  )
}

const Page = () => {
  const [stats, setStats] = useState<any>(null)
  const [followerCount, setFollowerCount] = useState<number>(0)
  const [sub, setSub] = useState<any>(null)
  const [live, setLive] = useState<any>(null)
  const [ts, setTs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = () => Promise.all([
      fetch(`${API}/vendor/analytics/contacts?days=30`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/vendor/subscription`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/vendor/followers`, { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }).catch(() => ({ count: 0 })),
      fetch(`${API}/vendor/analytics/live`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/vendor/analytics/timeseries?days=30`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([s, sb, f, lv, series]) => {
      if (!alive) return
      setStats(s); setSub(sb); setFollowerCount(f?.count || 0); setLive(lv || null)
      setTs(Array.isArray(series?.series) ? series.series : [])
    }).finally(() => { if (alive) setLoading(false) })
    load()
    const t = setInterval(load, 30000) // keep it genuinely live
    return () => { alive = false; clearInterval(t) }
  }, [])

  const totals = stats?.totals || { call: 0, whatsapp: 0, webrtc: 0, view: 0 }
  const grand = totals.call + totals.whatsapp + totals.webrtc + totals.view
  const activeNow = Number(live?.active_now ?? live?.online ?? 0)
  const tsLabels = ts.map((r) => (r.date || "").slice(5))

  return (
    <SingleColumnPage>
      {/* Subscription banner */}
      {sub && sub.status === "trial" && sub.days_left <= 7 && (
        <Container className="p-4">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-lg">⏰ {L(`Trial ends in ${sub.days_left} days`, `تنتهي التجربة خلال ${sub.days_left} يوم`)}</div>
              <div className="text-sm text-white/90 mt-0.5">{L("Subscribe now to keep your listings active.", "اشترك الآن لإبقاء إعلاناتك نشطة.")}</div>
            </div>
            <a href="/rental/subscription"><Button variant="secondary">{L("Subscribe Now →", "اشترك الآن →")}</Button></a>
          </div>
        </Container>
      )}

      {/* Command Center header */}
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">🛰️ {L("Command Center", "مركز القيادة")}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 text-white px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                {activeNow} {L("online now", "متصل الآن")}
              </span>
            </div>
            <Text className="text-ui-fg-subtle mt-1.5">{L("Your company at a glance — live, auto-updating every 30s.", "شركتك بلمحة — حيّة وتتحدّث تلقائياً كل 30 ثانية.")}</Text>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href="/rental/vehicles?new=1"><Button><Sparkles /> {L("Add Vehicle", "أضف مركبة")}</Button></a>
            <a href="/rental/traffic"><Button variant="secondary"><ChartBar /> {L("Traffic & Performance", "الزيارات والأداء")}</Button></a>
          </div>
        </div>

        {/* Quick stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: "📊", label: L("Last 30 days", "آخر 30 يوماً"), value: grand, color: "from-slate-600 to-slate-800" },
            { icon: "📞", label: L("Phone Calls", "مكالمات هاتفية"), value: totals.call || 0, color: "from-emerald-500 to-emerald-700" },
            { icon: "💬", label: "WhatsApp", value: totals.whatsapp || 0, color: "from-green-500 to-green-700" },
            { icon: "🌍", label: L("Free Call", "مكالمة مجانية"), value: totals.webrtc || 0, color: "from-amber-500 to-orange-600" },
            { icon: "👥", label: L("Followers", "المتابعون"), value: followerCount, color: "from-pink-500 to-rose-600" },
          ].map((c, i) => (
            <div key={i} className={`rounded-2xl p-4 text-white bg-gradient-to-br ${c.color} shadow-lg`}>
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="text-3xl font-black tabular-nums">{fmt(c.value)}</div>
              <div className="text-xs opacity-80 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      </Container>

      {/* Engagement over time — your company only */}
      <Container className="p-6 pt-0">
        <div className="rounded-2xl border border-ui-border-base bg-ui-bg-base p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Heading level="h2" className="text-base font-semibold">📈 {L("Engagement over time", "التفاعل عبر الزمن")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">{L("Views, calls & WhatsApp for your company · last 30 days", "مشاهدات ومكالمات وواتساب لشركتك · آخر 30 يوماً")}</Text>
            </div>
          </div>
          {loading ? (
            <Text className="text-ui-fg-muted text-sm py-8 text-center block">{L("Loading…", "جارٍ التحميل…")}</Text>
          ) : (
            <AreaChart labels={tsLabels} series={[
              { name: L("Views", "مشاهدات"), color: "#38bdf8", data: ts.map((r) => Number(r.view || 0)) },
              { name: L("Calls", "مكالمات"), color: "#34d399", data: ts.map((r) => Number(r.call || 0)) },
              { name: "WhatsApp", color: "#22c55e", data: ts.map((r) => Number(r.whatsapp || 0)) },
            ]} />
          )}
        </div>
      </Container>

      {/* GLOBE / MAP — the hero visualization (vendor-scoped) */}
      <Container className="p-6 pt-0">
        <VisitorGlobe days={30} scope="vendor"/>
      </Container>

      {/* Quick actions */}
      <Container className="p-6 pt-0">
        <Heading level="h3">🚀 {L("Quick actions", "إجراءات سريعة")}</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">{L("Things rental companies often want to do.", "أمور تحتاجها شركات التأجير غالباً.")}</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: "🚗", title: L("Add a new vehicle", "أضف مركبة جديدة"), desc: L("Upload photos, set prices, contact info.", "صور وأسعار وبيانات تواصل."), href: "/rental/vehicles?new=1" },
            { icon: "🏢", title: L("Store profile", "ملف المتجر"), desc: L("Banner, logo, description, contact details.", "غلاف وشعار ووصف وبيانات تواصل."), href: "/rental/settings/store" },
            { icon: "📜", title: L("Trade license", "الرخصة التجارية"), desc: L("Upload license for admin verification.", "ارفع الرخصة للتحقق من الإدارة."), href: "/rental/settings/trade-license" },
            { icon: "🎁", title: L("Run a promotion", "أطلق عرضاً"), desc: L("Discount % or specific sale price.", "نسبة خصم أو سعر بيع محدّد."), href: "/rental/promotions" },
            { icon: "👥", title: L("See your followers", "متابعوك"), desc: L("Customers who follow your company.", "العملاء الذين يتابعون شركتك."), href: "/rental/followers" },
            { icon: "📈", title: L("Detailed analytics", "تحليلات مفصّلة"), desc: L("Chart, heatmap, top vehicles, sources.", "مخطط، خريطة حرارية، أعلى المركبات، المصادر."), href: "/rental/analytics" },
            { icon: "⭐", title: L("Reviews", "التقييمات"), desc: L("Read what customers say.", "اقرأ ما يقوله العملاء."), href: "/rental/reviews" },
            { icon: "💳", title: L("Subscription", "الاشتراك"), desc: L("Manage your plan.", "أدر خطتك."), href: "/rental/subscription" },
          ].map((a, i) => (
            <a key={i} href={a.href} className="group bg-ui-bg-base border border-ui-border-base hover:border-ui-fg-muted hover:shadow-md rounded-xl p-4 flex items-start gap-3 transition">
              <div className="text-2xl">{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ui-fg-base group-hover:text-ui-fg-interactive">{a.title}</div>
                <div className="text-xs text-ui-fg-subtle mt-0.5">{a.desc}</div>
              </div>
              <span>→</span>
            </a>
          ))}
        </div>
      </Container>

      {/* Tips for new vendors */}
      {grand === 0 && !loading && (
        <Container className="p-6 pt-0">
          <div className="bg-gradient-to-br from-ui-tag-blue-bg to-ui-bg-base rounded-2xl p-6">
            <Heading level="h3" className="flex items-center gap-2"><span>⚡</span> {L("Tips to get your first customer event", "نصائح للحصول على أول تفاعل من عميل")}</Heading>
            <ol className="mt-3 space-y-2 text-sm list-decimal pl-5">
              <li>{L("Add at least 5 vehicles with sharp photos and accurate prices.", "أضف 5 مركبات على الأقل بصور واضحة وأسعار دقيقة.")}</li>
              <li>{L("Share your storefront link on Instagram, WhatsApp Status, Facebook.", "شارك رابط متجرك على إنستغرام وحالة واتساب وفيسبوك.")}</li>
              <li>{L("Ask past customers to leave a Google review and follow you.", "اطلب من عملائك السابقين تقييماً على Google ومتابعتك.")}</li>
              <li>{L("Run a small ad (AED 50/day) on Meta or Google for 7 days.", "أطلق إعلاناً صغيراً (50 درهم/يوم) على Meta أو Google لمدة 7 أيام.")}</li>
              <li>{L("Be responsive — customers who get a reply within 5 mins are 5× more likely to book.", "كن سريع الرد — من يُجابون خلال 5 دقائق أكثر حجزاً بـ5 أضعاف.")}</li>
            </ol>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page
