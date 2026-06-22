import { useEffect, useState } from "react"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text } from "@medusajs/ui"
import {
  Buildings,
  HandTruck,
  Star,
  Envelope,
  ChartBar,
  Bolt,
  DocumentText,
  Tag,
  TagSolid,
  FolderOpen,
  CheckCircleSolid,
  MapPin,
  PencilSquare,
  Sparkles,
  MagnifyingGlass,
  CurrencyDollar,
  Photo,
  Key,
  Clock,
  Phone,
  ChatBubbleLeftRight,
  Eye,
} from "@medusajs/icons"
import { Link } from "react-router-dom"
import { API } from "../lib/api"
import LiveTrafficPage from "./live-traffic/page"
import OverviewPage from "./overview/page"
import { TrafficGlobe } from "../components/traffic-globe"

type NavItem = {
  label: string
  desc: string
  href: string
  Icon: React.ComponentType<{ className?: string }>
}

type Section = { title: string; color: string; items: NavItem[] }

const SECTIONS: Section[] = [
  {
    title: "Operations",
    color: "#2563eb",
    items: [
      { label: "Rental Companies", desc: "Vendors, approvals & profiles", href: "/sellers", Icon: Buildings },
      { label: "Vehicles", desc: "Listings & inventory", href: "/vehicles", Icon: HandTruck },
      { label: "Reviews", desc: "Customer ratings & feedback", href: "/reviews", Icon: Star },
      { label: "Inbox", desc: "Messages & contact requests", href: "/inbox", Icon: Envelope },
    ],
  },
  {
    title: "Insights",
    color: "#7c3aed",
    items: [
      { label: "Analytics", desc: "Calls, views & engagement", href: "/analytics", Icon: ChartBar },
      { label: "Firebase Analytics", desc: "App usage & GA4 data", href: "/firebase-analytics", Icon: Bolt },
      { label: "Reports", desc: "Flagged content & issues", href: "/reports", Icon: DocumentText },
    ],
  },
  {
    title: "Catalog",
    color: "#0d9488",
    items: [
      { label: "Brands", desc: "Car manufacturers", href: "/brands", Icon: Tag },
      { label: "Models", desc: "Vehicle models", href: "/models", Icon: TagSolid },
      { label: "Vehicle Types", desc: "Body types & categories", href: "/vehicle-types", Icon: FolderOpen },
      { label: "Features", desc: "Vehicle features & specs", href: "/features", Icon: CheckCircleSolid },
      { label: "Locations", desc: "Cities & service areas", href: "/locations", Icon: MapPin },
    ],
  },
  {
    title: "Growth & Content",
    color: "#db2777",
    items: [
      { label: "Blog", desc: "Articles & posts", href: "/blog", Icon: PencilSquare },
      { label: "Marketing", desc: "Campaigns & promotions", href: "/marketing", Icon: Sparkles },
      { label: "SEO Manager", desc: "Meta, sitemap & search", href: "/seo-manager", Icon: MagnifyingGlass },
      { label: "Sales Toolkit", desc: "Leads & sales resources", href: "/sales-toolkit", Icon: CurrencyDollar },
    ],
  },
  {
    title: "Configuration",
    color: "#d97706",
    items: [
      { label: "Splash", desc: "App splash & branding", href: "/splash", Icon: Photo },
      { label: "AI Settings", desc: "AI providers & models", href: "/ai-settings", Icon: Sparkles },
      { label: "Integrations", desc: "Third-party connections", href: "/integrations", Icon: Key },
      { label: "Subscriptions", desc: "Vendor plans & billing", href: "/subscriptions", Icon: Clock },
      { label: "Legal Pages", desc: "Terms, privacy & policies", href: "/legal-pages", Icon: DocumentText },
    ],
  },
]

type Stat = { key: string; label: string; Icon: React.ComponentType<{ className?: string }>; tint: string }

const STATS: Stat[] = [
  { key: "call", label: "Phone Calls", Icon: Phone, tint: "text-emerald-500" },
  { key: "whatsapp", label: "WhatsApp", Icon: ChatBubbleLeftRight, tint: "text-green-500" },
  { key: "webrtc", label: "Free Calls", Icon: Bolt, tint: "text-amber-500" },
  { key: "view", label: "Listing Views", Icon: Eye, tint: "text-blue-500" },
]

