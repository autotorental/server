"use client"
import { Phone, MessageCircle, Globe } from "lucide-react"
import type { ReactNode } from "react"

function waLink(phone?: string, msg = "") {
  if (!phone) return "#"
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(msg)}`
}

export default function MobileStickyContact({ phone, whatsapp, livekitRoom, livekit, title, price, vehicleId, sellerId }: {
  phone?: string; whatsapp?: string; livekitRoom?: string; livekit?: boolean; title: string; price: ReactNode; vehicleId?: string; sellerId?: string
}) {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-ink-900 border-t border-ink-200 dark:border-ink-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="px-3 py-2.5 flex items-center gap-2">
        <div className="min-w-0 flex-shrink">
          <div className="text-[10px] text-ink-500 font-medium leading-tight">from</div>
          <div className="font-bold text-ink-900 dark:text-ink-100 text-base leading-tight">{price}</div>
          <div className="text-[10px] text-ink-500 leading-tight">/ day</div>
        </div>
        <div className="flex gap-1.5 flex-1 justify-end">
          {whatsapp && (
            <a href={waLink(whatsapp, `Hi, I am interested in the ${title} on Auto to Rental.`)} target="_blank" rel="noopener" className="flex-1 max-w-[110px] inline-flex items-center justify-center gap-1.5 bg-green-500 active:bg-green-600 text-white font-bold py-2.5 rounded-lg text-xs">
              <MessageCircle size={14}/> WhatsApp
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="flex-1 max-w-[110px] inline-flex items-center justify-center gap-1.5 bg-brand-600 active:bg-brand-700 text-white font-bold py-2.5 rounded-lg text-xs">
              <Phone size={14}/> Call
            </a>
          )}
          {livekit && (
            <a href={`/call.html?vehicle=${vehicleId}&seller=${sellerId}&title=${encodeURIComponent(title)}`} target="_blank" rel="noopener" className="w-10 h-10 inline-flex items-center justify-center bg-gradient-to-r from-amber-400 to-amber-500 text-ink-950 rounded-lg shrink-0" aria-label="Free international call">
              <Globe size={16}/>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
