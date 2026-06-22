"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import LiveTicker from "./live-ticker"
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
  // Middle East
  AE: [54, 24], SA: [45, 24], QA: [51.2, 25.3], KW: [47.5, 29.3], OM: [56, 21], BH: [50.5, 26],
  YE: [48, 15.5], IQ: [44, 33], SY: [38, 35], JO: [36, 31], LB: [35.8, 33.8], IL: [35, 31.5],
  PS: [35.2, 31.9], IR: [53, 32], TR: [35, 39],
  // North Africa
  EG: [30, 27], LY: [18, 27], TN: [9, 34], DZ: [2, 28], MA: [-6, 32], SD: [30, 15], SS: [31, 7], MR: [-10, 20],
  // Sub-Saharan Africa
  NG: [8, 10], ET: [40, 8], KE: [38, 0], ZA: [24, -29], GH: [-1, 8], TZ: [35, -6], UG: [32, 1],
  CI: [-5, 8], CM: [12, 6], SN: [-14, 14], ML: [-4, 17], BF: [-2, 12], NE: [8, 17], TD: [19, 15],
  SO: [46, 6], ZM: [28, -15], ZW: [29, -19], AO: [18, -12], MZ: [35, -18], MG: [47, -19], RW: [30, -2],
  BJ: [2.3, 9.5], BI: [30, -3.5], GN: [-10, 11], SL: [-12, 8.5], LR: [-9.4, 6.5], TG: [1, 8], CF: [21, 7],
  CG: [15, -1], CD: [24, -3], GA: [11, -1], BW: [24, -22], NA: [18, -22], MW: [34, -13.5], LS: [28.5, -29.5],
  SZ: [31.5, -26.5], GM: [-15.4, 13.5], GW: [-15, 12], GQ: [10, 1.5], DJ: [43, 11.5], ER: [39, 15],
  MU: [57.5, -20.3], KM: [43.5, -12], CV: [-24, 16],
  // Europe
  GB: [-2, 54], IE: [-8, 53], FR: [2, 46], DE: [10, 51], IT: [12, 42], ES: [-4, 40], PT: [-8, 39.5],
  NL: [5, 52], BE: [4, 50], LU: [6.1, 49.8], CH: [8, 47], AT: [14, 47.5], RU: [100, 62], UA: [32, 49],
  BY: [28, 53], PL: [19, 52], CZ: [15, 50], SK: [19.5, 48.7], HU: [19, 47], RO: [25, 46], BG: [25, 43],
  GR: [22, 39], HR: [16, 45.5], RS: [21, 44], SI: [14.8, 46], BA: [18, 44], AL: [20, 41], MK: [21.7, 41.6],
  ME: [19.3, 42.8], XK: [20.9, 42.6], MD: [28.5, 47], LT: [24, 55], LV: [25, 57], EE: [26, 59], FI: [26, 64],
  SE: [15, 62], NO: [10, 62], DK: [10, 56], IS: [-18, 65], MT: [14.4, 35.9], CY: [33, 35],
  // South & Central Asia
  IN: [79, 22], PK: [70, 30], BD: [90, 24], LK: [81, 7], NP: [84, 28], AF: [66, 33], BT: [90.4, 27.4],
  MV: [73.5, 3.2], KZ: [67, 48], UZ: [64, 41], TM: [59, 39], KG: [75, 41], TJ: [71, 39], AZ: [47.5, 40.3],
  GE: [43.3, 42], AM: [45, 40], MN: [103, 46],
  // East Asia
  CN: [104, 35], JP: [138, 37], KR: [128, 36], KP: [127, 40], TW: [121, 23.7], HK: [114.1, 22.3], MO: [113.5, 22.2],
  // Southeast Asia
  TH: [101, 15], VN: [106, 16], PH: [122, 12], ID: [120, -5], MY: [112, 3], SG: [103.8, 1.3],
  MM: [96, 21], KH: [105, 12.5], LA: [103, 18], BN: [114.7, 4.5], TL: [125.8, -8.8],
  // Oceania
  AU: [134, -25], NZ: [174, -41], PG: [144, -6], FJ: [178, -17.7], NC: [165.5, -21.3], SB: [160, -9.6],
  VU: [167, -16], GU: [144.8, 13.4], PF: [-149, -17.7],
  // Americas
  US: [-98, 39], CA: [-106, 56], MX: [-102, 23], GT: [-90.4, 15.7], BZ: [-88.7, 17.2], SV: [-89, 13.8],
  HN: [-86.6, 14.8], NI: [-85, 13], CR: [-84, 10], PA: [-80, 9], CO: [-73, 4], VE: [-66, 8], EC: [-78.5, -1.5],
  PE: [-75, -10], BO: [-64, -17], BR: [-53, -10], PY: [-58, -23], UY: [-56, -33], AR: [-64, -34], CL: [-71, -35],
  CU: [-79, 21.5], DO: [-70.7, 19], HT: [-72.3, 19], JM: [-77.3, 18.1], PR: [-66.5, 18.2], TT: [-61.2, 10.5],
  BS: [-77.4, 25], BB: [-59.5, 13.2], GY: [-58.9, 5], SR: [-56, 4],
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