const HomePage = () => {
  const [stats, setStats] = useState<any>(null)
  const [ov, setOv] = useState<any>(null)
  const [live, setLive] = useState<any>(null)
  useEffect(() => {
    fetch(`${API}/admin/analytics/contacts`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {})
    fetch(`${API}/admin/overview`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setOv)
      .catch(() => {})
    const loadLive = () => fetch(`${API}/admin/analytics/live`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).then(setLive).catch(() => {})
    loadLive()
    const iv = setInterval(loadLive, 8000)
    return () => clearInterval(iv)
  }, [])
  const money = (n: number) => "AED " + (n || 0).toLocaleString()

  const totals = stats?.totals

  return (
    <div className="flex w-full flex-col gap-y-3">
      <Container className="p-6">
        <div className="flex flex-col gap-y-1">
          <Heading level="h1" className="text-2xl">
            Auto to Rental Marketplace
          </Heading>
          <Text className="text-ui-fg-subtle">
            Manage your international, multi-vendor car rental marketplace — verified companies, direct booking, zero commission.
          </Text>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "0.75rem", marginTop: "1.25rem" }}>
          {[
            { label: "Est. MRR", value: ov ? money(ov.est_mrr_aed) : "—", accent: "#16a34a" },
            { label: "Paying vendors", value: ov ? String(ov.paying_vendors) : "—", accent: "#2563eb" },
            { label: "Trials expiring 7d", value: ov ? String(ov.trials_expiring_7d) : "—", accent: "#d97706" },
            { label: "Pending approvals", value: ov ? String(ov.pending_approvals) : "—", accent: "#7c3aed" },
            { label: "Companies", value: ov ? String(ov.companies) : "—", accent: "#0ea5e9" },
            { label: "Vehicles", value: ov ? String(ov.vehicles) : "—", accent: "#0891b2" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: k.accent }} />
                <span className="text-xs font-medium text-ui-fg-subtle">{k.label}</span>
              </div>
              <div className="text-2xl font-semibold text-ui-fg-base mt-1.5 tabular-nums">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-ui-border-base">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "#22d3ee" }} />
              <Heading level="h2" className="text-base font-semibold">Global Traffic · Live</Heading>
            </div>
            <Link to="/live-traffic" className="text-ui-fg-interactive text-sm no-underline">Open full view →</Link>
          </div>
          <div className="p-4">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Active now", value: live?.active_now, c: "#059669" },
                { label: "Views · 30m", value: live?.views_30m, c: "#2563eb" },
                { label: "Visitors today", value: live?.visitors_today, c: "#7c3aed" },
                { label: "Views today", value: live?.views_today, c: "#d97706" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                  <div className="text-[11px] font-medium text-ui-fg-subtle">{k.label}</div>
                  <div className="text-xl font-semibold tabular-nums mt-0.5" style={{ color: k.c }}>{typeof k.value === "number" ? k.value.toLocaleString() : "—"}</div>
                </div>
              ))}
            </div>
            <TrafficGlobe countries={(live?.top_countries || []).map((c: any) => ({ code: c.country, count: c.n }))} />
          </div>
        </div>

        {totals && (
          <div className="mt-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            {STATS.map((s) => {
              const Icon = s.Icon
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-x-3 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ui-bg-base">
                    <Icon className={s.tint} />
                  </div>
                  <div className="flex flex-col">
                    <Text size="xsmall" className="uppercase text-ui-fg-muted">
                      {s.label}
                    </Text>
                    <Heading level="h2" className="text-3xl">
                      {totals[s.key] ?? 0}
                    </Heading>
                  </div>
                </div>
              )
            })}
            <Text size="xsmall" className="text-ui-fg-muted" style={{ gridColumn: "1 / -1" }}>
              Last 30 days
            </Text>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <Heading level="h2" className="mb-3 text-base text-ui-fg-subtle flex items-center gap-2">
                <span className="inline-block rounded-full" style={{ width: 5, height: 16, background: section.color }} />
                {section.title}
              </Heading>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                {section.items.map((item) => {
                  const Icon = item.Icon
                  return (
                    <Link key={item.href} to={item.href} className="no-underline">
                      <div className="group flex h-full items-start gap-x-3 rounded-xl border border-ui-border-base bg-ui-bg-base p-4 transition-all hover:border-ui-border-interactive hover:shadow-elevation-card-hover">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105" style={{ background: `${section.color}16`, color: section.color }}>
                          <Icon />
                        </div>
                        <div className="flex flex-col">
                          <Text weight="plus" className="text-ui-fg-base">
                            {item.label}
                          </Text>
                          <Text size="small" className="text-ui-fg-subtle">
                            {item.desc}
                          </Text>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}

export { HomePage }
// The admin dashboard now opens directly on the Command Center (Overview).
export default OverviewPage