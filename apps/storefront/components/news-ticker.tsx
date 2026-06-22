"use client"
import { useEffect, useState } from "react"
import { ShieldCheck, BadgePercent, MessageCircle, MapPin, Sparkles } from "lucide-react"

type Item = { icon: any; text: string; color?: string }

export default function NewsTicker({ items, variant = "card" }: { items?: Item[]; variant?: "card" | "bar" }) {
  const list: Item[] = items && items.length ? items : [
    { icon: Sparkles, text: "Verified cars · Daily · Weekly · Monthly · Direct contact, no commission", color: "text-amber-300" },
    { icon: ShieldCheck, text: "Verified Companies — every rental house is vetted", color: "text-green-400" },
    { icon: BadgePercent, text: "No Commission — direct contact, fair price", color: "text-amber-300" },
    { icon: MessageCircle, text: "WhatsApp · Phone · Free International Call — talk to the owner directly", color: "text-brand-300" },
    { icon: MapPin, text: "16 Cities Covered across UAE & Syria", color: "text-pink-300" },
  ]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % list.length), 3500)
    return () => clearInterval(t)
  }, [list.length])

  if (variant === "bar") {
    return (
      <div className="flex items-center justify-between gap-3 min-h-[28px]">
        <div className="relative w-full overflow-hidden">
          {list.map((it, i) => {
            const I = it.icon
            const active = i === idx
            return (
              <div key={i}
                className={`flex items-center gap-2.5 transition-all duration-700 ease-out ${active ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 absolute inset-0 pointer-events-none"}`}>
                <I size={14} className={it.color || "text-white"}/>
                <div className="text-sm font-medium text-white truncate">{it.text}</div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-1 shrink-0">
          {list.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`slide ${i+1}`}
              className={`h-1 rounded-full transition-all ${i === idx ? "bg-white dark:bg-ink-900 w-6" : "bg-white dark:bg-ink-900/30 w-1"}`}/>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="mt-5 inline-flex items-center gap-3 bg-white dark:bg-ink-900/10 backdrop-blur-md border border-white/15 px-4 py-3 rounded-xl max-w-2xl min-h-[56px] overflow-hidden">
      <div className="relative w-full">
        {list.map((it, i) => {
          const I = it.icon
          const active = i === idx
          return (
            <div key={i} className={`flex items-center gap-3 transition-all duration-700 ease-out ${active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 absolute inset-0 pointer-events-none"}`}>
              <div className={`w-9 h-9 rounded-lg bg-white dark:bg-ink-900/10 flex items-center justify-center shrink-0 ${it.color || "text-white"}`}><I size={18}/></div>
              <div className="text-sm md:text-base font-medium text-white leading-snug">{it.text}</div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1 shrink-0">
        {list.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} aria-label={`slide ${i+1}`}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white dark:bg-ink-900 w-5" : "bg-white dark:bg-ink-900/30"}`}/>
        ))}
      </div>
    </div>
  )
}
