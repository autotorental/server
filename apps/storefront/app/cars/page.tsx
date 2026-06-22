
import { getLocale } from "@/lib/locale-server"
import { t, tf } from "@/lib/i18n"

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const locale = await getLocale()
  const sp = (await searchParams) || {}
  const period = sp.period
  if (period === "monthly" || period === "weekly" || period === "daily") {
    const country = (sp.country && /^[a-z]{2}$/.test(sp.country)) ? sp.country : await getServerCountry()
    const cName = country === "ae" ? t(locale, "country_ae") : country === "sy" ? t(locale, "country_sy") : countryLabel(country)
    const pLabel = t(locale, period === "monthly" ? "sh_monthly" : "sh_weekly")
    return buildMetadata({
      title: tf(locale, "cars_meta_title_p", { p: pLabel, c: cName }),
      description: tf(locale, "cars_meta_desc_p", { p: pLabel, c: cName }),
      path: `/${period}-car-rental-dubai`,
      locale,
      keywords: [`${period} car rental ${cName}`, `long term car rental ${cName}`, `${period} car hire`],
    })
  }
  if (sp.body) {
    const { body_types = [] } = await api.body_types().catch(() => ({ body_types: [] as any[] }))
    const bt = body_types.find((x: any) => x.id === sp.body)
    if (bt) {
      const slug = bt.slug || String(bt.name).toLowerCase().replace(/[^a-z0-9]+/g, "-")
      return buildMetadata({
        title: `${bt.name} Rental — Compare ${bt.name} Hire Deals`,
        description: `Rent a ${bt.name} from verified rental companies. Compare ${bt.name} rental deals, daily, weekly and monthly.`,
        path: `/vehicle-category/${slug}`,
        locale,
        noindex: true, // canonical /vehicle-category/slug is the indexable version; this ?body= URL is a duplicate filter
        keywords: [`${bt.name} rental`, `${bt.name} car rental`, `rent ${bt.name}`],
      })
    }
  }
  const hasFilters = !!(sp.brand || sp.city || sp.transmission || sp.body || sp.country)
  const dcountry = (sp.country && /^[a-z]{2}$/.test(sp.country)) ? sp.country : await getServerCountry()
  const dName = dcountry === "ae" ? t(locale, "country_ae") : dcountry === "sy" ? t(locale, "country_sy") : countryLabel(dcountry)
  return buildMetadata({
    title: `${tf(locale, "cars_h1_all", { c: dName })} | Auto to Rental`,
    description: t(locale, "cars_meta_desc"),
    path: "/cars",
    locale,
    noindex: hasFilters, // filtered /cars views are duplicates of the clean /cars page
    keywords: [
      "cars for rent in UAE",
      "rent a car UAE",
      "UAE car rental by city",
      "UAE car rental by brand",
    ],
  })
}
import Link from "next/link"
import { api } from "@/lib/api"
import { buildMetadata } from "@/lib/seo"
import VehicleCard from "@/components/vehicle-card"
import CarsBanner from "@/components/cars-banner"
import { SlidersHorizontal, X } from "lucide-react"
import { getServerCountry, countryFlag, countryLabel } from "@/lib/country-server"
import { localizedPath, type Locale } from "@/lib/locales"
import { BreadcrumbJsonLd, FAQPageJsonLd, ItemListJsonLd } from "@/components/jsonld"
import { translateBatch } from "@/lib/mt"
import MobileFilterBar from "@/components/mobile-filter-bar"

export const revalidate = 30

