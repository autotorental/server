"use client"
import { useEffect, useState } from "react"
import { Heart, BellRing, Check } from "lucide-react"
import { trackEvent } from "./tracking"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const KEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

// Instagram gradient palette
const IG_GRADIENT = "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)"

function getDeviceId() {
  if (typeof localStorage === "undefined") return ""
  let id = localStorage.getItem("device_id")
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("device_id", id) }
  return id
}

export default function FollowButton({ sellerId, sellerName, variant = "default" }: { sellerId: string; sellerName?: string; variant?: "default" | "icon" | "lg" | "hero" }) {
  const [following, setFollowing] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [burst, setBurst] = useState(false)

  useEffect(() => {
    const localFollow = localStorage.getItem(`follow:${sellerId}`)
    if (localFollow === "1") setFollowing(true)
    fetch(`${API}/store/sellers/${sellerId}/follow?follower_device_id=${getDeviceId()}`, { headers: { "x-publishable-api-key": KEY } })
      .then(r => r.ok ? r.json() : null).then(d => {
        if (!d) return
        if (typeof d.count === "number") setCount(d.count)
        if (d.following || d.is_following) setFollowing(true)
      }).catch(() => {})
  }, [sellerId])

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    const next = !following
    setFollowing(next)
    if (next) { setBurst(true); setTimeout(() => setBurst(false), 700) }
    setCount(c => (c == null ? c : c + (next ? 1 : -1)))
    try {
      const method = next ? "POST" : "DELETE"
      const body = next ? JSON.stringify({ follower_device_id: getDeviceId() }) : undefined
      const res = await fetch(`${API}/store/sellers/${sellerId}/follow${next ? "" : `?follower_device_id=${getDeviceId()}`}`, {
        method, headers: { "x-publishable-api-key": KEY, "Content-Type": "application/json" }, body,
      })
      if (!res.ok) throw new Error()
      if (next) { localStorage.setItem(`follow:${sellerId}`, "1"); trackEvent("follow_company", { seller_id: sellerId, seller_name: sellerName }) }
      else localStorage.removeItem(`follow:${sellerId}`)
    } catch {
      setFollowing(!next)
      setCount(c => (c == null ? c : c + (next ? -1 : 1)))
    } finally { setLoading(false) }
  }

  if (variant === "icon") {
    return (
      <button onClick={toggle} disabled={loading} aria-label="follow"
        className={`w-11 h-11 inline-flex items-center justify-center rounded-xl border-2 transition ${following ? "bg-red-50 border-red-200 text-red-600" : "border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-400 hover:text-red-600 hover:border-red-300"}`}>
        <Heart size={18} fill={following ? "currentColor" : "none"}/>
      </button>
    )
  }
  if (variant === "hero") {
    return (
      <button onClick={toggle} disabled={loading}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg ${following ? "bg-white dark:bg-ink-900 text-red-600 border-2 border-red-500" : "bg-white dark:bg-ink-900 text-brand-600 hover:bg-amber-300 hover:text-ink-900 dark:text-ink-100 border-2 border-white"}`}>
        {following ? <Check size={16}/> : <Heart size={16} fill="currentColor" className="text-red-500"/>}
        <span>{following ? "Following" : "Follow"}</span>
        {count != null && count > 0 && <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-semibold">{count}</span>}
      </button>
    )
  }
  if (variant === "lg") {
    return (
      <button onClick={toggle} disabled={loading}
        className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition ${following ? "bg-red-50 text-red-600 border-2 border-red-200" : "bg-brand-600 hover:bg-brand-700 text-white shadow-lg"}`}>
        <Heart size={16} fill={following ? "currentColor" : "none"}/>
        {following ? "Following" : "Follow"}
        {count != null && count > 0 && <span className="text-xs opacity-80">· {count}</span>}
      </button>
    )
  }

  // ===== DEFAULT — Instagram-style with animation =====
  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-pressed={following}
      className={`fb-ig group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all duration-300 overflow-hidden active:scale-95 ${
        following ? "is-followed text-white shadow-md shadow-pink-500/30" : "hover:text-white hover:shadow-md hover:shadow-pink-500/40"
      }`}
      style={following ? { background: IG_GRADIENT } : { background: "transparent" }}
    >
      <span className="relative inline-flex items-center gap-1.5">
        {following ? (
          <BellRing size={12} className={burst ? "animate-bell-ring" : ""}/>
        ) : (
          <Heart size={12} fill="currentColor" className={burst ? "animate-heart-burst" : ""}/>
        )}
        <span>{following ? "Following" : "Follow"}</span>
        {count != null && count > 0 && <span className="opacity-80">{count}</span>}
      </span>

      {/* Floating hearts on first follow */}
      {burst && [-25, 0, 25].map((dx, i) => (
        <Heart
          key={i}
          size={8}
          fill="currentColor"
          aria-hidden
          className="absolute left-1/2 top-1/2 pointer-events-none text-pink-500 animate-heart-float"
          style={{
            transform: `translate(${dx}px, 0)`,
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}

      <style jsx global>{`
        /* Default (not following): no background, but icon + text painted with the Instagram gradient */
        .fb-ig:not(.is-followed) {
          background: transparent;
        }
        .fb-ig:not(.is-followed) > span:not([aria-hidden]) {
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .fb-ig:not(.is-followed) > span:not([aria-hidden]) svg {
          stroke: currentColor;
          color: #dc2743;
        }
        /* Hover: full gradient background, white text/icon */
        .fb-ig:not(.is-followed):hover {
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%) !important;
        }
        .fb-ig:not(.is-followed):hover > span:not([aria-hidden]) {
          background: none;
          -webkit-text-fill-color: white;
          color: white !important;
        }
        .fb-ig:not(.is-followed):hover > span:not([aria-hidden]) svg {
          color: white;
        }

        @keyframes heart-burst {
          0% { transform: scale(1); }
          30% { transform: scale(1.45); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes bell-ring {
          0%, 100% { transform: rotate(0); }
          20% { transform: rotate(-18deg); }
          40% { transform: rotate(16deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(6deg); }
        }
        @keyframes heart-float {
          0%   { opacity: 0; transform: translate(var(--dx, 0), 0) scale(0.6); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx, 0), -34px) scale(1.1); }
        }
        :global(.animate-heart-burst) { animation: heart-burst 600ms ease-out; }
        :global(.animate-bell-ring)   { animation: bell-ring 700ms ease-out; }
        :global(.animate-heart-float) { animation: heart-float 700ms ease-out forwards; }
      `}</style>
    </button>
  )
}
