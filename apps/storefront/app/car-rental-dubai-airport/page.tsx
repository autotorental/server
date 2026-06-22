import Link from "next/link"
import { api } from "@/lib/api"
import VehicleCard from "@/components/vehicle-card"
import { buildMetadata } from "@/lib/seo"
import { seoFor } from "@/lib/seo-helper"
import { BreadcrumbJsonLd, FAQPageJsonLd, ItemListJsonLd } from "@/components/jsonld"
import { Star, ShieldCheck, BadgePercent, MessageCircle, CheckCircle2, Plane, Clock, MapPin } from "lucide-react"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { translateBatch } from "@/lib/mt"

export const revalidate = 300

export async function generateMetadata() {
  const locale = await getLocale()
  return seoFor("/car-rental-dubai-airport", {
    title: "Dubai Airport Car Rental (DXB) — Pick Up at Arrivals | Auto to Rental",
    description: "Rent a car at Dubai International Airport (DXB) & Al Maktoum (DWC). Meet & greet at arrivals, 24/7 pickup, no booking fee, free delivery to Terminal 1, 2 & 3. Economy to luxury & supercars.",
    path: "/car-rental-dubai-airport",
    locale,
    keywords: [
      "car rental Dubai airport", "Dubai airport car rental", "DXB car rental", "rent a car Dubai airport",
      "car hire Dubai airport", "Dubai airport car hire", "car rental Terminal 1 Dubai", "car rental Terminal 3 DXB",
      "Al Maktoum airport car rental", "DWC car rental", "luxury car rental Dubai airport", "cheap car rental Dubai airport",
      "Dubai airport rent a car arrivals", "monthly car rental Dubai airport",
    ],
  })
}

const FAQ = [
  { q: "Can I pick up a rental car at Dubai Airport (DXB)?", a: "Yes. Our partner rental companies offer meet & greet delivery at Dubai International Airport (DXB) Terminals 1, 2 and 3, as well as Al Maktoum International Airport (DWC). A representative meets you at arrivals with the car — no shuttle, no queues." },
  { q: "Is there a delivery fee to Dubai Airport?", a: "Most listed companies offer free delivery to DXB for rentals of 3 days or more. For shorter rentals a small delivery fee may apply. The exact terms are shown on each car and you confirm directly with the owner — Auto to Rental charges 0% commission." },
  { q: "What do I need to rent a car at Dubai Airport?", a: "Tourists need a passport, a valid driving licence from your home country (an International Driving Permit is recommended), and a credit card for the security deposit. GCC and UAE residents need their Emirates ID and UAE licence." },
  { q: "Can I rent a car at Dubai Airport 24/7?", a: "Yes. Many companies operate 24/7 airport delivery, so you can collect your car at any hour — perfect for late-night or early-morning flights. Message the owner on WhatsApp to confirm your flight time." },
  { q: "Can I rent a luxury or sports car at Dubai Airport?", a: "Absolutely. From economy hatchbacks to Lamborghini, Ferrari, Mercedes G63 and Rolls-Royce, you can have a supercar waiting at arrivals. Browse the fleet below and contact the owner directly." },
  { q: "How much is car rental at Dubai Airport?", a: "Economy cars start from around AED 100–150/day, SUVs from AED 250/day, and luxury/supercars from AED 900/day. Weekly and monthly rentals save up to 40% versus the daily rate." },
]

