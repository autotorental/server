import { useEffect, useRef, useState } from "react"
import { API } from "../lib/api"

// Country code → readable name (common ones; falls back to the code)
const COUNTRY: Record<string, string> = {
  AE: "UAE", US: "USA", GB: "UK", SG: "Singapore", CN: "China", SA: "Saudi Arabia",
  IN: "India", PK: "Pakistan", EG: "Egypt", SY: "Syria", QA: "Qatar", KW: "Kuwait",
  OM: "Oman", BH: "Bahrain", JO: "Jordan", LB: "Lebanon", TR: "Turkey", DE: "Germany",
  FR: "France", ES: "Spain", IT: "Italy", NL: "Netherlands", RU: "Russia", CA: "Canada",
  AU: "Australia", JP: "Japan", KR: "South Korea", BR: "Brazil", ID: "Indonesia",
  MY: "Malaysia", PH: "Philippines", TH: "Thailand", NG: "Nigeria", ZA: "South Africa",
  MA: "Morocco", DZ: "Algeria", TN: "Tunisia", IQ: "Iraq", YE: "Yemen", SD: "Sudan",
}
function countryName(cc?: string) {
  if (!cc || cc === "??") return "Unknown"
  return COUNTRY[cc.toUpperCase()] || cc.toUpperCase()
}
function flagEmoji(cc?: string) {
  if (!cc || cc.length !== 2 || cc === "??") return "🌍"
  const A = 0x1f1e6
  return String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65, A + cc.toUpperCase().charCodeAt(1) - 65)
}
// Turn a URL path into a human phrase: /cars/city/dubai → "Cars in Dubai"
function humanize(path?: string) {
  if (!path || path === "/") return "the homepage"
  path = path.split("?")[0]
  let segs = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
  if (["ar","es","zh","th","ru","ur"].includes(segs[0])) segs = segs.slice(1)
  const titled = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  if (segs[0] === "cars" && segs[1] === "city" && segs[2]) return `Cars in ${titled(segs[2])}`
  if (segs[0] === "cars" && segs[1] === "brand" && segs[2]) return `${titled(segs[2])} cars`
  if (segs[0] === "vehicle" && segs[segs.length - 1]) return `a car listing`
  if (segs[0] === "cars") return "the Cars page"
  if (segs[0] === "blog") return segs[1] ? `a blog post` : "the Blog"
  if (segs[0] === "company" || segs[0] === "rental") return "a rental company page"
  return titled(segs[segs.length - 1])
}
const devIcon = (d?: string) => (d === "mobile" ? "📱" : d === "tablet" ? "📲" : "💻")

function headline(ev: any) {
  return `${flagEmoji(ev.country)} New visitor from ${countryName(ev.country)} ${devIcon(ev.device)} — viewing ${ev.label || humanize(ev.path)}`
}

export default function LiveTicker({ big = false }: { big?: boolean }) {
  const [items, setItems] = useState<string[]>([])
  const [today, setToday] = useState(0)
  const [live, setLive] = useState(0)
  const timer = useRef<any>(null)

  async function load() {
    try {
      const r = await fetch(`${API}/admin/analytics/live`, { credentials: "include" })
      if (!r.ok) return
      const d = await r.json()
      const recent = Array.isArray(d?.recent) ? d.recent : []
      const heads = recent.map(headline)
      // headline rotation prefix: visitors today + active now
      setItems(heads)
      setToday(Number(d?.visitors_today ?? d?.views_today ?? 0))
      setLive(Number(d?.active_now ?? d?.online ?? 0))
    } catch {}
  }

  useEffect(() => {
    load()
    timer.current = setInterval(load, 5000)
    return () => clearInterval(timer.current)
  }, [])

  if (!items.length) return null
  const loop = [...items, ...items] // duplicate for seamless infinite scroll
  const duric = Math.max(24, items.length * 6) // seconds

  return (
    <div className={"atr-ticker" + (big ? " big" : "")}>
      <style>{`
        .atr-ticker{display:flex;align-items:center;gap:0;overflow:hidden;border-radius:12px;
          background:linear-gradient(90deg,#0b1f3a,#0e2a52);border:1px solid rgba(56,132,255,.25);
          box-shadow:0 1px 3px rgba(0,0,0,.25);height:42px;position:relative}
        .atr-ticker .badge{display:flex;align-items:center;gap:6px;height:100%;padding:0 14px;
          background:#dc2626;color:#fff;font-weight:800;font-size:12px;letter-spacing:.06em;flex:none;z-index:2}
        .atr-ticker .badge .dot{width:8px;height:8px;border-radius:50%;background:#fff;animation:atr-pulse 1.1s infinite}
        .atr-ticker .stat{display:flex;align-items:center;gap:6px;height:100%;padding:0 14px;flex:none;
          background:rgba(255,255,255,.06);color:#cfe0ff;font-size:12px;font-weight:700;z-index:2}
        .atr-ticker .marq{flex:1;overflow:hidden;position:relative;height:100%}
        .atr-ticker .track{display:flex;align-items:center;height:100%;white-space:nowrap;
          animation:atr-scroll var(--dur,40s) linear infinite;will-change:transform}
        .atr-ticker .track:hover{animation-play-state:paused}
        .atr-ticker .it{color:#eaf2ff;font-size:13px;font-weight:600;padding:0 4px}
        .atr-ticker .sep{color:#3b82f6;padding:0 14px;font-size:10px;opacity:.8}
        @keyframes atr-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes atr-pulse{0%,100%{opacity:1}50%{opacity:.25}}
        /* Broadcast (fullscreen) variant — big-company look */
        .atr-ticker.big{height:68px;border-radius:0;border:none;border-top:2px solid rgba(56,132,255,.5);
          background:linear-gradient(90deg,#06122a 0%,#0a2148 50%,#06122a 100%);
          box-shadow:0 -8px 30px rgba(0,0,0,.45)}
        .atr-ticker.big .badge{font-size:18px;padding:0 26px;letter-spacing:.12em}
        .atr-ticker.big .badge .dot{width:12px;height:12px}
        .atr-ticker.big .stat{font-size:18px;padding:0 26px;color:#dcebff}
        .atr-ticker.big .it{font-size:22px;font-weight:700}
        .atr-ticker.big .sep{font-size:14px;padding:0 26px}
      `}</style>
      <div className="badge"><span className="dot" /> LIVE</div>
      <div className="stat">🌍 {today.toLocaleString()} today{live ? ` · ${live} online` : ""}</div>
      <div className="marq">
        <div className="track" style={{ ["--dur" as any]: `${duric}s` }}>
          {loop.map((t, i) => (
            <span key={i} className="it">{t}<span className="sep">◆</span></span>
          ))}
        </div>
      </div>
    </div>
  )
}
