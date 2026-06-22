"use client"

import { ReactNode, useRef, useState } from "react"
import { useRouter } from "next/navigation"

// Tinder-style draggable profile card for touch devices: the whole profile
// follows the finger and tilts; flinging past the threshold animates it off
// screen and routes to the prev/next company. Vertical scrolling is preserved.
export default function CompanySwipeShell({
  prevHref,
  nextHref,
  children,
}: {
  prevHref?: string
  nextHref?: string
  children: ReactNode
}) {
  const router = useRouter()
  const [dx, setDx] = useState(0)
  const [animate, setAnimate] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const horizontal = useRef(false)

  const onStart = (e: React.TouchEvent) => {
    const el = e.target as Element | null
    if (el && el.closest("a,button,input,textarea,select,iframe,[role=tablist],.overflow-x-auto,.no-swipe")) {
      start.current = null
      return
    }
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    horizontal.current = false
    setAnimate(false)
  }

  const onMove = (e: React.TouchEvent) => {
    if (!start.current) return
    const x = e.touches[0].clientX - start.current.x
    const y = e.touches[0].clientY - start.current.y
    if (!horizontal.current) {
      if (Math.abs(x) < 12 && Math.abs(y) < 12) return
      horizontal.current = Math.abs(x) > Math.abs(y)
      if (!horizontal.current) { start.current = null; return } // vertical → let it scroll
    }
    // Resist swiping toward a side that has no neighbour.
    const damped = (x < 0 && !nextHref) || (x > 0 && !prevHref) ? x * 0.25 : x
    setDx(damped)
  }

  const onEnd = () => {
    if (!start.current) return
    start.current = null
    setAnimate(true)
    const threshold = 110
    if (dx <= -threshold && nextHref) {
      setDx(-(typeof window !== "undefined" ? window.innerWidth : 800))
      setTimeout(() => router.push(nextHref), 170)
    } else if (dx >= threshold && prevHref) {
      setDx(typeof window !== "undefined" ? window.innerWidth : 800)
      setTimeout(() => router.push(prevHref), 170)
    } else {
      setDx(0)
    }
  }

  const rot = Math.max(-12, Math.min(12, dx / 16))

  return (
    <div
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
      style={{
        transform: `translateX(${dx}px) rotate(${rot}deg)`,
        transition: animate ? "transform .17s ease-out" : "none",
        touchAction: "pan-y",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  )
}
