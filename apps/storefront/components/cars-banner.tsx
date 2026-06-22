"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"

// Optimize Contentful URLs (smaller WebP -> instant load)
const opt = (url: string, w = 1600) => {
  if (!url.includes("images.ctfassets.net")) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}w=${w}&fm=webp&q=80`
}

const SLIDES = [
  { img: "https://images.ctfassets.net/s23t570kxhs5/62xYCOsojZp8A7nAeE2fzm/c4b675af8f27b5222515754a92b97c5c/Lamborghini_Revuelto_2024_-_Photo_23.JPG",
    brand: "Lamborghini", title: "Revuelto 2024", badge: "🔥 Hot",
    gradient: "from-orange-900/80 via-red-950/60 to-transparent" },
  { img: "https://images.ctfassets.net/s23t570kxhs5/HoOQ95LeVVfaziIPT45OG/557cf4ae4745e3273d136a761e71029f/mercedes-amg-g63-final-1748334378243-0.jpg",
    brand: "Mercedes-AMG", title: "G63 White 2025", badge: "⭐ Premium",
    gradient: "from-zinc-900/80 via-slate-950/60 to-transparent" },
  { img: "https://images.ctfassets.net/s23t570kxhs5/7uUqyygguzWT0BQorPtA4R/c8f0d62431179a8e0ac82d5186b8ae0d/Mercedes-AMG_G63_Matte_Black_2025_-_Photo_7.JPG",
    brand: "Mercedes-AMG", title: "G63 Black 2025", badge: "🖤 Matte",
    gradient: "from-slate-900/90 via-zinc-950/70 to-transparent" },
  { img: "https://images.ctfassets.net/s23t570kxhs5/5nRb8hzGmePXhZXR5uj4lw/ef02d470413a2aee142c72efd4ec175c/Nissan_Patrol_Grey_2025_-_Photo_1.JPG",
    brand: "Nissan", title: "Patrol Grey 2025", badge: "🏔️ Power",
    gradient: "from-stone-900/80 via-neutral-950/60 to-transparent" },
  { img: "https://images.ctfassets.net/s23t570kxhs5/7DFz6ojntMZnCLZKkxKI5H/dc4669d00d01e2a07eb155cae8de93ec/mercedes-amg-sl55-2022-2.jpg",
    brand: "Mercedes-AMG", title: "SL 55 2022", badge: "💎 Luxury",
    gradient: "from-blue-950/80 via-indigo-950/60 to-transparent" },
]

const STATS = [
  { n: "50+", label: "Luxury Cars" },
  { n: "0%",  label: "Commission" },
  { n: "24/7", label: "Support" },
  { n: "4.9★", label: "Rating" },
]

const INTERVAL_MS = 3800

export default function CarsBanner({ countryName, total }: { countryName: string; total: number }) {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchRef = useRef<{ x: number; t: number } | null>(null)

  // Auto-advance — always running unless user is hovering
  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), INTERVAL_MS)
    return () => clearInterval(t)
  }, [paused])

  // Preload next slide so it's ready before fade-in
  useEffect(() => {
    const next = (idx + 1) % SLIDES.length
    const img = new window.Image()
    img.src = opt(SLIDES[next].img)
  }, [idx])

  const goTo = (i: number) => setIdx(i)
  const prev = () => setIdx(i => (i - 1 + SLIDES.length) % SLIDES.length)
  const next = () => setIdx(i => (i + 1) % SLIDES.length)
  const cur = SLIDES[idx]

  return (
    <div
      className="relative overflow-hidden rounded-2xl mb-6 h-52 md:h-64 lg:h-72 shadow-xl bg-ink-900"
      style={{ touchAction: "pan-y" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchRef.current = { x: e.touches[0].clientX, t: Date.now() } }}
      onTouchEnd={(e) => {
        if (!touchRef.current) return
        const dx = e.changedTouches[0].clientX - touchRef.current.x
        const dt = Date.now() - touchRef.current.t
        touchRef.current = null
        if (dt < 800 && Math.abs(dx) > 30) {
          if (dx < 0) next(); else prev()
        }
      }}
    >
      {/* ALL slides stacked — only the active one is opacity:1. True cross-fade. */}
      {SLIDES.map((s, i) => {
        const active = i === idx
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-[900ms] ease-in-out"
            style={{ opacity: active ? 1 : 0, zIndex: active ? 10 : 5 }}
            aria-hidden={!active}
          >
            <Image
              src={opt(s.img)}
              alt={s.title}
              fill
              sizes="100vw"
              priority
              className={`object-cover ${active ? "scale-110" : "scale-100"} transition-transform ease-linear`}
              style={{ transitionDuration: `${INTERVAL_MS + 1000}ms` }} quality={85}
            />
            <div className={`absolute inset-0 bg-gradient-to-r ${s.gradient}`} />
          </div>
        )
      })}

      {/* Content overlay (uses current slide) */}
      <div className="absolute inset-0 z-30 flex flex-col justify-between p-5 md:p-7 pointer-events-none">
        <div className="flex items-start justify-between">
          <div className="transition-all duration-500" key={`txt-${idx}`} style={{ animation: "slideUp 500ms ease-out" }}>
            <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/30 mb-2">
              {cur.badge}
            </span>
            <div className="text-white/70 text-xs font-semibold tracking-widest uppercase">{cur.brand}</div>
            <div className="text-white text-xl md:text-2xl font-black leading-tight drop-shadow-lg">{cur.title}</div>
          </div>
          <div className="hidden md:flex gap-2">
            {STATS.map(s => (
              <div key={s.n} className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 text-center border border-white/20">
                <div className="text-white font-black text-sm">{s.n}</div>
                <div className="text-white/70 text-[10px]">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between pointer-events-auto">
          <div>
            <div className="text-white/80 text-sm font-medium drop-shadow">
              {total > 0 ? `${total} cars available in ${countryName}` : `Luxury fleet in ${countryName}`}
            </div>
            <div className="text-white/50 text-xs mt-0.5">No booking fee · Direct contact</div>
          </div>
          <div className="flex items-center gap-1.5">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} aria-label={`slide ${i + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  i === idx ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar — visual proof it's a carousel */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-30">
        <div
          key={`bar-${idx}-${paused}`}
          className="h-full bg-white/80"
          style={{
            animation: paused ? "none" : `progress ${INTERVAL_MS}ms linear forwards`,
          }}
        />
      </div>

      {/* Arrows */}
      <button onClick={prev} aria-label="previous"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white text-lg flex items-center justify-center hover:bg-black/70 transition opacity-60 hover:opacity-100">‹</button>
      <button onClick={next} aria-label="next"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white text-lg flex items-center justify-center hover:bg-black/70 transition opacity-60 hover:opacity-100">›</button>

      <style jsx>{`
        @keyframes progress { from { width: 0% } to { width: 100% } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
