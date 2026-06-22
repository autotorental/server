"use client"
import Link from "next/link"
import Image from "next/image"
import { Vehicle } from "@/lib/api"
import Price from "./price"
import { MapPin, Users, Fuel, Settings2, Heart, Star, Calendar, DoorOpen, Gauge, Palette, Car } from "lucide-react"
import { useEffect, useState } from "react"
import OnlineBadge from "./online-badge"
import { Locale, localizedPath } from "@/lib/locales"
import { cardLabels, fuelLabel, transmissionLabel } from "@/lib/card-i18n"

export default function VehicleCard({ v, brand, city, sellerName, online = true, locale = "en", displayTitle, period = "daily" }: { v: Vehicle; brand?: string; city?: string; sellerName?: string; online?: boolean; locale?: Locale; displayTitle?: string; period?: "daily"|"weekly"|"monthly" }) {
  const L = cardLabels(locale)
  const title = displayTitle || v.title
  const [isFav, setIsFav] = useState(false)
  useEffect(() => { try { const f = JSON.parse(localStorage.getItem("favorites") || "[]") as string[]; setIsFav(f.includes(v.id)) } catch {} }, [v.id])
  const toggleFav = (e: React.MouseEvent) => { e.preventDefault(); try { const f = JSON.parse(localStorage.getItem("favorites") || "[]") as string[]; const next = f.includes(v.id) ? f.filter(x => x !== v.id) : [v.id, ...f]; localStorage.setItem("favorites", JSON.stringify(next)); setIsFav(next.includes(v.id)) } catch {} }
  const photo = v.photos?.[0]
  // Select price based on period
  const displayPrice = period === "monthly" ? (v.monthly_price || v.daily_price)
    : period === "weekly" ? (v.weekly_price || v.daily_price)
    : v.daily_price
  const displaySalePrice = period === "daily" ? v.sale_daily_price : null
  const hasSale = displaySalePrice && v.daily_price && displaySalePrice < v.daily_price
  const ccy = v.currency_code?.toUpperCase() || "AED"
  // If the period price is missing we show the daily price — so label it "per day" too
  const usingFallback = (period === "monthly" && !v.monthly_price) || (period === "weekly" && !v.weekly_price)
  const perLabel = usingFallback ? L.perDay : period === "monthly" ? L.perMonth : period === "weekly" ? L.perWeek : L.perDay
  return (
    <Link href={localizedPath(`/cars/${v.slug || v.id}`, locale)} className="group surface-card interactive-card overflow-hidden rounded-2xl">
      <div className="relative aspect-[4/3] bg-ink-100 dark:bg-ink-800 overflow-hidden">
        {photo ? (
          <Image src={photo} alt={`${title} for rent${city ? ` in ${city}` : ""}${brand ? ` — ${brand}` : ""}`} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-500" quality={85}/>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-100 to-ink-200 dark:from-ink-800 dark:to-ink-900"/>
        )}
        {v.discount_label && (
          <div className="absolute top-3 left-3 bg-accent-red text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md shadow">
            {v.discount_label}
          </div>
        )}
        {v.discount_percent && !v.discount_label && (
          <div className="absolute top-3 left-3 bg-accent-red text-white px-2.5 py-1 text-[11px] font-bold rounded-md shadow">
            {L.off(v.discount_percent)}
          </div>
        )}
        {v.is_featured && (
          <div className="absolute top-3 right-12 bg-accent-amber text-ink-950 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md shadow">
            {L.featured}
          </div>
        )}
        <button className={`absolute top-3 right-3 w-8 h-8 bg-white/95 dark:bg-ink-900/95 hover:bg-white dark:hover:bg-ink-900 rounded-lg flex items-center justify-center transition ${isFav ? "text-red-500" : "text-ink-600 dark:text-ink-400 hover:text-accent-red"}`} aria-label="favorite" onClick={toggleFav}>
          <Heart size={15} fill={isFav ? "currentColor" : "none"}/>
        </button>
        {city && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-white/95 dark:bg-ink-900/95 backdrop-blur-sm px-2 py-1 rounded-md text-[11px] font-medium text-ink-700 dark:text-ink-300 shadow">
            <MapPin size={11} className="text-brand-600"/>{city}
          </div>
        )}
        <div className="absolute bottom-3 right-3 inline-flex bg-white/95 dark:bg-ink-900/95 backdrop-blur-sm px-2 py-1 rounded-md shadow">
          <OnlineBadge online={online} label={online ? L.availableNow : L.replyWithin}/>
        </div>
      </div>

      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-ink-500 font-medium uppercase tracking-wide truncate">{brand} {v.year ? `· ${v.year}` : ""}</div>
            <h3 className="text-[1.02rem] font-bold text-ink-900 dark:text-ink-100 leading-snug mt-0.5 line-clamp-1 group-hover:text-brand-600 transition">{title}</h3>
            {sellerName && <div className="text-[11px] text-ink-500 mt-1 truncate">{L.by} <span className="font-bold text-brand-600 dark:text-brand-400 hover:underline">{sellerName}</span></div>}
          </div>

        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-500 mt-3">
          {v.year && <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-brand-600"/>{v.year}</span>}
          {v.transmission && <span className="inline-flex items-center gap-1 capitalize"><Settings2 size={11} className="text-brand-600"/>{transmissionLabel(v.transmission, locale)}</span>}
          {v.seats && <span className="inline-flex items-center gap-1"><Users size={11} className="text-brand-600"/>{v.seats}</span>}
          {(v as any).doors && <span className="inline-flex items-center gap-1"><DoorOpen size={11} className="text-brand-600"/>{(v as any).doors}</span>}
          {v.fuel_type && <span className="inline-flex items-center gap-1 capitalize"><Fuel size={11} className="text-brand-600"/>{fuelLabel(v.fuel_type, locale)}</span>}
          {(v as any).mileage_km != null && (v as any).mileage_km > 0 && <span className="inline-flex items-center gap-1"><Gauge size={11} className="text-brand-600"/>{Math.round(Number((v as any).mileage_km)/1000)}k km</span>}
          {(v as any).color && <span className="inline-flex items-center gap-1 capitalize"><Palette size={11} className="text-brand-600"/>{(v as any).color}</span>}
        </div>

        <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-800 flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <div className="text-xl font-bold text-ink-900 dark:text-ink-100">
                <Price amount={hasSale ? displaySalePrice : displayPrice} from={ccy as any}/>
              </div>
              {hasSale && <div className="text-xs text-ink-400 line-through"><Price amount={v.daily_price} from={ccy as any}/></div>}
            </div>
            <div className="text-[11px] text-ink-500">{perLabel}</div>
          </div>
          <div className="text-[11px] font-semibold text-brand-600 group-hover:translate-x-0.5 transition-transform">{L.viewDeal}</div>
        </div>
      </div>
    </Link>
  )
}
