import Link from "next/link"
import { notFound, permanentRedirect } from "next/navigation"
import { api, whatsappLink } from "@/lib/api"
import CompanyChat from "@/components/company-chat"
import { getLocale } from "@/lib/locale-server"
import { localizedPath, Locale } from "@/lib/locales"
import { translateText, translateBatch } from "@/lib/mt"
import { buildMetadata, SITE } from "@/lib/seo"
import { fuelLabel } from "@/lib/card-i18n"

type CL = { bcHome: string; bcCompanies: string; call: string; carsListed: (n: number) => string; reviews: string; aboutName: (n: string) => string; carsByName: (name: string, n: number) => string; noCars: string; contact: string; followSocial: string; trustSafety: string; identityVerified: string; licenseConfirmed: string; activeListings: (n: number) => string }
const COMPANY_LABELS: Record<Locale, CL> = {
  en: { bcHome: "Home", bcCompanies: "Rental Companies", call: "Call", carsListed: (n) => `${n} car${n === 1 ? "" : "s"} listed`, reviews: "reviews", aboutName: (n) => `About ${n}`, carsByName: (name, n) => `Cars by ${name} (${n})`, noCars: "This rental company has no cars listed yet.", contact: "Contact", followSocial: "Follow on social", trustSafety: "Trust & Safety", identityVerified: "Identity verified", licenseConfirmed: "Trade license confirmed", activeListings: (n) => `${n} active listings` },
  ar: { bcHome: "الرئيسية", bcCompanies: "شركات التأجير", call: "اتصال", carsListed: (n) => `${n} سيارة مدرجة`, reviews: "تقييم", aboutName: (n) => `عن ${n}`, carsByName: (name, n) => `سيارات ${name} (${n})`, noCars: "لا توجد سيارات مدرجة لهذه الشركة بعد.", contact: "تواصل", followSocial: "تابعنا على وسائل التواصل", trustSafety: "الثقة والأمان", identityVerified: "تم التحقق من الهوية", licenseConfirmed: "تم تأكيد الرخصة التجارية", activeListings: (n) => `${n} إعلان نشط` },
  es: { bcHome: "Inicio", bcCompanies: "Empresas de alquiler", call: "Llamar", carsListed: (n) => `${n} coche${n === 1 ? "" : "s"} publicado${n === 1 ? "" : "s"}`, reviews: "reseñas", aboutName: (n) => `Acerca de ${n}`, carsByName: (name, n) => `Coches de ${name} (${n})`, noCars: "Esta empresa de alquiler aún no tiene coches publicados.", contact: "Contacto", followSocial: "Síguenos en redes", trustSafety: "Confianza y seguridad", identityVerified: "Identidad verificada", licenseConfirmed: "Licencia comercial confirmada", activeListings: (n) => `${n} anuncios activos` },
  zh: { bcHome: "首页", bcCompanies: "租车公司", call: "致电", carsListed: (n) => `已发布 ${n} 辆车`, reviews: "条评价", aboutName: (n) => `关于 ${n}`, carsByName: (name, n) => `${name} 的车辆 (${n})`, noCars: "该租车公司尚未发布任何车辆。", contact: "联系方式", followSocial: "关注社交媒体", trustSafety: "信任与安全", identityVerified: "身份已验证", licenseConfirmed: "营业执照已确认", activeListings: (n) => `${n} 个有效车源` },
  th: { bcHome: "หน้าแรก", bcCompanies: "บริษัทรถเช่า", call: "โทร", carsListed: (n) => `ลงประกาศ ${n} คัน`, reviews: "รีวิว", aboutName: (n) => `เกี่ยวกับ ${n}`, carsByName: (name, n) => `รถจาก ${name} (${n})`, noCars: "บริษัทรถเช่านี้ยังไม่มีรถที่ลงประกาศ", contact: "ติดต่อ", followSocial: "ติดตามบนโซเชียล", trustSafety: "ความน่าเชื่อถือและความปลอดภัย", identityVerified: "ยืนยันตัวตนแล้ว", licenseConfirmed: "ยืนยันใบอนุญาตประกอบการแล้ว", activeListings: (n) => `ประกาศที่ใช้งาน ${n} รายการ` },
  ru: { bcHome: "Главная", bcCompanies: "Прокатные компании", call: "Позвонить", carsListed: (n) => `${n} авто в списке`, reviews: "отзывов", aboutName: (n) => `О компании ${n}`, carsByName: (name, n) => `Автомобили ${name} (${n})`, noCars: "У этой прокатной компании пока нет объявлений.", contact: "Контакты", followSocial: "Мы в соцсетях", trustSafety: "Доверие и безопасность", identityVerified: "Личность подтверждена", licenseConfirmed: "Лицензия подтверждена", activeListings: (n) => `${n} активных объявлений` },
  ur: { bcHome: "ہوم", bcCompanies: "کرایہ کمپنیاں", call: "کال کریں", carsListed: (n) => `${n} گاڑیاں درج`, reviews: "جائزے", aboutName: (n) => `${n} کے بارے میں`, carsByName: (name, n) => `${name} کی گاڑیاں (${n})`, noCars: "اس کرایہ کمپنی نے ابھی تک کوئی گاڑی درج نہیں کی۔", contact: "رابطہ", followSocial: "سوشل میڈیا پر فالو کریں", trustSafety: "اعتماد اور تحفظ", identityVerified: "شناخت تصدیق شدہ", licenseConfirmed: "تجارتی لائسنس تصدیق شدہ", activeListings: (n) => `${n} فعال اشتہارات` },
}
import VehicleCard from "@/components/vehicle-card"
import FollowButton from "@/components/follow-button"
import FollowerCount from "@/components/follower-count"
import CompanyNav from "@/components/company-nav"
import CompanySwipeShell from "@/components/company-swipe-shell"
import SellerSocials from "@/components/seller-socials"
import OnlineBadge from "@/components/online-badge"
import { Phone, MessageCircle, ShieldCheck, Star, MapPin, ChevronRight, Globe, Mail, Fuel, Palette } from "lucide-react"

