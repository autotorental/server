import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge } from "@medusajs/ui"
import { CreditCardSolid, CheckCircleSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Subscription", icon: CreditCardSolid, nested: "/settings" }

type Sub = {
  status?: string
  plan?: string
  trial_ends_at?: string
  subscription_ends_at?: string
  stripe_customer_id?: string
}

const Page = () => {
  const [sub, setSub] = useState<Sub | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState("")

  const load = () => {
    setLoading(true)
    fetch(`${API}/vendor/subscription`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setSub)
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // ?ok=1 or ?cancelled=1 returns from Stripe Checkout
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search)
    if (qs.get("ok") === "1") {
      setMsg("✅ Subscription activated! Welcome aboard.")
      setTimeout(() => { setMsg(""); load(); window.history.replaceState({}, "", "/rental/settings/subscription") }, 4000)
    } else if (qs.get("cancelled") === "1") {
      setMsg("Subscription cancelled. You can subscribe any time below.")
      setTimeout(() => setMsg(""), 4000)
    }
  }, [])

  const subscribe = async (plan: "monthly" | "yearly") => {
    setBusy(true); setMsg("")
    try {
      const res = await fetch(`${API}/vendor/subscription/checkout`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      })
      const d = await res.json()
      if (!res.ok || !d.url) throw new Error(d.message || "Failed to start checkout")
      window.location.href = d.url
    } catch (e: any) {
      setMsg("⚠️ " + (e.message || "Checkout failed"))
      setBusy(false)
    }
  }

  const manageBilling = async () => {
    setBusy(true); setMsg("")
    try {
      const res = await fetch(`${API}/vendor/subscription/checkout`, { credentials: "include" })
      const d = await res.json()
      if (!res.ok || !d.url) throw new Error(d.message || "No customer portal available")
      window.location.href = d.url
    } catch (e: any) {
      setMsg("⚠️ " + (e.message || "Portal failed"))
      setBusy(false)
    }
  }

  const status = sub?.status || "trial"
  const isActive = status === "active"
  const isTrial = status === "trial"
  const isPastDue = status === "past_due"
  const isCancelled = status === "cancelled"

  const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86400000)) : 0

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">💳 Subscription</Heading>
        <Text className="text-ui-fg-subtle">Manage your Auto to Rental subscription. Without an active subscription, your listings will not be visible to customers after the trial ends.</Text>

        {msg && <div className="mt-4 p-3 rounded-lg bg-ui-bg-subtle"><Text>{msg}</Text></div>}
      </Container>

      <Container className="p-6">
        <Heading level="h3" className="mb-3">Current plan</Heading>
        {loading ? <Text>Loading…</Text> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-ui-bg-base border rounded-xl p-4">
              <Text size="small" className="text-ui-fg-muted uppercase tracking-wider font-bold">Status</Text>
              <div className="mt-2 flex items-center gap-2">
                {isActive && <Badge color="green">✓ Active</Badge>}
                {isTrial && <Badge color="orange">🆓 Trial</Badge>}
                {isPastDue && <Badge color="red">⚠️ Past due</Badge>}
                {isCancelled && <Badge color="grey">Cancelled</Badge>}
              </div>
            </div>
            <div className="bg-ui-bg-base border rounded-xl p-4">
              <Text size="small" className="text-ui-fg-muted uppercase tracking-wider font-bold">Plan</Text>
              <Heading level="h3" className="mt-2 capitalize">{sub?.plan || "Trial"}</Heading>
            </div>
            <div className="bg-ui-bg-base border rounded-xl p-4">
              <Text size="small" className="text-ui-fg-muted uppercase tracking-wider font-bold">
                {isTrial ? "Trial ends" : "Next renewal"}
              </Text>
              <Heading level="h3" className="mt-2">
                {isTrial ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}` :
                 sub?.subscription_ends_at ? new Date(sub.subscription_ends_at).toLocaleDateString() : "—"}
              </Heading>
            </div>
          </div>
        )}

        {isActive && sub?.stripe_customer_id && (
          <div className="mt-4">
            <Button variant="secondary" onClick={manageBilling} disabled={busy}>
              {busy ? "Opening…" : "💳 Manage billing (invoices, payment method, cancel)"}
            </Button>
          </div>
        )}
      </Container>

      {!isActive && (
        <Container className="p-6">
          <Heading level="h3" className="mb-1">Choose a plan</Heading>
          <Text size="small" className="text-ui-fg-subtle mb-4">Cancel any time. No long-term contract. All payments via Stripe.</Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="border-2 border-ui-border-base rounded-2xl p-6 bg-ui-bg-base">
              <div className="flex items-baseline justify-between">
                <Heading level="h2">Monthly</Heading>
                <Badge>Flexible</Badge>
              </div>
              <div className="mt-3">
                <span className="text-4xl font-black">AED 99</span>
                <span className="text-ui-fg-subtle"> / month</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Unlimited vehicle listings</li>
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Advanced analytics + heatmap</li>
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Follower email notifications</li>
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Promotions and sale prices</li>
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Free international calls (WebRTC)</li>
              </ul>
              <Button className="mt-5 w-full" disabled={busy} onClick={() => subscribe("monthly")}>
                {busy ? "Loading…" : "Subscribe — AED 99 / month"}
              </Button>
            </div>

            {/* Yearly */}
            <div className="border-2 border-brand-500 rounded-2xl p-6 bg-ui-bg-base relative">
              <div className="absolute -top-3 left-6"><Badge color="green">SAVE 17%</Badge></div>
              <div className="flex items-baseline justify-between">
                <Heading level="h2">Yearly</Heading>
                <Badge color="green">Best value</Badge>
              </div>
              <div className="mt-3">
                <span className="text-4xl font-black">AED 990</span>
                <span className="text-ui-fg-subtle"> / year</span>
              </div>
              <Text size="small" className="text-ui-fg-muted">Equivalent to AED 82.50/month — 2 months free</Text>
              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Everything in Monthly</li>
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Priority placement in search</li>
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> 1 free social ad credit / month (AED 50)</li>
                <li className="flex items-start gap-2"><CheckCircleSolid className="text-emerald-500 shrink-0 mt-0.5"/> Dedicated account manager</li>
              </ul>
              <Button className="mt-5 w-full" disabled={busy} onClick={() => subscribe("yearly")}>
                {busy ? "Loading…" : "Subscribe — AED 990 / year"}
              </Button>
            </div>
          </div>

          <Text size="small" className="text-ui-fg-muted mt-4 text-center">
            Secure payment by Stripe. Cancel any time from your account.
          </Text>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page
