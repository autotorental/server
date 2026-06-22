"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Lets visitors slide / swipe left-right between rental company profiles,
// with prev/next arrows on desktop and swipe gestures on touch devices.
export default function CompanyNav({
  prevHref,
  prevName,
  nextHref,
  nextName,
}: {
  prevHref?: string
  prevName?: string
  nextHref?: string
  nextName?: string
}) {
  const router = useRouter()
  const startX = useRef(0)
  const startY = useRef(0)
  const tracking = useRef(false)

  // Prefetch neighbours for instant slide.
  useEffect(() => {
    if (prevHref) router.prefetch(prevHref)
    if (nextHref) router.prefetch(nextHref)
  }, [prevHref, nextHref, router])


  const arrowCls =
    "fixed top-1/2 -translate-y-1/2 z-40 w-11 h-11 items-center justify-center rounded-full bg-white/90 dark:bg-ink-900/90 backdrop-blur border border-ink-200 dark:border-ink-700 shadow-lg text-ink-700 dark:text-ink-200 hover:bg-brand-600 hover:text-white hover:border-brand-600 transition"

  return (
    <>
      {prevHref && (
        <Link href={prevHref} prefetch aria-label={prevName ? `Previous company: ${prevName}` : "Previous company"} title={prevName} className={`hidden md:flex left-3 ${arrowCls}`}>
          <ChevronLeft size={22} />
        </Link>
      )}
      {nextHref && (
        <Link href={nextHref} prefetch aria-label={nextName ? `Next company: ${nextName}` : "Next company"} title={nextName} className={`hidden md:flex right-3 ${arrowCls}`}>
          <ChevronRight size={22} />
        </Link>
      )}

      {/* Mobile: floating prev/next pills (swipe also works) */}
      {(prevHref || nextHref) && (
        <div className="md:hidden fixed bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto bg-ink-900/80 text-white backdrop-blur rounded-full px-2 py-1.5 shadow-xl">
            {prevHref && <Link href={prevHref} prefetch aria-label="Previous company" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 transition"><ChevronLeft size={20} /></Link>}
            <span className="text-[11px] font-semibold px-1 opacity-90">Swipe</span>
            {nextHref && <Link href={nextHref} prefetch aria-label="Next company" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/15 transition"><ChevronRight size={20} /></Link>}
          </div>
        </div>
      )}
    </>
  )
}