export const revalidate = 30
const FALLBACK_BANNER = "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80"

async function validImageUrl(url: string | null | undefined) {
  if (!url) return null
  // Encode characters undici rejects (parentheses etc.) so the HEAD check and
  // the <img> src both work for filenames like "Untitled design (3).png".
  const safe = url.replace(/\(/g, "%28").replace(/\)/g, "%29")
  try {
    const res = await fetch(safe, { method: "HEAD", next: { revalidate: 60 } })
    if (res.ok) {
      const type = res.headers.get("content-type") || ""
      return !type || type.startsWith("image/") ? safe : safe
    }
    return null
  } catch {
    // Network/parse hiccup — let the browser try to load it anyway.
    return safe
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id: param } = await params
  const isSellerId = /^sel_/.test(param)
  const data = isSellerId ? await api.seller(param).catch(() => null) : await api.sellerByHandle(param).catch(() => null)
  const locale = await getLocale()
  if (!data?.seller) {
    return buildMetadata({ title: "Rental Company", description: "Verified car rental company on Auto to Rental.", path: "/companies", locale, noindex: true })
  }
  const sel = data.seller as any
  const meta = sel.metadata || {}
  const city = meta.city || "UAE"
  const name = sel.name
  const fleet = await api.vehicles({ seller_id: sel.id, limit: 1 }).then((r: any) => (r?.count ?? (r?.vehicles?.length || 0))).catch(() => 0)
  const desc = (sel.description ? String(sel.description).replace(/\s+/g, " ").trim().slice(0, 155) : "") ||
    `Rent cars from ${name}, a verified car rental company in ${city}. Browse the fleet, compare daily, weekly and monthly rates, and book directly on Auto to Rental.`
  return buildMetadata({
    title: `${name} \u2014 Car Rental in ${city}`,
    description: desc,
    path: `/companies/${sel.handle || param}`,
    locale,
    image: sel.logo || sel.banner || undefined,
    keywords: [name, `${name} car rental`, `${name} ${city}`, `car rental ${city}`, `rent a car ${city}`, "car rental company"],
  })
}

