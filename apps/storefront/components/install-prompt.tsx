"use client"
import { useEffect, useState } from "react"
import { Download, Share, Plus, X, ChevronDown, Smartphone } from "lucide-react"

const DISMISS_KEY = "atr-install-dismissed"
const DISMISS_DAYS = 14

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}
function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches ||
         (navigator as any).standalone === true
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<"native" | "ios" | null>(null)

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    }
    if (isStandalone()) return
    try {
      const t = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10)
      if (t && Date.now() - t < DISMISS_DAYS * 86400_000) return
    } catch {}

    const onBefore = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      setMode("native")
      setTimeout(() => setOpen(true), 4000)
    }
    window.addEventListener("beforeinstallprompt", onBefore)
    if (isIOS()) {
      setMode("ios")
      setTimeout(() => setOpen(true), 8000)
    }
    return () => window.removeEventListener("beforeinstallprompt", onBefore)
  }, [])

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    const choice = await deferred.userChoice
    if (choice?.outcome === "accepted") { setOpen(false); setDeferred(null) }
  }
  const dismiss = () => {
    setOpen(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  if (!open || !mode) return null

  /* ─────────────────────────── ANDROID / DESKTOP NATIVE ─────────────────────────── */
  if (mode === "native") {
    return (
      <>
        <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:hidden atr-anim-up" role="dialog">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-[0_-10px_40px_-12px_rgba(0,0,0,0.25)] border border-ink-200 dark:border-ink-700 p-4">
            <div className="flex items-start gap-3">
              <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-xl shadow-md flex-shrink-0"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-ink-900 dark:text-white text-sm">Auto to Rental app</div>
                    <div className="text-xs text-ink-600 dark:text-ink-300 mt-0.5">Install on your phone — works offline.</div>
                  </div>
                  <button onClick={dismiss} aria-label="Close" className="text-ink-400 -mt-1 -mr-1 p-1"><X size={16}/></button>
                </div>
                <button onClick={install} className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm">
                  <Download size={16}/> Install app
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden sm:block fixed right-5 top-20 z-[100] w-[340px] atr-anim-down" role="dialog">
          <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl border border-ink-200 dark:border-ink-700 p-5">
            <div className="flex items-start gap-3 mb-3">
              <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-xl shadow-md"/>
              <div className="flex-1">
                <div className="font-bold text-ink-900 dark:text-white">Install Auto to Rental</div>
                <div className="text-xs text-ink-500 dark:text-ink-400">autotorental.com</div>
              </div>
              <button onClick={dismiss} className="text-ink-400 -mt-1 -mr-1 p-1"><X size={16}/></button>
            </div>
            <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed mb-4">
              Get one-tap access from your home screen. Faster, offline-ready, full-screen.
            </p>
            <div className="flex gap-2">
              <button onClick={dismiss} className="flex-1 px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-200 text-sm font-semibold hover:bg-ink-50 dark:bg-ink-900/50 dark:hover:bg-ink-800">Not now</button>
              <button onClick={install} className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-2 rounded-lg text-sm">
                <Download size={14}/> Install
              </button>
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes atrSlideUp { from { transform: translateY(110%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          @keyframes atrSlideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          :global(.atr-anim-up) { animation: atrSlideUp 380ms cubic-bezier(.2,.85,.3,1.05) both; }
          :global(.atr-anim-down) { animation: atrSlideDown 380ms cubic-bezier(.2,.85,.3,1.05) both; }
        `}</style>
      </>
    )
  }

  /* ─────────────────────────── iOS GUIDED INSTALL ─────────────────────────── */
  return (
    <>
      {/* Backdrop blocks the page so user focuses on the steps */}
      <div className="fixed inset-0 z-[99] bg-ink-950/40 backdrop-blur-sm sm:hidden atr-anim-fade" onClick={dismiss}/>

      {/* Bottom-anchored card with steps + pulsing arrow pointing at Safari's Share button */}
      <div className="fixed inset-x-0 bottom-0 z-[100] sm:hidden atr-anim-up" role="dialog" aria-modal="true">
        <div className="bg-white dark:bg-ink-900 rounded-t-3xl shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.45)] border-t border-ink-200 dark:border-ink-700/40 dark:border-ink-700 px-5 pt-5 pb-7">
          {/* Drag handle visual */}
          <div className="mx-auto w-10 h-1 rounded-full bg-ink-200 dark:bg-ink-700 mb-4"/>

          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <img src="/icon-192.png" alt="" className="w-14 h-14 rounded-2xl shadow-lg flex-shrink-0"/>
            <div className="flex-1">
              <div className="font-black text-ink-900 dark:text-white text-lg leading-tight">
                Add to Home Screen
              </div>
              <div className="text-sm text-ink-600 dark:text-ink-300 mt-0.5">
                Auto to Rental — works offline
              </div>
            </div>
            <button onClick={dismiss} aria-label="Close" className="text-ink-400 hover:text-ink-700 dark:hover:text-white -mt-1 -mr-1 p-1">
              <X size={20}/>
            </button>
          </div>

          {/* 3 numbered steps */}
          <div className="space-y-3 mb-4">
            <Step n={1} icon={<Share size={18} className="text-white"/>} bg="from-blue-500 to-blue-700">
              <span className="font-semibold">Tap the Share button</span>
              <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">It's the square with an arrow ↑ at the bottom of Safari.</div>
            </Step>
            <Step n={2} icon={<ChevronDown size={18} className="text-white"/>} bg="from-purple-500 to-purple-700">
              <span className="font-semibold">Scroll down in the menu</span>
            </Step>
            <Step n={3} icon={<Plus size={18} className="text-white"/>} bg="from-emerald-500 to-emerald-700">
              <span className="font-semibold">Tap "Add to Home Screen"</span>
              <div className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">Then "Add" in the top right.</div>
            </Step>
          </div>

          {/* Animated arrow pointing toward the Share button */}
          <div className="flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 font-semibold text-sm">
            <span>Start by tapping</span>
            <Share size={16}/>
            <span>below</span>
            <span className="atr-arrow inline-flex flex-col leading-none">
              <span>↓</span>
              <span>↓</span>
            </span>
          </div>

          {/* Subtle "not now" */}
          <button onClick={dismiss} className="mt-4 w-full text-center text-xs text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-white py-2">
            Maybe later
          </button>
        </div>
      </div>

      {/* Desktop iOS users see a small banner */}
      <div className="hidden sm:block fixed right-5 top-20 z-[100] w-[360px] atr-anim-down">
        <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl border border-ink-200 dark:border-ink-700 p-5">
          <div className="flex items-start gap-3 mb-3">
            <img src="/icon-192.png" alt="" className="w-12 h-12 rounded-xl shadow-md"/>
            <div className="flex-1">
              <div className="font-bold text-ink-900 dark:text-white">Install on iPad</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">autotorental.com</div>
            </div>
            <button onClick={dismiss} className="text-ink-400 -mt-1 -mr-1 p-1"><X size={16}/></button>
          </div>
          <div className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
            Tap <Share size={14} className="inline align-text-bottom mx-1"/> Share in the URL bar, then <strong>Add to Home Screen</strong>.
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes atrSlideUp { from { transform: translateY(110%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes atrSlideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes atrFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes atrArrow {
          0%, 100% { transform: translateY(0); opacity: .9; }
          50%      { transform: translateY(4px); opacity: 1; }
        }
        :global(.atr-anim-up)   { animation: atrSlideUp 420ms cubic-bezier(.2,.85,.3,1.05) both; }
        :global(.atr-anim-down) { animation: atrSlideDown 420ms cubic-bezier(.2,.85,.3,1.05) both; }
        :global(.atr-anim-fade) { animation: atrFadeIn 260ms ease-out both; }
        :global(.atr-arrow)     { animation: atrArrow 900ms ease-in-out infinite; font-size: 14px; }
      `}</style>
    </>
  )
}

function Step({ n, icon, bg, children }: { n: number; icon: React.ReactNode; bg: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-ink-50 dark:bg-ink-800/50 rounded-xl p-3">
      <div className="relative flex-shrink-0">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bg} inline-flex items-center justify-center shadow-md`}>{icon}</div>
        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 inline-flex items-center justify-center text-[10px] font-bold text-ink-900 dark:text-white">{n}</div>
      </div>
      <div className="flex-1 text-sm text-ink-800 dark:text-ink-100">{children}</div>
    </div>
  )
}