export default async function CarsPage({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const sp = await searchParams
  const [serverCountry, locale, b, c, bt, s] = await Promise.all([
    getServerCountry(),
    getLocale(),
    api.brands().catch(() => ({ brands: [] })),
    api.cities().catch(() => ({ cities: [] })),
    api.body_types().catch(() => ({ body_types: [] })),
    api.sellers().catch(() => ({ sellers: [] })),
  ])

  // Which countries actually have visible cars right now? We probe the real
  // /store/vehicles route (limit:1) so the result honors the same seller-subscription
  // filtering the listing uses — a country whose sellers are all expired counts as empty.
  const allCountryCodes = Array.from(new Set(
    c.cities.map((x: any) => String(x.country_code || "").toLowerCase()).filter((x: string) => /^[a-z]{2}$/.test(x))
  )) as string[]
  const presence = await Promise.all(
    allCountryCodes.map((cc: string) =>
      api.vehicles({ country: cc, limit: 1 }).then((r: any) => (r.vehicles?.length || 0) > 0).catch(() => false)
    )
  )
  const countriesWithCars = allCountryCodes.filter((_, i) => presence[i])

  // Default the country filter to the visitor's geo-IP country IF it has cars;
  // otherwise fall back to the primary market (or the first country that has any).
  let country = (sp.country && /^[a-z]{2}$/.test(sp.country)) ? sp.country : serverCountry
  if (!sp.country && countriesWithCars.length > 0 && !countriesWithCars.includes(country)) {
    country = countriesWithCars.includes("ae") ? "ae" : (countriesWithCars[0] || "ae")
  }

  const lp = (p: string) => localizedPath(p, locale)
  const filters = { brand_id: sp.brand, city_id: sp.city, body_type_id: sp.body, transmission: sp.transmission, country }
  let v = await api.vehicles({ ...filters, limit: 60 }).catch(() => ({ vehicles: [] as any[] }))

  // SEO FIX: when the auto-detected country has no cars (e.g. Googlebot=US)
  // and the user did NOT explicitly pick a country/filter, fall back to the
  // primary market so search engines index real inventory, not an empty page.
  const userPickedFilters = !!(sp.country || sp.brand || sp.city || sp.body || sp.transmission)
  if ((!v.vehicles || v.vehicles.length === 0) && !userPickedFilters && country !== "ae") {
    const fb = await api.vehicles({ ...filters, country: "ae", limit: 60 }).catch(() => ({ vehicles: [] }))
    if (fb.vehicles && fb.vehicles.length > 0) v = fb as any
  }
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const sellerMap = new Map(s.sellers.map((x: any) => [x.id, x.name]))
  const countryCities = c.cities.filter((x: any) => x.country_code === country)
  const activeBrand = b.brands.find((x: any) => x.id === sp.brand)
  const activeCity = c.cities.find((x: any) => x.id === sp.city)
  const activeBody = bt.body_types.find((x: any) => x.id === sp.body)
  const period = sp.period || "daily"
  const periodLabel = t(locale, period === "monthly" ? "sh_monthly" : period === "weekly" ? "sh_weekly" : "sh_daily")
  const countryName = country === "ae" ? t(locale, "country_ae") : country === "sy" ? t(locale, "country_sy") : countryLabel(country)
  // International: only countries that actually have visible cars — hide empty ones
  // (a country with cities but zero active listings used to show up and return "0 results").
  const countryOptions = countriesWithCars
    .map((cc: string) => ({ id: cc, name: `${countryFlag(cc)} ${cc === "ae" ? t(locale, "country_ae") : cc === "sy" ? t(locale, "country_sy") : countryLabel(cc)}` }))
    .sort((a, b) => a.name.localeCompare(b.name))
  const topBrandLinks = b.brands.slice(0, 8)
  const topCityLinks = countryCities.slice(0, 8)
  const homeLabel = ({ en: "Home", ar: "الرئيسية", es: "Inicio", zh: "首页", th: "หน้าแรก", ru: "Главная", ur: "ہوم" } as Record<Locale, string>)[locale]
  const carsLabel = ({ en: "Cars", ar: "السيارات", es: "Autos", zh: "租车", th: "รถเช่า", ru: "Авто", ur: "گاڑیاں" } as Record<Locale, string>)[locale]
  const countryFilterLabel = ({ en: "Country", ar: "الدولة", es: "País", zh: "国家", th: "ประเทศ", ru: "Страна", ur: "ملک" } as Record<Locale, string>)[locale]

  const TX_TITLE = ({ en: "Transmission", ar: "ناقل الحركة", es: "Transmisión", zh: "变速箱", th: "ระบบเกียร์", ru: "Коробка передач", ur: "ٹرانسمیشن" } as Record<Locale, string>)[locale]
  const TX_OPTS = ({
    en: { automatic: "Automatic", manual: "Manual" },
    ar: { automatic: "أوتوماتيك", manual: "يدوي (عادي)" },
    es: { automatic: "Automático", manual: "Manual" },
    zh: { automatic: "自动", manual: "手动" },
    th: { automatic: "อัตโนมัติ", manual: "ธรรมดา" },
    ru: { automatic: "Автомат", manual: "Механика" },
    ur: { automatic: "آٹومیٹک", manual: "مینوئل" },
  } as Record<Locale, { automatic: string; manual: string }>)[locale]
  const txOptions = [{ id: "automatic", name: TX_OPTS.automatic }, { id: "manual", name: TX_OPTS.manual }]
  const activeTx = sp.transmission === "automatic" ? TX_OPTS.automatic : sp.transmission === "manual" ? TX_OPTS.manual : null

  const CARS_FAQ = [
    { q: t(locale, "cars_faq_s_q1"), a: t(locale, "cars_faq_s_a1") },
    { q: t(locale, "cars_faq_s_q2"), a: t(locale, "cars_faq_s_a2") },
    { q: t(locale, "cars_faq_s_q3"), a: t(locale, "cars_faq_s_a3") },
  ]

  const h1 = activeBrand
    ? tf(locale, "cars_h1_brand", { b: activeBrand.name, c: countryName })
    : activeCity
      ? tf(locale, "cars_h1_city", { city: activeCity.name })
      : activeBody
        ? tf(locale, "cars_h1_body", { body: activeBody.name, c: countryName })
        : (period === "monthly" || period === "weekly")
          ? tf(locale, "cars_h1_p", { p: periodLabel, c: countryName })
          : tf(locale, "cars_h1_all", { c: countryName })

  const __titles = await translateBatch(v.vehicles.map((x: any) => x.title), locale)
  const __titleById = new Map(v.vehicles.map((x: any, i: number) => [x.id, __titles[i]]))

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: homeLabel, url: lp("/") }, { name: carsLabel, url: lp("/cars") }]}/>
      <FAQPageJsonLd faqs={CARS_FAQ}/>
      <ItemListJsonLd
        name={tf(locale, "cars_h1_all", { c: countryName })}
        items={v.vehicles.slice(0, 30).map((veh: any) => ({ id: veh.id, slug: veh.slug, title: veh.title, price: veh.sale_daily_price || veh.daily_price, photo: veh.photos?.[0] }))}
      />
      <section className="bg-ink-50 dark:bg-ink-900/50 border-b border-ink-100 dark:border-ink-800 py-7">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-ink-500 mb-2 flex gap-2">
            <Link href={lp("/")} className="hover:text-brand-600">{homeLabel}</Link>
            <span>›</span>
            <span className="text-ink-700 dark:text-ink-300 font-medium">{tf(locale, "cars_bc_cars", { c: countryName })}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100">{h1}</h1>
          <p className="text-sm text-ink-500 mt-1">{tf(locale, "cars_available", { n: v.vehicles.length, period: periodLabel })}</p>
        </div>
      </section>

      {(sp.brand || sp.city || sp.body || sp.transmission || sp.country) && (
        <section className="bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 py-4">
          <div className="mx-auto max-w-7xl px-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-ink-500 font-semibold mr-1">{t(locale, "cars_active_filters")}</span>
            {sp.country && <FilterChip label={`${countryFlag(country)} ${countryName}`} removeUrl={removeParam(sp, "country", lp)}/>}
            {activeBrand && <FilterChip label={activeBrand.name} removeUrl={removeParam(sp, "brand", lp)}/>}
            {activeCity && <FilterChip label={activeCity.name} removeUrl={removeParam(sp, "city", lp)}/>}
            {activeBody && <FilterChip label={activeBody.name} removeUrl={removeParam(sp, "body", lp)}/>}
            {activeTx && <FilterChip label={activeTx} removeUrl={removeParam(sp, "transmission", lp)}/>}
            <Link href={lp("/cars")} className="text-xs font-semibold text-brand-600 hover:text-brand-700 ml-2">{t(locale, "cars_clear_all")}</Link>
          </div>
        </section>
      )}


      <MobileFilterBar
        brands={b.brands.slice(0, 8).map((x: any) => ({ id: x.id, name: x.name }))}
        cities={countryCities.slice(0, 6).map((x: any) => ({ id: x.id, name: x.name }))}
        bodyTypes={bt.body_types.slice(0, 5).map((x: any) => ({ id: x.id, name: x.name }))}
        currentBrand={sp.brand}
        currentCity={sp.city}
        currentBody={sp.body}
        currentTransmission={sp.transmission}
        localePrefix={lp("").replace(/\/+$/, "")}
        searchParams={sp as Record<string, string | undefined>}
      />
      <section className="py-8 md:py-10">
        <div className="mx-auto max-w-7xl px-4 grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className="hidden lg:block">
            <div className="sticky top-24 bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-ink-100 dark:border-ink-800">
                <SlidersHorizontal size={16} className="text-brand-600"/>
                <h3 className="font-bold text-ink-900 dark:text-ink-100">{t(locale, "cars_filters")}</h3>
              </div>
              {countryOptions.length > 1 && (
                <FilterGroup title={countryFilterLabel} current={country} param="country" options={countryOptions} sp={sp} lp={lp} drops={["city"]}/>
              )}
              <FilterGroup title={t(locale, "cars_f_period")} current={period} param="period" options={[{id:"daily",name:t(locale,"sh_daily")},{id:"weekly",name:t(locale,"sh_weekly")},{id:"monthly",name:t(locale,"sh_monthly")}]} sp={sp} lp={lp}/>
              <FilterGroup title={t(locale, "cars_f_brand")} current={sp.brand} param="brand" options={b.brands.slice(0,12).map((x:any)=>({id:x.id,name:x.name}))} sp={sp} lp={lp}/>
              <FilterGroup title={tf(locale, "cars_f_city", { c: countryName })} current={sp.city} param="city" options={countryCities.map((x:any)=>({id:x.id,name:x.name}))} sp={sp} lp={lp}/>
              <FilterGroup title={t(locale, "cars_f_body")} current={sp.body} param="body" options={bt.body_types.map((x:any)=>({id:x.id,name:x.name}))} sp={sp} lp={lp}/>
              <FilterGroup title={TX_TITLE} current={sp.transmission} param="transmission" options={txOptions} sp={sp} lp={lp}/>
            </div>
          </aside>

          <div>
            <CarsBanner countryName={countryName} total={v.vehicles.length} />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="text-sm text-ink-600 dark:text-ink-400" dangerouslySetInnerHTML={{ __html: tf(locale, "cars_showing", { n: `<strong class="text-ink-900 dark:text-ink-100">${v.vehicles.length}</strong>`, c: `<strong class="text-brand-600">${countryName}</strong>` }) }}/>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-500">{t(locale, "cars_sort_by")}</span>
                <select className="border border-ink-200 dark:border-ink-700 rounded-lg px-3 py-2 text-sm font-medium bg-white dark:bg-ink-900 min-w-[180px]">
                  <option>{t(locale, "cars_sort_recommended")}</option>
                  <option>{t(locale, "cars_sort_price_low")}</option>
                  <option>{t(locale, "cars_sort_price_high")}</option>
                  <option>{t(locale, "cars_sort_newest")}</option>
                </select>
              </div>
            </div>

            {v.vehicles.length === 0 ? (
              <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-16 text-center">
                <div className="text-5xl mb-4">🚗</div>
                <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mb-2">{tf(locale, "cars_none_title", { c: countryName })}</h3>
                <p className="text-ink-500 mb-6">{t(locale, "cars_none_sub")}</p>
                <Link href={lp("/cars")} className="btn-primary inline-flex">{t(locale, "cars_clear_filters")}</Link>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {v.vehicles.map((veh: any) => (
                    <VehicleCard key={veh.id} v={veh} brand={brandMap.get(veh.brand_id)} city={cityMap.get(veh.city_id)} sellerName={sellerMap.get(veh.seller_id)} locale={locale} displayTitle={__titleById.get(veh.id)} period={period as any}/>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-brand-50 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">{t(locale, "cars_promo_label")}</div>
                    <h2 className="mt-1 text-xl font-black text-ink-900 dark:text-ink-100">{t(locale, "cars_promo_title")}</h2>
                    <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{t(locale, "cars_promo_sub")}</p>
                  </div>
                  <Link href={lp("/list-your-car")} className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 transition">
                    {t(locale, "cars_promo_cta")}
                  </Link>
                </div>
              </>
            )}

            <section className="mt-8 surface-card p-5 md:p-6">
              <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">{tf(locale, "cars_popular_links", { c: countryName })}</h2>
              <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{t(locale, "cars_popular_sub")}</p>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">{t(locale, "cars_top_brands")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {topBrandLinks.map((brand: any) => (
                      <Link key={brand.id} href={lp(brand.slug ? `/cars/brand/${brand.slug}` : `/cars?brand=${brand.id}`)} className="rounded-full border border-ink-200 dark:border-ink-700 px-4 py-2.5 min-h-[40px] inline-flex items-center text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">{t(locale, "cars_top_cities")}</h3>
                  <div className="flex flex-wrap gap-2">
                    {topCityLinks.map((ct: any) => (
                      <Link key={ct.id} href={lp(ct.slug ? `/cars/city/${ct.slug}` : `/cars?city=${ct.id}`)} className="rounded-full border border-ink-200 dark:border-ink-700 px-4 py-2.5 min-h-[40px] inline-flex items-center text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">
                        {ct.name}
                      </Link>
                    ))}
                    <Link href={lp("/companies")} className="rounded-full border border-ink-200 dark:border-ink-700 px-4 py-2.5 min-h-[40px] inline-flex items-center text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">{t(locale, "cars_verified_companies")}</Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-5 md:p-6">
              <h2 className="text-lg font-black text-ink-900 dark:text-ink-100">{tf(locale, "cars_faq_title", { c: countryName })}</h2>
              <div className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
                <p><strong>{t(locale, "cars_faq_q1")}</strong> {t(locale, "cars_faq_a1")}</p>
                <p><strong>{t(locale, "cars_faq_q2")}</strong> {t(locale, "cars_faq_a2_pre")} <Link href={lp("/cars?period=monthly")} className="text-brand-600 font-semibold hover:text-brand-700">{t(locale, "cars_faq_a2_link")}</Link> {t(locale, "cars_faq_a2_post")}</p>
                <p><strong>{t(locale, "cars_faq_q3")}</strong> {t(locale, "cars_faq_a3_pre")} <Link href={lp("/companies")} className="text-brand-600 font-semibold hover:text-brand-700">{t(locale, "cars_faq_a3_link")}</Link> {t(locale, "cars_faq_a3_post")}</p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  )
}

function removeParam(sp: Record<string,string|undefined>, key: string, lp: (p: string) => string) {
  const qs = new URLSearchParams()
  for (const [k,v] of Object.entries(sp)) if (k !== key && v) qs.set(k, v)
  return lp(`/cars?${qs}`)
}
function FilterChip({ label, removeUrl }: { label: string; removeUrl: string }) {
  return (
    <Link href={removeUrl} className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-xs font-semibold hover:bg-brand-100">
      {label} <X size={12}/>
    </Link>
  )
}
function FilterGroup({ title, current, param, options, sp, lp, drops = [] }: { title: string; current?: string; param: string; options: {id:string;name:string}[]; sp: Record<string,string|undefined>; lp: (p: string) => string; drops?: string[] }) {
  const url = (id: string) => {
    const qs = new URLSearchParams()
    for (const [k,v] of Object.entries(sp)) if (v && k !== param && !drops.includes(k)) qs.set(k, v)
    qs.set(param, id)
    return lp(`/cars?${qs}`)
  }
  return (
    <div className="mb-6 pb-4 border-b border-ink-100 dark:border-ink-800 last:border-0">
      <h4 className="text-[11px] font-bold text-ink-500 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
        {options.map(o => (
          <Link key={o.id} href={url(o.id)} className={`block px-3 py-2 rounded-lg text-sm transition ${current === o.id ? "bg-brand-600 text-white font-semibold" : "text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:bg-ink-900/50"}`}>
            {o.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