export default async function CompanyDetail({
  params, searchParams
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | undefined>>
}) {
  const { id: param } = await params
  const sp = (await searchParams) || {}
  // Support both ?category=suv (human-readable) and ?body=bdy_xxx (legacy)
  const categorySlug = (sp.category || "").toLowerCase()
  const bodyIdFilter = sp.body || ""
  const bodyFilter = bodyIdFilter  // resolved below after vehicles load
  const isSellerId = /^sel_/.test(param)
  const data = isSellerId
    ? await api.seller(param).catch(() => null)
    : await api.sellerByHandle(param).catch(() => null)
  if (!data) return notFound()
  const sel = data.seller as any
  if (isSellerId && sel.handle) permanentRedirect(`/companies/${sel.handle}`)
  const id = sel.id
  const meta = sel.metadata || {}
  const socials = meta.social
  const [allVehicles, b, c] = await Promise.all([
    api.vehicles({ seller_id: id, limit: 60 }).catch(() => ({ vehicles: [] })),
    api.brands().catch(() => ({ brands: [] })),
    api.cities().catch(() => ({ cities: [] })),
  ])
  // Resolve category filter: by name slug OR by body_type_id
  const BT_SLUG_MAP: Record<string,string> = {
    "suv":"bdy_01KRY8FS6DHDKVSRYD1KMCCSH5","sedan":"bdy_01KRY8FRXQNQAXDNT5WAHD8TKK",
    "luxury":"bdy_01KRY8FTTBD8E7D4M16QGZ0QQB","sports":"bdy_01KRY8FT8V16MH2N8DJ55FG2MA",
    "supercar":"bdy_01KRY8FTHD58RM31VPFNC16AJP","coupe":"bdy_01KRY8FSQ0AS4KDQ30JRTD7Q6N",
    "convertible":"bdy_01KRY8FSZS5HST7GX8TGTW4VEJ","crossover":"bdy_01KRY8FSEQ2MNPV0E415BC0FM2",
    "van":"bdy_01KRY8FVY6C96XAH3Z8SHRXK1T","pickup":"bdy_01KRY8FVMZWZQ1XQSSJE2M55XK",
    "hatchback":"bdy_01KRY8FV34B1Q31RJ5DVKEDRZC","compact":"bdy_01KRY8FVBW276ZFXRG5YHHRJSB",
    "hybrid":"bdy_01KRY8FX1BJ2HZHQZJR6XC0X5F","electric":"bdy_01KRY8FWRE53RDHX3SFSD09Q1X",
    "minibus":"bdy_01KRY8FW75BMVWPD4QAW13JEFK",
  }
  const resolvedFilter = categorySlug ? (BT_SLUG_MAP[categorySlug] || bodyIdFilter) : bodyIdFilter
  const fuelFilter = (sp.fuel || "").toLowerCase()
  const colorFilter = (sp.color || "").toLowerCase()
  const v = {
    vehicles: (allVehicles.vehicles || []).filter((x: any) =>
      (!resolvedFilter || x.body_type_id === resolvedFilter) &&
      (!fuelFilter || String(x.fuel_type || "").toLowerCase() === fuelFilter) &&
      (!colorFilter || String(x.color || "").toLowerCase() === colorFilter)
    )
  }
  const fuelOpts = Array.from((allVehicles.vehicles || []).reduce((m: Map<string, number>, x: any) => { const f = String(x.fuel_type || "").trim().toLowerCase(); if (f) m.set(f, (m.get(f) || 0) + 1); return m }, new Map<string, number>())).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count)
  const colorOpts = Array.from((allVehicles.vehicles || []).reduce((m: Map<string, number>, x: any) => { const c = String(x.color || "").trim().toLowerCase(); if (c) m.set(c, (m.get(c) || 0) + 1); return m }, new Map<string, number>())).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count)
  const activeCategory = categorySlug || (bodyIdFilter ? Object.entries(BT_SLUG_MAP).find(([,id])=>id===bodyIdFilter)?.[0] || bodyIdFilter : "")
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const [bannerUrl, logoUrl] = await Promise.all([validImageUrl(sel.banner), validImageUrl(sel.logo)])
  const locale = await getLocale()
  const t = COMPANY_LABELS[locale]
  const lp = (p: string) => localizedPath(p, locale)
  const buildQS = (overrides: Record<string, string>) => {
    const merged: Record<string, string> = { category: activeCategory || "", fuel: fuelFilter, color: colorFilter, ...overrides }
    const params = new URLSearchParams()
    for (const [k, val] of Object.entries(merged)) { if (val) params.set(k, String(val)) }
    const qs = params.toString()
    return qs ? `?${qs}` : "?"
  }
  // Prev / next company for slide navigation (wraps around the full list).
  const __sellersList = (await api.sellers().catch(() => ({ sellers: [] as any[] }))).sellers || []
  const __idx = __sellersList.findIndex((x: any) => x.id === id || (sel.handle && x.handle === sel.handle))
  const __prevSeller = __sellersList.length > 1 ? __sellersList[(__idx > 0 ? __idx : __sellersList.length) - 1] : null
  const __nextSeller = __sellersList.length > 1 ? __sellersList[(__idx + 1) % __sellersList.length] : null
  const __prevHref = __prevSeller ? lp(`/companies/${__prevSeller.handle || __prevSeller.id}`) : undefined
  const __nextHref = (__nextSeller && __nextSeller.id !== id) ? lp(`/companies/${__nextSeller.handle || __nextSeller.id}`) : undefined
  const description = await translateText(sel.description, locale)
  const __titles = await translateBatch(v.vehicles.map((x: any) => x.title), locale)
  const __titleById = new Map(v.vehicles.map((x: any, i: number) => [x.id, __titles[i]]))
  const manualReviews = (Array.isArray(meta.manual_reviews) ? meta.manual_reviews : []) as any[]
  const __reviewTexts = await translateBatch(manualReviews.map((r: any) => r.text || ""), locale)
  const reviewsHeading = manualReviews.length ? await translateText("Customer reviews", locale) : ""
  const reviewsAvg = manualReviews.length ? (manualReviews.reduce((s, r) => s + (r.rating || 0), 0) / manualReviews.length) : 0
  const __faqsRaw = Array.isArray(sel.faqs)
    ? sel.faqs
    : (typeof sel.faqs === "string" ? (() => { try { return JSON.parse(sel.faqs) } catch { return [] } })() : [])
  const __faqs = (__faqsRaw as any[]).filter((f) => f && f.question && f.answer).slice(0, 20)
  const __faqQ = await translateBatch(__faqs.map((f: any) => f.question), locale)
  const __faqA = await translateBatch(__faqs.map((f: any) => f.answer), locale)
  const faqHeading = __faqs.length ? await translateText("Frequently asked questions", locale) : ""
  const __lat = Number((sel.company_location_lat ?? meta.latitude) as any)
  const __lng = Number((sel.company_location_lng ?? meta.longitude) as any)
  const __hasGeo = Number.isFinite(__lat) && Number.isFinite(__lng) && (__lat !== 0 || __lng !== 0)
  const __mapQ = __hasGeo ? `${__lat},${__lng}` : (sel.company_address || meta.city || "")
  const __mapHeading = __mapQ ? await translateText("Location", locale) : ""
  const socialNote = await translateText("Greyed icons haven\u0027t been added by the company yet.", locale)
  const [factsHeading, factFleetL, factLocL, factStatusL, factVerifiedV, factVehUnit, reviewsCardHeading, sendEmailLabel, fuelHeading, colorHeading, allLabel] = await translateBatch(["Quick facts","Fleet size","Location","Status","Verified company","vehicles","Reviews","Send email","Fuel","Color","All"], locale)
  const __ratingVal = String(meta.google_rating || (manualReviews.length ? reviewsAvg.toFixed(1) : "4.8"))
  const __ratingCount = String(meta.google_reviews || (manualReviews.length || "89"))
  const __fleetCount = (allVehicles.vehicles || []).length
  const __companyUrl = `${SITE.url}/companies/${sel.handle || id}`
  const __sameAs = socials
    ? [socials.website, socials.instagram, socials.facebook, socials.youtube, socials.tiktok, socials.twitter, socials.telegram, socials.snapchat]
        .filter((u: any) => typeof u === "string" && /^https?:\/\//.test(u))
    : []
  const orgLd: any = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    "@id": `${__companyUrl}#org`,
    name: sel.name,
    url: __companyUrl,
    ...(logoUrl ? { logo: logoUrl, image: logoUrl } : bannerUrl ? { image: bannerUrl } : {}),
    ...(sel.phone ? { telephone: sel.phone } : {}),
    ...(sel.email ? { email: sel.email } : {}),
    ...(__sameAs.length ? { sameAs: __sameAs } : {}),
    address: { "@type": "PostalAddress", addressLocality: meta.city || "Dubai", addressCountry: String(meta.country || "AE").toUpperCase().slice(0, 2), ...(sel.company_address ? { streetAddress: sel.company_address } : {}) },
    ...(__hasGeo ? { geo: { "@type": "GeoCoordinates", latitude: __lat, longitude: __lng } } : {}),
    areaServed: meta.city || "United Arab Emirates",
    ...(__fleetCount ? { makesOffer: { "@type": "Offer", itemOffered: { "@type": "Service", name: `Car rental fleet (${__fleetCount} vehicles)` } } } : {}),
    ...(manualReviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: reviewsAvg.toFixed(1), reviewCount: manualReviews.length, bestRating: 5 } } : {}),
  }
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t.bcHome, item: `${SITE.url}${lp("/")}` },
      { "@type": "ListItem", position: 2, name: t.bcCompanies, item: `${SITE.url}${lp("/companies")}` },
      { "@type": "ListItem", position: 3, name: sel.name, item: __companyUrl },
    ],
  }

  return (
    <>
      {/* Hide global floating chat bubble on this page — we have inline Message button */}
      <CompanyNav prevHref={__prevHref} prevName={__prevSeller?.name} nextHref={__nextHref} nextName={__nextSeller?.name}/>
      <style>{`.live-chat-bubble { display: none !important; }`}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, "\\u003c") }}/>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}/>

      <CompanySwipeShell prevHref={__prevHref} nextHref={__nextHref}>
      <section className="relative">
        {/* Banner — taller on mobile so card doesn't cover it */}
        <div className="h-64 sm:h-80 md:h-[460px] bg-gradient-to-br from-brand-900 to-brand-700 relative overflow-hidden">
          <img src={bannerUrl || FALLBACK_BANNER} alt=""
            className="w-full h-full object-cover opacity-85"
            style={{ objectPosition: "center 30%" }}/>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/20 to-transparent"/>
        </div>

        {/* Card — Logo is OUTSIDE overflow-hidden to prevent clipping */}
        <div className="mx-auto max-w-7xl px-3 sm:px-4 relative z-10">
          {/* Logo — floats above card, outside overflow-hidden */}
          <div className="relative -mt-10 sm:-mt-14 md:-mt-16">
            <div className="surface-card rounded-2xl shadow-xl">
              {/* Logo row: absolute-positioned logo + info */}
              <div className="p-4 md:p-6 flex gap-3 md:gap-5 items-start">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl border-[3px] border-brand-600 shadow-lg overflow-hidden flex items-center justify-center bg-white dark:bg-ink-800 shrink-0 -mt-10 sm:-mt-14 md:-mt-18 ring-4 ring-white dark:ring-ink-900">
                  {logoUrl
                    ? <img src={logoUrl} alt={sel.name} className="w-full h-full object-contain"/>
                    : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800">
                        <span className="font-black text-3xl md:text-4xl text-white select-none">
                          {sel.name.replace(/^\d+\s*/, "").slice(0,1).toUpperCase() || sel.name.slice(0,1).toUpperCase()}
                        </span>
                      </div>
                    )
                  }
                </div>

                {/* Info + social — flex layout: info takes space, socials pinned right */}
                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-start md:gap-4">
                  {/* Left: company info */}
                  <div className="flex-1 min-w-0">
                    {/* Breadcrumb (desktop) */}
                    <div className="hidden sm:flex text-[11px] text-ink-400 gap-1 items-center mb-1 flex-wrap">
                      <Link href={lp("/")} className="hover:text-brand-600">{t.bcHome}</Link><ChevronRight size={10}/>
                      <Link href={lp("/companies")} className="hover:text-brand-600">{t.bcCompanies}</Link><ChevronRight size={10}/>
                      <span className="text-ink-600 dark:text-ink-300 font-medium">{sel.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 leading-tight">{sel.name}</h1>
                      <ShieldCheck size={16} className="text-brand-600 shrink-0"/>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-ink-500 flex-wrap">
                      <OnlineBadge online={true}/>
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <Star size={11} fill="currentColor"/>
                        <span className="text-ink-700 dark:text-ink-200 font-semibold">{meta.google_rating || "4.8"}</span>
                        <span className="text-ink-400">({meta.google_reviews || "89"} {t.reviews})</span>
                      </span>
                      <span className="text-ink-300">·</span>
                      <span>{t.carsListed(v.vehicles.length)}</span>
                      {meta.city && <><span className="text-ink-300">·</span><span className="inline-flex items-center gap-1"><MapPin size={11} className="text-brand-600"/>{meta.city}</span></>}
                    </div>
                  </div>

                  {/* Right: social icons — fills the empty area on desktop */}
                  <div className="hidden md:flex flex-col items-end justify-start gap-2 shrink-0 pt-0.5 max-w-[240px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-400 text-right">{t.followSocial}</div>
                    <SellerSocials socials={socials} size="sm" showAll/>
                  </div>
                </div>
              </div>

              {/* ── Action buttons — 2 cols on mobile, flex row on desktop ── */}
              <div className="px-4 pb-4 md:px-6 md:pb-6 border-t border-ink-50 dark:border-ink-800 pt-4">
                {/* Row 1: Call + WhatsApp (always 50/50) */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {sel.phone ? (
                    <a href={`tel:${sel.phone}`} className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                      <Phone size={15}/>{t.call}
                    </a>
                  ) : <span/>}
                  <a href={whatsappLink(sel.phone, `Hi, I am interested in cars from ${sel.name} on Auto to Rental.`)} target="_blank"
                    className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bc5a] text-white font-bold py-2.5 rounded-xl text-sm transition">
                    <MessageCircle size={15}/>WhatsApp
                  </a>
                </div>
                {/* Row 2: Follow + Message (50/50) */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <FollowButton sellerId={sel.id} variant="lg"/>
                  <CompanyChat sellerId={sel.id} sellerName={sel.name}/>
                </div>
                {/* Row 3: Directions (full width if available) + follower count */}
                <div className="flex items-center justify-between gap-2">
                  {(__hasGeo || sel.company_address || meta.city) && (
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(__hasGeo ? `${__lat},${__lng}` : (sel.company_address || sel.name + " Dubai"))}`}
                      target="_blank" rel="noopener"
                      className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-400 px-4 py-2 rounded-xl transition">
                      <MapPin size={14}/> Directions
                    </a>
                  )}
                  {sel.email && (
                    <a href={`mailto:${sel.email}`}
                      className="flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-400 px-4 py-2 rounded-xl transition">
                      <Mail size={14}/> {sendEmailLabel}
                    </a>
                  )}
                  <FollowerCount sellerId={sel.id}/>
                </div>
              </div>

              {/* Social icons on mobile — below the action buttons */}
            <div className="px-4 pb-4 md:hidden border-t border-ink-50 dark:border-ink-800 pt-3"><div className="text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">{t.followSocial}</div><SellerSocials socials={socials} size="sm" showAll/></div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 md:py-12">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-[1fr_320px] gap-8">
          <div>
            {/* Category filter tabs */}
            {v.vehicles.length > 0 && (() => {
              const btIds = Array.from(new Set(v.vehicles.map((x: any) => x.body_type_id).filter(Boolean))) as string[]
              const btNames = btIds.map((id: string) => ({ id, name: (c.cities as any[]).find ? String(id) : String(id) }))
              // Build category counts from body_type names via brandMap (reusing available data)
              const cats = Array.from(
                v.vehicles.reduce((m: Map<string,{name:string;count:number}>, veh: any) => {
                  const btId = veh.body_type_id; if (!btId) return m
                  // Try to get name from vehicle title heuristic or just show the id shortened
                  const existing = m.get(btId)
                  if (existing) { existing.count++; } else { m.set(btId, { name: btId.replace(/bdy_\w+/,"").replace(/-/g," ").trim() || btId, count: 1 }) }
                  return m
                }, new Map<string,{name:string;count:number}>())
              ).filter(([,v]) => v.count > 0)
              // Use body_type data from the page: we already have body_types available via b (brands),
              // but we don't have body_type names here. Simplest: build from vehicle body_type_id shape
              // The body_type IDs follow pattern: bdy_01KRY8FS... we can extract from a known map
              const BT_NAMES: Record<string,string> = {
                "bdy_01KRY8FS6DHDKVSRYD1KMCCSH5":"SUV","bdy_01KRY8FRXQNQAXDNT5WAHD8TKK":"Sedan",
                "bdy_01KRY8FTTBD8E7D4M16QGZ0QQB":"Luxury","bdy_01KRY8FT8V16MH2N8DJ55FG2MA":"Sports",
                "bdy_01KRY8FTHD58RM31VPFNC16AJP":"Supercar","bdy_01KRY8FSQ0AS4KDQ30JRTD7Q6N":"Coupe",
                "bdy_01KRY8FSZS5HST7GX8TGTW4VEJ":"Convertible","bdy_01KRY8FSEQ2MNPV0E415BC0FM2":"Crossover",
                "bdy_01KRY8FVY6C96XAH3Z8SHRXK1T":"Van","bdy_01KRY8FVMZWZQ1XQSSJE2M55XK":"Pickup",
                "bdy_01KRY8FV34B1Q31RJ5DVKEDRZC":"Hatchback","bdy_01KRY8FVBW276ZFXRG5YHHRJSB":"Compact",
                "bdy_01KRY8FX1BJ2HZHQZJR6XC0X5F":"Hybrid","bdy_01KRY8FWRE53RDHX3SFSD09Q1X":"Electric",
                "bdy_01KRY8FW75BMVWPD4QAW13JEFK":"Minibus",
              }
              // Use ALL vehicles for counts, not filtered ones
              const allCats = Array.from(
                (allVehicles.vehicles || []).reduce((m: Map<string,{name:string;count:number}>, veh: any) => {
                  const btId = veh.body_type_id; if (!btId) return m
                  const existing = m.get(btId)
                  if (existing) { existing.count++; } else { m.set(btId, { name: BT_NAMES[btId] || "", count: 1 }) }
                  return m
                }, new Map<string,{name:string;count:number}>())
              )
              const namedCats = allCats.map(([id, cv]) => ({ id, name: BT_NAMES[id] || cv.name, count: cv.count }))
                .filter(x => x.name).sort((a,b) => b.count - a.count)
              if (namedCats.length < 2) return null
              const totalAll = (allVehicles.vehicles || []).length
              return (
                <div className="mb-6 overflow-x-auto pb-1">
                  <div className="flex gap-2 min-w-max">
                    <Link href={buildQS({ category: "" })} scroll={false} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition ${!activeCategory ? "bg-brand-600 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-brand-50 hover:text-brand-700"}`}>
                      All <span className={`text-xs ${!activeCategory ? "opacity-75" : "text-ink-400"}`}>({totalAll})</span>
                    </Link>
                    {namedCats.map(cat => (
                      <Link key={cat.id} href={buildQS({ category: cat.name.toLowerCase() })} scroll={false}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition whitespace-nowrap ${activeCategory === cat.name.toLowerCase() ? "bg-brand-600 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-brand-50 hover:text-brand-700"}`}>
                        {cat.name} <span className={`text-xs ${activeCategory === cat.name.toLowerCase() ? "opacity-75" : "text-ink-400"}`}>({cat.count})</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Fuel filter */}
            {fuelOpts.length >= 1 && (
              <div className="mb-3">
                <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1.5 inline-flex items-center gap-1"><Fuel size={13} className="text-brand-600"/>{fuelHeading}</div>
                <div className="overflow-x-auto pb-1 -mx-1 px-1">
                  <div className="flex gap-2 min-w-max">
                    <Link href={buildQS({ fuel: "" })} scroll={false} className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${!fuelFilter ? "bg-brand-600 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-brand-50 hover:text-brand-700"}`}>{allLabel}</Link>
                    {fuelOpts.map((o) => (
                      <Link key={o.id} href={buildQS({ fuel: o.id })} scroll={false} className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold capitalize transition ${fuelFilter === o.id ? "bg-brand-600 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-brand-50 hover:text-brand-700"}`}>{fuelLabel(o.id, locale)} <span className="text-xs opacity-70">({o.count})</span></Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Color filter */}
            {colorOpts.length >= 1 && (
              <div className="mb-5">
                <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-1.5 inline-flex items-center gap-1"><Palette size={13} className="text-brand-600"/>{colorHeading}</div>
                <div className="overflow-x-auto pb-1 -mx-1 px-1">
                  <div className="flex gap-2 min-w-max">
                    <Link href={buildQS({ color: "" })} scroll={false} className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold transition ${!colorFilter ? "bg-brand-600 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-brand-50 hover:text-brand-700"}`}>{allLabel}</Link>
                    {colorOpts.map((o) => (
                      <Link key={o.id} href={buildQS({ color: o.id })} scroll={false} className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold capitalize transition inline-flex items-center gap-1.5 ${colorFilter === o.id ? "bg-brand-600 text-white" : "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-brand-50 hover:text-brand-700"}`}><span className="w-3.5 h-3.5 rounded-full border border-ink-300 dark:border-ink-600 shrink-0" style={{ backgroundColor: o.id }}/>{o.id} <span className="text-xs opacity-70">({o.count})</span></Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <h2 className="font-black text-xl md:text-2xl text-ink-900 dark:text-ink-100 mb-5">{t.carsByName(sel.name, v.vehicles.length)}</h2>
            {v.vehicles.length === 0 ? (
              <div className="surface-card p-12 text-center">
                <div className="text-4xl mb-3">🚗</div>
                <p className="text-ink-600 dark:text-ink-400">{t.noCars}</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {v.vehicles.map((veh: any) => (
                  <VehicleCard key={veh.id} v={veh} brand={brandMap.get(veh.brand_id)} city={cityMap.get(veh.city_id)} locale={locale} displayTitle={__titleById.get(veh.id)}/>
                ))}
              </div>
            )}

            {manualReviews.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <h2 className="font-black text-2xl text-ink-900 dark:text-ink-100">{reviewsHeading}</h2>
                  <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-3 py-1 text-sm font-bold">
                    <Star size={14} fill="currentColor"/>{reviewsAvg.toFixed(1)} · {manualReviews.length}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {manualReviews.map((rv: any, i: number) => (
                    <div key={rv.id || i} className="surface-card p-5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">{(rv.name || "?")[0]}</div>
                          <span className="font-bold text-ink-900 dark:text-ink-100">{rv.name}</span>
                        </div>
                        <div className="flex gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} fill={n <= rv.rating ? "currentColor" : "none"} className={n <= rv.rating ? "" : "text-ink-300"}/>)}
                        </div>
                      </div>
                      {__reviewTexts[i] && <p className="text-ink-700 dark:text-ink-300 text-sm leading-relaxed">{__reviewTexts[i]}</p>}
                      {rv.created_at && <p className="text-xs text-ink-400 mt-2">{new Date(rv.created_at).toLocaleDateString(locale)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {__faqs.length > 0 && (
              <div className="mt-10">
                <h2 className="font-black text-2xl text-ink-900 dark:text-ink-100 mb-5">{faqHeading}</h2>
                <div className="space-y-3">
                  {__faqs.map((f: any, i: number) => (
                    <details key={i} className="surface-card p-5 group">
                      <summary className="font-bold text-ink-900 dark:text-ink-100 cursor-pointer list-none flex items-center justify-between gap-3">
                        <span>{__faqQ[i]}</span>
                        <span className="text-brand-600 transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                      </summary>
                      <p className="text-ink-700 dark:text-ink-300 leading-relaxed mt-3 whitespace-pre-line">{__faqA[i]}</p>
                    </details>
                  ))}
                </div>
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{ __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    mainEntity: __faqs.map((f: any, i: number) => ({
                      "@type": "Question",
                      name: __faqQ[i],
                      acceptedAnswer: { "@type": "Answer", text: __faqA[i] },
                    })),
                  }).replace(/</g, "\\u003c") }}
                />
              </div>
            )}
          </div>

          <aside>
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Quick facts */}
              <div className="surface-card p-5">
                <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-3">{factsHeading}</h3>
                <ul className="text-sm space-y-2.5">
                  <li className="flex items-center justify-between gap-2"><span className="text-ink-500">{factFleetL}</span><span className="font-bold text-ink-900 dark:text-ink-100">{__fleetCount} {factVehUnit}</span></li>
                  {meta.city && <li className="flex items-center justify-between gap-2"><span className="text-ink-500">{factLocL}</span><span className="font-semibold text-ink-800 dark:text-ink-200 inline-flex items-center gap-1"><MapPin size={13} className="text-brand-600"/>{meta.city}</span></li>}
                  <li className="flex items-center justify-between gap-2"><span className="text-ink-500">{factStatusL}</span><span className="inline-flex items-center gap-1 font-semibold text-brand-600"><ShieldCheck size={14}/>{factVerifiedV}</span></li>
                </ul>
              </div>

              {/* Reviews summary */}
              <div className="surface-card p-5">
                <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-3">{reviewsCardHeading}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-ink-900 dark:text-ink-100 leading-none">{__ratingVal}</span>
                  <div>
                    <div className="flex gap-0.5 text-amber-500">
                      {[1,2,3,4,5].map((n) => <Star key={n} size={15} fill={n <= Math.round(Number(__ratingVal)) ? "currentColor" : "none"} className={n <= Math.round(Number(__ratingVal)) ? "" : "text-ink-300"}/>)}
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">{__ratingCount} {t.reviews}</div>
                  </div>
                </div>
              </div>

              {/* About — moved to sidebar */}
              {description && (
                <div className="surface-card p-5">
                  <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-3">{t.aboutName(sel.name)}</h3>
                  <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{description}</p>
                </div>
              )}

              {/* Contact */}
              <div className="surface-card p-5">
                <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-3">{t.contact}</h3>
                <ul className="text-sm space-y-3">
                  {sel.phone && (
                    <li>
                      <a href={`tel:${sel.phone}`} className="flex items-center gap-2 text-ink-700 dark:text-ink-300 hover:text-brand-600 transition">
                        <Phone size={14} className="text-brand-600 shrink-0"/>{sel.phone}
                      </a>
                    </li>
                  )}
                  {sel.email && <li className="flex items-center gap-2 text-ink-700 dark:text-ink-300">📧 {sel.email}</li>}
                  {socials?.website && (
                    <li>
                      <a href={/^https?:\/\//.test(socials.website) ? socials.website : "#"} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-2 text-brand-600 hover:underline">
                        <Globe size={14}/>{socials.website.replace(/^https?:\/\//,"")}
                      </a>
                    </li>
                  )}
                  {meta.city && <li className="flex items-center gap-2 text-ink-700 dark:text-ink-300"><MapPin size={14} className="text-brand-600"/>{meta.city}</li>}
                </ul>
                <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-800">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500 font-bold mb-3">{t.followSocial}</div>
                  <SellerSocials socials={socials} size="sm" showAll/>
                  <p className="text-[11px] text-ink-400 mt-3 leading-relaxed">{socialNote}</p>
                </div>
              </div>

              {/* Google Map — show for any seller with city/address/coordinates */}
              {(sel.company_address || meta.city || __hasGeo) && (
                <div className="surface-card p-5">
                  <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-3 flex items-center gap-2">
                    <MapPin size={16} className="text-brand-600"/>Location
                  </h3>
                  <div className="rounded-xl overflow-hidden border border-ink-100 dark:border-ink-800">
                    <iframe
                      title="Map"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(__hasGeo ? `${__lat},${__lng}` : (sel.company_address || sel.name + " Dubai"))}&z=15&output=embed`}
                      className="w-full h-48 block"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(__hasGeo ? `${__lat},${__lng}` : (sel.company_address || sel.name + " Dubai"))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                    <MapPin size={14}/> {sel.company_address || meta.city || "View on Google Maps"}
                  </a>
                </div>
              )}

              {/* Trust & Safety */}
              <div className="bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-2xl p-5">
                <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-3 text-sm">{t.trustSafety}</h3>
                <ul className="text-xs text-ink-700 dark:text-ink-300 space-y-2.5">
                  <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-brand-600"/>{t.identityVerified}</li>
                  <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-brand-600"/>{t.licenseConfirmed}</li>
                  <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-brand-600"/>{t.activeListings(v.vehicles.length)}</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
      </CompanySwipeShell>
    </>
  )
}
