"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  geoOrthographicRaw,
  geoEquirectangularRaw,
  geoProjectionMutator,
  geoPath,
  geoGraticule,
  geoDistance,
} from "d3-geo"
import { feature } from "topojson-client"

// Faithful port of the globe-to-map-transform source — rendered with React/SVG.
// Shopify-style live visitor markers: pulsing glow + country label + hover tooltip.

type Country = { code: string; name?: string; count: number }

const CENTROIDS: Record<string, [number, number]> = {
  AE: [54, 24], SY: [38, 35], SA: [45, 24], QA: [51.2, 25.3], KW: [47.5, 29.3], OM: [56, 21],
  BH: [50.5, 26], EG: [30, 27], JO: [36, 31], LB: [35.8, 33.8], IQ: [44, 33], YE: [48, 15.5],
  TR: [35, 39], IR: [53, 32], IN: [79, 22], PK: [70, 30], GB: [-2, 54], US: [-98, 39],
  FR: [2, 46], DE: [10, 51], IT: [12, 42], ES: [-4, 40], RU: [100, 62], CN: [104, 35],
  PH: [122, 12], BD: [90, 24], LK: [81, 7], NG: [8, 10], ZA: [24, -29], CA: [-106, 56],
  AU: [134, -25], BR: [-53, -10], SD: [30, 15], MA: [-6, 32], DZ: [2, 28], TN: [9, 34],
  ET: [40, 8], KE: [38, 0], ID: [120, -5], MY: [112, 3], SG: [103.8, 1.3], TH: [101, 15],
  NL: [5, 52], BE: [4, 50], CH: [8, 47], SE: [15, 62], UA: [32, 49], CZ: [15, 50], PL: [19, 52],
}

const COUNTRY_NAMES: Record<string, string> = {
  AE: "UAE", SY: "Syria", SA: "Saudi Arabia", QA: "Qatar", KW: "Kuwait", OM: "Oman",
  BH: "Bahrain", EG: "Egypt", JO: "Jordan", LB: "Lebanon", IQ: "Iraq", YE: "Yemen",
  TR: "Turkey", IR: "Iran", IN: "India", PK: "Pakistan", GB: "United Kingdom", US: "United States",
  FR: "France", DE: "Germany", IT: "Italy", ES: "Spain", RU: "Russia", CN: "China",
  PH: "Philippines", BD: "Bangladesh", LK: "Sri Lanka", NG: "Nigeria", ZA: "South Africa", CA: "Canada",
  AU: "Australia", BR: "Brazil", SD: "Sudan", MA: "Morocco", DZ: "Algeria", TN: "Tunisia",
  ET: "Ethiopia", KE: "Kenya", ID: "Indonesia", MY: "Malaysia", SG: "Singapore", TH: "Thailand",
  NL: "Netherlands", BE: "Belgium", CH: "Switzerland", SE: "Sweden", UA: "Ukraine", CZ: "Czechia", PL: "Poland",
}

const FLAGS: Record<string, string> = {
  AE: "🇦🇪", SY: "🇸🇾", SA: "🇸🇦", QA: "🇶🇦", KW: "🇰🇼", OM: "🇴🇲", BH: "🇧🇭", EG: "🇪🇬", JO: "🇯🇴",
  LB: "🇱🇧", IQ: "🇮🇶", YE: "🇾🇪", TR: "🇹🇷", IR: "🇮🇷", IN: "🇮🇳", PK: "🇵🇰", GB: "🇬🇧", US: "🇺🇸",
  FR: "🇫🇷", DE: "🇩🇪", IT: "🇮🇹", ES: "🇪🇸", RU: "🇷🇺", CN: "🇨🇳", PH: "🇵🇭", BD: "🇧🇩", LK: "🇱🇰",
  NG: "🇳🇬", ZA: "🇿🇦", CA: "🇨🇦", AU: "🇦🇺", BR: "🇧🇷", SD: "🇸🇩", MA: "🇲🇦", DZ: "🇩🇿", TN: "🇹🇳",
  ET: "🇪🇹", KE: "🇰🇪", ID: "🇮🇩", MY: "🇲🇾", SG: "🇸🇬", TH: "🇹🇭", NL: "🇳🇱", BE: "🇧🇪", CH: "🇨🇭",
  SE: "🇸🇪", UA: "🇺🇦", CZ: "🇨🇿", PL: "🇵🇱",
}

