"use client"
import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X, Maximize2, Pause, Play } from "lucide-react"
import { galleryUrl, zoomUrl, thumbUrl } from "@/lib/img-opt"

const AUTOROTATE_MS = 5000

export default function Gallery({ photos, alt = "Rental car" }: { photos: string[]; alt?: string }) {
  // Descriptive alt for each photo — good for Google Images SEO. e.g. "BMW X5 2023 for rent in Dubai — photo 2 of 8"
  const altFor = (i: number) => photos.length > 1 ? `${alt} — photo ${i + 1} of ${photos.length}` : alt
  const [idx, setIdx] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [paused, setPaused] = useState(false)
  const touch = useRef<{ x: number; t: number } | null>(null)

  // Auto-rotate, loops forever — pauses on hover, on zoom, when user pressed Pause
  useEffect(() => {
    if (paused || zoom || photos.length < 2) return
    const id = setInterval(() => {
      setIdx(i => (i + 1) % photos.length)
    }, AUTOROTATE_MS)
    return () => clearInterval(id)
  }, [paused, zoom, photos.length])

  // Keyboard nav when zoomed
  useEffect(() => {
    if (!zoom) return
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false)
      if (e.key === "ArrowRight") setIdx(i => (i + 1) % photos.length)
      if (e.key === "ArrowLeft") setIdx(i => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [zoom, photos.length])

  if (!photos || photos.length === 0) return null

  const next = () => setIdx(i => (i + 1) % photos.length)
  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length)

  // Track whether user is swiping so we can suppress the click→zoom modal.
  const swipingRef = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, t: Date.now() }
    swipingRef.current = false
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = Math.abs(e.touches[0].clientX - touch.current.x)
    if (dx > 10) swipingRef.current = true
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dt = Date.now() - touch.current.t
    touch.current = null
    if (dt < 800 && Math.abs(dx) > 30) {
      if (dx < 0) next(); else prev()
    }
    // Keep swiping flag true for 350ms so the subsequent synthetic click
    // (iOS fires click after touchend) is suppressed by the click handler.
    if (swipingRef.current) {
      setTimeout(() => { swipingRef.current = false }, 350)
    }
  }
  const onClickGuard = (e: React.MouseEvent) => {
    if (swipingRef.current) { e.preventDefault(); e.stopPropagation(); return }
    setZoom(true)
  }

  return (
    <>
      <div
        className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="relative aspect-[16/10] bg-ink-100 dark:bg-ink-800 cursor-zoom-in select-none"
          style={{ touchAction: "pan-y" }}
          onClick={onClickGuard}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Stacked images with cross-fade — keeps the loop animation smooth */}
          {photos.map((p, i) => (
            <img
              key={i}
              src={galleryUrl(p)}
              alt={altFor(i)}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                i === idx ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}

          {/* Top-right: pause/play + zoom */}
          <div className="absolute top-3 right-3 flex gap-2">
            {photos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setPaused(p => !p) }}
                aria-label={paused ? "Play" : "Pause"}
                title={paused ? "Resume slideshow" : "Pause slideshow"}
                className="w-10 h-10 bg-white dark:bg-ink-900/95 rounded-lg flex items-center justify-center text-ink-700 dark:text-ink-300 hover:text-brand-600 shadow"
              >
                {paused ? <Play size={16}/> : <Pause size={16}/>}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setZoom(true) }}
              aria-label="Zoom"
              className="w-10 h-10 bg-white dark:bg-ink-900/95 rounded-lg flex items-center justify-center text-ink-700 dark:text-ink-300 hover:text-brand-600 shadow"
            >
              <Maximize2 size={16}/>
            </button>
          </div>

          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                aria-label="Previous"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-ink-900/95 rounded-full flex items-center justify-center text-ink-700 dark:text-ink-300 hover:text-brand-600 shadow"
              >
                <ChevronLeft size={20}/>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                aria-label="Next"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white dark:bg-ink-900/95 rounded-full flex items-center justify-center text-ink-700 dark:text-ink-300 hover:text-brand-600 shadow"
              >
                <ChevronRight size={20}/>
              </button>

              {/* Counter + progress dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setIdx(i) }}
                    aria-label={`Go to photo ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-white dark:bg-ink-900" : "w-1.5 bg-white dark:bg-ink-900/50 hover:bg-white dark:bg-ink-900/80"}`}
                  />
                ))}
              </div>

              <div className="absolute bottom-3 right-3 bg-ink-950/70 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                {idx + 1} / {photos.length}
              </div>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="p-3 grid grid-cols-5 md:grid-cols-6 gap-2">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`View photo ${i + 1}`}
                className={`relative aspect-[4/3] rounded-lg overflow-hidden transition-all ${
                  i === idx ? "ring-2 ring-brand-600" : "ring-1 ring-ink-100 opacity-75 hover:opacity-100"
                }`}
              >
                <img src={thumbUrl(p)} alt={`${alt} — thumbnail ${i + 1}`} loading="lazy" className="w-full h-full object-cover"/>
              </button>
            ))}
          </div>
        )}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 bg-ink-950/95 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setZoom(false)}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <button className="absolute top-6 right-6 text-white hover:text-brand-300" onClick={() => setZoom(false)} aria-label="Close">
            <X size={28}/>
          </button>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                aria-label="Previous"
                className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-ink-900/15 hover:bg-white dark:bg-ink-900/25 rounded-full flex items-center justify-center text-white backdrop-blur"
              >
                <ChevronLeft size={28}/>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                aria-label="Next"
                className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white dark:bg-ink-900/15 hover:bg-white dark:bg-ink-900/25 rounded-full flex items-center justify-center text-white backdrop-blur"
              >
                <ChevronRight size={28}/>
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-ink-950/70 backdrop-blur-md text-white text-sm font-semibold px-3 py-1.5 rounded-lg">
                {idx + 1} / {photos.length}
              </div>
            </>
          )}
          <img
            src={zoomUrl(photos[idx])}
            alt={altFor(idx)}
            className="max-w-[95vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
