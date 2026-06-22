import Link from "next/link"
import { api } from "@/lib/api"
import VehicleCard from "@/components/vehicle-card"
import { buildMetadata } from "@/lib/seo"
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { getLocale } from "@/lib/locale-server"
import { getServerCountry } from "@/lib/country-server"
import { localizedPath } from "@/lib/locales"
import { translateBatch } from "@/lib/mt"

export const revalidate = 120

const slugify = (s: string) =>
  (s || "").toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

const NAME_OVERRIDE: Record<string, string> = { ae: "UAE", sy: "Syria" }
function countryName(cc: string) {
  const lc = (cc || "ae").toLowerCase()
  if (NAME_OVERRIDE[lc]) return NAME_OVERRIDE[lc]
  try { return new (Intl as any).DisplayNames(["en"], { type: "region" }).of(lc.toUpperCase()) || lc.toUpperCase() } catch { return lc.toUpperCase() }
}

async function resolveType(slug: string) {
  const { body_types = [] } = await api.body_types().catch(() => ({ body_types: [] as any[] }))
  const s = slugify(slug)
  return (
    body_types.find((b: any) => slugify(b.slug || "") === s) ||
    body_types.find((b: any) => slugify(b.name) === s) ||
    null
  )
}

export async function generateStaticParams() {
  const { body_types = [] } = await api.body_types().catch(() => ({ body_types: [] as any[] }))
  return body_types.map((b: any) => ({ slug: b.slug || slugify(b.name) }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const locale = await getLocale()
  const bt = await resolveType(slug)
  const country = await getServerCountry()
  const cName = countryName(country)
  if (!bt) {
    return buildMetadata({ title: "Car Rental", description: "Browse rental cars.", path: `/vehicle-category/${slug}`, locale })
  }
  const n = bt.name
  return buildMetadata({
    title: `${n} Rental in ${cName} — Compare ${n} Hire Deals`,
    description: `Rent a ${n} in ${cName} from verified rental companies. Compare ${n} rental prices — daily, weekly & monthly rates, free delivery, no commission, no booking fees.`,
    path: `/vehicle-category/${slug}`,
    locale,
    keywords: [`${n} rental ${cName}`, `${n} car rental`, `rent ${n} ${cName}`, `${n} hire`, `cheap ${n} rental ${cName}`],
  })
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [locale, country, bt] = await Promise.all([getLocale(), getServerCountry(), resolveType(slug)])
  const lp = (p: string) => localizedPath(p, locale)
  const cName = countryName(country)

  const [b, c] = await Promise.all([
    api.brands().catch(() => ({ brands: [] })),
    api.cities().catch(() => ({ cities: [] })),
  ])
  const v = bt
    ? (await api.vehicles({ body_type_id: bt.id, country, limit: 24 }).catch(() => ({ vehicles: [] }))).vehicles
    : []
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const shown = v.slice(0, 12)
  const __titles = await translateBatch(shown.map((x: any) => x.title), locale)
  const __titleById = new Map(shown.map((x: any, i: number) => [x.id, __titles[i]]))

  const n = bt?.name || "Car"
  const faqs = [
    { q: `How much does it cost to rent a ${n} in ${cName}?`, a: `${n} rental prices in ${cName} vary by model and season. Compare live deals from verified rental companies on this page and contact them directly — no commission, no booking fees.` },
    { q: `Can I rent a ${n} daily, weekly or monthly in ${cName}?`, a: `Yes. Most rental companies offer daily, weekly and monthly ${n} rentals, with weekly and monthly rates discounted versus daily.` },
    { q: `Is delivery available for ${n} rentals?`, a: `Many companies in ${cName} offer free delivery to your hotel, home or the airport. Check each listing for delivery options.` },
    { q: `What do I need to rent a ${n} in ${cName}?`, a: `Tourists usually need a passport, visa and a valid driving licence or International Driving Permit. Residents need a local ID and licence.` },
  ]

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", url: lp("/") }, { name: `${n} Rental`, url: lp(`/vehicle-category/${slug}`) }]} />
      <FAQPageJsonLd faqs={faqs} />

      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="text-sm text-white/70 mb-3"><Link href={lp("/")} className="hover:text-white">Home</Link> › <span className="text-white">{n} Rental</span></nav>
          <h1 className="text-3xl md:text-5xl font-black leading-tight">{n} Rental in {cName}</h1>
          <p className="mt-4 text-lg text-white/85 max-w-2xl">Compare {n} rental deals from verified rental companies in {cName}. Daily, weekly and monthly rates — contact owners directly, no commission, no booking fees.</p>
          <Link href={lp(`/cars?body=${bt?.id || ""}`)} className="mt-6 inline-block bg-white text-brand-700 hover:bg-brand-50 font-bold px-7 py-3.5 rounded-xl">Browse all {n}s →</Link>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-7">Available {n}s in {cName}</h2>
          {shown.length === 0 ? (
            <div className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/40 p-10 text-center">
              <p className="text-ink-600 dark:text-ink-300 text-lg font-semibold">No {n}s listed in {cName} yet.</p>
              <p className="text-ink-500 mt-1">New cars are added daily — or browse all available cars.</p>
              <Link href={lp("/cars")} className="btn-primary inline-flex mt-5">Browse all cars</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {shown.map((x: any) => (
                <VehicleCard key={x.id} v={x} brand={brandMap.get(x.brand_id)} city={cityMap.get(x.city_id)} locale={locale} displayTitle={__titleById.get(x.id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-ink-50 dark:bg-ink-900/50">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-7">{n} rental in {cName} — FAQs</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl p-5 group">
                <summary className="font-bold text-ink-900 dark:text-ink-100 cursor-pointer list-none flex items-center justify-between"><span>{f.q}</span><span className="group-open:rotate-180 transition">▾</span></summary>
                <p className="mt-3 text-ink-700 dark:text-ink-300 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
