import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Textarea, Switch, Label, FocusModal, IconButton, Tooltip } from "@medusajs/ui"
import { CommandLine, PencilSquare, ArrowDownTray, GlobeEurope } from "@medusajs/icons"

export const config: RouteConfig = { label: "SEO Manager", icon: CommandLine }

const API = "https://api.autotorental.com"
const SITE = "https://autotorental.com"

// Discoverable pages (auto-populated from API + landing pages + blog posts + static)
type PageRow = {
  path: string
  kind: "static" | "vehicle" | "blog" | "landing" | "brand" | "city" | "company"
  default_title: string
  default_description: string
  // From DB override (if any)
  title?: string | null
  description?: string | null
  focus_keyword?: string | null
  og_image?: string | null
  noindex?: boolean
}

// SEO scoring: like RankMath/Yoast
type Score = { value: number; label: "good" | "ok" | "bad"; checks: { ok: boolean; text: string }[] }
function scoreSeo(title: string, description: string, focus: string, path: string): Score {
  const checks: { ok: boolean; text: string }[] = []
  const t = (title || "").trim()
  const d = (description || "").trim()
  const f = (focus || "").trim().toLowerCase()
  // Title length
  checks.push({ ok: t.length >= 30 && t.length <= 60, text: `Title length ${t.length} chars (target 30–60)` })
  // Description length
  checks.push({ ok: d.length >= 120 && d.length <= 160, text: `Description length ${d.length} chars (target 120–160)` })
  // Focus keyword present
  if (f) {
    checks.push({ ok: t.toLowerCase().includes(f), text: `Focus keyword "${focus}" appears in title` })
    checks.push({ ok: d.toLowerCase().includes(f), text: `Focus keyword in description` })
    checks.push({ ok: path.toLowerCase().includes(f.replace(/\s+/g, "-")), text: `Focus keyword in URL slug` })
  } else {
    checks.push({ ok: false, text: "Focus keyword not set" })
  }
  // Description not empty
  checks.push({ ok: d.length > 0, text: "Has description" })
  // Title not empty
  checks.push({ ok: t.length > 0, text: "Has title" })
  const passed = checks.filter(c => c.ok).length
  const pct = Math.round((passed / checks.length) * 100)
  const label = pct >= 75 ? "good" : pct >= 50 ? "ok" : "bad"
  return { value: pct, label, checks }
}