function interpolateProjection(raw0: any, raw1: any) {
  const mutate: any = geoProjectionMutator((t: number) => (x: number, y: number) => {
    const [x0, y0] = raw0(x, y)
    const [x1, y1] = raw1(x, y)
    return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)]
  })
  let t = 0
  return Object.assign((mutate as any)(t), {
    alpha(_?: number) {
      return arguments.length ? (mutate as any)((t = +(_ as number))) : t
    },
  })
}

export function TrafficGlobe({
  countries = [],
  accent = "#38bdf8",
  autoRotate = true,
}: {
  countries?: Country[]
  accent?: string
  autoRotate?: boolean
}) {
  const [world, setWorld] = useState<any[]>([])
  const [progress, setProgress] = useState(0)
  const [rotation, setRotation] = useState<[number, number]>([20, -10])
  const [animating, setAnimating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState<any>(null)
  const last = useRef<[number, number]>([0, 0])
  const spin = useRef(autoRotate)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = 800
  const height = 500

  useEffect(() => {
    let alive = true
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then((r) => r.json())
      .then((w: any) => { if (alive) setWorld((feature(w, w.objects.countries) as any).features || []) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!autoRotate) return
    const iv = setInterval(() => {
      if (spin.current && progress <= 8) setRotation(([a, b]) => [(a + 0.3) % 360, b])
    }, 60)
    return () => clearInterval(iv)
  }, [autoRotate, progress])

  const { graticuleD, countryDs, sphereD, markers } = useMemo(() => {
    if (!world.length) return { graticuleD: "", countryDs: [] as string[], sphereD: "", markers: [] as any[] }
    const t = progress / 100
    const alpha = Math.pow(t, 0.5)
    const projection: any = interpolateProjection(geoOrthographicRaw, geoEquirectangularRaw)
      .scale(200 - 80 * alpha)
      .translate([width / 2, height / 2])
      .rotate([rotation[0], rotation[1]])
      .precision(0.1)
    projection.alpha(alpha)
    const path = geoPath(projection)
    let g = ""
    try { g = path(geoGraticule()()) || "" } catch {}
    const ds: string[] = []
    for (const f of world) {
      try { const d = path(f as any); if (d && !d.includes("NaN")) ds.push(d) } catch {}
    }
    let s = ""
    try { s = path({ type: "Sphere" } as any) || "" } catch {}
    const valid = countries.filter((c) => CENTROIDS[(c.code || "").toUpperCase()])
    const max = Math.max(1, ...valid.map((c) => c.count || 0))
    const center: [number, number] = [-rotation[0], -rotation[1]]
    const mk: any[] = []
    for (const c of valid) {
      const code = c.code.toUpperCase()
      const ll = CENTROIDS[code]
      if (alpha < 0.55 && geoDistance(ll, center) > Math.PI / 2) continue
      const p = projection(ll)
      if (!p || isNaN(p[0]) || isNaN(p[1])) continue
      mk.push({
        x: p[0], y: p[1],
        r: 4 + 8 * Math.sqrt((c.count || 0) / max),
        key: code,
        name: COUNTRY_NAMES[code] || code,
        flag: FLAGS[code] || "🌐",
        count: c.count || 0,
      })
    }
    mk.sort((a, b) => b.count - a.count)
    return { graticuleD: g, countryDs: ds, sphereD: s, markers: mk }
  }, [world, progress, rotation, countries])

  const onDown = (e: React.MouseEvent) => {
    spin.current = false
    setDragging(true)
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) last.current = [e.clientX - rect.left, e.clientY - rect.top]
  }
  const onMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const cur: [number, number] = [e.clientX - rect.left, e.clientY - rect.top]
    const dx = cur[0] - last.current[0]
    const dy = cur[1] - last.current[1]
    const sens = progress < 50 ? 0.5 : 0.25
    setRotation(([a, b]) => [a + dx * sens, Math.max(-90, Math.min(90, b - dy * sens))])
    last.current = cur
  }
  const onUp = () => setDragging(false)

  const animate = () => {
    if (animating) return
    spin.current = false
    setAnimating(true)
    const start = progress
    const end = start < 50 ? 100 : 0
    const t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min((now - t0) / 1600, 1)
      const eased = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k
      setProgress(start + (end - start) * eased)
      if (k < 1) requestAnimationFrame(step)
      else setAnimating(false)
    }
    requestAnimationFrame(step)
  }
  const reset = () => { spin.current = autoRotate; setRotation([20, -10]); setProgress(0) }

  const totalVisitors = markers.reduce((s, m) => s + m.count, 0)

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "radial-gradient(120% 120% at 50% 0%, #10213f 0%, #0b1220 60%)", padding: 8 }}>
        <div style={{ position: "absolute", top: 12, left: 14, zIndex: 2, display: "flex", alignItems: "center", gap: 8, background: "rgba(8,15,30,0.65)", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 999, backdropFilter: "blur(6px)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "#22d3ee", boxShadow: "0 0 8px #22d3ee", display: "inline-block", animation: "atrpulse 1.6s ease-out infinite" }} />
          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>LIVE</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{markers.length} countries · {totalVisitors} visitors today</span>
        </div>

        <style>{`@keyframes atrpulse{0%{transform:scale(0.6);opacity:0.9}70%{opacity:0}100%{transform:scale(2.4);opacity:0}}`}</style>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "auto", cursor: dragging ? "grabbing" : "grab", display: "block" }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={() => { onUp(); setHover(null) }}
        >
          <defs>
            <radialGradient id="markerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </radialGradient>
          </defs>

          {graticuleD ? <path d={graticuleD} fill="none" stroke="#3b5170" strokeWidth={0.8} opacity={0.25} /> : null}
          {countryDs.map((d, i) => (
            <path key={i} d={d} fill="#16243f" stroke="#33486b" strokeWidth={0.7} opacity={0.95} />
          ))}
          {sphereD ? <path d={sphereD} fill="none" stroke="#2b3a55" strokeWidth={1.2} opacity={1} /> : null}

          {markers.map((m) => {
            const active = hover?.key === m.key
            return (
              <g key={m.key} style={{ cursor: "pointer" }} onMouseEnter={() => setHover(m)}>
                <circle cx={m.x} cy={m.y} r={m.r} fill="none" stroke={accent} strokeWidth={1.5} opacity={0.7}>
                  <animate attributeName="r" values={`${m.r};${m.r * 3.2}`} dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite" />
                </circle>
                <circle cx={m.x} cy={m.y} r={m.r * 2.4} fill="url(#markerGlow)" />
                <circle cx={m.x} cy={m.y} r={m.r} fill={accent} opacity={0.98} stroke="#fff" strokeWidth={active ? 1.5 : 0.8} />
                <circle cx={m.x} cy={m.y} r={Math.max(1.4, m.r * 0.35)} fill="#fff" opacity={0.95} />
                <text x={m.x + m.r + 5} y={m.y + 3.5} fontSize={11} fontWeight={700}
                      fill="#f1f5f9" stroke="#0b1220" strokeWidth={2.6} paintOrder="stroke"
                      style={{ pointerEvents: "none" }}>
                  {m.name} · {m.count}
                </text>
              </g>
            )
          })}
        </svg>

        {hover ? (
          <div style={{
            position: "absolute", left: `${(hover.x / width) * 100}%`, top: `${(hover.y / height) * 100}%`,
            transform: "translate(12px, -120%)", zIndex: 3, pointerEvents: "none",
            background: "rgba(8,15,30,0.92)", border: `1px solid ${accent}`, borderRadius: 10,
            padding: "8px 12px", color: "#fff", fontSize: 13, whiteSpace: "nowrap",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{hover.flag} {hover.name}</div>
            <div style={{ color: "#7dd3fc", fontWeight: 700, marginTop: 2 }}>{hover.count} visitor{hover.count === 1 ? "" : "s"} today</div>
          </div>
        ) : null}

        <div style={{ position: "absolute", bottom: 12, right: 12, display: "flex", gap: 8 }}>
          <button onClick={animate} disabled={animating}
            style={{ minWidth: 120, padding: "8px 14px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {animating ? "…" : progress < 50 ? "Unroll to Map" : "Roll to Globe"}
          </button>
          <button onClick={reset}
            style={{ minWidth: 70, padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Reset
          </button>
        </div>
      </div>
      <input type="range" min={0} max={100} value={progress}
        onChange={(e) => { spin.current = false; setProgress(Number(e.target.value)) }}
        style={{ width: "100%", marginTop: 10, accentColor: accent }} />
    </div>
  )
}

export default TrafficGlobe
