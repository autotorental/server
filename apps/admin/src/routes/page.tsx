import { useEffect, useState } from "react"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { Link } from "react-router-dom"

const API = "https://api.autotorental.com"

const HomePage = () => {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => {
    fetch(`${API}/admin/analytics/contacts`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(setStats).catch(() => {})
  }, [])

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h2" className="text-xl">🚗 Welcome to Auto to Rental Marketplace</Heading>
        <Text className="text-ui-fg-subtle mt-2">The B2C2C marketplace for car rentals in UAE + Syria.</Text>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: "Rental Companies", href: "/sellers" },
            { label: "Vehicles", href: "/vehicles" },
            { label: "Reports", href: "/reports" },
            { label: "Analytics", href: "/analytics" },
            { label: "Brands", href: "/brands" },
            { label: "Vehicle Types", href: "/vehicle-types" },
            { label: "Features", href: "/features" },
            { label: "Locations", href: "/locations" },
          ].map(item => (
            <Link key={item.href} to={item.href} style={{ textDecoration: "none" }}>
              <div className="p-6 border border-ui-border-base rounded-lg bg-ui-bg-base hover:bg-ui-bg-base-hover transition-colors" style={{ cursor: "pointer" }}>
                <Heading level="h2" className="text-xl">{item.label}</Heading>
              </div>
            </Link>
          ))}
        </div>

        {stats?.totals && (
          <div className="mt-8">
            <Heading level="h2" className="mb-4">Last 30 days</Heading>
            <div className="grid grid-cols-4 gap-3">
              <div className="p-4 border rounded-lg"><Text size="xsmall" className="uppercase text-ui-fg-muted">📞 Calls</Text><Heading level="h1">{stats.totals.call}</Heading></div>
              <div className="p-4 border rounded-lg"><Text size="xsmall" className="uppercase text-ui-fg-muted">💬 WhatsApp</Text><Heading level="h1">{stats.totals.whatsapp}</Heading></div>
              <div className="p-4 border rounded-lg"><Text size="xsmall" className="uppercase text-ui-fg-muted">🎙️ Free Calls</Text><Heading level="h1">{stats.totals.webrtc}</Heading></div>
              <div className="p-4 border rounded-lg"><Text size="xsmall" className="uppercase text-ui-fg-muted">👁️ Views</Text><Heading level="h1">{stats.totals.view}</Heading></div>
            </div>
          </div>
        )}
      </Container>
    </SingleColumnPage>
  )
}
export default HomePage
