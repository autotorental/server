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

type NavItem = {
  label: string
  desc: string
  href: string
  Icon: React.ComponentType<{ className?: string }>
}

type Section = { title: string; items: NavItem[] }

const SECTIONS: Section[] = [
  {
    title: "Operations",
    items: [
      { label: "Rental Companies", desc: "Vendors, approvals & profiles", href: "/sellers", Icon: Buildings },
      { label: "Vehicles", desc: "Listings & inventory", href: "/vehicles", Icon: HandTruck },
      { label: "Reviews", desc: "Customer ratings & feedback", href: "/reviews", Icon: Star },
      { label: "Inbox", desc: "Messages & contact requests", href: "/inbox", Icon: Envelope },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", desc: "Calls, views & engagement", href: "/analytics", Icon: ChartBar },
      { label: "Firebase Analytics", desc: "App usage & GA4 data", href: "/firebase-analytics", Icon: Bolt },
      { label: "Reports", desc: "Flagged content & issues", href: "/reports", Icon: DocumentText },
    ],
  },
  {
    title: "Catalog",
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
    items: [
      { label: "Blog", desc: "Articles & posts", href: "/blog", Icon: PencilSquare },
      { label: "Marketing", desc: "Campaigns & promotions", href: "/marketing", Icon: Sparkles },
      { label: "SEO Manager", desc: "Meta, sitemap & search", href: "/seo-manager", Icon: MagnifyingGlass },
      { label: "Sales Toolkit", desc: "Leads & sales resources", href: "/sales-toolkit", Icon: CurrencyDollar },
    ],
  },
  {
    title: "Configuration",
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
  useEffect(() => {
    fetch(`${API}/admin/analytics/contacts`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => {})
  }, [])

  const totals = stats?.totals

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex flex-col gap-y-1">
          <Heading level="h1" className="text-2xl">
            Auto to Rental Marketplace
          </Heading>
          <Text className="text-ui-fg-subtle">
            Manage your B2C2C car rental marketplace across UAE &amp; Syria.
          </Text>
        </div>

        {totals && (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
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
                    <Heading level="h2" className="text-xl">
                      {totals[s.key] ?? 0}
                    </Heading>
                  </div>
                </div>
              )
            })}
            <Text size="xsmall" className="col-span-2 text-ui-fg-muted md:col-span-4">
              Last 30 days
            </Text>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <Heading level="h2" className="mb-3 text-base text-ui-fg-subtle">
                {section.title}
              </Heading>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {section.items.map((item) => {
                  const Icon = item.Icon
                  return (
                    <Link key={item.href} to={item.href} className="no-underline">
                      <div className="group flex h-full items-start gap-x-3 rounded-xl border border-ui-border-base bg-ui-bg-base p-4 transition-all hover:border-ui-border-interactive hover:shadow-elevation-card-hover">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ui-bg-subtle text-ui-fg-subtle transition-colors group-hover:bg-ui-bg-base-hover">
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
    </SingleColumnPage>
  )
}

export default HomePage