export default async function DubaiAirportCarRentalPage() {
  const [b, c, vAll, locale] = await Promise.all([
    api.brands().catch(() => ({ brands: [] })),
    api.cities().catch(() => ({ cities: [] })),
    api.vehicles({ limit: 60, country: "ae" }).catch(() => ({ vehicles: [] })),
    getLocale(),
  ])
  const lp = (p: string) => localizedPath(p, locale)
  const dubai = c.cities.find((x: any) => x.name === "Dubai" || x.slug === "dubai")
  const vehicles = dubai
    ? (await api.vehicles({ city_id: dubai.id, limit: 12, country: "ae" }).catch(() => ({ vehicles: [] }))).vehicles
    : vAll.vehicles.slice(0, 12)
  const list = (vehicles && vehicles.length) ? vehicles : vAll.vehicles
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const topBrands = b.brands.slice(0, 12)
  const shown = list.slice(0, 8)
  const __titles = await translateBatch(shown.map((x: any) => x.title), locale)
  const __titleById = new Map(shown.map((x: any, i: number) => [x.id, __titles[i]]))

  const browseHref = dubai ? lp(`/cars?city=${dubai.id}`) : lp("/cars")

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: lp("/") }, { name: "Dubai Airport Car Rental", url: lp("/car-rental-dubai-airport") }]}/>
      <FAQPageJsonLd faqs={FAQ}/>
      <ItemListJsonLd name="Rental Cars at Dubai Airport (DXB)" items={list.map((v: any) => ({ id: v.id, slug: v.slug, title: v.title, price: v.daily_price, photo: v.photos?.[0] }))}/>

      {/* HERO */}
      <section className="relative bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-25">
          <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=2400&fm=webp&q=70" alt="" className="w-full h-full object-cover"/>
        </div>
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3 flex gap-2 items-center">
            <Link href={lp("/")} className="hover:text-white">Home</Link><span>›</span><span>Dubai Airport Car Rental</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-amber-400 text-ink-950 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-5">
            <Plane size={14}/> Meet &amp; Greet at Arrivals
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-[1.05]">
            Car Rental at<br/>
            <span className="text-amber-300">Dubai Airport (DXB)</span>
          </h1>
          <p className="mt-5 text-lg text-ink-200 max-w-2xl">
            Pick up your car the moment you land. Free delivery to Terminals 1, 2 &amp; 3 and Al Maktoum (DWC),
            24/7 service, and {list.length}+ cars from economy to supercars — with 0% commission and direct owner contact.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={browseHref} className="bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-950 font-bold px-7 py-3.5 rounded-xl transition">Browse Airport Cars</Link>
            <Link href={lp("/list-your-car")} className="border border-white/30 hover:border-white text-white font-semibold px-7 py-3.5 rounded-xl">List Your Car Free</Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-5 text-sm text-ink-200">
            {["Free delivery to DXB & DWC", "24/7 airport pickup", "No booking fee", "Economy to supercars"].map((badge, i) => (
              <span key={i} className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-green-400"/>{badge}</span>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-b border-ink-100 dark:border-ink-800 py-7 bg-white dark:bg-ink-900">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
          {[
            { I: Plane, t: "Airport Meet & Greet", s: "Car waiting at arrivals" },
            { I: Clock, t: "24/7 Pickup", s: "Any flight, any hour" },
            { I: BadgePercent, t: "0% Commission", s: "Pay the owner directly" },
            { I: ShieldCheck, t: "Verified Companies", s: "Every rental house vetted" },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0"><x.I size={20}/></div>
              <div>
                <div className="font-semibold text-ink-900 dark:text-ink-100 text-sm">{x.t}</div>
                <div className="text-xs text-ink-500 mt-0.5">{x.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TERMINALS */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-2">Pickup at Every Dubai Airport Terminal</h2>
          <p className="text-sm text-ink-500 mb-7">A representative meets you at arrivals — no shuttle bus, no rental desk queue.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { t: "Terminal 1 (DXB)", s: "International airlines — most long-haul arrivals" },
              { t: "Terminal 2 (DXB)", s: "flydubai & regional carriers" },
              { t: "Terminal 3 (DXB)", s: "Emirates — the world's largest terminal" },
              { t: "Al Maktoum (DWC)", s: "Dubai South — growing budget & cargo hub" },
            ].map((x, i) => (
              <div key={i} className="bg-white dark:bg-ink-900 rounded-xl border border-ink-100 dark:border-ink-800 p-5">
                <div className="flex items-center gap-2 text-brand-600 mb-2"><MapPin size={18}/><span className="font-bold text-ink-900 dark:text-ink-100">{x.t}</span></div>
                <p className="text-sm text-ink-500">{x.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CARS */}
      <section className="py-14 bg-ink-50 dark:bg-ink-900/50">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-end justify-between mb-7">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100">Cars Available for Dubai Airport Pickup</h2>
              <p className="text-sm text-ink-500 mt-1">From economy to luxury — delivered to your terminal</p>
            </div>
            <Link href={browseHref} className="text-sm font-bold text-brand-600 hover:text-brand-700">View all cars →</Link>
          </div>
          {shown.length === 0 ? (
            <div className="bg-white dark:bg-ink-900 rounded-2xl p-12 text-center text-ink-500">Loading cars…</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((v: any) => (
                <VehicleCard key={v.id} v={v} brand={brandMap.get(v.brand_id)} city={cityMap.get(v.city_id)} locale={locale} displayTitle={__titleById.get(v.id)}/>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* BY BRAND */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-2">Rent by Brand at Dubai Airport</h2>
          <p className="text-sm text-ink-500 mb-7">Pick your favourite make and have it waiting at arrivals.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {topBrands.map((br: any) => (
              <Link key={br.id} href={lp(`/cars?brand=${br.id}&city=${dubai?.id || ""}`)} className="bg-white dark:bg-ink-900 rounded-xl border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover p-4 flex flex-col items-center text-center">
                <div className="h-12 flex items-center justify-center">{br.logo_url ? <img src={br.logo_url} alt={br.name} className="max-h-10 max-w-full object-contain"/> : <span className="font-bold text-ink-700 dark:text-ink-300">{br.name}</span>}</div>
                <div className="mt-2 text-xs font-semibold text-ink-700 dark:text-ink-300">{br.name} rental</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SEO CONTENT */}
      <section className="py-14 bg-ink-50 dark:bg-ink-900/50">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-5">Renting a Car at Dubai International Airport</h2>
          <div className="prose-section space-y-5 text-ink-700 dark:text-ink-300 leading-relaxed">
            <p>Dubai International Airport (<strong>DXB</strong>) is the busiest international airport in the world, welcoming over 90 million passengers a year across Terminals 1, 2 and 3. Renting a car at the airport is the fastest, most flexible way to explore Dubai and the wider UAE — and with <strong>Auto to Rental</strong> you skip the crowded rental desks entirely. A representative from your chosen company meets you right at <strong>arrivals</strong> with the keys.</p>
            <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mt-7">Why rent at the airport instead of the city?</h3>
            <ul>
              <li><strong>Zero downtime</strong> — drive away the moment you land instead of taking a taxi to a rental office.</li>
              <li><strong>24/7 availability</strong> — Dubai's flights arrive around the clock, and so do our partner companies.</li>
              <li><strong>Free delivery</strong> to Terminal 1, 2, 3 and Al Maktoum (DWC) on most rentals of 3+ days.</li>
              <li><strong>Every car, every budget</strong> — from an economy Toyota to a Lamborghini Urus or Mercedes G63.</li>
            </ul>
            <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mt-7">What you need to rent</h3>
            <p>Tourists should bring a <strong>passport</strong>, a valid <strong>driving licence</strong> (an International Driving Permit is recommended), and a <strong>credit card</strong> for the refundable security deposit. UAE and GCC residents simply need their Emirates ID and local licence. Salik (toll) charges and Dubai's well-signposted road network make driving straightforward for visitors.</p>
            <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mt-7">Book in three steps</h3>
            <p>1) Browse the cars below and pick the one you want. 2) Message the owner on <strong>WhatsApp</strong> or call them directly — tell them your flight number and terminal. 3) Meet them at arrivals and drive off. Because Auto to Rental charges <strong>0% commission</strong>, you always get the owner's best direct price.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-8">Dubai Airport Car Rental — FAQ</h2>
          <div className="space-y-3">
            {FAQ.map((f, i) => (
              <details key={i} className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl p-5 group">
                <summary className="font-bold text-ink-900 dark:text-ink-100 cursor-pointer list-none flex items-center justify-between">
                  <span>{f.q}</span>
                  <span className="text-ink-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-ink-700 dark:text-ink-300 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-gradient-to-br from-brand-600 to-brand-900 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl md:text-4xl font-black">Your Car, Waiting at Arrivals</h2>
          <p className="mt-3 text-brand-100 text-lg">Browse {list.length}+ cars for Dubai Airport pickup — no booking fee, direct owner contact.</p>
          <Link href={browseHref} className="mt-7 inline-block bg-amber-300 hover:bg-amber-400 text-ink-950 font-bold px-8 py-4 rounded-xl transition">Browse Dubai Airport Cars</Link>
        </div>
      </section>
    </>
  )
}
