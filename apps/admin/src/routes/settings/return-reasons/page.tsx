import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { ChartBar, HandTruck, ChatBubbleLeftRight, Phone } from "@medusajs/icons"

/** Overrides Mercur's e-commerce "Return reasons" settings — not used on Auto to Rental. */
const Page = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate("/analytics", { replace: true }), 8000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Badge color="grey" className="mb-3">Listing marketplace</Badge>
        <Heading level="h1" className="text-2xl font-semibold tracking-tight">
          Returns are not used here
        </Heading>
        <Text className="mt-2 max-w-2xl text-ui-fg-subtle">
          Auto to Rental is not a checkout store. Rental companies list vehicles; customers browse listings and
          contact the vendor directly by phone, WhatsApp, or free international WebRTC call.
        </Text>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
            <Phone className="text-ui-fg-muted mb-2" />
            <Text className="font-medium">Phone calls</Text>
            <Text size="small" className="mt-1 text-ui-fg-muted">Tracked in Analytics</Text>
          </div>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
            <ChatBubbleLeftRight className="text-ui-fg-muted mb-2" />
            <Text className="font-medium">WhatsApp</Text>
            <Text size="small" className="mt-1 text-ui-fg-muted">One-tap contact from listings</Text>
          </div>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
            <ChartBar className="text-ui-fg-muted mb-2" />
            <Text className="font-medium">Free WebRTC calls</Text>
            <Text size="small" className="mt-1 text-ui-fg-muted">International callers</Text>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Button onClick={() => navigate("/analytics")}>
            <ChartBar />
            Open Analytics
          </Button>
          <Button variant="secondary" onClick={() => navigate("/vehicles")}>
            <HandTruck />
            Manage vehicles
          </Button>
        </div>

        <Text size="small" className="mt-6 text-ui-fg-muted">
          Redirecting to Analytics in a few seconds…
        </Text>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
