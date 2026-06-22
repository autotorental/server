"use client"
import { useEffect, useState } from "react"
import { X } from "lucide-react"

function getCookie(k: string) {
  if (typeof document === "undefined") return ""
  const m = document.cookie.match(new RegExp(`${k}=([^;]+)`))
  return m?.[1] || ""
}
function setCookie(k: string, v: string, days = 365) {
  document.cookie = `${k}=${v}; path=/; max-age=${days * 86400}; SameSite=Lax`
}

export default function ConsentBanner() {
  const [show, setShow] = useState(false)
  useEffect(() => { if (!getCookie("cookie_consent")) setShow(true) }, [])

  if (!show) return null

  const choose = (value: "all" | "essential") => {
    setCookie("cookie_consent", value)
    setShow(false)
    // Reload so tracking scripts load (only if 'all')
    if (value === "all") window.location.reload()
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 bg-white dark:bg-ink-900 rounded-2xl shadow-2xl border border-ink-100 dark:border-ink-800 p-5">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🍪</div>
        <div className="flex-1">
          <div className="font-bold text-ink-900 dark:text-ink-100 mb-1">We use cookies</div>
          <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
            We use essential cookies to make the site work. With your consent, we also use analytics and advertising cookies (Google, Meta, TikTok) to improve your experience and show you relevant ads.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button onClick={() => choose("all")} className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm flex-1">
              Accept all
            </button>
            <button onClick={() => choose("essential")} className="border border-ink-200 dark:border-ink-700 hover:border-ink-400 text-ink-700 dark:text-ink-300 font-medium px-4 py-2.5 rounded-lg text-sm flex-1">
              Essential only
            </button>
          </div>
          <a href="/privacy" className="text-xs text-ink-500 hover:text-brand-600 mt-2 inline-block">Privacy policy</a>
        </div>
        <button onClick={() => choose("essential")} className="text-ink-400 hover:text-ink-700 dark:text-ink-300"><X size={18}/></button>
      </div>
    </div>
  )
}
