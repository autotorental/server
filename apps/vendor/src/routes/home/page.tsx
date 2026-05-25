import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { House, Sparkles, ChartBar, Megaphone } from "@medusajs/icons"
import { VisitorGlobe } from "../../components/visitor-globe"

export const config: RouteConfig = { label: "Home", icon: House, nested: "/" }

const API = "https://api.autotorental.com"

const Page = () => {
  const [stats, setStats] = useState<any>(null)
  const [followerCount, setFollowerCount] = useState<number>(0)
  const [sub, setSub] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/vendor/analytics/contacts?days=30`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/vendor/subscription`, { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API}/vendor/followers`, { credentials: "include" }).then(r => r.ok ? r.json() : { count: 0 }).catch(() => ({ count: 0 })),
    ]).then(([s, sb, f]) => { setStats(s); setSub(sb); setFollowerCount(f?.count || 0) }).finally(() => setLoading(false))
  }, [])

  const totals = stats?.totals || { call: 0, whatsapp: 0, webrtc: 0, view: 0 }
  const grand = totals.call + totals.whatsapp + totals.webrtc + totals.view

  return (
    <SingleColumnPage>
      {/* Subscription banner */}
      {sub && sub.status === "trial" && sub.days_left <= 7 && (
        <Container className="p-4">
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-lg">⏰ Trial ends in {sub.days_left} days</div>
              <div className="text-sm text-white/90 mt-0.5">Subscribe now to keep your listings active.</div>
            </div>
            <a href="/rental/subscription"><Button variant="secondary">Subscribe Now →</Button></a>
          </div>
        </Container>
      )}

      {/* Welcome + quick stats */}
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-ui-fg-muted font-bold mb-1">Rental Company Dashboard</div>
            <Heading level="h1" className="text-3xl">Welcome back 👋</Heading>
            <Text className="text-ui-fg-subtle mt-1">Here's your business at a glance.</Text>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href="/rental/vehicles?new=1"><Button><Sparkles /> Add Vehicle</Button></a>
            <a href="/rental/analytics"><Button variant="secondary"><ChartBar /> Full Analytics</Button></a>
          </div>
        </div>

        {/* Quick stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon: "📊", label: "Last 30 days", value: grand, color: "from-slate-600 to-slate-800" },
            { icon: "📞", label: "Phone Calls", value: totals.call || 0, color: "from-emerald-500 to-emerald-700" },
            { icon: "💬", label: "WhatsApp", value: totals.whatsapp || 0, color: "from-green-500 to-green-700" },
            { icon: "🌍", label: "Free Int'l", value: totals.webrtc || 0, color: "from-amber-500 to-orange-600" },
            { icon: "👥", label: "Followers", value: followerCount, color: "from-pink-500 to-rose-600" },
          ].map((c, i) => (
            <div key={i} className={`rounded-2xl p-4 text-white bg-gradient-to-br ${c.color} shadow-lg`}>
              <div className="text-3xl mb-2">{c.icon}</div>
              <div className="text-3xl font-black tabular-nums">{c.value.toLocaleString()}</div>
              <div className="text-xs opacity-80 mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      </Container>

      {/* GLOBE / MAP — the hero visualization */}
      <Container className="p-6">
        <VisitorGlobe days={30} scope="vendor"/>
      </Container>

      {/* Quick actions */}
      <Container className="p-6">
        <Heading level="h3">🚀 Quick actions</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Things rental companies often want to do.</Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: "🚗", title: "Add a new vehicle", desc: "Upload photos, set prices, contact info.", href: "/rental/vehicles?new=1" },
            { icon: "🎁", title: "Run a promotion", desc: "Discount % or specific sale price.", href: "/rental/promotions" },
            { icon: "👥", title: "See your followers", desc: "Customers who follow your company.", href: "/rental/followers" },
            { icon: "📈", title: "Detailed analytics", desc: "Chart, heatmap, top vehicles, sources.", href: "/rental/analytics" },
            { icon: "⭐", title: "Reviews", desc: "Read what customers say.", href: "/rental/reviews" },
            { icon: "💳", title: "Subscription", desc: "Manage your plan.", href: "/rental/subscription" },
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
        <Container className="p-6">
          <div className="bg-gradient-to-br from-ui-tag-blue-bg to-ui-bg-base rounded-2xl p-6">
            <Heading level="h3" className="flex items-center gap-2"><span>⚡</span> Tips to get your first customer event</Heading>
            <ol className="mt-3 space-y-2 text-sm list-decimal pl-5">
              <li><strong>Add at least 5 vehicles</strong> with sharp photos and accurate prices.</li>
              <li><strong>Share your storefront link</strong> on Instagram, WhatsApp Status, Facebook.</li>
              <li><strong>Ask past customers</strong> to leave a Google review and follow you.</li>
              <li><strong>Run a small ad</strong> (AED 50/day) on Meta or Google for 7 days.</li>
              <li><strong>Be responsive</strong> — customers who get a reply within 5 mins are 5× more likely to book.</li>
            </ol>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page