let REGION_DN: any = null
try { REGION_DN = new (Intl as any).DisplayNames(["en"], { type: "region" }) } catch { REGION_DN = null }
function nameOf(code: string): string {
  if (COUNTRY_NAMES[code]) return COUNTRY_NAMES[code]
  try { const n = REGION_DN ? REGION_DN.of(code) : null; if (n && n !== code) return n } catch { /* noop */ }
  return code
}
function flagOf(code: string): string {
  if (FLAGS[code]) return FLAGS[code]
  if (/^[A-Z]{2}$/.test(code)) {
    try { return String.fromCodePoint(0x1f1e6 + code.charCodeAt(0) - 65, 0x1f1e6 + code.charCodeAt(1) - 65) } catch { /* noop */ }
  }
  return "🌐"
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
  const [rotation, setRotation] = useState<[number, number]>([-54, -10])
  const [animating, setAnimating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState<any>(null)
  const last = useRef<[number, number]>([0, 0])
  const spin = useRef(autoRotate)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = 800
  const height = 500
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFs, setIsFs] = useState(false)
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFs)
    return () => document.removeEventListener("fullscreenchange", onFs)
  }, [])
  const toggleFs = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen().catch(() => {})
  }

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
        name: nameOf(code),
        flag: flagOf(code),
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
      <div ref={containerRef} style={{ position: "relative", borderRadius: isFs ? 0 : 16, overflow: "hidden", background: "radial-gradient(120% 120% at 50% 0%, #10213f 0%, #0b1220 60%)", padding: 8, ...(isFs ? { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" } : {}) }}>
        <button onClick={toggleFs} title={isFs ? "Exit full screen" : "Full screen"} aria-label="Toggle full screen"
          style={{ position: "absolute", top: 12, right: 12, zIndex: 4, width: 38, height: 38, borderRadius: 8, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(8,15,30,0.7)", color: "#e2e8f0", cursor: "pointer", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isFs ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
          )}
        </button>
        <div style={{ position: "absolute", top: 12, left: 14, zIndex: 2, display: "flex", alignItems: "center", gap: 8, background: "rgba(8,15,30,0.65)", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 999, backdropFilter: "blur(6px)" }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: "#22d3ee", boxShadow: "0 0 8px #22d3ee", display: "inline-block", animation: "atrpulse 1.6s ease-out infinite" }} />
          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>LIVE</span>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{totalVisitors} online now · {markers.length} {markers.length === 1 ? "country" : "countries"}</span>
        </div>

        <style>{`@keyframes atrpulse{0%{transform:scale(0.6);opacity:0.9}70%{opacity:0}100%{transform:scale(2.4);opacity:0}}`}</style>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: "100%", height: "auto", maxHeight: isFs ? "94vh" : undefined, cursor: dragging ? "grabbing" : "grab", display: "block" }}
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
            <div style={{ color: "#7dd3fc", fontWeight: 700, marginTop: 2 }}>{hover.count} online now</div>
          </div>
        ) : null}

        {isFs && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 4 }}>
            <LiveTicker big />
          </div>
        )}
        <div style={{ position: "absolute", bottom: isFs ? 88 : 12, right: 12, display: "flex", gap: 8, zIndex: 5 }}>
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
