"use client"
import Link from "next/link"
import { X } from "lucide-react"

type FilterOption = { id: string; name: string }

interface MobileFilterBarProps {
  brands: FilterOption[]
  cities: FilterOption[]
  bodyTypes: FilterOption[]
  currentBrand?: string
  currentCity?: string
  currentBody?: string
  currentTransmission?: string
  localePrefix: string
  searchParams: Record<string, string | undefined>
}

function buildUrl(
  prefix: string,
  sp: Record<string, string | undefined>,
  param: string,
  value: string | undefined
): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== param) qs.set(k, v)
  }
  if (value) qs.set(param, value)
  const queryStr = qs.toString()
  return `${prefix}/cars${queryStr ? "?" + queryStr : ""}`
}

function removeParam(
  prefix: string,
  sp: Record<string, string | undefined>,
  param: string
): string {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== param) qs.set(k, v)
  }
  const queryStr = qs.toString()
  return `${prefix}/cars${queryStr ? "?" + queryStr : ""}`
}

export default function MobileFilterBar({
  brands,
  cities,
  bodyTypes,
  currentBrand,
  currentCity,
  currentBody,
  currentTransmission,
  localePrefix,
  searchParams,
}: MobileFilterBarProps) {
  const hasActiveFilter = currentBrand || currentCity || currentBody || currentTransmission
  const clearUrl = `${localePrefix}/cars`

  return (
    <div className="lg:hidden sticky top-16 z-30 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 shadow-sm">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-4 py-3 min-w-max">

          {/* Active filter chips (remove on tap) */}
          {currentBrand && (() => {
            const brand = brands.find(b => b.id === currentBrand)
            return brand ? (
              <Link
                href={removeParam(localePrefix, searchParams, "brand")}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold text-white whitespace-nowrap transition"
                style={{ backgroundColor: "#1753b0" }}
              >
                {brand.name} <X size={11} />
              </Link>
            ) : null
          })()}

          {currentCity && (() => {
            const city = cities.find(c => c.id === currentCity)
            return city ? (
              <Link
                href={removeParam(localePrefix, searchParams, "city")}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold text-white whitespace-nowrap transition"
                style={{ backgroundColor: "#1753b0" }}
              >
                {city.name} <X size={11} />
              </Link>
            ) : null
          })()}

          {currentBody && (() => {
            const body = bodyTypes.find(b => b.id === currentBody)
            return body ? (
              <Link
                href={removeParam(localePrefix, searchParams, "body")}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold text-white whitespace-nowrap transition"
                style={{ backgroundColor: "#1753b0" }}
              >
                {body.name} <X size={11} />
              </Link>
            ) : null
          })()}

          {currentTransmission && (
            <Link
              href={removeParam(localePrefix, searchParams, "transmission")}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold text-white whitespace-nowrap transition"
              style={{ backgroundColor: "#1753b0" }}
            >
              {currentTransmission === "automatic" ? "Automatic" : "Manual"} <X size={11} />
            </Link>
          )}

          {/* Clear all (only if any active filter) */}
          {hasActiveFilter && (
            <>
              <div className="w-px h-6 bg-ink-200 dark:bg-ink-700 mx-1 flex-shrink-0" />
              <Link
                href={clearUrl}
                className="inline-flex items-center px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap border border-red-300 text-red-600 hover:bg-red-50 transition flex-shrink-0"
              >
                Clear all
              </Link>
              <div className="w-px h-6 bg-ink-200 dark:bg-ink-700 mx-1 flex-shrink-0" />
            </>
          )}

          {/* Brand pills (top 8, skip active) */}
          {brands.slice(0, 8).filter(b => b.id !== currentBrand).map(brand => (
            <Link
              key={brand.id}
              href={buildUrl(localePrefix, searchParams, "brand", brand.id)}
              className="inline-flex items-center px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-blue-400 hover:text-blue-700 transition flex-shrink-0"
            >
              {brand.name}
            </Link>
          ))}

          {/* Separator */}
          {cities.length > 0 && (
            <div className="w-px h-6 bg-ink-200 dark:bg-ink-700 mx-1 flex-shrink-0" />
          )}

          {/* City pills (top 6, skip active) */}
          {cities.slice(0, 6).filter(c => c.id !== currentCity).map(city => (
            <Link
              key={city.id}
              href={buildUrl(localePrefix, searchParams, "city", city.id)}
              className="inline-flex items-center px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-blue-400 hover:text-blue-700 transition flex-shrink-0"
            >
              {city.name}
            </Link>
          ))}

          {/* Body type pills */}
          {bodyTypes.length > 0 && (
            <div className="w-px h-6 bg-ink-200 dark:bg-ink-700 mx-1 flex-shrink-0" />
          )}
          {bodyTypes.slice(0, 5).filter(b => b.id !== currentBody).map(bt => (
            <Link
              key={bt.id}
              href={buildUrl(localePrefix, searchParams, "body", bt.id)}
              className="inline-flex items-center px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-blue-400 hover:text-blue-700 transition flex-shrink-0"
            >
              {bt.name}
            </Link>
          ))}

          {/* Transmission */}
          <div className="w-px h-6 bg-ink-200 dark:bg-ink-700 mx-1 flex-shrink-0" />
          {currentTransmission !== "automatic" && (
            <Link
              href={buildUrl(localePrefix, searchParams, "transmission", "automatic")}
              className="inline-flex items-center px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-blue-400 hover:text-blue-700 transition flex-shrink-0"
            >
              Automatic
            </Link>
          )}
          {currentTransmission !== "manual" && (
            <Link
              href={buildUrl(localePrefix, searchParams, "transmission", "manual")}
              className="inline-flex items-center px-3 py-2 min-h-[36px] rounded-full text-xs font-semibold whitespace-nowrap border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-300 hover:border-blue-400 hover:text-blue-700 transition flex-shrink-0"
            >
              Manual
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
