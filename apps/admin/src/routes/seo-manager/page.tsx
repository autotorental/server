import { useEffect, useMemo, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Textarea, Switch, Label, FocusModal, Select } from "@medusajs/ui"
import {
  CommandLine,
  PencilSquare,
  ArrowDownTray,
  GlobeEurope,
  Sparkles,
  MagnifyingGlass,
  CheckCircleSolid,
  XCircleSolid,
  DocumentText,
  ExclamationCircle,
} from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("SEO Manager", "إدارة SEO"), icon: CommandLine, rank: 31 }

const SITE = "https://autotorental.com"

type PageRow = {
  path: string
  kind: "static" | "vehicle" | "blog" | "landing" | "brand" | "city" | "company"
  default_title: string
  default_description: string
  title?: string | null
  description?: string | null
  focus_keyword?: string | null
  og_image?: string | null
  noindex?: boolean
  custom_schema?: string | null
}

type Score = {
  value: number
  label: "good" | "ok" | "bad"
  checks: { ok: boolean; text: string; fix: string }[]
}

function buildChecks(title: string, description: string, focus: string, path: string, kind?: PageRow["kind"]) {
  const t = (title || "").trim()
  const d = (description || "").trim()
  const f = (focus || "").trim()
  const fl = f.toLowerCase()
  const slugPart = path.split("/").filter(Boolean).pop() || path

  const checks: { ok: boolean; text: string; fix: string }[] = []

  const titleOk = t.length >= 30 && t.length <= 60
  checks.push({
    ok: titleOk,
    text: `Title length ${t.length} chars (target 30–60)`,
    fix: t.length === 0
      ? "Write an SEO title between 30 and 60 characters."
      : t.length < 30
        ? `Add ${30 - t.length} more characters to the title (currently ${t.length}).`
        : t.length > 60
          ? `Shorten the title by ${t.length - 60} characters (currently ${t.length}).`
          : "",
  })

  const descOk = d.length >= 120 && d.length <= 160
  checks.push({
    ok: descOk,
    text: `Description length ${d.length} chars (target 120–160)`,
    fix: d.length === 0
      ? "Write a meta description between 120 and 160 characters."
      : d.length < 120
        ? `Add ${120 - d.length} more characters to the description (currently ${d.length}).`
        : d.length > 160
          ? `Shorten the description by ${d.length - 160} characters (currently ${d.length}).`
          : "",
  })

  if (f) {
    const inTitle = t.toLowerCase().includes(fl)
    checks.push({
      ok: inTitle,
      text: `Focus keyword "${f}" in title`,
      fix: inTitle ? "" : `Include "${f}" in the SEO title (natural wording is fine).`,
    })
    const inDesc = d.toLowerCase().includes(fl)
    checks.push({
      ok: inDesc,
      text: "Focus keyword in description",
      fix: inDesc ? "" : `Mention "${f}" once in the meta description.`,
    })
    const slugNeedle = fl.replace(/\s+/g, "-")
    const urlFixed = kind === "static" || kind === "vehicle" || kind === "brand" || kind === "city"
    if (urlFixed) {
      checks.push({
        ok: true,
        text: "URL path (fixed — not scored)",
        fix: "",
      })
    } else {
      const inSlug =
        path.toLowerCase().includes(slugNeedle) ||
        slugPart.toLowerCase().includes(slugNeedle.replace(/-/g, ""))
      checks.push({
        ok: inSlug,
        text: "Focus keyword in URL slug",
        fix: inSlug
          ? ""
          : `Use a URL slug with "${slugNeedle}" (blog posts & landing pages). Example: /blog/${slugNeedle}-guide`,
      })
    }
  } else {
    checks.push({
      ok: false,
      text: "Focus keyword not set",
      fix: 'Set a focus keyword (e.g. "car rental Dubai") — required for a full score.',
    })
  }

  checks.push({
    ok: d.length > 0,
    text: "Has meta description",
    fix: d.length > 0 ? "" : "Fill in the meta description field and save.",
  })
  checks.push({
    ok: t.length > 0,
    text: "Has SEO title",
    fix: t.length > 0 ? "" : "Fill in the SEO title field and save.",
  })

  return checks
}

function scoreSeo(title: string, description: string, focus: string, path: string, kind?: PageRow["kind"]): Score {
  const checks = buildChecks(title, description, focus, path, kind)
  const passed = checks.filter(c => c.ok).length
  const pct = Math.round((passed / checks.length) * 100)
  const label = pct >= 100 ? "good" : pct >= 75 ? "good" : pct >= 50 ? "ok" : "bad"
  return { value: pct, label, checks }
}

function failedChecks(score: Score) {
  return score.checks.filter(c => !c.ok)
}

const KIND_LABELS: Record<PageRow["kind"], string> = {
  static: "Static",
  vehicle: "Vehicle",
  blog: "Blog",
  landing: "Landing",
  brand: "Brand",
  city: "City",
  company: "Company",
}

const KIND_BADGE: Record<PageRow["kind"], "green" | "blue" | "orange" | "grey" | "purple"> = {
  static: "grey",
  vehicle: "blue",
  blog: "green",
  landing: "orange",
  brand: "purple",
  city: "orange",
  company: "grey",
}

function charHint(len: number, min: number, max: number) {
  if (len >= min && len <= max) return { text: "Optimal", tone: "text-emerald-600" }
  if (len > max) return { text: `${len - max} over limit`, tone: "text-red-600" }
  return { text: `${min - len} below target`, tone: "text-amber-600" }
}

