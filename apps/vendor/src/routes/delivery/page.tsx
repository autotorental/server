import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge, Switch } from "@medusajs/ui"
import { MapPin } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Locations & Delivery", icon: MapPin, nested: "/settings" }

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const

type EmirateConfig = { active: boolean; free: boolean; price: number }
type DeliveryConfig = { enabled: boolean; emirates: Record<string, EmirateConfig> }

const emptyEmirate = (): EmirateConfig => ({ active: false, free: false, price: 0 })

const normalize = (raw: any): DeliveryConfig => {
  const emirates: Record<string, EmirateConfig> = {}
  for (const name of EMIRATES) {
    const e = raw?.emirates?.[name] || {}
    emirates[name] = {
      active: !!e.active,
      free: !!e.free,
      price: Number(e.price) || 0,
    }
  }
  return { enabled: !!raw?.enabled, emirates }
}

const Page = () => {
  const [seller, setSeller] = useState<any>(null)
  const [cfg, setCfg] = useState<DeliveryConfig>(() => normalize(null))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const currency = (seller?.currency_code || "aed").toUpperCase()

  const load = async () => {
    setLoading(true)
    try {
      const p = await fetch(`${API}/vendor/profile`, { credentials: "include" }).then(r => (r.ok ? r.json() : null))
      const s = p?.seller || null
      setSeller(s)
      setCfg(normalize(s?.metadata?.delivery))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const activeCount = useMemo(
    () => EMIRATES.filter(n => cfg.emirates[n]?.active).length,
    [cfg]
  )

  const setEmirate = (name: string, patch: Partial<EmirateConfig>) => {
    setCfg(c => ({ ...c, emirates: { ...c.emirates, [name]: { ...c.emirates[name], ...patch } } }))
  }

  const save = async () => {
    setSaving(true); setMsg("")
    try {
      const res = await fetch(`${API}/vendor/profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { delivery: cfg } }),
      })
      const d = await res.json()
      setSeller(d.seller)
      setCfg(normalize(d.seller?.metadata?.delivery))
      setMsg(res.ok ? "✓ Saved" : (d.message || "Failed to save"))
    } catch {
      setMsg("Failed to save")
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(""), 3000)
    }
  }

  if (loading) {
    return <SingleColumnPage><Container className="p-6"><Text>Loading…</Text></Container></SingleColumnPage>
  }
  if (!seller) {
    return <SingleColumnPage><Container className="p-6"><Text>Could not load your profile.</Text></Container></SingleColumnPage>
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">📍 Locations & Delivery</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          Choose which emirates you deliver your cars to. Turn on an emirate, then set it as Free delivery or enter a delivery price. Customers see this on your car listings.
        </Text>
      </Container>

      <Container className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Switch checked={cfg.enabled} onCheckedChange={v => setCfg(c => ({ ...c, enabled: v }))} />
            <div>
              <Label className="font-medium">Delivery enabled</Label>
              <Text size="small" className="text-ui-fg-subtle">Master switch for all delivery options.</Text>
            </div>
          </div>
          {cfg.enabled && <Badge color="blue">{activeCount} emirate{activeCount === 1 ? "" : "s"} active</Badge>}
        </div>

        <div className={cfg.enabled ? "" : "opacity-50 pointer-events-none"}>
          {EMIRATES.map(name => {
            const e = cfg.emirates[name] || emptyEmirate()
            return (
              <div key={name} className="mb-3 rounded-lg border border-ui-border-base overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-ui-bg-subtle">
                  <div className="flex items-center gap-3">
                    <Switch checked={e.active} onCheckedChange={v => setEmirate(name, { active: v })} />
                    <Label className="font-medium">{name}</Label>
                  </div>
                  {e.active && (
                    <Badge color={e.free ? "green" : "grey"}>
                      {e.free ? "Free delivery" : e.price > 0 ? `${e.price} ${currency}` : "No price set"}
                    </Badge>
                  )}
                </div>

                {e.active && (
                  <div className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Switch checked={e.free} onCheckedChange={v => setEmirate(name, { free: v, price: v ? 0 : e.price })} />
                      <span className="text-sm text-ui-fg-base">Free delivery</span>
                    </label>
                    {!e.free && (
                      <div className="flex items-center gap-2">
                        <Label size="small">Delivery price</Label>
                        <Input
                          type="number"
                          min={0}
                          value={e.price ? String(e.price) : ""}
                          placeholder="0"
                          className="w-32"
                          onChange={ev => setEmirate(name, { price: Math.max(0, Number(ev.target.value) || 0) })}
                        />
                        <span className="text-sm text-ui-fg-subtle">{currency}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button onClick={save} isLoading={saving}>Save delivery settings</Button>
          {msg && <Text size="small" className={msg.startsWith("✓") ? "text-ui-fg-interactive" : "text-ui-fg-error"}>{msg}</Text>}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
