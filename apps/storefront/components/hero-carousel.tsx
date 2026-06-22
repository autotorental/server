"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"

// Fallback photos (shown while video loads or on low-bandwidth)
const PHOTOS = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80&auto=format",  // Porsche on road
  "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=80&auto=format",  // Lamborghini
  "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=1600&q=80&auto=format",  // Mercedes
  "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1600&q=80&auto=format",  // Land Cruiser
]

// Free car rental promo videos (Pexels - royalty-free)
const VIDEOS = [
  "https://videos.pexels.com/video-files/4611463/4611463-hd_1920_1080_25fps.mp4",  // Luxury car driving
  "https://videos.pexels.com/video-files/4065451/4065451-uhd_2560_1440_30fps.mp4", // Sports car night
]

const ROTATE_MS = 7000

export default function HeroCarousel() {
  const [idx, setIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoIdx, setVideoIdx] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIdx(i => (i + 1) % PHOTOS.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [paused])

  // Switch video every 15 seconds
  useEffect(() => {
    const t = setInterval(() => setVideoIdx(i => (i + 1) % VIDEOS.length), 15000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Photo slideshow (always present as fallback/background) */}
      {PHOTOS.map((p, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-[1800ms] ease-in-out ${
            i === idx && !videoLoaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={p}
            alt=""
            priority={i === 0}
            fill
            sizes="100vw"
            className={`object-cover ${i === idx ? "animate-kenburns" : ""}`}
            style={{ animationDuration: `${ROTATE_MS + 2000}ms` }} quality={85}
          />
        </div>
      ))}

      {/* Video background — loads silently, replaces photos when ready */}
      <video
        ref={videoRef}
        key={VIDEOS[videoIdx]}
        src={VIDEOS[videoIdx]}
        autoPlay
        muted
        loop={false}
        playsInline
        preload="auto"
        onCanPlay={() => setVideoLoaded(true)}
        onError={() => setVideoLoaded(false)}
        onEnded={() => setVideoIdx(i => (i + 1) % VIDEOS.length)}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${
          videoLoaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Dual gradient overlay for legibility — slightly stronger for video */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-ink-950/50 to-ink-950/10"/>
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-ink-950/15"/>

      {/* Slide indicators */}
      {!videoLoaded && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {PHOTOS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="relative h-1 rounded-full bg-white/40 overflow-hidden transition-all hover:bg-white/60"
              style={{ width: i === idx ? 56 : 16 }}
            >
              {i === idx && (
                <div
                  key={`${idx}-${paused ? "p" : "r"}`}
                  className="absolute inset-0 bg-white rounded-full"
                  style={{
                    transformOrigin: "left center",
                    transform: "scaleX(0)",
                    animation: paused ? "none" : `hero-progress ${ROTATE_MS}ms linear forwards`,
                  }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes hero-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes kenburns {
          from { transform: scale(1.00); }
          to   { transform: scale(1.06); }
        }
        :global(.animate-kenburns) {
          animation-name: kenburns;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  )
}
