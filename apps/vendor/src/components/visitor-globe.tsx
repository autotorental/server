// Interactive globe + map transform component
// Uses cobe (same library v0/Vercel use for marketing pages)
// Real visitor data from /vendor/analytics/geography
import { useEffect, useRef, useState } from "react"
import createGlobe from "cobe"

import { API } from "../lib/api"

// Country code → [latitude, longitude] (capital city)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  AE: [24.4539, 54.3773], SY: [33.5138, 36.2765], SA: [24.7136, 46.6753],
  KW: [29.3759, 47.9774], QA: [25.2854, 51.5310], OM: [23.5859, 58.4059],
  BH: [26.0667, 50.5577], JO: [31.9454, 35.9284], EG: [30.0444, 31.2357],
  LB: [33.8938, 35.5018], IQ: [33.3128, 44.3615], TR: [39.9334, 32.8597],
  IN: [28.6139, 77.2090], PK: [33.6844, 73.0479], BD: [23.8103, 90.4125],
  PH: [14.5995, 120.9842], ID: [-6.2088, 106.8456], MY: [3.1390, 101.6869],
  TH: [13.7563, 100.5018], SG: [1.3521, 103.8198], VN: [21.0285, 105.8542],
  CN: [39.9042, 116.4074], JP: [35.6762, 139.6503], KR: [37.5665, 126.9780],
  GB: [51.5074, -0.1278], FR: [48.8566, 2.3522], DE: [52.5200, 13.4050],
  IT: [41.9028, 12.4964], ES: [40.4168, -3.7038], NL: [52.3676, 4.9041],
  BE: [50.8503, 4.3517], CH: [46.9480, 7.4474], AT: [48.2082, 16.3738],
  PT: [38.7223, -9.1393], GR: [37.9838, 23.7275], PL: [52.2297, 21.0122],
  SE: [59.3293, 18.0686], NO: [59.9139, 10.7522], FI: [60.1699, 24.9384],
  DK: [55.6761, 12.5683], IE: [53.3498, -6.2603], RU: [55.7558, 37.6173],
  UA: [50.4501, 30.5234], RO: [44.4268, 26.1025], BG: [42.6977, 23.3219],
  HU: [47.4979, 19.0402], CZ: [50.0755, 14.4378], SK: [48.1486, 17.1077],
  US: [38.9072, -77.0369], CA: [45.4215, -75.6972], MX: [19.4326, -99.1332],
  BR: [-15.8267, -47.9218], AR: [-34.6037, -58.3816], CL: [-33.4489, -70.6693],
  AU: [-35.2809, 149.1300], NZ: [-41.2865, 174.7762], ZA: [-25.7479, 28.2293],
  NG: [9.0820, 8.6753], KE: [-1.2921, 36.8219], MA: [33.9716, -6.8498],
  TN: [36.8065, 10.1815], DZ: [36.7538, 3.0588], ET: [9.1450, 40.4897],
}

const COUNTRY_FLAGS: Record<string, string> = {
  AE: "🇦🇪", SY: "🇸🇾", SA: "🇸🇦", KW: "🇰🇼", QA: "🇶🇦", OM: "🇴🇲", BH: "🇧🇭", JO: "🇯🇴",
  EG: "🇪🇬", LB: "🇱🇧", IQ: "🇮🇶", TR: "🇹🇷", IN: "🇮🇳", PK: "🇵🇰", PH: "🇵🇭", MY: "🇲🇾",
  CN: "🇨🇳", JP: "🇯🇵", KR: "🇰🇷", GB: "🇬🇧", FR: "🇫🇷", DE: "🇩🇪", IT: "🇮🇹", ES: "🇪🇸",
  US: "🇺🇸", CA: "🇨🇦", AU: "🇦🇺", BR: "🇧🇷", RU: "🇷🇺", NL: "🇳🇱",
}

type Marker = { location: [number, number]; size: number; label: string; count: number }

