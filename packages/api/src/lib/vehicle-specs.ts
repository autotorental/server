import fs from "fs"
import path from "path"

/**
 * Vehicle spec auto-fill lookup (server-side, shared by store + vendor APIs).
 *
 * Reads a slim, CC0-licensed vehicle catalog (static/vehicle-catalog.json)
 * filtered to the brand/model names that exist in our backend. Every value is
 * only a SUGGESTION used to pre-fill the listing form; the vendor edits any
 * field before publishing.
 *
 * Shape of the JSON file:
 * {
 *   "Toyota": { "Land Cruiser": [ {yearFrom,yearTo,bodyType,seats,doors,fuel,transmission} ] }
 * }
 * bodyType is the backend body-type NAME (e.g. "SUV", "Pickup Truck").
 */

export type CatalogSpecs = {
  bodyType?: string
  seats?: number
  doors?: number
  fuel?: string
  transmission?: string
}
type CatalogTrim = CatalogSpecs & { yearFrom?: number; yearTo?: number }
type Catalog = Record<string, Record<string, CatalogTrim[]>>

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "")

let cachedIndex: Record<string, Record<string, CatalogTrim[]>> | null = null

function loadCatalog(): Catalog {
  const candidates = [
    path.join(process.cwd(), "static", "vehicle-catalog.json"),
    path.join(process.cwd(), ".medusa", "server", "static", "vehicle-catalog.json"),
  ]
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, "utf-8")) as Catalog
      }
    } catch {
      // ignore and try next candidate
    }
  }
  return {}
}

function getIndex() {
  if (cachedIndex) return cachedIndex
  const catalog = loadCatalog()
  const idx: Record<string, Record<string, CatalogTrim[]>> = {}
  for (const brand of Object.keys(catalog)) {
    const bn = norm(brand)
    idx[bn] = idx[bn] || {}
    for (const model of Object.keys(catalog[brand])) {
      idx[bn][norm(model)] = catalog[brand][model]
    }
  }
  cachedIndex = idx
  return idx
}

function countFields(t: CatalogTrim): number {
  let n = 0
  if (t.bodyType) n++
  if (t.seats != null) n++
  if (t.doors != null) n++
  if (t.fuel) n++
  if (t.transmission) n++
  return n
}

function pickRichest(trims: CatalogTrim[]): CatalogTrim | undefined {
  if (!trims || trims.length === 0) return undefined
  return [...trims].sort((a, b) => {
    const fa = countFields(a)
    const fb = countFields(b)
    if (fa !== fb) return fb - fa
    return (b.yearTo || b.yearFrom || 0) - (a.yearTo || a.yearFrom || 0)
  })[0]
}

export function lookupCatalogSpecs(
  brandName?: string,
  modelName?: string,
  year?: number
): CatalogSpecs | undefined {
  if (!brandName || !modelName) return undefined
  const idx = getIndex()
  const brand = idx[norm(brandName)]
  if (!brand) return undefined
  const trims = brand[norm(modelName)]
  if (!trims || trims.length === 0) return undefined

  let chosen: CatalogTrim | undefined
  if (year && !Number.isNaN(year)) {
    const inRange = trims.filter(
      (t) =>
        (t.yearFrom == null || year >= t.yearFrom) &&
        (t.yearTo == null || year <= t.yearTo)
    )
    chosen = pickRichest(inRange)
  }
  if (!chosen) chosen = pickRichest(trims) || trims[trims.length - 1]
  if (!chosen) return undefined

  const out: CatalogSpecs = {}
  if (chosen.bodyType) out.bodyType = chosen.bodyType
  if (chosen.seats != null) out.seats = chosen.seats
  if (chosen.doors != null) out.doors = chosen.doors
  if (chosen.fuel) out.fuel = chosen.fuel
  if (chosen.transmission) out.transmission = chosen.transmission
  return Object.keys(out).length ? out : undefined
}