function ProgressBar({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const inRange = value >= min && value <= max
  const over = value > max
  const bar = over ? "bg-red-500" : inRange ? "bg-emerald-500" : "bg-amber-500"
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-ui-bg-subtle overflow-hidden">
      <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ScoreRing({ score, size = "md" }: { score: Score; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? 72 : size === "md" ? 52 : 40
  const stroke = size === "lg" ? 6 : 5
  const r = (dim - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (score.value / 100) * c
  const color = score.label === "good" ? "#059669" : score.label === "ok" ? "#d97706" : "#dc2626"
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={stroke} />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-xs font-semibold tabular-nums text-ui-fg-base">{score.value}</span>
    </div>
  )
}

function ScoreBadge({ score }: { score: Score }) {
  const color = score.value >= 100 ? "green" : score.label === "good" ? "green" : score.label === "ok" ? "orange" : "red"
  const label = score.value >= 100 ? "Perfect" : score.label === "good" ? "Good" : score.label === "ok" ? "Needs work" : "Poor"
  return (
    <div className="flex items-center gap-2">
      <ScoreRing score={score} size="sm" />
      <Badge color={color as any} size="2xsmall">
        {label}
      </Badge>
    </div>
  )
}

function ScoreImprovements({ score, compact = false }: { score: Score; compact?: boolean }) {
  const failed = failedChecks(score)
  if (failed.length === 0) {
    return (
      <Text size="xsmall" className="text-emerald-600 font-medium">
        ✓ 100% — all checks passed
      </Text>
    )
  }

  const items = compact ? failed.slice(0, 2) : failed
  return (
    <div className={compact ? "mt-2 max-w-xs" : ""}>
      {!compact && (
        <Text size="small" weight="plus" className="text-amber-800 dark:text-amber-300 mb-2">
          To reach 100% ({score.value} → 100), do this:
        </Text>
      )}
      {compact && (
        <Text size="xsmall" weight="plus" className="text-amber-700 dark:text-amber-400 mb-1">
          Missing for 100%:
        </Text>
      )}
      <ul className={`space-y-1.5 ${compact ? "" : "rounded-lg border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/30 p-3"}`}>
        {items.map((c, i) => (
          <li key={i} className="flex items-start gap-2 text-xs leading-snug">
            <XCircleSolid className="text-red-500 shrink-0 mt-0.5" />
            <span className="text-red-700 dark:text-red-300">{c.fix || c.text}</span>
          </li>
        ))}
        {compact && failed.length > 2 && (
          <li className="text-xs text-ui-fg-muted pl-5">+{failed.length - 2} more — click Edit for full list</li>
        )}
      </ul>
    </div>
  )
}

function GoogleSnippet({ title, description, path }: { title: string; description: string; path: string }) {
  const shortUrl = `${SITE.replace(/^https?:\/\//, "")}${path}`.replace(/\/$/, "")
  return (
    <div className="rounded-xl border border-ui-border-base bg-white dark:bg-[#202124] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-ui-bg-subtle flex items-center justify-center text-[10px] font-bold text-ui-fg-muted">ATR</div>
        <div className="min-w-0">
          <div className="text-xs text-[#202124] dark:text-[#bdc1c6] truncate">Auto to Rental</div>
          <div className="text-[11px] text-[#4d5156] dark:text-[#9aa0a6] truncate">{shortUrl.replace(/\//g, " › ")}</div>
        </div>
      </div>
      <div className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg leading-snug hover:underline cursor-default truncate">
        {title || "Page title preview"}
      </div>
      <div className="text-sm text-[#4d5156] dark:text-[#bdc1c6] mt-1 line-clamp-2 leading-relaxed">
        {description || "Meta description preview appears here. Write a compelling summary that includes your focus keyword."}
      </div>
    </div>
  )
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ui-bg-subtle ${className}`} />
}

const MONTH_ABBR = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function MonthlyTrend({ data }: { data?: { year: number; month: number; search_volume: number }[] }) {
  if (!data || data.length === 0) return null
  const series = [...data].sort((a, b) => a.year - b.year || a.month - b.month)
  const max = Math.max(...series.map(d => d.search_volume), 1)
  const peak = series.reduce((m, d) => (d.search_volume > m.search_volume ? d : m), series[0])
  const avg = Math.round(series.reduce((s, d) => s + d.search_volume, 0) / series.length)
  return (
    <div className="mt-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
      <div className="flex items-center justify-between mb-2 gap-2">
        <Text size="xsmall" weight="plus" className="text-ui-fg-base">
          12-month search trend
        </Text>
        <Text size="xsmall" className="text-ui-fg-muted">
          Peak {MONTH_ABBR[peak.month]} · {peak.search_volume.toLocaleString()} · avg {avg.toLocaleString()}
        </Text>
      </div>
      <div className="flex items-end gap-1 h-20">
        {series.map((d, i) => {
          const h = Math.max(6, Math.round((d.search_volume / max) * 100))
          const isPeak = d.year === peak.year && d.month === peak.month
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-1 group/bar"
              title={`${MONTH_ABBR[d.month]} ${d.year}: ${d.search_volume.toLocaleString()} searches`}
            >
              <div
                className={`w-full rounded-t transition-all ${isPeak ? "bg-ui-fg-interactive" : "bg-ui-fg-muted/30 group-hover/bar:bg-ui-fg-muted/60"}`}
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] leading-none text-ui-fg-muted">{MONTH_ABBR[d.month].charAt(0)}</span>
            </div>
          )
        })}
      </div>
      <Text size="xsmall" className="text-ui-fg-muted mt-2 leading-snug">
        Plan content & campaigns around peak months for maximum impact.
      </Text>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  chip,
  iconColor,
  valueColor = "text-ui-fg-base",
  hint,
}: {
  icon: any
  label: string
  value: number | string
  chip: string
  iconColor: string
  valueColor?: string
  hint?: string
}) {
  return (
    <div className="group rounded-xl border border-ui-border-base bg-ui-bg-base p-4 shadow-elevation-card-rest transition-shadow hover:shadow-elevation-card-hover">
      <div className="flex items-start justify-between gap-2">
        <Text size="small" className="text-ui-fg-muted leading-tight">
          {label}
        </Text>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${chip}`}>
          <Icon className={iconColor} />
        </div>
      </div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums leading-none ${valueColor}`}>{value}</div>
      {hint && (
        <Text size="xsmall" className="text-ui-fg-muted mt-1.5">
          {hint}
        </Text>
      )}
    </div>
  )
}

const EditModal = ({ row, onClose, onSaved }: { row: PageRow; onClose: () => void; onSaved: () => void }) => {
  const [title, setTitle] = useState(row.title || row.default_title || "")
  const [description, setDescription] = useState(row.description || row.default_description || "")
  const [focus, setFocus] = useState(row.focus_keyword || "")
  const [og, setOg] = useState(row.og_image || "")
  const [noindex, setNoindex] = useState(!!row.noindex)
  const isBlog = row.kind === "blog"
  const initialSlug = isBlog ? row.path.replace(/^\/blog\//, "").replace(/\/+$/, "") : ""
  const [slug, setSlug] = useState(initialSlug)
  const [createRedirect, setCreateRedirect] = useState(true)
  const [slugError, setSlugError] = useState("")
  const [customSchema, setCustomSchema] = useState(row.custom_schema || "")
  const [schemaError, setSchemaError] = useState("")
  const [saving, setSaving] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [aiError, setAiError] = useState("")
  const [aiRationale, setAiRationale] = useState("")
  const [volumeData, setVolumeData] = useState<any>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState("")

  const titleHint = charHint(title.length, 30, 60)
  const descHint = charHint(description.length, 120, 160)
  const score = useMemo(() => scoreSeo(title, description, focus, row.path, row.kind), [title, description, focus, row.path, row.kind])

  const lookupVolume = async () => {
    if (!focus.trim()) return
    setLookingUp(true)
    setLookupError("")
    setVolumeData(null)
    try {
      const callVol = async () => {
        const r = await fetch(`${API}/admin/seo/keyword-volume`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: focus.trim(), location_code: 2784 }),
        })
        const t = await r.text()
        let parsed: any = null; try { parsed = t ? JSON.parse(t) : null } catch { /* non-JSON = transient proxy/gateway blip */ }
        return { r, parsed }
      }
      let { r, parsed: d } = await callVol()
      if (d == null && r.status !== 400 && r.status !== 401) { await new Promise((rs) => setTimeout(rs, 1200)); ({ r, parsed: d } = await callVol()) }
      if (d == null) { setLookupError("Keyword service is busy right now — please try again in a moment."); return }
      if (!r.ok) {
        setLookupError(d.message || "Lookup failed")
        return
      }
      setVolumeData(d)
    } catch {
      setLookupError("Couldn't reach the keyword service. Check your connection and try again.")
    } finally {
      setLookingUp(false)
    }
  }

  const optimizeWithAi = async () => {
    setOptimizing(true)
    setAiError("")
    setAiRationale("")
    try {
      const callAi = async () => {
        const r = await fetch(`${API}/admin/ai/optimize-seo`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: row.path,
            page_type: row.kind,
            current_title: title || row.default_title,
            current_description: description || row.default_description,
            context: row.default_description,
          }),
        })
        const t = await r.text()
        let parsed: any = null; try { parsed = t ? JSON.parse(t) : null } catch { /* transient non-JSON */ }
        return { r, parsed }
      }
      let { r, parsed: d } = await callAi()
      if (d == null && r.status !== 400 && r.status !== 401) { await new Promise((rs) => setTimeout(rs, 1200)); ({ r, parsed: d } = await callAi()) }
      if (d == null) { setAiError("AI service is busy right now — please try again in a moment."); return }
      if (!r.ok) {
        setAiError(d.message || "AI optimization failed")
        return
      }
      if (d.title) setTitle(d.title)
      if (d.description) setDescription(d.description)
      if (d.focus_keyword) setFocus(d.focus_keyword)
      if (d.rationale) setAiRationale(d.rationale)
    } catch {
      setAiError("Couldn't reach the AI service. Check your connection and try again.")
    } finally {
      setOptimizing(false)
    }
  }

  const save = async () => {
    // Validate custom JSON-LD before saving so we never push broken schema to the live site.
    const trimmed = customSchema.trim()
    if (trimmed) {
      try { JSON.parse(trimmed) } catch { setSchemaError("Invalid JSON — fix it before saving."); return }
    }
    setSchemaError("")
    setSlugError("")
    setSaving(true)
    try {
      let effectivePath = row.path
      if (isBlog && slug.trim() && slug.trim() !== initialSlug) {
        const rr = await fetch(`${API}/admin/seo/change-slug`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ old_path: row.path, new_slug: slug.trim(), create_redirect: createRedirect }),
        })
        const dd = await rr.json().catch(() => ({}))
        if (!rr.ok) { setSlugError(dd.message || "Could not change the slug."); setSaving(false); return }
        effectivePath = dd.new_path || row.path
      }
      await fetch(`${API}/admin/seo`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: effectivePath, title, description, focus_keyword: focus, og_image: og, noindex, custom_schema: trimmed || null }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    if (!confirm("Reset to default? This removes your custom SEO override.")) return
    setSaving(true)
    try {
      await fetch(`${API}/admin/seo?path=${encodeURIComponent(row.path)}`, { method: "DELETE", credentials: "include" })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-0 xl:gap-6">
      <div className="space-y-5 p-6 xl:pr-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-ui-border-base pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge color={KIND_BADGE[row.kind]} size="2xsmall">{KIND_LABELS[row.kind]}</Badge>
              <Heading level="h2" className="text-base font-semibold">Search optimization</Heading>
            </div>
            <Text size="small" className="text-ui-fg-muted font-mono break-all mt-1.5">{row.path}</Text>
          </div>
          <Button size="small" variant="secondary" onClick={optimizeWithAi} disabled={optimizing} isLoading={optimizing} className="shrink-0">
            <Sparkles />
            Optimize with AI
          </Button>
        </div>

        {isBlog && (
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
            <Label size="small" className="font-medium">URL slug</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-ui-fg-muted text-sm font-mono shrink-0">/blog/</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="best-suv-rental-desert-dubai" className="font-mono" />
            </div>
            <Text size="xsmall" className="text-ui-fg-muted mt-1">Lowercase letters, numbers and dashes. Changing this changes the page address.</Text>
            {slug.trim() && slug.trim() !== initialSlug && (
              <div className="flex items-center gap-2 mt-3">
                <Switch checked={createRedirect} onCheckedChange={setCreateRedirect} id="rdr-toggle" />
                <Label htmlFor="rdr-toggle" size="small">Auto-redirect old URL → new (301 — keeps your Google ranking &amp; old links working)</Label>
              </div>
            )}
            {slugError && <Text size="small" className="text-ui-fg-error mt-2">{slugError}</Text>}
          </div>
        )}

        {aiError && (
          <div className="rounded-lg border border-ui-border-error bg-ui-bg-error-subtle px-4 py-3 text-sm text-ui-fg-error">{aiError}</div>
        )}
        {aiRationale && (
          <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3 text-sm text-ui-fg-subtle">
            <Text size="small" weight="plus" className="text-ui-fg-base mb-1">
              AI rationale
            </Text>
            {aiRationale}
          </div>
        )}

        <Text size="small" weight="plus" className="text-ui-fg-base">Page content</Text>
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 space-y-4 -mt-2">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <Label size="small">SEO title</Label>
              <Text size="xsmall" className={titleHint.tone}>
                {titleHint.text}
              </Text>
            </div>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={row.default_title} maxLength={80} />
            <ProgressBar value={title.length} min={30} max={60} />
            <Text size="xsmall" className="text-ui-fg-muted mt-1">
              {title.length} characters · target 30–60
            </Text>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <Label size="small">Meta description</Label>
              <Text size="xsmall" className={descHint.tone}>
                {descHint.text}
              </Text>
            </div>
            <Textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder={row.default_description} maxLength={200} />
            <ProgressBar value={description.length} min={120} max={160} />
            <Text size="xsmall" className="text-ui-fg-muted mt-1">
              {description.length} characters · target 120–160
            </Text>
          </div>

          <div>
            <Label size="small">Focus keyword</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                value={focus}
                onChange={e => {
                  setFocus(e.target.value)
                  setVolumeData(null)
                }}
                placeholder="e.g. car rental Dubai"
                className="flex-1"
              />
              <Button size="small" variant="secondary" onClick={lookupVolume} disabled={lookingUp || !focus.trim()} isLoading={lookingUp}>
                <MagnifyingGlass />
                Volume
              </Button>
            </div>
            <Text size="xsmall" className="text-ui-fg-muted mt-1">
              Primary phrase you want this page to rank for.
            </Text>
            {lookupError && (
              <Text size="xsmall" className="text-ui-fg-error mt-1">
                {lookupError}
              </Text>
            )}
            {volumeData && (
              <>
              <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                <div>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Monthly searches (UAE)
                  </Text>
                  <div className="text-lg font-semibold tabular-nums mt-0.5">{(volumeData.search_volume ?? 0).toLocaleString()}</div>
                </div>
                <div>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Competition
                  </Text>
                  <div className="text-lg font-semibold mt-0.5">
                    {volumeData.competition || "—"}
                    {volumeData.competition_index != null ? ` (${volumeData.competition_index})` : ""}
                  </div>
                </div>
                <div>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Avg. CPC
                  </Text>
                  <div className="text-lg font-semibold tabular-nums mt-0.5">${(volumeData.cpc ?? 0).toFixed(2)}</div>
                </div>
                {volumeData.cached && (
                  <Text size="xsmall" className="col-span-3 text-ui-fg-muted">
                    Cached for 24 hours to reduce API usage.
                  </Text>
                )}
              </div>
              <MonthlyTrend data={volumeData.monthly_searches} />
              </>
            )}
          </div>

          <div>
            <Label size="small">Social / OG image URL</Label>
            <Input value={og} onChange={e => setOg(e.target.value)} placeholder="https://..." className="mt-1.5" />
            <Text size="xsmall" className="text-ui-fg-muted mt-1">
              1200×630 recommended for Facebook and Twitter cards.
            </Text>
          </div>

          <div className="pt-2 border-t border-ui-border-base">
            <div className="flex items-center justify-between gap-2">
              <Label size="small">Custom Schema (JSON-LD)</Label>
              <Button size="small" variant="transparent" type="button" onClick={() => {
                try {
                  const v = customSchema.trim()
                  if (v) { setCustomSchema(JSON.stringify(JSON.parse(v), null, 2)); setSchemaError("") }
                } catch { setSchemaError("Invalid JSON — cannot format.") }
              }}>Format / Validate</Button>
            </div>
            <Textarea
              rows={8}
              value={customSchema}
              onChange={e => { setCustomSchema(e.target.value); if (schemaError) setSchemaError("") }}
              placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": []\n}'}
              className="mt-1.5 font-mono text-xs"
            />
            {schemaError
              ? <Text size="xsmall" className="text-red-500 mt-1">{schemaError}</Text>
              : <Text size="xsmall" className="text-ui-fg-muted mt-1">Optional. Paste any schema.org JSON-LD (FAQPage, Service, Event…). It is injected into this page's &lt;head&gt;. Validated as JSON on save. Test at search.google.com/test/rich-results.</Text>}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-ui-border-base">
            <div className="flex items-center gap-3">
              <Switch checked={noindex} onCheckedChange={setNoindex} />
              <Label>Hide from Google (noindex)</Label>
            </div>
          </div>
        </div>

      </div>

      <div className="space-y-4 p-6 xl:pl-0 xl:border-l border-ui-border-base bg-ui-bg-subtle/40">
        <div>
          <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
            Google preview
          </Text>
          <GoogleSnippet title={title} description={description} path={row.path} />
        </div>

        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
          <div className="flex items-center gap-4 mb-4">
            <ScoreRing score={score} size="lg" />
            <div>
              <Heading level="h3" className="text-base font-semibold">
                SEO score
              </Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {score.value}/100
                {score.value >= 100
                  ? " · Perfect score"
                  : score.label === "good"
                    ? " · Almost there — see fixes below"
                    : score.label === "ok"
                      ? " · Room to improve"
                      : " · Needs attention"}
              </Text>
            </div>
          </div>

          {score.value < 100 && (
            <div className="mb-4">
              <ScoreImprovements score={score} />
            </div>
          )}

          <Text size="small" weight="plus" className="text-ui-fg-base mb-2">
            All checks
          </Text>
          <ul className="space-y-2">
            {score.checks.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <CheckCircleSolid className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircleSolid className="text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className={c.ok ? "text-ui-fg-base" : "text-red-600 dark:text-red-400 font-medium"}>{c.text}</span>
                  {!c.ok && c.fix && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">{c.fix}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle px-4 py-3 text-xs text-ui-fg-subtle leading-relaxed">
          Use your focus keyword in the title, description, and URL. Keep titles under 60 characters and descriptions between 120–160 for best click-through rates.
        </div>
      </div>
      </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-ui-border-base bg-ui-bg-base px-6 py-4">
        <Button variant="danger" disabled={saving} onClick={reset}>
          Reset to default
        </Button>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={saving} isLoading={saving} onClick={save}>
            Save SEO
          </Button>
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
  const [scoreFilter, setScoreFilter] = useState<string>("all")
  const [showSubmitGuide, setShowSubmitGuide] = useState(false)
  const [bulk, setBulk] = useState<{ done: number; total: number; saved: number; failed: number; current: string } | null>(null)
  const bulkCancel = useRef(false)

  const load = async () => {
    setLoading(true)
    const [ovrRes, vehiclesRes, brandsRes, citiesRes, sellersRes, blogRes] = await Promise.all([
      fetch(`${API}/admin/seo`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API}/admin/vehicles?limit=500`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API}/admin/catalog/brands?limit=200`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API}/admin/locations/cities?limit=200`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API}/admin/sellers?limit=200`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
      fetch(`${API}/admin/blog/posts`, { credentials: "include" }).then(r => (r.ok ? r.json() : null)),
    ])
    const ovrMap: Record<string, any> = {}
    for (const o of ovrRes?.items || []) ovrMap[o.path] = o
    setOverrides(ovrMap)

    const list: PageRow[] = []
    const STATIC: [string, string, string][] = [
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
      list.push({ path, kind: "static", default_title: title, default_description: desc, ...(ovrMap[path] || {}) })
    }
    for (const v of vehiclesRes?.vehicles || []) {
      const path = `/cars/${v.id}`
      list.push({
        path,
        kind: "vehicle",
        default_title: v.title || "Vehicle",
        default_description: v.description?.slice(0, 160) || `Rent ${v.title} from a verified rental company.`,
        ...(ovrMap[path] || {}),
      })
    }
    for (const b of brandsRes?.brands || []) {
      const path = `/cars?brand=${b.id}`
      list.push({
        path,
        kind: "brand",
        default_title: `${b.name} cars for rent | Auto to Rental`,
        default_description: `Browse all ${b.name} rental cars across UAE & Syria. Verified rental companies, direct contact.`,
        ...(ovrMap[path] || {}),
      })
    }
    for (const c of citiesRes?.cities || []) {
      const path = `/cars?city=${c.id}`
      list.push({
        path,
        kind: "city",
        default_title: `Cars for rent in ${c.name} | Auto to Rental`,
        default_description: `Rent a car in ${c.name}. ${c.country_code === "ae" ? "UAE" : "Syria"}. Direct contact with rental companies.`,
        ...(ovrMap[path] || {}),
      })
    }
    for (const s of sellersRes?.sellers || []) {
      const path = `/companies/${s.handle || s.id}`
      list.push({
        path,
        kind: "company",
        default_title: `${s.name} — Rental Company on Auto to Rental`,
        default_description: s.description?.slice(0, 160) || `Browse cars from ${s.name}. Verified rental company.`,
        ...(ovrMap[path] || {}),
      })
    }
    for (const p of blogRes?.posts || []) {
      const path = `/blog/${p.slug}`
      list.push({
        path,
        kind: "blog",
        default_title: p.meta_title || p.title,
        default_description: p.meta_description || p.excerpt || "Read our latest expert guide on car rental.",
        ...(ovrMap[path] || {}),
      })
    }
    setPages(list)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const enriched = useMemo(
    () =>
      pages.map(p => {
        const title = p.title || p.default_title
        const desc = p.description || p.default_description
        const score = scoreSeo(title, desc, p.focus_keyword || "", p.path, p.kind)
        return { ...p, score, isOverridden: !!overrides[p.path], displayTitle: title, displayDesc: desc }
      }),
    [pages, overrides]
  )

  const stats = useMemo(() => {
    const good = enriched.filter(p => p.score.label === "good").length
    const ok = enriched.filter(p => p.score.label === "ok").length
    const bad = enriched.filter(p => p.score.label === "bad").length
    const perfect = enriched.filter(p => p.score.value >= 100).length
    const not100 = enriched.filter(p => p.score.value < 100).length
    return { good, ok, bad, perfect, not100, overridden: Object.keys(overrides).length }
  }, [enriched, overrides])

  const [sortBy, setSortBy] = useState<string>("score-asc")

  const filtered = useMemo(() => {
    const out = enriched.filter(p => {
      if (kindFilter !== "all" && p.kind !== kindFilter) return false
      if (scoreFilter !== "all") {
        if (scoreFilter === "perfect" && p.score.value < 100) return false
        if (scoreFilter === "not100" && p.score.value >= 100) return false
        if (scoreFilter === "perfect" || scoreFilter === "not100") {
          // handled above
        } else if (p.score.label !== scoreFilter) return false
      }
      if (filter) {
        const q = filter.toLowerCase()
        if (!p.path.toLowerCase().includes(q) && !p.displayTitle.toLowerCase().includes(q) && !(p.focus_keyword || "").toLowerCase().includes(q))
          return false
      }
      return true
    })
    out.sort((a, b) => {
      if (sortBy === "score-asc") return a.score.value - b.score.value || a.path.localeCompare(b.path)
      if (sortBy === "score-desc") return b.score.value - a.score.value || a.path.localeCompare(b.path)
      if (sortBy === "path") return a.path.localeCompare(b.path)
      if (sortBy === "type") return a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path)
      return 0
    })
    return out
  }, [enriched, filter, kindFilter, scoreFilter, sortBy])

  const exportCsv = () => {
    const rows = [
      ["Path", "Type", "Title", "Description", "Focus Keyword", "Score", "Status"],
      ...filtered.map(p => [
        p.path,
        p.kind,
        p.displayTitle,
        p.displayDesc,
        p.focus_keyword || "",
        String(p.score.value),
        p.isOverridden ? "Custom" : "Default",
      ]),
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "seo-pages.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const bulkTargets = useMemo(() => filtered.filter(p => p.score.value < 100), [filtered])

  const optimizeAll = async () => {
    const targets = bulkTargets
    if (targets.length === 0) return
    if (!confirm(`Optimize ${targets.length} page${targets.length > 1 ? "s" : ""} with AI?\n\nThis rewrites the title, meta description and focus keyword for each page below 100%, then saves them. You can re-edit or reset any page afterward.`)) return
    bulkCancel.current = false
    setBulk({ done: 0, total: targets.length, saved: 0, failed: 0, current: "" })
    let done = 0, saved = 0, failed = 0
    let idx = 0
    const CONCURRENCY = 3
    const worker = async () => {
      while (idx < targets.length && !bulkCancel.current) {
        const p = targets[idx++]
        setBulk(b => (b ? { ...b, current: p.path } : b))
        try {
          const r = await fetch(`${API}/admin/ai/optimize-seo`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: p.path,
              page_type: p.kind,
              current_title: p.title || p.default_title,
              current_description: p.description || p.default_description,
              context: p.default_description,
            }),
          })
          const d = await r.json()
          if (!r.ok) throw new Error(d.message || "AI failed")
          await fetch(`${API}/admin/seo`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: p.path,
              title: d.title || p.title || p.default_title,
              description: d.description || p.description || p.default_description,
              focus_keyword: d.focus_keyword || p.focus_keyword || "",
              og_image: p.og_image || "",
              noindex: !!p.noindex,
            }),
          })
          saved++
        } catch {
          failed++
        } finally {
          done++
          setBulk(b => (b ? { ...b, done, saved, failed } : b))
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker))
    await load()
    setBulk(b => (b ? { ...b, current: bulkCancel.current ? "Cancelled" : "Done" } : b))
    setTimeout(() => setBulk(null), 4500)
  }

  return (
    <SingleColumnPage>
      {/* Header */}
      <Container className="p-6 pb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-ui-fg-subtle text-xs font-semibold uppercase tracking-wider mb-2">
              <CommandLine className="text-ui-fg-muted" />
              Search visibility
            </div>
            <Heading level="h1" className="text-2xl font-semibold tracking-tight">
              SEO Manager
            </Heading>
            <Text className="text-ui-fg-subtle mt-1 max-w-2xl">
              Edit titles, meta descriptions, and focus keywords for every storefront page — with live Google preview and SEO scoring.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="primary"
              onClick={optimizeAll}
              disabled={loading || !!bulk || bulkTargets.length === 0}
              isLoading={!!bulk}
            >
              <Sparkles />
              {bulkTargets.length > 0 ? `Optimize All (${bulkTargets.length})` : "All optimized"}
            </Button>
            <Button variant="secondary" onClick={exportCsv} disabled={loading || filtered.length === 0}>
              <ArrowDownTray />
              Export CSV
            </Button>
            <a href="https://autotorental.com/sitemap.xml" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary">
                <GlobeEurope />
                Sitemap
              </Button>
            </a>
          </div>
        </div>
      </Container>

      {/* Bulk AI progress */}
      {bulk && (
        <Container className="p-4 mx-6 mb-0 rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="text-ui-fg-interactive shrink-0" />
              <Text weight="plus" className="text-ui-fg-base">
                {bulk.current === "Done"
                  ? `Done — ${bulk.saved} optimized${bulk.failed ? `, ${bulk.failed} failed` : ""}`
                  : bulk.current === "Cancelled"
                    ? `Cancelled — ${bulk.saved} saved before stopping`
                    : "Optimizing pages with AI…"}
              </Text>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Text size="small" className="text-ui-fg-muted tabular-nums">
                {bulk.done}/{bulk.total}
              </Text>
              {bulk.current !== "Done" && bulk.current !== "Cancelled" && (
                <Button size="small" variant="secondary" onClick={() => (bulkCancel.current = true)}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-ui-bg-subtle overflow-hidden">
            <div
              className="h-full rounded-full bg-ui-fg-interactive transition-all"
              style={{ width: `${bulk.total ? Math.round((bulk.done / bulk.total) * 100) : 0}%` }}
            />
          </div>
          {bulk.current && bulk.current !== "Done" && bulk.current !== "Cancelled" && (
            <Text size="xsmall" className="text-ui-fg-muted mt-1.5 font-mono break-all">
              {bulk.current}
            </Text>
          )}
        </Container>
      )}

      {/* KPI cards */}
      <Container className="p-6">
        <div className="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
                  <Skeleton className="h-3 w-16 mb-3" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))
            : (
              <>
                <StatCard
                  icon={DocumentText}
                  label="Total pages"
                  value={pages.length}
                  chip="bg-ui-bg-subtle"
                  iconColor="text-ui-fg-subtle"
                />
                <StatCard
                  icon={PencilSquare}
                  label="Custom overrides"
                  value={stats.overridden}
                  chip="bg-ui-bg-subtle"
                  iconColor="text-ui-fg-interactive"
                  valueColor="text-ui-fg-interactive"
                  hint={`${Math.round((stats.overridden / Math.max(1, pages.length)) * 100)}% of pages edited`}
                />
                <StatCard
                  icon={CheckCircleSolid}
                  label="Perfect 100%"
                  value={stats.perfect}
                  chip="bg-emerald-100 dark:bg-emerald-950/40"
                  iconColor="text-emerald-600 dark:text-emerald-400"
                  valueColor="text-emerald-700 dark:text-emerald-400"
                  hint={`${Math.round((stats.perfect / Math.max(1, pages.length)) * 100)}% fully optimized`}
                />
                <StatCard
                  icon={ExclamationCircle}
                  label="Not 100% yet"
                  value={stats.not100}
                  chip="bg-amber-100 dark:bg-amber-950/40"
                  iconColor="text-amber-600 dark:text-amber-400"
                  valueColor="text-amber-700 dark:text-amber-400"
                  hint="Improvable with Optimize All"
                />
                <StatCard
                  icon={XCircleSolid}
                  label="Poor score"
                  value={stats.bad}
                  chip="bg-red-100 dark:bg-red-950/40"
                  iconColor="text-red-600 dark:text-red-400"
                  valueColor="text-red-700 dark:text-red-400"
                  hint="Below 50 — needs attention"
                />
              </>
            )}
        </div>
      </Container>

      {/* Submit guide — collapsible */}
      <Container className="p-6">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSubmitGuide(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-ui-bg-subtle transition-colors"
          >
            <div>
              <Text weight="plus" className="text-ui-fg-base">
                Submit to Google & Bing
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                One-time setup to get your sitemap indexed
              </Text>
            </div>
            <Text size="small" className="text-ui-fg-muted">
              {showSubmitGuide ? "Hide" : "Show"}
            </Text>
          </button>
          {showSubmitGuide && (
            <div className="px-5 pb-5 border-t border-ui-border-base pt-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                <Text weight="plus" className="mb-1">
                  Google Search Console
                </Text>
                <Text size="small" className="text-ui-fg-subtle mb-3">
                  Submit your sitemap so Google indexes your pages.
                </Text>
                <ol className="text-xs text-ui-fg-subtle list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>
                    Open{" "}
                    <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-ui-fg-interactive underline">
                      search.google.com/search-console
                    </a>
                  </li>
                  <li>Add property: autotorental.com</li>
                  <li>Verify ownership (HTML tag in site env)</li>
                  <li>Sitemaps → add sitemap.xml</li>
                </ol>
              </div>
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                <Text weight="plus" className="mb-1">
                  Bing Webmaster Tools
                </Text>
                <Text size="small" className="text-ui-fg-subtle mb-3">
                  Also powers DuckDuckGo and Yahoo search.
                </Text>
                <ol className="text-xs text-ui-fg-subtle list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>
                    Open{" "}
                    <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-ui-fg-interactive underline">
                      bing.com/webmasters
                    </a>
                  </li>
                  <li>Import from Google Search Console</li>
                  <li>Confirm sitemap is listed</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Filters */}
      <Container className="p-4 mx-6 mb-0 rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest">
        <div className="" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
          <div className="lg:col-span-2">
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">
              Search pages
            </Text>
            <Input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Path, title, or keyword…" />
          </div>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">
              Page type
            </Text>
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All types</Select.Item>
                <Select.Item value="static">Static pages</Select.Item>
                <Select.Item value="blog">Blog posts</Select.Item>
                <Select.Item value="landing">Landing pages</Select.Item>
                <Select.Item value="vehicle">Vehicles</Select.Item>
                <Select.Item value="brand">Brands</Select.Item>
                <Select.Item value="city">Cities</Select.Item>
                <Select.Item value="company">Companies</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">
              SEO score
            </Text>
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All scores</Select.Item>
                <Select.Item value="good">Good (75–99)</Select.Item>
                <Select.Item value="ok">Needs work (50–74)</Select.Item>
                <Select.Item value="bad">Poor (&lt;50)</Select.Item>
                <Select.Item value="perfect">Perfect (100 only)</Select.Item>
                <Select.Item value="not100">Not 100% yet</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div>
            <Text size="small" className="text-ui-fg-muted font-medium mb-1.5">
              Sort by
            </Text>
            <Select value={sortBy} onValueChange={setSortBy}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="score-asc">Worst score first</Select.Item>
                <Select.Item value="score-desc">Best score first</Select.Item>
                <Select.Item value="path">Path (A–Z)</Select.Item>
                <Select.Item value="type">Page type</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
        {!loading && (
          <Text size="small" className="text-ui-fg-muted mt-3">
            Showing {filtered.length} of {pages.length} pages
          </Text>
        )}
      </Container>

      {/* Table */}
      <Container className="p-6 pt-4">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base overflow-hidden shadow-elevation-card-rest">
          {loading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <MagnifyingGlass className="mx-auto mb-3 text-ui-fg-muted" />
              <Text className="text-ui-fg-subtle font-medium">No pages match your filters</Text>
              <Text size="small" className="text-ui-fg-muted mt-1">
                Try clearing search or changing the page type filter.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row className="bg-ui-bg-subtle/50 [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:font-semibold [&>th]:text-ui-fg-muted">
                  <Table.HeaderCell>Page</Table.HeaderCell>
                  <Table.HeaderCell>SEO preview</Table.HeaderCell>
                  <Table.HeaderCell>Focus</Table.HeaderCell>
                  <Table.HeaderCell>Score</Table.HeaderCell>
                  <Table.HeaderCell>How to reach 100%</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filtered.map(p => (
                  <Table.Row key={p.path} className="hover:bg-ui-bg-subtle/50 transition-colors [&>td]:py-4 [&>td]:align-top">
                    <Table.Cell className="align-top max-w-[220px]">
                      <Badge color={KIND_BADGE[p.kind]} size="2xsmall" className="mb-1.5">
                        {KIND_LABELS[p.kind]}
                      </Badge>
                      <div className="font-mono text-xs text-ui-fg-subtle break-all leading-relaxed">{p.path}</div>
                    </Table.Cell>
                    <Table.Cell className="align-top max-w-md">
                      <div className="font-medium text-ui-fg-base line-clamp-1">{p.displayTitle}</div>
                      <div className="text-xs text-ui-fg-muted line-clamp-2 mt-0.5 leading-relaxed">{p.displayDesc}</div>
                    </Table.Cell>
                    <Table.Cell className="align-top">
                      {p.focus_keyword ? (
                        <span
                          title={p.focus_keyword}
                          className="inline-flex max-w-[160px] items-center gap-x-1 rounded-md border border-ui-tag-blue-border bg-ui-tag-blue-bg px-2 py-0.5 text-xs font-medium text-ui-tag-blue-text"
                        >
                          <MagnifyingGlass className="shrink-0 text-ui-tag-blue-icon" />
                          <span className="truncate">{p.focus_keyword}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-dashed border-ui-border-strong px-2 py-0.5 text-xs text-ui-fg-muted">
                          Not set
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="align-top">
                      <ScoreBadge score={p.score} />
                    </Table.Cell>
                    <Table.Cell className="align-top min-w-[240px]">
                      <ScoreImprovements score={p.score} compact />
                    </Table.Cell>
                    <Table.Cell className="align-top">
                      {p.isOverridden ? (
                        <Badge color="green" size="2xsmall">
                          Custom
                        </Badge>
                      ) : (
                        <Badge color="grey" size="2xsmall">
                          Default
                        </Badge>
                      )}
                      {p.noindex && (
                        <Badge color="orange" size="2xsmall" className="ml-1">
                          noindex
                        </Badge>
                      )}
                    </Table.Cell>
                    <Table.Cell className="align-top text-right">
                      <Button size="small" variant="secondary" onClick={() => setEditing(p)}>
                        <PencilSquare />
                        Edit
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>

      <FocusModal open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <FocusModal.Content style={{ maxWidth: 960 }}>
          <FocusModal.Header>
            <Heading level="h2" className="text-lg font-semibold">
              Edit SEO
            </Heading>
          </FocusModal.Header>
          <FocusModal.Body className="p-0 flex flex-col overflow-hidden">
            {editing && (
              <EditModal
                row={editing}
                onClose={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null)
                  load()
                }}
              />
            )}
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}

export default Page