export function VisitorGlobe({ days = 30, scope = "vendor" }: { days?: number; scope?: "vendor" | "admin" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(0)
  const interactingRef = useRef(false)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [topCountries, setTopCountries] = useState<Array<{ code: string; name?: string; count: number }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [view, setView] = useState<"globe" | "map">("globe")

  // Fetch real geography data
  useEffect(() => {
    setLoading(true)
    fetch(`${API}/${scope}/analytics/geography?days=${days}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.countries) { setError("No data"); return }
        setTopCountries(d.countries)
        const max = Math.max(1, ...d.countries.map((c: any) => c.count))
        const mks: Marker[] = d.countries
          .map((c: any) => {
            const coord = COUNTRY_COORDS[c.code]
            if (!coord) return null
            return {
              location: coord,
              size: 0.03 + (c.count / max) * 0.08,
              label: c.name || c.code,
              count: c.count,
            }
          })
          .filter(Boolean) as Marker[]
        setMarkers(mks)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [days, scope])

  // Cobe globe rendering
  useEffect(() => {
    if (view !== "globe" || !canvasRef.current || loading) return
    const canvas = canvasRef.current
    const width = canvas.offsetWidth
    let phi = phiRef.current
    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.2,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.15, 0.32, 0.69],   // brand blue tint
      markerColor: [0.95, 0.65, 0.05], // amber for markers
      glowColor: [0.15, 0.32, 0.69],
      markers: markers.map(m => ({ location: m.location, size: m.size })),
      onRender: (state: any) => {
        if (!interactingRef.current) phi += 0.003
        state.phi = phi
        state.width = width * 2
        state.height = width * 2
      },
    })
    // Pause rotation on hover
    const onEnter = () => { interactingRef.current = true }
    const onLeave = () => { interactingRef.current = false }
    canvas.addEventListener("mouseenter", onEnter)
    canvas.addEventListener("mouseleave", onLeave)
    return () => {
      globe.destroy()
      canvas.removeEventListener("mouseenter", onEnter)
      canvas.removeEventListener("mouseleave", onLeave)
      phiRef.current = phi
    }
  }, [markers, view, loading])

  return (
    <div className="bg-gradient-to-br from-[#06070a] via-[#0a0c15] to-[#0e1430] rounded-2xl overflow-hidden border border-ui-border-base relative">
      {/* Header + toggle */}
      <div className="p-5 flex items-center justify-between flex-wrap gap-3 border-b border-white/10">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50 font-bold mb-1">Real-time visitor map</div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">🌍 Where your customers are</h2>
          <div className="text-xs text-white/60 mt-1">Last {days} days · {topCountries.length} countries · {topCountries.reduce((s, c) => s + c.count, 0).toLocaleString()} events</div>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-lg p-1 flex">
          <button onClick={() => setView("globe")} className={`px-3 py-1.5 text-xs font-semibold rounded transition ${view === "globe" ? "bg-white text-[#0e1430]" : "text-white/70 hover:text-white"}`}>🌍 Globe</button>
          <button onClick={() => setView("map")} className={`px-3 py-1.5 text-xs font-semibold rounded transition ${view === "map" ? "bg-white text-[#0e1430]" : "text-white/70 hover:text-white"}`}>🗺️ Map</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-0">
        {/* GLOBE / MAP visualization */}
        <div className="relative aspect-square lg:aspect-auto lg:min-h-[420px] flex items-center justify-center p-4">
          {loading ? (
            <div className="text-white/50 text-sm flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Loading…</div>
          ) : error ? (
            <div className="text-white/40 text-sm text-center">
              <div className="text-3xl mb-2 opacity-60">🌍</div>
              <div>{error}</div>
            </div>
          ) : markers.length === 0 ? (
            <div className="text-white/40 text-sm text-center max-w-[260px]">
              <div className="text-5xl mb-2 opacity-60">🌍</div>
              <div className="text-base text-white/80 font-semibold mb-1">No visitor activity yet</div>
              <div className="text-xs">Markers appear here when customers from any country contact you.</div>
            </div>
          ) : view === "globe" ? (
            <canvas ref={canvasRef} className="w-full max-w-[420px] aspect-square" style={{ contain: "layout paint size" }}/>
          ) : (
            <FlatMap markers={markers}/>
          )}
        </div>

        {/* Top countries list */}
        <div className="border-t lg:border-t-0 lg:border-l border-white/10 p-5 max-h-[480px] overflow-y-auto">
          <div className="text-xs uppercase tracking-widest text-white/50 font-bold mb-3">Top Countries</div>
          {topCountries.length === 0 ? (
            <div className="text-white/40 text-xs">No countries yet</div>
          ) : (
            <ul className="space-y-2">
              {topCountries.slice(0, 12).map((c, i) => {
                const max = Math.max(1, ...topCountries.map(x => x.count))
                const pct = (c.count / max) * 100
                return (
                  <li key={c.code} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-white/40 text-xs w-5">{i + 1}</span>
                        <span className="text-lg">{COUNTRY_FLAGS[c.code] || "🏳️"}</span>
                        <span className="text-sm text-white/90 truncate">{c.name || c.code}</span>
                      </div>
                      <span className="text-sm font-bold text-white tabular-nums">{c.count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-400 to-amber-400" style={{ width: `${pct}%` }}/>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple SVG flat-map projection (equirectangular)
function FlatMap({ markers }: { markers: Marker[] }) {
  const W = 800, H = 400
  // Project [lat, lon] to [x, y]
  const project = (lat: number, lon: number): [number, number] => {
    const x = (lon + 180) * (W / 360)
    const y = (90 - lat) * (H / 180)
    return [x, y]
  }
  const max = Math.max(1, ...markers.map(m => m.count))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Background ocean */}
      <rect width={W} height={H} fill="url(#ocean)"/>
      <defs>
        <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1740"/>
          <stop offset="100%" stopColor="#050a1f"/>
        </linearGradient>
        <radialGradient id="dot">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0"/>
        </radialGradient>
      </defs>
      {/* Continents — simplified rectangles for visual reference */}
      <g fill="#1b2658" opacity="0.5">
        {/* North America */}
        <path d="M 80 70 L 220 70 L 240 200 L 100 230 Z"/>
        {/* South America */}
        <path d="M 180 220 L 260 220 L 250 350 L 200 360 Z"/>
        {/* Europe */}
        <path d="M 360 70 L 440 60 L 440 140 L 360 150 Z"/>
        {/* Africa */}
        <path d="M 370 160 L 460 160 L 470 300 L 380 310 Z"/>
        {/* Asia */}
        <path d="M 460 60 L 700 70 L 720 220 L 480 200 Z"/>
        {/* Australia */}
        <path d="M 620 280 L 720 280 L 720 340 L 620 340 Z"/>
      </g>
      {/* Markers */}
      {markers.map((m, i) => {
        const [x, y] = project(m.location[0], m.location[1])
        const r = 5 + (m.count / max) * 15
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r + 8} fill="url(#dot)"/>
            <circle cx={x} cy={y} r={r} fill="#fbbf24"/>
            <circle cx={x} cy={y} r={r} fill="none" stroke="#fde68a" strokeWidth="1.5">
              <animate attributeName="r" from={r} to={r + 12} dur="1.5s" begin={`${i * 0.1}s`} repeatCount="indefinite"/>
              <animate attributeName="opacity" from="1" to="0" dur="1.5s" begin={`${i * 0.1}s`} repeatCount="indefinite"/>
            </circle>
          </g>
        )
      })}
    </svg>
  )
}
