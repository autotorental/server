"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

const CAROUSEL_IMAGES = [
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80&auto=format",
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80&auto=format",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80&auto=format",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80&auto=format",
]

export default function MonthlyDealsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const imagesCount = CAROUSEL_IMAGES.length

  useEffect(() => {
    if (imagesCount <= 1) return

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % imagesCount)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [imagesCount])

  const goNext = () => setActiveIndex((prev) => (prev + 1) % imagesCount)
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + imagesCount) % imagesCount)

  return (
    <div className="relative h-full w-full float-frame">
      <div className="absolute inset-0">
        {CAROUSEL_IMAGES.map((src, idx) => (
          <div
            key={src}
            aria-hidden={idx !== activeIndex}
            className={[
              "absolute inset-0 transition-all duration-700 ease-out",
              idx === activeIndex
                ? "opacity-100 scale-[1.06]"
                : "opacity-0 scale-100 pointer-events-none",
            ].join(" ")}
          >
            <Image src={src} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" quality={85}/>
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />

      <button
        type="button"
        onClick={goPrev}
        aria-label="Previous image"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/35 text-white hover:bg-black/55 transition flex items-center justify-center"
      >
        <span aria-hidden="true">‹</span>
      </button>

      <button
        type="button"
        onClick={goNext}
        aria-label="Next image"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-black/35 text-white hover:bg-black/55 transition flex items-center justify-center"
      >
        <span aria-hidden="true">›</span>
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {CAROUSEL_IMAGES.map((_, idx) => (
          <button
            key={`dot-${idx}`}
            type="button"
            onClick={() => setActiveIndex(idx)}
            aria-label={`Go to image ${idx + 1}`}
            className={[
              "h-2.5 rounded-full transition-all",
              idx === activeIndex ? "w-6 bg-white dark:bg-ink-900" : "w-2.5 bg-white dark:bg-ink-900/55 hover:bg-white dark:bg-ink-900/80",
            ].join(" ")}
          />
        ))}
      </div>

      <style jsx>{`
        .float-frame {
          animation: subtleFloat 8s ease-in-out infinite;
        }
        @keyframes subtleFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  )
}
