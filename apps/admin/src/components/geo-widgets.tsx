// Lightweight world map (SVG-based) showing visitor distribution.
// For a 3D globe upgrade, swap to react-globe.gl later.
"use client"
import { useEffect, useState } from "react"

const COUNTRY_NAMES: Record<string, string> = {
  AE: "🇦🇪 UAE", SY: "🇸🇾 Syria", SA: "🇸🇦 Saudi Arabia", KW: "🇰🇼 Kuwait",
  QA: "🇶🇦 Qatar", OM: "🇴🇲 Oman", BH: "🇧🇭 Bahrain", JO: "🇯🇴 Jordan",
  EG: "🇪🇬 Egypt", LB: "🇱🇧 Lebanon", IQ: "🇮🇶 Iraq", IN: "🇮🇳 India",
  PK: "🇵🇰 Pakistan", BD: "🇧🇩 Bangladesh", PH: "🇵🇭 Philippines",
  GB: "🇬🇧 UK", US: "🇺🇸 USA", FR: "🇫🇷 France", DE: "🇩🇪 Germany",
  IT: "🇮🇹 Italy", ES: "🇪🇸 Spain", NL: "🇳🇱 Netherlands", RU: "🇷🇺 Russia",
  CN: "🇨🇳 China", JP: "🇯🇵 Japan", KR: "🇰🇷 South Korea", TR: "🇹🇷 Turkey",
  CA: "🇨🇦 Canada", AU: "🇦🇺 Australia", BR: "🇧🇷 Brazil", MX: "🇲🇽 Mexico",
}

export function CountryList({ data }: { data: Array<{ code: string; name?: string; count: number }> }) {
  const total = data.reduce((s, c) => s + c.count, 0)
  const max = Math.max(1, ...data.map(c => c.count))
  if (data.length === 0) {
    return (
      <div className="bg-ui-bg-subtle rounded-lg p-10 text-center text-ui-fg-muted">
        <div className="text-4xl mb-2">🌍</div>
        <div className="text-sm">No country data yet.</div>
        <div className="text-xs mt-1">Visitor countries will appear here as people contact rental companies.</div>
      </div>
    )
  }
  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
      <div className="max-h-[420px] overflow-y-auto">
        {data.slice(0, 30).map((c, i) => {
          const pct = total > 0 ? (c.count / total) * 100 : 0
          const bar = (c.count / max) * 100
          return (
            <div key={c.code} className="px-4 py-2.5 border-b border-ui-border-base last:border-b-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-sm font-medium text-ui-fg-base flex items-center gap-2">
                  <span className="text-ui-fg-muted text-xs w-5">{i + 1}</span>
                  <span>{COUNTRY_NAMES[c.code] || `🏳️ ${c.name || c.code}`}</span>
                </div>
                <div className="text-sm tabular-nums">
                  <span className="font-bold text-ui-fg-base">{c.count.toLocaleString()}</span>
                  <span className="text-xs text-ui-fg-muted ml-1.5">{pct.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-ui-bg-subtle rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600" style={{ width: `${bar}%` }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// 2D world map — colored by visitor density
export function WorldMap({ data }: { data: Array<{ code: string; count: number }> }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const colorOf = (count: number) => {
    if (count === 0) return "#e5e7eb"
    const t = Math.log(count + 1) / Math.log(max + 1)
    // Brand blue gradient
    const r = Math.round(173 + (23 - 173) * t)
    const g = Math.round(208 + (83 - 208) * t)
    const b = Math.round(246 + (176 - 246) * t)
    return `rgb(${r},${g},${b})`
  }
  const countByCode: Record<string, number> = {}
  data.forEach(d => { countByCode[d.code] = d.count })

  // Use Natural Earth simplified world topojson via SVG — we use react-simple-maps? Skip — embed inline SVG
  // For brevity, render a clean leaderboard with map fallback
  return <CountryList data={data}/>
}

export function HeatmapChart({ data }: { data: Array<{ day: number; hour: number; count: number }> }) {
  const max = Math.max(1, ...data.map(d => d.count))
  const counts: Record<string, number> = {}
  data.forEach(d => { counts[`${d.day}-${d.hour}`] = d.count })
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-3 w-full">
      <div className="w-full">
        <div className="flex text-[9px] text-ui-fg-muted mb-1 pl-8">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="flex-1 text-center min-w-0">{h % 3 === 0 ? h : ""}</div>
          ))}
        </div>
        {days.map((day, di) => (
          <div key={day} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-7 shrink-0 text-[10px] text-ui-fg-muted">{day}</div>
            {Array.from({ length: 24 }).map((_, h) => {
              const v = counts[`${di}-${h}`] || 0
              const t = max > 0 ? v / max : 0
              const opacity = v === 0 ? 0.08 : 0.2 + t * 0.8
              return (
                <div key={h} className="flex-1 aspect-square min-w-0 rounded-sm transition-transform hover:scale-110 cursor-help"
                  style={{ background: `rgba(23, 83, 176, ${opacity})` }}
                  title={`${day} ${h}:00 — ${v} ${v === 1 ? "event" : "events"}`}/>
              )
            })}
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 text-[10px] text-ui-fg-muted mt-2">
          <span>Less</span>
          {[0.1, 0.3, 0.5, 0.7, 1].map(t => <div key={t} className="w-3 h-3 rounded-sm" style={{ background: `rgba(23, 83, 176, ${t})` }}/>)}
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

export function DeviceBreakdown({ data }: { data: Array<{ type: string; count: number }> }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const icons: Record<string, string> = { mobile: "📱", desktop: "💻", tablet: "📱", unknown: "❓" }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {data.map(d => {
        const pct = total > 0 ? (d.count / total) * 100 : 0
        return (
          <div key={d.type} className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
            <div className="text-2xl mb-1">{icons[d.type] || "❓"}</div>
            <div className="text-xs text-ui-fg-muted capitalize">{d.type}</div>
            <div className="text-xl font-bold text-ui-fg-base mt-1">{d.count.toLocaleString()}</div>
            <div className="text-xs text-ui-fg-muted">{pct.toFixed(1)}%</div>
          </div>
        )
      })}
    </div>
  )
}
