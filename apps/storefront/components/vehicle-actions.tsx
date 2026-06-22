"use client"
import { useEffect, useState } from "react"
import { Heart, Share2, Flag, X, Check, Loader2 } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

type Props = { vehicleId: string; title: string }

const REPORT_REASONS: { v: string; l: string }[] = [
  { v: "wrong_info", l: "Wrong information" },
  { v: "price_wrong", l: "Wrong price" },
  { v: "already_rented", l: "Already rented out" },
  { v: "scam", l: "Looks like a scam" },
  { v: "duplicate", l: "Duplicate listing" },
  { v: "inappropriate", l: "Inappropriate content" },
  { v: "spam", l: "Spam" },
  { v: "fake_photos", l: "Fake or stolen photos" },
  { v: "stolen_vehicle", l: "Stolen vehicle" },
  { v: "other", l: "Other" },
]

/** Report trigger — use in sidebar card, mobile bar, etc. */
export function ReportListingTrigger({
  vehicleId,
  title,
  variant = "icon",
  className = "",
}: Props & { variant?: "icon" | "link"; className?: string }) {
  const [reportOpen, setReportOpen] = useState(false)

  if (variant === "link") {
    return (
      <>
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className={`inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 hover:text-red-600 transition ${className}`}
          aria-label="Report this listing"
        >
          <Flag size={12} strokeWidth={2.25} />
          Report listing
        </button>
        {reportOpen && (
          <ReportModal vehicleId={vehicleId} title={title} onClose={() => setReportOpen(false)} />
        )}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        aria-label="Report this listing"
        title="Report this listing"
        className={
          className ||
          "w-9 h-9 md:w-10 md:h-10 inline-flex items-center justify-center rounded-lg border border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-400 hover:text-red-600 hover:border-red-300 transition"
        }
      >
        <Flag size={16} />
      </button>
      {reportOpen && (
        <ReportModal vehicleId={vehicleId} title={title} onClose={() => setReportOpen(false)} />
      )}
    </>
  )
}

export default function VehicleActions({ vehicleId, title }: Props) {
  const [isFav, setIsFav] = useState(false)
  const [shareMsg, setShareMsg] = useState("")

  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem("favorites") || "[]") as string[]
      setIsFav(f.includes(vehicleId))
    } catch {}
  }, [vehicleId])

  const toggleFav = () => {
    try {
      const f = JSON.parse(localStorage.getItem("favorites") || "[]") as string[]
      const next = f.includes(vehicleId) ? f.filter(x => x !== vehicleId) : [vehicleId, ...f]
      localStorage.setItem("favorites", JSON.stringify(next))
      setIsFav(next.includes(vehicleId))
    } catch {}
  }

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    const data = { title, text: `Check this rental: ${title}`, url }
    try {
      if (navigator.share) {
        await navigator.share(data)
      } else {
        await navigator.clipboard.writeText(url)
        setShareMsg("Link copied!")
        setTimeout(() => setShareMsg(""), 2000)
      }
    } catch {
      // user cancelled native share — silent
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={toggleFav}
          aria-label="favorite"
          title={isFav ? "Remove from favorites" : "Add to favorites"}
          className={`w-9 h-9 md:w-10 md:h-10 inline-flex items-center justify-center rounded-lg border transition ${
            isFav
              ? "bg-red-50 border-red-300 text-red-600"
              : "border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-400 hover:text-brand-600 hover:border-brand-300"
          }`}
        >
          <Heart size={16} fill={isFav ? "currentColor" : "none"} />
        </button>

        <div className="relative">
          <button
            onClick={share}
            aria-label="share"
            title="Share this listing"
            className="w-9 h-9 md:w-10 md:h-10 inline-flex items-center justify-center rounded-lg border border-ink-200 dark:border-ink-700 text-ink-600 dark:text-ink-400 hover:text-brand-600 hover:border-brand-300 transition"
          >
            <Share2 size={16} />
          </button>
          {shareMsg && (
            <span className="absolute top-full mt-2 right-0 bg-ink-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 inline-flex items-center gap-1">
              <Check size={12} /> {shareMsg}
            </span>
          )}
        </div>

        <ReportListingTrigger vehicleId={vehicleId} title={title} variant="icon" />
      </div>
    </>
  )
}

function ReportModal({ vehicleId, title, onClose }: { vehicleId: string; title: string; onClose: () => void }) {
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) { setErr("Please select a reason"); return }
    setBusy(true); setErr("")
    try {
      const res = await fetch(`${API}/store/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify({
          vehicle_id: vehicleId,
          reason,
          description: description || null,
          reporter_email: email || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to send report")
      setDone(true)
      setTimeout(onClose, 2500)
    } catch (e: any) {
      setErr(e.message || "Failed")
    } finally { setBusy(false) }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-ink-900 rounded-2xl max-w-md w-full p-6 shadow-2xl"
      >
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 inline-flex items-center justify-center mb-3">
              <Check size={28} />
            </div>
            <h3 className="text-lg font-bold text-ink-900 dark:text-white">Thank you</h3>
            <p className="text-ink-600 dark:text-ink-300 mt-1 text-sm">
              Our team will review this listing.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-ink-900 dark:text-white">Report this listing</h3>
                <p className="text-xs text-ink-500 mt-0.5 truncate max-w-[260px]">{title}</p>
              </div>
              <button onClick={onClose} className="text-ink-500 hover:text-ink-900 dark:text-ink-100 p-1" aria-label="Close">
                <X size={20} />
              </button>
            </div>

            {err && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm mb-3">
                {err}
              </div>
            )}

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-300 rounded-lg text-sm bg-white dark:bg-ink-800 dark:text-white"
                  required
                >
                  <option value="">Pick a reason…</option>
                  {REPORT_REASONS.map(r => (
                    <option key={r.v} value={r.v}>{r.l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-1">
                  Details <span className="text-ink-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="What is wrong with this listing?"
                  className="w-full px-3 py-2 border border-ink-300 rounded-lg text-sm bg-white dark:bg-ink-800 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-1">
                  Your email <span className="text-ink-400 font-normal">(optional, so we can follow up)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  dir="ltr"
                  className="w-full px-3 py-2 border border-ink-300 rounded-lg text-sm bg-white dark:bg-ink-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-ink-300 text-ink-700 dark:text-ink-200 font-semibold text-sm hover:bg-ink-50 dark:bg-ink-900/50 dark:hover:bg-ink-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || !reason}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-semibold text-sm inline-flex items-center justify-center gap-1.5"
                >
                  {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Send report"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
