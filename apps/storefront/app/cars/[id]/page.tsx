import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { api, fmtPrice, whatsappLink } from "@/lib/api"
import Price from "@/components/price"
import Gallery from "@/components/gallery"
import VehicleTracker from "@/components/vehicle-tracker"
import { VehicleJsonLd, LocalBusinessJsonLd, BreadcrumbJsonLd } from "@/components/jsonld"
import OnlineBadge from "@/components/online-badge"
import MobileStickyContact from "@/components/mobile-sticky-contact"
import { featureIcon, featureGlyph, isImageIcon } from "@/lib/feature-icons"
import { Phone, MessageCircle, Globe, Calendar, Gauge, Users, Fuel, Settings2, MapPin, ChevronRight, Star, ShieldCheck, BadgeCheck, Heart, Share2, Flag, Car as CarIcon, Palette, Cog } from "lucide-react"
import FollowButton from "@/components/follow-button"
import VehicleActions, { ReportListingTrigger } from "@/components/vehicle-actions"
import SellerSocials from "@/components/seller-socials"
import { VehicleVideoPlayer } from "@/components/vehicle-video"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { vehicleContent } from "@/lib/vehicle-i18n"
import { translateFeature } from "@/lib/feature-i18n"
import { translateText } from "@/lib/mt"

export const revalidate = 30

import { seoFor } from "@/lib/seo-helper"
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await api.vehicle(id).catch(() => null)
  if (!data) return { title: "Vehicle not found" }
  const v = data.vehicle
  const [b, c, sellerData, locale] = await Promise.all([api.brands().catch(() => ({ brands: [] })), api.cities().catch(() => ({ cities: [] })), api.seller(v.seller_id).catch(() => null), getLocale()])
  const m = vehicleContent(locale)
  const brand = b.brands.find((x: any) => x.id === v.brand_id)
  const city = c.cities.find((x: any) => x.id === v.city_id)
  const ccy = (v.currency_code || "AED").toUpperCase()
  const price = v.sale_daily_price || v.daily_price
  const specs = `${v.transmission ? v.transmission + ", " : ""}${v.fuel_type ? v.fuel_type + ", " : ""}${v.seats ? v.seats + " " + m.specSeats + ". " : ""}`
  const vtRaw = (await translateText(v.title, locale)).replace(/[.。۔]+\s*$/, "")
  const cityName = city?.name
  // Avoid the "Rent X in Dubai — Rent in Dubai" doubling: add the city only when the (vendor-authored) title omits it.
  const vt = locale === "en" && cityName && !vtRaw.toLowerCase().includes(cityName.toLowerCase()) ? `${vtRaw} — ${cityName}` : vtRaw
  const sellerName = sellerData?.seller?.name
  const defaultTitle = m.metaTitle(vt, ccy, price)
  const defaultDesc = m.metaDesc(vt, ccy, price, specs, sellerName)
  return seoFor(`/cars/${v.slug || v.id}`, { title: defaultTitle, description: defaultDesc, image: v.photos?.[0] })
}