function GoogleSnippet({ title, description, path }: { title: string; description: string; path: string }) {
  const url = `${SITE}${path}`
  const shortUrl = url.replace(/^https?:\/\//, "").replace(/\/$/, "")
  return (
    <div className="bg-white rounded-lg border border-ui-border-base p-4 max-w-2xl">
      <div className="text-xs text-ui-fg-muted mb-1 truncate">{shortUrl.replace(/\//g, " › ")}</div>
      <div className="text-[#1a0dab] dark:text-[#8ab4f8] text-xl leading-snug font-normal" style={{ textDecoration: "underline" }}>{title || "Page title"}</div>
      <div className="text-sm text-[#4d5156] mt-1 leading-snug" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{description || "Page description appears here..."}</div>
    </div>
  )
}

function ScoreBadge({ score }: { score: Score }) {
  const color = score.label === "good" ? "green" : score.label === "ok" ? "orange" : "red"
  return <Badge color={color as any}>{score.value}/100 {score.label === "good" ? "✓" : score.label === "ok" ? "⚠" : "✗"}</Badge>
}

const EditModal = ({ row, onClose, onSaved }: { row: PageRow; onClose: () => void; onSaved: () => void }) => {
  const [title, setTitle] = useState(row.title || row.default_title || "")
  const [description, setDescription] = useState(row.description || row.default_description || "")
  const [focus, setFocus] = useState(row.focus_keyword || "")
  const [og, setOg] = useState(row.og_image || "")
  const [noindex, setNoindex] = useState(!!row.noindex)
  const [saving, setSaving] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiRationale, setAiRationale] = useState("")
  const [volumeData, setVolumeData] = useState<any>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState("")

  const lookupVolume = async () => {
    if (!focus.trim()) return
    setLookingUp(true); setLookupError(""); setVolumeData(null)
    try {
      const r = await fetch(`${API}/admin/seo/keyword-volume`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: focus.trim(), location_code: 2784 }),
      })
      const d = await r.json()
      if (!r.ok) { setLookupError(d.message || "Lookup failed"); return }
      setVolumeData(d)
    } catch (e: any) { setLookupError(e.message) }
    finally { setLookingUp(false) }
  }

  const optimizeWithAi = async () => {
    setOptimizing(true); setAiError(""); setAiRationale("")
    try {
      const r = await fetch(`${API}/admin/ai/optimize-seo`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: row.path,
          page_type: row.kind,
          current_title: title || row.default_title,
          current_description: description || row.default_description,
          context: row.default_description,
        }),
      })
      const d = await r.json()
      if (!r.ok) { setAiError(d.message || "AI failed"); return }
      if (d.title) setTitle(d.title)
      if (d.description) setDescription(d.description)
      if (d.focus_keyword) setFocus(d.focus_keyword)
      if (d.rationale) setAiRationale(d.rationale)
    } catch (e: any) {
      setAiError(e.message || "AI failed")
    } finally { setOptimizing(false) }
  }

  const score = useMemo(() => scoreSeo(title, description, focus, row.path), [title, description, focus, row.path])

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/admin/seo`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: row.path, title, description, focus_keyword: focus, og_image: og, noindex }),
      })
      onSaved()
    } finally { setSaving(false) }
  }

  const reset = async () => {
    if (!confirm("Reset to default? This removes your override.")) return
    setSaving(true)
    try {
      await fetch(`${API}/admin/seo?path=${encodeURIComponent(row.path)}`, { method: "DELETE", credentials: "include" })
      onSaved()
    } finally { setSaving(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 p-6">
      {/* Left: editor */}
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-ui-fg-muted">Editing SEO for <code className="bg-ui-bg-subtle px-1 rounded">{row.path}</code></div>
          <Button size="small" variant="primary" onClick={optimizeWithAi} disabled={optimizing}>
            {optimizing ? "✨ Optimizing..." : "✨ Optimize with AI"}
          </Button>
        </div>
        {aiError && <div className="bg-ui-tag-red-bg border border-ui-tag-red-border rounded-md p-3 text-sm text-ui-fg-error">{aiError}</div>}
        {aiRationale && (
          <div className="bg-ui-tag-blue-bg border border-ui-tag-blue-border rounded-md p-3 text-xs text-ui-fg-base">
            <strong>AI rationale:</strong> {aiRationale}
          </div>
        )}

        <div>
          <Label size="small">SEO Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={row.default_title} maxLength={80}/>
          <div className="flex justify-between mt-1">
            <Text size="xsmall" className="text-ui-fg-muted">Recommended 30–60 chars. Currently <strong>{title.length}</strong>.</Text>
            <Text size="xsmall" className={title.length >= 30 && title.length <= 60 ? "text-green-500" : title.length > 60 ? "text-red-500" : "text-amber-500"}>
              {title.length >= 30 && title.length <= 60 ? "✓ Optimal" : title.length > 60 ? `${title.length - 60} too long` : `${30 - title.length} too short`}
            </Text>
          </div>
        </div>

        <div>
          <Label size="small">Meta Description</Label>
          <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder={row.default_description} maxLength={200}/>
          <div className="flex justify-between mt-1">
            <Text size="xsmall" className="text-ui-fg-muted">Recommended 120–160 chars. Currently <strong>{description.length}</strong>.</Text>
            <Text size="xsmall" className={description.length >= 120 && description.length <= 160 ? "text-green-500" : description.length > 160 ? "text-red-500" : "text-amber-500"}>
              {description.length >= 120 && description.length <= 160 ? "✓ Optimal" : description.length > 160 ? `${description.length - 160} too long` : `${120 - description.length} too short`}
            </Text>
          </div>
        </div>

        <div>
          <Label size="small">Focus Keyword</Label>
          <div className="flex gap-2">
            <Input value={focus} onChange={e => { setFocus(e.target.value); setVolumeData(null) }} placeholder="e.g. car rental Dubai"/>
            <Button size="small" variant="secondary" onClick={lookupVolume} disabled={lookingUp || !focus.trim()}>
              {lookingUp ? "..." : "🔍 Check volume"}
            </Button>
          </div>
          <Text size="xsmall" className="text-ui-fg-muted mt-1">The single phrase you want this page to rank for.</Text>
          {lookupError && <Text size="xsmall" className="text-ui-fg-error mt-1">{lookupError}</Text>}
          {volumeData && (
            <div className="mt-3 bg-ui-bg-subtle rounded-lg p-3 grid grid-cols-3 gap-3 text-xs">
              <div><div className="text-ui-fg-muted">Monthly searches (UAE)</div><div className="font-bold text-ui-fg-base text-lg">{(volumeData.search_volume ?? 0).toLocaleString()}</div></div>
              <div><div className="text-ui-fg-muted">Competition</div><div className="font-bold text-ui-fg-base text-lg">{volumeData.competition || "—"}{volumeData.competition_index != null && ` (${volumeData.competition_index})`}</div></div>
              <div><div className="text-ui-fg-muted">Avg CPC</div><div className="font-bold text-ui-fg-base text-lg">${(volumeData.cpc ?? 0).toFixed(2)}</div></div>
              {volumeData.cached && <div className="col-span-3 text-[10px] text-ui-fg-muted">📦 Cached for 24h to save API costs</div>}
            </div>
          )}
        </div>

        <div>
          <Label size="small">Social / OG Image URL</Label>
          <Input value={og} onChange={e => setOg(e.target.value)} placeholder="https://..."/>
          <Text size="xsmall" className="text-ui-fg-muted mt-1">1200×630 recommended for Facebook + Twitter shares.</Text>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t">
          <Switch checked={noindex} onCheckedChange={setNoindex}/>
          <Label>Hide from Google (noindex)</Label>
        </div>

        <div className="flex gap-2 justify-between pt-4 border-t">
          <Button variant="danger" disabled={saving} onClick={reset}>Reset to default</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      </div>

      {/* Right: live preview + score */}
      <div className="space-y-5">
        <div>
          <Label size="small">Google preview</Label>
          <GoogleSnippet title={title} description={description} path={row.path}/>
        </div>

        <div className="bg-ui-bg-subtle rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Heading level="h3">SEO Score</Heading>
            <ScoreBadge score={score}/>
          </div>
          <ul className="space-y-1.5 text-sm">
            {score.checks.map((c, i) => (
              <li key={i} className={c.ok ? "text-green-600" : "text-ui-fg-subtle"}>
                {c.ok ? "✓" : "✗"} {c.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-ui-fg-muted bg-ui-bg-subtle rounded-lg p-3">
          💡 Tips: Use your focus keyword in the title, description, and URL. Aim for clear, click-worthy titles under 60 chars.
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  const [pages, setPages] = useState<PageRow[]>([])
  const [overrides, setOverrides] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PageRow | null>(null)
  const [filter, setFilter] = useState("")
  const [kindFilter, setKindFilter] = useState<string>("all")

  const load = async () => {
    setLoading(true)
    const [ovrRes, vehiclesRes, brandsRes, citiesRes, sellersRes] = await Promise.all([
      fetch(`${API}/admin/seo`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/admin/vehicles?limit=500`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/admin/catalog/brands?limit=200`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/admin/locations/cities?limit=200`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      fetch(`${API}/admin/sellers?limit=200`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ])
    const ovrMap: Record<string, any> = {}
    for (const o of (ovrRes?.items || [])) ovrMap[o.path] = o
    setOverrides(ovrMap)

    const list: PageRow[] = []
    // Static
    const STATIC = [
      ["/", "Auto to Rental — Car Rental Marketplace UAE & Syria", "Browse 1,200+ rental cars from verified companies. Direct contact, no commission, no booking fees."],
      ["/cars", "All Cars for Rent — UAE & Syria | Auto to Rental", "Browse every rental car available across UAE and Syria. Compare daily, weekly, monthly rates from verified rental companies."],
      ["/brands", "Browse 50+ Car Brands for Rent in UAE", "Toyota, BMW, Mercedes-Benz, Lamborghini and more. Browse rental cars by brand across UAE and Syria."],
      ["/companies", "Verified Rental Companies — UAE & Syria", "500+ verified rental companies. Direct contact, real Google reviews."],
      ["/about", "About Auto to Rental — The Zero-Commission Marketplace", "Marketplace connecting customers directly with rental companies across UAE and Syria. No commission, no booking fees."],
      ["/contact", "Contact Auto to Rental — Support & Help", "Get in touch via WhatsApp, phone, or email. Usually reply within a few hours."],
      ["/help", "Help Center — Car Rental Questions Answered", "FAQs about renting a car in UAE, paying as a vendor, and using the marketplace."],
      ["/blog", "Car Rental Blog — Tips, Guides, Reviews", "Expert guides on car rental in Dubai and UAE. Cheapest tips, luxury reviews, tourist guides."],
      ["/list-your-car", "List Your Cars Free — Auto to Rental", "Join 500+ rental companies. Free 30-day trial. Zero commission."],
      ["/car-rental-dubai", "Car Rental Dubai — Rent a Car in Dubai from AED 99/day", "Compare 1,000+ rental cars in Dubai. Daily, weekly, monthly. Direct contact, no booking fees."],
      ["/rent-a-car-dubai", "Rent a Car in Dubai — Best Deals on UAE Rental Cars", "Compare deals from verified rental companies. Free delivery. No hidden fees."],
      ["/monthly-car-rental-dubai", "Monthly Car Rental Dubai — Save up to 40% vs Daily Rates", "Long-term car rental from AED 1,499/month. Up to 40% off daily rates."],
      ["/luxury-car-rental-dubai", "Luxury Car Rental Dubai — Lamborghini, Ferrari, Rolls-Royce", "Rent luxury and sports cars in Dubai. Compare prices from top rental companies."],
    ]
    for (const [path, title, desc] of STATIC) {
      list.push({ path, kind: "static" as any, default_title: title, default_description: desc, ...(ovrMap[path] || {}) })
    }
    // Vehicles
    for (const v of (vehiclesRes?.vehicles || [])) {
      const path = `/cars/${v.id}`
      list.push({
        path, kind: "vehicle", default_title: v.title || "Vehicle",
        default_description: v.description?.slice(0, 160) || `Rent ${v.title} from a verified rental company.`,
        ...(ovrMap[path] || {}),
      })
    }
    // Brands
    for (const b of (brandsRes?.brands || [])) {
      const path = `/cars?brand=${b.id}`
      list.push({
        path, kind: "brand", default_title: `${b.name} cars for rent | Auto to Rental`,
        default_description: `Browse all ${b.name} rental cars across UAE & Syria. Verified rental companies, direct contact.`,
        ...(ovrMap[path] || {}),
      })
    }
    // Cities
    for (const c of (citiesRes?.cities || [])) {
      const path = `/cars?city=${c.id}`
      list.push({
        path, kind: "city", default_title: `Cars for rent in ${c.name} | Auto to Rental`,
        default_description: `Rent a car in ${c.name}. ${c.country_code === "ae" ? "UAE" : "Syria"}. Direct contact with rental companies.`,
        ...(ovrMap[path] || {}),
      })
    }
    // Companies
    for (const s of (sellersRes?.sellers || [])) {
      const path = `/companies/${s.id}`
      list.push({
        path, kind: "company", default_title: `${s.name} — Rental Company on Auto to Rental`,
        default_description: s.description?.slice(0, 160) || `Browse cars from ${s.name}. Verified rental company.`,
        ...(ovrMap[path] || {}),
      })
    }
    // Blog
    const BLOG_SLUGS = [
      "cheapest-car-rental-dubai-2026", "monthly-car-rental-dubai-guide", "rent-lamborghini-dubai-real-cost",
      "car-rental-vs-taxi-uber-dubai", "rent-car-dubai-tourist-guide", "best-suv-rental-desert-dubai",
      "long-term-car-rental-dubai-vs-leasing",
    ]
    for (const slug of BLOG_SLUGS) {
      const path = `/blog/${slug}`
      list.push({
        path, kind: "blog", default_title: slug.replace(/-/g, " ") + " | Blog",
        default_description: "Read our latest expert guide on car rental.",
        ...(ovrMap[path] || {}),
      })
    }
    setPages(list)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => pages.filter(p => {
    if (kindFilter !== "all" && p.kind !== kindFilter) return false
    if (filter && !p.path.toLowerCase().includes(filter.toLowerCase()) && !p.default_title.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  }), [pages, filter, kindFilter])

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Heading level="h2" className="text-2xl">🔎 SEO Manager</Heading>
            <Text className="text-ui-fg-subtle">Edit titles, descriptions, focus keywords for every page. Like Rank Math / Yoast — but built into your dashboard.</Text>
          </div>
          <a href="https://autotorental.com/sitemap.xml" target="_blank" rel="noopener" className="inline-flex"><Button variant="secondary"><GlobeEurope/> View Sitemap</Button></a>
        </div>
      </Container>

      {/* Stats */}
      <Container className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-ui-bg-subtle rounded-lg p-4"><div className="text-xs text-ui-fg-muted">Total pages</div><div className="text-2xl font-bold text-ui-fg-base">{pages.length}</div></div>
        <div className="bg-ui-bg-subtle rounded-lg p-4"><div className="text-xs text-ui-fg-muted">With SEO override</div><div className="text-2xl font-bold text-green-500">{Object.keys(overrides).length}</div></div>
        <div className="bg-ui-bg-subtle rounded-lg p-4"><div className="text-xs text-ui-fg-muted">Using defaults</div><div className="text-2xl font-bold text-amber-500">{pages.length - Object.keys(overrides).length}</div></div>
        <div className="bg-ui-bg-subtle rounded-lg p-4"><div className="text-xs text-ui-fg-muted">Sitemap entries</div><div className="text-2xl font-bold text-blue-500">{pages.length}</div></div>
      </Container>

      {/* Submit to Google */}
      <Container className="p-6">
        <Heading level="h3">📡 Submit to Google + Bing</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="font-bold mb-1">Google Search Console</div>
            <div className="text-sm text-ui-fg-subtle mb-3">Submit your sitemap so Google indexes your pages.</div>
            <ol className="text-xs text-ui-fg-subtle list-decimal pl-4 space-y-1">
              <li>Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">search.google.com/search-console</a></li>
              <li>Add property: <code>autotorental.com</code></li>
              <li>Verify (HTML tag → paste verification code in <code>NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION</code>)</li>
              <li>Sitemaps → add new → enter <code>sitemap.xml</code></li>
            </ol>
          </div>
          <div className="bg-ui-bg-subtle rounded-lg p-4">
            <div className="font-bold mb-1">Bing Webmaster Tools</div>
            <div className="text-sm text-ui-fg-subtle mb-3">Bing powers DuckDuckGo + Yahoo too.</div>
            <ol className="text-xs text-ui-fg-subtle list-decimal pl-4 space-y-1">
              <li>Go to <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">bing.com/webmasters</a></li>
              <li>Import from Google Search Console (1-click)</li>
              <li>Done.</li>
            </ol>
          </div>
        </div>
      </Container>

      {/* Filters */}
      <Container className="p-6">
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <Label size="small">Search</Label>
            <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by path or title..."/>
          </div>
          <div>
            <Label size="small">Type</Label>
            <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} className="border border-ui-border-base rounded-md px-3 py-2 bg-ui-bg-base">
              <option value="all">All</option>
              <option value="static">Static pages</option>
              <option value="blog">Blog posts</option>
              <option value="landing">Landing pages</option>
              <option value="vehicle">Vehicles</option>
              <option value="brand">Brands</option>
              <option value="city">Cities</option>
              <option value="company">Companies</option>
            </select>
          </div>
        </div>
      </Container>

      {/* List */}
      <Container className="p-0">
        {loading ? <div className="p-12 text-center text-ui-fg-muted">Loading…</div>
         : filtered.length === 0 ? <div className="p-12 text-center text-ui-fg-muted">No pages match your filters.</div>
         : (
          <Table>
            <Table.Header><Table.Row>
              <Table.HeaderCell>Page</Table.HeaderCell>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Focus</Table.HeaderCell>
              <Table.HeaderCell>Score</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row></Table.Header>
            <Table.Body>
              {filtered.map(p => {
                const title = p.title || p.default_title
                const desc = p.description || p.default_description
                const score = scoreSeo(title, desc, p.focus_keyword || "", p.path)
                const isOverridden = !!overrides[p.path]
                return (
                  <Table.Row key={p.path}>
                    <Table.Cell>
                      <Badge color={p.kind === "vehicle" ? "blue" : p.kind === "blog" ? "green" : p.kind === "brand" ? "purple" : p.kind === "city" ? "orange" : "grey"} className="mr-2">{p.kind}</Badge>
                      <code className="text-xs text-ui-fg-subtle">{p.path}</code>
                    </Table.Cell>
                    <Table.Cell className="max-w-md">
                      <div className="truncate font-medium text-ui-fg-base">{title}</div>
                      <div className="truncate text-xs text-ui-fg-muted">{desc}</div>
                    </Table.Cell>
                    <Table.Cell>{p.focus_keyword ? <Badge color="blue">{p.focus_keyword}</Badge> : <span className="text-ui-fg-muted text-xs">—</span>}</Table.Cell>
                    <Table.Cell><ScoreBadge score={score}/></Table.Cell>
                    <Table.Cell>{isOverridden ? <Badge color="green">Custom</Badge> : <Badge color="grey">Default</Badge>}</Table.Cell>
                    <Table.Cell><Button size="small" variant="secondary" onClick={() => setEditing(p)}><PencilSquare /> Edit</Button></Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
      </Container>

      <FocusModal open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>Edit SEO</Heading></FocusModal.Header>
          <FocusModal.Body>
            {editing && <EditModal row={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }}/>}
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
