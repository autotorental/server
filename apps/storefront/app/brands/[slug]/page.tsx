import Link from "next/link"
import { notFound } from "next/navigation"
import { api } from "@/lib/api"
import VehicleCard from "@/components/vehicle-card"
import { ChevronRight } from "lucide-react"
import { getLocale } from "@/lib/locale-server"
import { translateBatch } from "@/lib/mt"

export const revalidate = 60

export default async function BrandDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = await api.brands()
  const brand = b.brands.find((x: any) => x.slug === slug || x.id === slug)
  if (!brand) return notFound()
  const [v, c, m] = await Promise.all([
    api.vehicles({ brand_id: brand.id, limit: 60 }).catch(() => ({ vehicles: [] })),
    api.cities().catch(() => ({ cities: [] })),
    api.models(brand.id).catch(() => ({ models: [] })),
  ])
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x.name]))
  const locale = await getLocale()
  const __titles = await translateBatch(v.vehicles.map((x: any) => x.title), locale)
  const __titleById = new Map(v.vehicles.map((x: any, i: number) => [x.id, __titles[i]]))

  return (
    <>
      <section className="bg-gradient-to-br from-brand-600 to-brand-900 text-white py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-2 flex gap-2 items-center">
            <Link href="/" className="hover:text-white">Home</Link><ChevronRight size={12}/>
            <Link href="/brands" className="hover:text-white">Brands</Link><ChevronRight size={12}/>
            <span>{brand.name}</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-white dark:bg-ink-900 rounded-2xl flex items-center justify-center p-3 shadow-2xl">
              {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="max-h-full max-w-full object-contain"/> : <span className="font-black text-xl text-ink-900 dark:text-ink-100">{brand.name[0]}</span>}
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-black">{brand.name}</h1>
              <p className="text-brand-100 mt-1">{v.vehicles.length} car{v.vehicles.length===1?"":"s"} for rent · {m.models.length} models</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4">
          {m.models.length > 0 && (
            <div className="mb-10">
              <h2 className="font-bold text-lg text-ink-900 dark:text-ink-100 mb-3">Popular {brand.name} models</h2>
              <div className="flex gap-2 flex-wrap">
                {m.models.slice(0, 20).map((mod: any) => (
                  <Link key={mod.id} href={`/cars?brand=${brand.id}&model=${mod.id}`} className="bg-ink-50 dark:bg-ink-900/50 hover:bg-brand-50 hover:text-brand-700 px-4 py-2 rounded-full text-sm font-medium text-ink-700 dark:text-ink-300 border border-ink-100 dark:border-ink-800 transition">
                    {mod.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <h2 className="font-bold text-2xl text-ink-900 dark:text-ink-100 mb-5">Available {brand.name} cars</h2>
          {v.vehicles.length === 0 ? (
            <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-16 text-center">
              <div className="text-5xl mb-4">🚗</div>
              <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100">No {brand.name} cars listed yet</h3>
              <p className="text-ink-500 mt-2">Check back soon or browse other brands.</p>
              <Link href="/brands" className="btn-primary inline-flex mt-5">Browse all brands</Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {v.vehicles.map((veh: any) => (
                <VehicleCard key={veh.id} v={veh} brand={brand.name} city={cityMap.get(veh.city_id)} locale={locale} displayTitle={__titleById.get(veh.id)}/>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