export default async function VehicleDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await api.vehicle(id).catch(() => null)
  if (!data) return notFound()
  const v = data.vehicle
  if (/^veh_/.test(id) && v.slug && v.slug !== id) permanentRedirect(`/cars/${v.slug}`)
  const [b, c, mdl, bt, fs, sellerData, sellerVehicles, locale] = await Promise.all([
    api.brands().catch(() => ({ brands: [] })),
    api.cities().catch(() => ({ cities: [] })),
    api.models().catch(() => ({ models: [] })),
    api.body_types().catch(() => ({ body_types: [] })),
    api.features().catch(() => ({ features: [] })),
    api.seller(v.seller_id).catch(() => null),
    api.vehicles({ seller_id: v.seller_id, limit: 4 }).catch(() => ({ vehicles: [] })),
    getLocale(),
  ])
  const m = vehicleContent(locale)
  const lp = (p: string) => localizedPath(p, locale)
  const brand = b.brands.find((x: any) => x.id === v.brand_id)
  const city = c.cities.find((x: any) => x.id === v.city_id)
  const model = mdl.models.find((x: any) => x.id === v.model_id)
  const body = bt.body_types.find((x: any) => x.id === v.body_type_id)
  const features = (v.feature_ids || []).map((id: string) => fs.features.find((f: any) => f.id === id)).filter(Boolean)
  const descLocalized = await translateText(v.description, locale)
  const titleLocalized = await translateText(v.title, locale)
  const dailyBase = v.daily_price
  const dailySale = v.sale_daily_price
  const hasSale = dailySale != null && dailyBase != null && dailySale < dailyBase
  const dailyDisplay = hasSale ? dailySale : dailyBase
  const ccy = v.currency_code?.toUpperCase() || "AED"
  const seller = sellerData?.seller
  const sellerDescLocalized = await translateText(seller?.description, locale)
  const listedByName = seller?.name || v.seller_name || v.company_name || "Verified Rental Company"
  const listedByCompanyId = seller?.id || v.seller_id
  const listedByHref = listedByCompanyId ? lp(`/companies/${listedByCompanyId}`) : null
  const otherVehicles = sellerVehicles.vehicles.filter((x: any) => x.id !== v.id).slice(0, 3)
  const primaryVideo = Array.isArray(v.videos) && v.videos.length > 0 ? v.videos[0] : null
  const sellerInitial = seller?.name?.trim()?.charAt(0)?.toUpperCase() || "R"

  return (
    <>
      <VehicleJsonLd v={v} brand={brand} model={model} city={city} seller={seller} body={body}/>
      {seller && <LocalBusinessJsonLd seller={seller} city={city}/>}
      <BreadcrumbJsonLd items={[{name:m.bcHome,url:lp("/")},{name:m.bcCars,url:lp("/cars")},...(brand?[{name:brand.name,url:lp(`/cars?brand=${brand.id}`)}]:[]),{name:titleLocalized,url:lp(`/cars/${v.slug || v.id}`)}]}/>
      <VehicleTracker vehicleId={v.id} sellerId={v.seller_id} brandName={brand?.name} modelName={model?.name} cityName={city?.name} price={dailyDisplay}/>
      {/* Breadcrumb */}
      <section className="bg-ink-50 dark:bg-ink-900/50 border-b border-ink-100 dark:border-ink-800">
        <div className="mx-auto max-w-7xl px-4 py-3 text-xs text-ink-500 flex items-center gap-2 flex-wrap overflow-x-auto no-scrollbar">
          <Link href={lp("/")} className="hover:text-brand-600 whitespace-nowrap">{m.bcHome}</Link><ChevronRight size={12}/>
          <Link href={lp("/cars")} className="hover:text-brand-600 whitespace-nowrap">{m.bcCars}</Link><ChevronRight size={12}/>
          {brand && <><Link href={lp(`/cars?brand=${brand.id}`)} className="hover:text-brand-600 whitespace-nowrap">{brand.name}</Link><ChevronRight size={12}/></>}
          {model && <><Link href={lp(`/cars?brand=${brand?.id}&model=${model.id}`)} className="hover:text-brand-600 whitespace-nowrap">{model.name}</Link><ChevronRight size={12}/></>}
          <span className="text-ink-800 dark:text-ink-200 font-medium truncate">{v.year}</span>
        </div>
      </section>

      {/* Title */}
      <section className="pt-3 pb-6 md:pt-5 md:pb-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {v.is_featured && <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-1 rounded-md">{m.featured}</span>}
                {v.discount_label && <span className="inline-block bg-accent-red text-white text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-md">{v.discount_label}</span>}
                <OnlineBadge online={true} size="md"/>
                {seller?.metadata?.google_rating && seller?.metadata?.google_reviews && (
                  <span className="inline-flex items-center gap-1 text-amber-500 text-sm"><Star size={14} fill="currentColor"/><span className="font-bold text-ink-800 dark:text-ink-200">{seller.metadata.google_rating}</span><span className="text-ink-500 hidden sm:inline">({seller.metadata.google_reviews} reviews)</span></span>
                )}
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-ink-900 dark:text-ink-100 leading-tight w-full">{titleLocalized}</h1>
              <div className="mt-2 flex items-center gap-x-3 gap-y-1 text-sm text-ink-600 dark:text-ink-400 flex-wrap">
                {brand && <Link href={lp(`/cars?brand=${brand.id}`)} className="font-semibold hover:text-brand-600">{brand.name}</Link>}
                {model && <Link href={lp(`/cars?brand=${brand?.id}&model=${model.id}`)} className="hover:text-brand-600 hidden sm:inline">· {model.name}</Link>}
                {!!v.year && <Link href={lp(`/cars?year=${v.year}`)} className="hover:text-brand-600">· {v.year}</Link>}
                {city && <Link href={lp(`/cars?city=${city.id}`)} className="inline-flex items-center gap-1 hover:text-brand-600"><MapPin size={14} className="text-brand-600"/>{city.name}, {city.country_code === "ae" ? "UAE" : "Syria"}</Link>}
              </div>
            </div>
            <VehicleActions vehicleId={v.id} title={v.title}/>
          </div>
        </div>
      </section>

      {/* Hero: Gallery (left) + Price & Contact card (right, sticky on desktop) */}
      <section className="pb-8">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          {/* Left — Gallery */}
          <div>
            <Gallery photos={v.photos || []} alt={`${v.title}${v.year ? ` ${v.year}` : ""} for rent${city?.name ? ` in ${city.name}` : ""}`}/>
            {primaryVideo && (
              <div className="mt-4 bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-3">
                <div className="text-xs text-ink-500 font-semibold uppercase tracking-wide mb-2">{m.vehicleVideo}</div>
                <VehicleVideoPlayer url={primaryVideo} title={`${v.title} video`} />
              </div>
            )}
          </div>

          {/* Right — Price + Contact (sticky on desktop, inline on mobile) */}
          <aside className="lg:sticky lg:top-24">
            <div className="bg-white dark:bg-ink-900 border-2 border-brand-200 rounded-2xl p-5 md:p-6 shadow-card relative">
              <ReportListingTrigger
                vehicleId={v.id}
                title={v.title}
                variant="link"
                className="absolute top-4 right-4 md:top-5 md:right-5 z-10"
              />
              {/* Price */}
              <div className="text-sm text-ink-500 mb-1.5 flex items-center gap-2.5 flex-wrap pr-24">
                <span>
                  {m.listedBy}{" "}
                  {listedByHref ? (
                    <Link href={listedByHref} className="font-semibold text-ink-700 dark:text-ink-300 hover:text-brand-600 transition-colors">
                      {listedByName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink-700 dark:text-ink-300">{listedByName}</span>
                  )}
                </span>
                <OnlineBadge online={true} size="sm" label={m.availableNow}/>
              </div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100"><Price amount={dailyDisplay} from={ccy as any}/></span>
                {hasSale && dailyBase != null && <span className="text-lg text-ink-400 line-through"><Price amount={dailyBase} from={ccy as any}/></span>}
                <span className="text-sm font-semibold text-ink-500">{m.perDay}</span>
                {v.discount_percent && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md">{m.save(v.discount_percent)}</span>}
              </div>

              {/* Daily / Weekly / Monthly tiers */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {dailyDisplay != null && <PricePill label={m.daily} main={dailyDisplay} ccy={ccy}/>}
                {v.weekly_price && <PricePill label={m.weekly} main={v.sale_weekly_price ?? v.weekly_price} ccy={ccy}/>}
                {v.monthly_price && <PricePill label={m.monthly} main={v.sale_monthly_price ?? v.monthly_price} ccy={ccy} hot bestDeal={m.bestDeal}/>}
              </div>

              {/* Security deposit */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-50 dark:bg-ink-900/50 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-brand-600 shrink-0"/>
                  <span className="text-sm font-semibold text-ink-700 dark:text-ink-300">{m.securityDeposit}</span>
                </div>
                {v.security_deposit != null && v.security_deposit > 0 ? (
                  <span className="text-sm font-black text-ink-900 dark:text-ink-100"><Price amount={v.security_deposit} from={ccy as any}/></span>
                ) : v.security_deposit === 0 ? (
                  <span className="text-xs font-bold text-green-700 bg-green-50 dark:bg-green-900/30 dark:text-green-400 rounded-lg px-2.5 py-1">{m.noDeposit}</span>
                ) : (
                  <span className="text-xs font-semibold text-ink-500 bg-ink-100 dark:bg-ink-800 dark:text-ink-400 rounded-lg px-2.5 py-1">{locale === "ar" ? "غير محدّد من الشركة" : "Not provided by vendor"}</span>
                )}
              </div>
              {v.security_deposit != null && v.security_deposit > 0 && v.security_deposit_note ? (
                <p className="mt-1.5 text-[11px] text-ink-500 leading-relaxed px-1">{v.security_deposit_note}</p>
              ) : null}

              {/* Contact buttons — the ONLY set on the page */}
              <div className="mt-5 pt-4 border-t border-ink-100 dark:border-ink-800 space-y-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase tracking-wider text-ink-500 font-bold">{m.contactDirectly}</span>
                  <OnlineBadge online={true} size="sm"/>
                </div>
                {v.whatsapp_number && (
                  <a
                    href={whatsappLink(
                      v.whatsapp_number,
                      m.waMessage({
                        title: v.title,
                        place: `${city?.name || ""}${city ? ", " : ""}${city?.country_code === "ae" ? "UAE" : city?.country_code === "sy" ? "Syria" : ""}`,
                        price: dailyDisplay != null ? `${(v.currency_code || "AED").toUpperCase()} ${dailyDisplay.toLocaleString()}${m.perDay}` : "",
                        url: `https://autotorental.com${lp(`/cars/${v.slug || v.id}`)}`,
                      })
                    )}
                    target="_blank"
                    rel="noopener"
                    className="w-full inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-green-500/30"
                  >
                    <MessageCircle size={18}/> {m.whatsapp}
                  </a>
                )}
                {v.phone_number && (
                  <a href={`tel:${v.phone_number}`} className="w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl transition">
                    <Phone size={18}/> {m.callNow}
                  </a>
                )}
                {v.livekit_enabled && (
                  <a href={`/call.html?vehicle=${v.id}&seller=${v.seller_id}&title=${encodeURIComponent(titleLocalized)}`} target="_blank" rel="noopener" className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-ink-950 font-bold py-3 rounded-xl transition shadow-lg shadow-amber-400/30">
                    <Globe size={18}/> {m.freeIntlCall}
                  </a>
                )}
              </div>

              <div className="text-[11px] text-ink-500 leading-relaxed mt-4 pt-4 border-t border-ink-100 dark:border-ink-800 text-center">
                {m.noFees1}<br/>{m.noFees2}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="pb-24 lg:pb-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="space-y-6">

            {/* QUICK SPECS strip — clickable WooCommerce-archive style */}
            <div className="surface-card p-5 md:p-6">
              <h2 className="font-black text-xl text-ink-900 dark:text-ink-100 mb-4">{m.quickSpecs}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {!!v.year && <SpecChip I={Calendar} label={m.specYear} val={v.year} href={lp(`/cars?year=${v.year}`)}/>}
                {body && <SpecChip I={CarIcon} label={m.specBody} val={body.name} href={lp(`/cars?body=${body.id}`)}/>}
                {v.transmission && <SpecChip I={Cog} label={m.specTransmission} val={v.transmission} href={lp(`/cars?transmission=${v.transmission}`)} cap/>}
                {v.fuel_type && <SpecChip I={Fuel} label={m.specFuel} val={v.fuel_type} href={lp(`/cars?fuel_type=${v.fuel_type}`)} cap/>}
                {!!v.seats && <SpecChip I={Users} label={m.specSeats} val={v.seats} href={lp(`/cars?seats=${v.seats}`)}/>}
                {!!v.doors && <SpecChip I={Settings2} label={m.specDoors} val={v.doors}/>}
                {v.color && <SpecChip I={Palette} label={m.specColor} val={v.color} href={lp(`/cars?color=${encodeURIComponent(v.color)}`)}/>}
                {!!v.mileage_km && <SpecChip I={Gauge} label={m.specMileage} val={`${v.mileage_km.toLocaleString()} km`}/>}
              </div>
            </div>

            {/* FEATURES */}
            {features.length > 0 && (
              <div className="surface-card p-5 md:p-6">
                <h2 className="font-black text-xl text-ink-900 dark:text-ink-100 mb-4">{m.featuresTitle}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {features.map((f: any) => (
                    <div key={f.id} className="flex items-center gap-2.5 bg-ink-50 dark:bg-ink-900/50 rounded-xl px-3 py-2.5 text-sm">
                      {isImageIcon(f.icon) ? (
                        <img src={f.icon} alt="" className="w-5 h-5 object-contain shrink-0" />
                      ) : (
                        <span className="text-xl leading-none shrink-0">{featureGlyph(f.icon, f.name)}</span>
                      )}
                      <span className="font-medium text-ink-800 dark:text-ink-200 truncate">{translateFeature(f.name, locale)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DESCRIPTION */}
            {v.description && (
              <div className="surface-card p-5 md:p-6">
                <h2 className="font-black text-xl text-ink-900 dark:text-ink-100 mb-3">{m.aboutTitle}</h2>
                <p className="text-ink-700 dark:text-ink-300 leading-relaxed">{descLocalized}</p>
              </div>
            )}

            {/* DELIVERY */}
            {v.delivery?.enabled && (v.delivery.emirates?.length ?? 0) > 0 && (
              <div className="surface-card p-5 md:p-6">
                <h2 className="font-black text-xl text-ink-900 dark:text-ink-100 mb-1">{m.deliveryTitle}</h2>
                <p className="text-sm text-ink-500 mb-4">{m.deliverySub}</p>
                <div className="divide-y divide-ink-100">
                  {(v.delivery.emirates ?? []).map((em: any) => (
                    <div key={em.name} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2.5">
                        <MapPin size={16} className="text-brand-600 shrink-0"/>
                        <span className="font-semibold text-ink-800 dark:text-ink-200">{em.name}</span>
                      </div>
                      {em.free || !(em.price > 0) ? (
                        <span className="text-xs font-bold text-green-700 bg-green-50 rounded-lg px-2.5 py-1">{m.freeDelivery}</span>
                      ) : (
                        <span className="font-bold text-ink-900 dark:text-ink-100">{fmtPrice(em.price, ccy)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRUST STRIP */}
            <div className="bg-brand-50 border border-brand-100 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                { I: ShieldCheck, t: m.trustVerified },
                { I: BadgeCheck, t: m.trustNoFees },
                { I: MessageCircle, t: m.trustDirect },
                { I: Star, t: m.trustTopRated },
              ].map((x,i)=>(
                <div key={i} className="flex items-center gap-2 justify-center">
                  <x.I size={18} className="text-brand-600 shrink-0"/><span className="text-xs font-semibold text-ink-700 dark:text-ink-300">{x.t}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-brand-50 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{m.promoLabel}</div>
                <h2 className="mt-1 text-xl font-black text-ink-900 dark:text-ink-100">{m.promoTitle}</h2>
                <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{m.promoSub}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={lp("/cars")} className="inline-flex items-center justify-center rounded-xl border border-brand-200 bg-white dark:bg-ink-900 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">{m.allCars}</Link>
                {brand && <Link href={lp(`/cars?brand=${brand.id}`)} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700">{m.brandCars(brand.name)}</Link>}
              </div>
            </div>

            <div className="surface-card p-5 md:p-6">
              <h2 className="font-black text-xl text-ink-900 dark:text-ink-100">{m.faqTitle}</h2>
              <div className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
                <p><strong>{m.faqReserveQ}</strong> {m.faqReserveA}</p>
                <p><strong>{m.faqCompareQ}</strong> {m.faqCompareA1}<Link href={brand ? lp(`/cars?brand=${brand.id}`) : lp("/cars")} className="text-brand-600 font-semibold hover:text-brand-700">{m.faqCompareLink1}</Link>{m.faqCompareA2}<Link href={city ? lp(`/cars?city=${city.id}`) : lp("/cars")} className="text-brand-600 font-semibold hover:text-brand-700">{city?.name || ""}</Link>.</p>
                <p><strong>{m.faqVerifiedQ}</strong> {m.faqVerifiedA}</p>
              </div>
            </div>

            {/* RENTAL COMPANY PROFILE */}
            {seller && (
              <div className="surface-card overflow-hidden">
                <div className="h-48 sm:h-64 md:h-[23rem] bg-gradient-to-br from-brand-600 to-brand-900 relative overflow-hidden">
                  {seller.banner && (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-cover bg-center opacity-80"
                      style={{ backgroundImage: `url("${seller.banner}")` }}
                    />
                  )}
                </div>
                <div className="px-5 md:px-6 pb-6 pt-0 relative bg-white dark:bg-ink-900">
                  <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-10 pt-3">
                    <div className="w-20 h-20 bg-white dark:bg-ink-900 rounded-2xl border-4 border-white shadow-lg overflow-hidden flex items-center justify-center shrink-0 relative">
                      <span className="font-black text-3xl text-brand-600 select-none">{sellerInitial}</span>
                      {seller.logo && (
                        <div
                          aria-label={seller.name}
                          role="img"
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url("${seller.logo}")` }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] uppercase tracking-wider text-brand-600 font-bold mb-1">{m.listedByLabel}</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-xl text-ink-900 dark:text-ink-100">{seller.name}</h3>
                        <ShieldCheck size={18} className="text-brand-600" aria-label="Verified"/>
                      </div>
                      <div className="flex items-center gap-3 gap-y-1 mt-1.5 text-xs text-ink-600 dark:text-ink-400 flex-wrap">
                        <OnlineBadge online={true}/>
                        {seller.metadata?.google_rating && seller.metadata?.google_reviews && (
                          <span className="inline-flex items-center gap-1 text-amber-500"><Star size={11} fill="currentColor"/><span className="font-bold text-ink-700 dark:text-ink-300">{seller.metadata.google_rating}</span><span className="text-ink-500">· {seller.metadata.google_reviews} Google reviews</span></span>
                        )}
                        <span className="inline-flex items-center gap-1"><CarIcon size={11}/>{m.carsCount(sellerVehicles.vehicles.length)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2"><FollowButton sellerId={seller.id} variant="default"/><Link href={lp(`/companies/${seller.id}`)} className="btn-outline text-sm whitespace-nowrap text-center">{m.viewProfile}</Link></div>
                  </div>
                  {seller.description && <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed mt-5">{sellerDescLocalized}</p>}
                  {seller.metadata?.social && <div className="mt-4"><SellerSocials socials={seller.metadata.social} size="sm"/></div>}

                  {otherVehicles.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-ink-100 dark:border-ink-800">
                      <div className="text-[11px] uppercase tracking-wider text-ink-500 font-bold mb-3">{m.moreFrom(seller.name)}</div>
                      <div className="grid grid-cols-3 gap-3">
                        {otherVehicles.map((ov: any) => (
                          <Link key={ov.id} href={lp(`/cars/${ov.slug || ov.id}`)} className="group">
                            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-ink-100 dark:bg-ink-800">
                              {ov.photos?.[0] && <img src={ov.photos[0]} alt={ov.title} className="w-full h-full object-cover group-hover:scale-105 transition"/>}
                            </div>
                            <div className="text-[11px] font-semibold text-ink-800 dark:text-ink-200 mt-2 truncate group-hover:text-brand-600">{ov.title}</div>
                            <div className="text-[10px] text-brand-600 font-bold">{fmtPrice(ov.sale_daily_price || ov.daily_price, ccy)}{m.perDay}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REVIEWS (Google placeholder) */}
            <div className="surface-card p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-bold text-lg text-ink-900 dark:text-ink-100 inline-flex items-center gap-2">
                  {m.reviewsTitle} <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4"/> <span className="text-xs font-normal text-ink-500">{m.viaGoogle}</span>
                </h2>
                {seller?.metadata?.google_rating && seller?.metadata?.google_reviews && (
                  <div className="inline-flex items-center gap-2 text-sm">
                    <div className="flex text-amber-400">{[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor"/>)}</div>
                    <span className="font-bold text-ink-900 dark:text-ink-100">{seller.metadata.google_rating}</span>
                    <span className="text-ink-500">· {seller.metadata.google_reviews} {m.reviewsWord}</span>
                  </div>
                )}
              </div>
              <div className="bg-ink-50 dark:bg-ink-900/50 rounded-xl p-4 text-sm text-ink-600 dark:text-ink-400">
                <div className="font-semibold text-ink-800 dark:text-ink-200 mb-1">{m.reviewsNoteTitle}</div>
                {m.reviewsNote}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* MOBILE STICKY CONTACT BAR */}
      <MobileStickyContact
        phone={v.phone_number}
        whatsapp={v.whatsapp_number}
        livekitRoom={`veh-${v.id}`}
        vehicleId={v.id}
        sellerId={v.seller_id}
        livekit={v.livekit_enabled}
        title={v.title}
        price={<Price amount={dailyDisplay} from={ccy as any} />}
      />
    </>
  )
}

function SpecChip({ I, label, val, href, cap }: { I: any; label: string; val: any; href?: string; cap?: boolean }) {
  const body = (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-ink-50 dark:bg-ink-900/50 ${href ? "hover:bg-brand-50 hover:ring-1 hover:ring-brand-300 cursor-pointer" : ""} transition`}>
      <div className="w-8 h-8 rounded-lg bg-white dark:bg-ink-900 text-brand-600 flex items-center justify-center shrink-0 shadow-sm"><I size={14}/></div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-ink-500 font-medium uppercase tracking-wider">{label}</div>
        <div className={`text-sm font-bold text-ink-900 dark:text-ink-100 truncate ${cap ? "capitalize" : ""}`}>{val}</div>
      </div>
    </div>
  )
  return href ? <Link href={href}>{body}</Link> : body
}
function PricePill({ label, main, ccy, hot, bestDeal }: { label: string; main: number; ccy: string; hot?: boolean; bestDeal?: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 text-center ${hot ? "bg-amber-50 border border-amber-200" : "bg-ink-50 dark:bg-ink-900/50"}`}>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-ink-500">{label}</div>
      <div className="text-sm font-bold text-ink-900 dark:text-ink-100 mt-0.5 leading-tight whitespace-normal"><Price amount={main} from={ccy as any}/></div>
      {hot && bestDeal && <div className="text-[9px] font-bold text-amber-700 mt-0.5">{bestDeal}</div>}
    </div>
  )
}
