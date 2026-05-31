import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input } from "@medusajs/ui"
import { ArrowUpRightOnBox, ArrowDownTray, BoltSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Marketing", icon: BoltSolid }

const EXTERNAL_TOOLS = [
  { name: "Google Analytics", url: "https://analytics.google.com", desc: "Page views, audience, traffic sources", logo: "📊", bg: "bg-amber-50 dark:bg-amber-950" },
  { name: "Google Search Console", url: "https://search.google.com/search-console", desc: "Submit sitemap, monitor keywords, indexing status", logo: "🔎", bg: "bg-blue-50 dark:bg-blue-950" },
  { name: "Google Ads", url: "https://ads.google.com", desc: "Search + display + YouTube ad campaigns", logo: "🎯", bg: "bg-green-50 dark:bg-green-950" },
  { name: "Google Merchant", url: "https://merchants.google.com", desc: "Submit catalog feed for Shopping ads", logo: "🛒", bg: "bg-emerald-50 dark:bg-emerald-950" },
  { name: "Meta Business Suite", url: "https://business.facebook.com", desc: "Facebook + Instagram ads + Pixel", logo: "📘", bg: "bg-sky-50 dark:bg-sky-950" },
  { name: "Meta Commerce Manager", url: "https://business.facebook.com/commerce_manager", desc: "Catalog for Dynamic Product Ads", logo: "🏪", bg: "bg-indigo-50 dark:bg-indigo-950" },
  { name: "TikTok Ads Manager", url: "https://ads.tiktok.com", desc: "Reels + creator ads + pixel", logo: "🎵", bg: "bg-pink-50 dark:bg-pink-950" },
  { name: "Snapchat Ads", url: "https://ads.snapchat.com", desc: "Heavy UAE audience reach", logo: "👻", bg: "bg-yellow-50 dark:bg-yellow-950" },
  { name: "Bing Webmaster", url: "https://www.bing.com/webmasters", desc: "Bing + DuckDuckGo + Yahoo indexing", logo: "🔵", bg: "bg-cyan-50 dark:bg-cyan-950" },
  { name: "LinkedIn Campaign Manager", url: "https://www.linkedin.com/campaignmanager", desc: "B2B + corporate rental targeting", logo: "💼", bg: "bg-blue-50 dark:bg-blue-950" },
]

const Page = () => {
  const [campaignData, setCampaignData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/admin/analytics/campaigns?days=${days}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setCampaignData)
      .finally(() => setLoading(false))
  }, [days])

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h2" className="text-2xl">📣 Marketing Tools</Heading>
        <Text className="text-ui-fg-subtle">Quick-jump to ad platforms + view your campaign performance from UTM-tagged links.</Text>
      </Container>

      {/* Catalog feeds section */}
      <Container className="p-6">
        <Heading level="h3">📦 Product Catalog Feeds</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">
          Submit these feeds to Meta and Google so they show your actual cars in dynamic personalized ads. Critical for ROI on car rental marketplaces.
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-ui-bg-subtle rounded-lg p-5">
            <div className="font-bold text-ui-fg-base mb-1">Facebook Catalog Feed</div>
            <code className="text-xs bg-ui-bg-base px-2 py-1 rounded block mb-3">https://autotorental.com/catalog.xml</code>
            <Text size="xsmall" className="text-ui-fg-subtle mb-3">
              In Meta Commerce Manager → Catalogs → Data Sources → Add Data Feed → paste URL above. Updates every 30 minutes automatically.
            </Text>
            <a href="https://business.facebook.com/commerce_manager" target="_blank" rel="noopener"><Button size="small" variant="secondary"><ArrowUpRightOnBox /> Open Commerce Manager</Button></a>
          </div>
          <div className="bg-ui-bg-subtle rounded-lg p-5">
            <div className="font-bold text-ui-fg-base mb-1">Google Merchant Feed</div>
            <code className="text-xs bg-ui-bg-base px-2 py-1 rounded block mb-3">https://autotorental.com/catalog.xml</code>
            <Text size="xsmall" className="text-ui-fg-subtle mb-3">
              In Google Merchant Center → Products → Feeds → Add Primary Feed → paste URL above. Powers Shopping ads + dynamic remarketing.
            </Text>
            <a href="https://merchants.google.com" target="_blank" rel="noopener"><Button size="small" variant="secondary"><ArrowUpRightOnBox /> Open Merchant Center</Button></a>
          </div>
        </div>
      </Container>

      {/* External tools grid */}
      <Container className="p-6">
        <Heading level="h3">External Dashboards</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Direct links to where ad performance lives.</Text>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {EXTERNAL_TOOLS.map(t => (
            <a key={t.name} href={t.url} target="_blank" rel="noopener" className={`block rounded-xl p-4 transition hover:scale-[1.02] hover:shadow-md ${t.bg}`}>
              <div className="text-3xl mb-2">{t.logo}</div>
              <div className="font-bold text-ui-fg-base text-sm">{t.name}</div>
              <div className="text-[11px] text-ui-fg-subtle mt-1">{t.desc}</div>
              <div className="text-[10px] text-ui-fg-muted mt-2">↗ open in new tab</div>
            </a>
          ))}
        </div>
      </Container>

      {/* Campaign Performance */}
      <Container className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <Heading level="h3">📈 Campaign Performance (from UTM)</Heading>
            <Text size="small" className="text-ui-fg-subtle">Conversions per campaign. Tag your ad URLs with <code>?utm_source=facebook&utm_campaign=summer-2026</code> to track here.</Text>
          </div>
          <div className="flex items-center gap-2">
            <select value={days} onChange={e => setDays(parseInt(e.target.value, 10))} className="border border-ui-border-base rounded-md px-3 py-2 bg-ui-bg-base text-sm">
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {loading ? <div className="bg-ui-bg-subtle rounded-lg p-12 text-center text-ui-fg-muted">Loading…</div>
         : !campaignData || campaignData.campaigns.length === 0 ? (
          <div className="bg-ui-bg-subtle rounded-lg p-8 text-center">
            <div className="text-3xl mb-2">📊</div>
            <div className="font-bold text-ui-fg-base">No UTM-tagged traffic yet</div>
            <div className="text-sm text-ui-fg-subtle mt-2 mb-4">When you start running ads, tag your URLs like this:</div>
            <code className="text-xs bg-ui-bg-base px-3 py-2 rounded inline-block">https://autotorental.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=summer-sale</code>
          </div>
        ) : (
          <Table>
            <Table.Header><Table.Row>
              <Table.HeaderCell>Source</Table.HeaderCell>
              <Table.HeaderCell>Medium</Table.HeaderCell>
              <Table.HeaderCell>Campaign</Table.HeaderCell>
              <Table.HeaderCell>📞</Table.HeaderCell>
              <Table.HeaderCell>💬</Table.HeaderCell>
              <Table.HeaderCell>🌍</Table.HeaderCell>
              <Table.HeaderCell>👁️</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Total Conversions</Table.HeaderCell>
            </Table.Row></Table.Header>
            <Table.Body>
              {campaignData.campaigns.map((c: any) => (
                <Table.Row key={`${c.utm_source}-${c.utm_medium}-${c.utm_campaign}`}>
                  <Table.Cell><Badge color="blue">{c.utm_source || "—"}</Badge></Table.Cell>
                  <Table.Cell><Text size="small">{c.utm_medium || "—"}</Text></Table.Cell>
                  <Table.Cell><Text size="small" className="font-medium">{c.utm_campaign || "—"}</Text></Table.Cell>
                  <Table.Cell className="tabular-nums">{c.call || 0}</Table.Cell>
                  <Table.Cell className="tabular-nums">{c.whatsapp || 0}</Table.Cell>
                  <Table.Cell className="tabular-nums">{c.webrtc || 0}</Table.Cell>
                  <Table.Cell className="tabular-nums">{c.view || 0}</Table.Cell>
                  <Table.Cell className="text-right font-bold tabular-nums">{(c.call + c.whatsapp + c.webrtc).toLocaleString()}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Container>

      {/* UTM Builder */}
      <Container className="p-6">
        <Heading level="h3">🔗 UTM Link Builder</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Build tracked URLs for your ad campaigns. Copy and paste into Meta / Google / TikTok ad creatives.</Text>
        <UtmBuilder/>
      </Container>
    </SingleColumnPage>
  )
}

function UtmBuilder() {
  const [url, setUrl] = useState("https://autotorental.com/cars")
  const [source, setSource] = useState("facebook")
  const [medium, setMedium] = useState("cpc")
  const [campaign, setCampaign] = useState("summer-2026")
  const [content, setContent] = useState("")
  const [term, setTerm] = useState("")
  const [copied, setCopied] = useState(false)

  const built = useMemo(() => {
    const u = new URL(url || "https://autotorental.com/")
    if (source) u.searchParams.set("utm_source", source)
    if (medium) u.searchParams.set("utm_medium", medium)
    if (campaign) u.searchParams.set("utm_campaign", campaign)
    if (content) u.searchParams.set("utm_content", content)
    if (term) u.searchParams.set("utm_term", term)
    return u.toString()
  }, [url, source, medium, campaign, content, term])

  const copy = () => {
    navigator.clipboard?.writeText(built)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-ui-bg-subtle rounded-lg p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div><label className="text-xs font-bold text-ui-fg-muted">Destination URL</label><Input value={url} onChange={e => setUrl(e.target.value)}/></div>
        <div><label className="text-xs font-bold text-ui-fg-muted">utm_source (where)</label><Input value={source} onChange={e => setSource(e.target.value)} placeholder="facebook, google, tiktok"/></div>
        <div><label className="text-xs font-bold text-ui-fg-muted">utm_medium (how)</label><Input value={medium} onChange={e => setMedium(e.target.value)} placeholder="cpc, organic, email"/></div>
        <div><label className="text-xs font-bold text-ui-fg-muted">utm_campaign (which campaign)</label><Input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="summer-2026"/></div>
        <div><label className="text-xs font-bold text-ui-fg-muted">utm_content (which ad creative)</label><Input value={content} onChange={e => setContent(e.target.value)} placeholder="lamborghini-video"/></div>
        <div><label className="text-xs font-bold text-ui-fg-muted">utm_term (keyword, optional)</label><Input value={term} onChange={e => setTerm(e.target.value)} placeholder="rent lamborghini dubai"/></div>
      </div>
      <div className="bg-ui-bg-base rounded p-3 font-mono text-xs break-all">{built}</div>
      <Button size="small" onClick={copy} className="mt-3">{copied ? "✓ Copied!" : "📋 Copy URL"}</Button>
    </div>
  )
}

// Need useMemo
import { useMemo } from "react"

export default Page
