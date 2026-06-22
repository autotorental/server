"use client"
import { useEffect, useState } from "react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

type Item = { kind: string; emoji: string; text: string; text_ar?: string; link?: string | null }

// Live activity marquee: real events (cars added, discounts, new companies,
// people browsing now) blended with admin-authored news from /store/ticker.
export default function ActivityTicker({ locale = "en" }: { locale?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const isAr = locale === "ar" || locale === "ur"

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const r = await fetch(`${API}/store/ticker`, { headers: { "x-publishable-api-key": KEY } })
        if (!r.ok) return
        const d = await r.json()
        if (alive && Array.isArray(d?.items) && d.items.length) setItems(d.items)
      } catch { /* ignore */ }
    }
    load()
    const t = setInterval(load, 45000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  if (!items.length) return null
  const txt = (it: Item) => (isAr && it.text_ar ? it.text_ar : it.text)
  const loop = [...items, ...items]
  const dur = Math.max(22, items.length * 2.4) // ~2x faster, clearly-visible scroll

  return (
    <div className="atrtk" dir="ltr" aria-label="Live activity">
      <div className="atrtk-live"><span className="atrtk-dot" />{isAr ? "مباشر" : "LIVE"}</div>
      <div className="atrtk-mask">
        <div className="atrtk-move" style={{ animationDuration: `${dur}s` }}>
          {loop.map((it, i) => {
            const body = <><span className="atrtk-e">{it.emoji}</span>{txt(it)}</>
            return it.link
              ? <a key={i} href={it.link} className="atrtk-i atrtk-link">{body}</a>
              : <span key={i} className="atrtk-i">{body}</span>
          })}
        </div>
      </div>
      <style>{`
        .atrtk{display:flex;align-items:center;background:linear-gradient(90deg,#0a1428,#0d1f44,#0a1428);color:#fff;height:42px;overflow:hidden;position:relative;z-index:11;border-top:1px solid rgba(255,255,255,.07);border-bottom:1px solid rgba(255,255,255,.07)}
        .atrtk-live{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.12em;background:#dc2626;color:#fff;height:100%;padding:0 13px;flex-shrink:0;text-transform:uppercase}
        .atrtk-dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:atrtkpulse 1.2s infinite}
        @keyframes atrtkpulse{0%,100%{opacity:1}50%{opacity:.2}}
        .atrtk-mask{flex:1;overflow:hidden;position:relative;-webkit-mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent);mask-image:linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)}
        .atrtk-move{display:inline-flex;align-items:center;white-space:nowrap;animation-name:atrtkscroll;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}
        .atrtk:hover .atrtk-move{animation-play-state:paused}
        @keyframes atrtkscroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .atrtk-i{display:inline-flex;align-items:center;gap:7px;font-size:13.5px;font-weight:500;color:rgba(255,255,255,.92);padding:0 22px;border-right:1px solid rgba(255,255,255,.09)}
        .atrtk-e{font-size:15px;line-height:1}
        .atrtk-link{text-decoration:none;transition:color .15s}
        .atrtk-link:hover{color:#7fb2ff}
      `}</style>
    </div>
  )
}
