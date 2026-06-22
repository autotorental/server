import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../modules/catalog"
import { lookupCatalogSpecs } from "../../../../lib/vehicle-specs"
import { getSetting } from "../../../../lib/settings"

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "")
function mapBody(b: string): string | undefined {
  const t = (b || "").toLowerCase(); if (!t) return undefined
  if (t.includes("suv") || t.includes("sport utility") || t.includes("mpv") || t.includes("crossover")) return "SUV"
  if (t.includes("pickup") || t.includes("truck")) return "Pickup Truck"
  if (t.includes("sedan") || t.includes("saloon")) return "Sedan"
  if (t.includes("coupe")) return "Coupe"
  if (t.includes("convert") || t.includes("cabrio") || t.includes("roadster") || t.includes("spyder") || t.includes("spider")) return "Convertible"
  if (t.includes("hatch")) return "Hatchback"
  if (t.includes("wagon") || t.includes("estate") || t.includes("touring")) return "Wagon"
  if (t.includes("van") || t.includes("minivan")) return "Van"
  return undefined
}
function mapFuel(f: string): string | undefined {
  const t = (f || "").toLowerCase(); if (!t) return undefined
  if (t.includes("diesel")) return "diesel"
  if (t.includes("hybrid") || t.includes("phev") || t.includes("plug")) return "hybrid"
  if (t.includes("electric") || t.includes("ev") || t.includes("bev")) return "electric"
  if (t.includes("gas") || t.includes("petrol") || t.includes("flex")) return "petrol"
  return undefined
}
const firstInt = (v: any): number | undefined => { if (v == null) return undefined; const m = String(v).match(/\d+/); return m ? parseInt(m[0], 10) : undefined }
function deepFind(obj: any, exact: string[], loose: string[], depth = 0): string | undefined {
  if (!obj || typeof obj !== "object" || depth > 6) return undefined
  const entries = Array.isArray(obj) ? obj.map((v, i) => [String(i), v] as [string, any]) : Object.entries(obj)
  for (const [k, v] of entries) { const nk = norm(k); if (nk.endsWith("id")) continue; if (exact.includes(nk) && (typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v).trim() }
  for (const [k, v] of entries) { const nk = norm(k); if (nk.endsWith("id")) continue; if (loose.some((m) => nk.includes(m)) && (typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v).trim() }
  for (const [, v] of entries) { if (v && typeof v === "object") { const r = deepFind(v, exact, loose, depth + 1); if (r) return r } }
  return undefined
}
function collectEquipment(obj: any, depth = 0, out: string[] = []): string[] {
  if (!obj || typeof obj !== "object" || depth > 6) return out
  for (const [k, v] of Object.entries(obj)) { const nk = norm(k)
    if (Array.isArray(v) && (nk.includes("equipment") || nk.includes("feature") || nk.includes("option"))) { for (const it of v) if (typeof it === "string") out.push(it) }
    else if (v && typeof v === "object") collectEquipment(v, depth + 1, out) }
  return out
}
type Dec = { make?: string; model?: string; year?: number; body?: string; fuel?: string; trim?: string; doors?: number; seats?: number; equipment: string[]; source: string }

// Free, no-watermark reference image (Wikimedia Commons) so the vendor can
// VERIFY the VIN decoded to the right car. NOT published — the vendor uploads
// their own photos for the listing.
async function fetchReferenceImage(make: string, model: string): Promise<string | null> {
  const term = [make, model].filter(Boolean).join(" ").trim()
  if (!term) return null
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term + " car")}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json&redirects=1`
    const r = await fetch(url, { headers: { "User-Agent": "AutoToRental/1.0 (vin-reference)", Accept: "application/json" }, signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const d = await r.json()
    const pages = d?.query?.pages || {}
    for (const k of Object.keys(pages)) { const src = pages[k]?.thumbnail?.source; if (src) return src }
    return null
  } catch { return null }
}

async function decodeOneUrl(urlTpl: string, key: string, vin: string): Promise<Dec | null> {
  const url = urlTpl.includes("{vin}") ? urlTpl.replace("{vin}", encodeURIComponent(vin)) : `${urlTpl}${encodeURIComponent(vin)}`
  let host = ""; try { host = new URL(url).host } catch { return null }
  try {
    const resp = await fetch(url, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host, Accept: "application/json" }, signal: AbortSignal.timeout(6000) })
    if (!resp.ok) return null
    const data = await resp.json()
    const make = deepFind(data, ["make", "manufacturer", "brand", "marke"], ["make", "manufact", "brand"])
    const model = deepFind(data, ["model", "modelname", "carmodel", "modelfamily"], [])
    const yearStr = deepFind(data, ["year", "modelyear", "yearofmanufacture", "productionyear"], ["year"])
    const body = deepFind(data, ["bodytype", "bodystyle", "bodyclass", "body", "carbody"], ["body"])
    const fuel = deepFind(data, ["fueltype", "fuel", "enginefuel"], ["fuel"])
    const trim = deepFind(data, ["trim", "series", "version", "grade"], ["trim", "series"])
    const doors = firstInt(deepFind(data, ["numberofdoors", "doors", "doorcount"], ["door"]))
    const seats = firstInt(deepFind(data, ["numberofseats", "seats", "seatingcapacity"], ["seat"]))
    if (!make && !model) return null
    return { make, model, year: firstInt(yearStr), body, fuel, trim, doors, seats, equipment: collectEquipment(data), source: "rapidapi" }
  } catch { return null }
}

async function decodeViaRapidSources(scope: any, vin: string): Promise<Dec | null> {
  let key = "", urlsRaw = ""
  try { key = (await getSetting(scope, "rapidapi_key")) || process.env.RAPIDAPI_KEY || ""; urlsRaw = (await getSetting(scope, "rapidapi_vin_url")) || process.env.RAPIDAPI_VIN_URL || "" } catch {}
  if (!key || !urlsRaw) return null
  const urls = urlsRaw.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean)
  let best: Dec | null = null
  for (const u of urls) {
    const d = await decodeOneUrl(u, key, vin)
    if (d) { if (d.model) return d; best = best ? { ...d, ...Object.fromEntries(Object.entries(best).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length))) } : d }
  }
  return best
}

async function aiCompleteVin(scope: any, vin: string, make: string, year: number | undefined, modelNames: string[]): Promise<{ model?: string; body?: string; fuel?: string; trim?: string }> {
  let cfg: any = {}
  try { const knex: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION); const row = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
    cfg = { api_key: row?.api_key || (await getSetting(scope, "openai_api_key")) || process.env.OPENAI_API_KEY || "", base_url: row?.base_url || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1", model: row?.model || process.env.OPENAI_MODEL || "gpt-4o-mini" } } catch {}
  if (!cfg.api_key) return {}
  const sys = "You are a VIN decoding expert. Given a VIN and partial info, identify the vehicle. The VDS (positions 4-9) encodes the model/body/engine per manufacturer. Reply ONLY with compact JSON: {\"model\":\"\",\"body\":\"\",\"fuel\":\"\",\"trim\":\"\"}. body one of: SUV, Sedan, Coupe, Hatchback, Convertible, Wagon, Pickup Truck, Van. fuel one of: petrol, diesel, electric, hybrid. If a known model list is given, choose the closest match for model. If unsure, give your best estimate, never empty model."
  const user = `VIN: ${vin}\nMake: ${make}\nYear: ${year || "unknown"}\nKnown ${make} models in our catalog: ${modelNames.join(", ") || "(none)"}\nReturn the JSON.`
  try {
    const resp = await fetch(`${cfg.base_url}/chat/completions`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.api_key}` }, body: JSON.stringify({ model: cfg.model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: sys }, { role: "user", content: user }] }) })
    if (!resp.ok) return {}
    const j = await resp.json()
    const txt = j?.choices?.[0]?.message?.content || "{}"
    const parsed = JSON.parse(txt)
    return { model: parsed.model || undefined, body: parsed.body || undefined, fuel: parsed.fuel || undefined, trim: parsed.trim || undefined }
  } catch { return {} }
}

async function decodeViaNhtsa(vin: string): Promise<Dec | null> {
  try { const resp = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${encodeURIComponent(vin)}?format=json`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(9000) })
    if (!resp.ok) return null
    const r = ((await resp.json())?.Results || [])[0] || {}
    if (!r.Make && !r.Model && !r.ModelYear) return null
    return { make: r.Make || undefined, model: r.Model || undefined, year: firstInt(r.ModelYear), body: r.BodyClass || undefined, fuel: r.FuelTypePrimary || undefined, trim: r.Trim || r.Series || undefined, doors: firstInt(r.Doors), seats: undefined, equipment: [], source: "nhtsa" }
  } catch { return null }
}

const handleVin = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = req.query as Record<string, string | undefined>
  const vin = String((q.vin ?? (req.body as any)?.vin) || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (vin.length < 11 || vin.length > 17) return res.status(400).json({ message: "Enter a valid VIN (11-17 characters)." })

  let dec = await decodeViaNhtsa(vin)
  if (!dec || !dec.make) { const rp = await decodeViaRapidSources(req.scope, vin); if (rp) dec = dec ? { ...dec, ...Object.fromEntries(Object.entries(rp).filter(([, v]) => v != null && !(Array.isArray(v) && !v.length))) } : rp }
  if (!dec) return res.status(404).json({ message: "Could not decode this VIN. Use manual entry." })

  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const brands = await svc.listBrands({}).catch(() => [])
  let makeName = dec.make || ""
  // Match brand early so we can give the AI our model list.
  let brand: any = brands.find((x: any) => norm(x.name) === norm(makeName)) || brands.find((x: any) => makeName && (norm(x.name).includes(norm(makeName)) || norm(makeName).includes(norm(x.name))))
  let aiUsed = false
  if (!dec.model && makeName) {
    const brandModels = brand ? await svc.listCarModels({ brand_id: brand.id }).catch(() => []) : []
    const ai = await aiCompleteVin(req.scope, vin, makeName, dec.year, brandModels.map((m: any) => m.name))
    if (ai.model) { dec.model = ai.model; aiUsed = true }
    if (!dec.body && ai.body) dec.body = ai.body
    if (!dec.fuel && ai.fuel) dec.fuel = ai.fuel
    if (!dec.trim && ai.trim) dec.trim = ai.trim
  }

  const modelName = dec.model || "", year = dec.year
  const bodyName = mapBody(dec.body || "")
  let fuel = mapFuel(dec.fuel || "")
  let model_id: string | undefined, body_type_id: string | undefined, feature_ids: string[] = []
  try {
    if (brand && modelName) {
      const models = await svc.listCarModels({ brand_id: brand.id })
      model_id = (models.find((x: any) => norm(x.name) === norm(modelName)) || models.find((x: any) => norm(modelName).includes(norm(x.name)) || norm(x.name).includes(norm(modelName))))?.id
    }
    if (bodyName) { const bts = await svc.listBodyTypes({}); body_type_id = bts.find((x: any) => norm(x.name) === norm(bodyName))?.id }
    if (dec.equipment?.length) { const features = await svc.listFeatures({}); const eq = dec.equipment.map((e) => norm(e))
      for (const f of features) { const fn = norm(f.name); if (fn && eq.some((e) => e === fn || e.includes(fn) || fn.includes(e))) feature_ids.push(f.id) }
      feature_ids = Array.from(new Set(feature_ids)) }
  } catch {}

  const cat = lookupCatalogSpecs(makeName, modelName, year)
  if (!fuel && cat?.fuel) fuel = cat.fuel

  const reference_image = await fetchReferenceImage(makeName, modelName)

  res.json({
    vin, source: dec.source, ai_used: aiUsed,
    reference_image,
    decoded: { make: makeName || null, model: modelName || null, year: year ?? null, trim: dec.trim || null, body: dec.body || null, fuel: dec.fuel || null, equipment: dec.equipment || [] },
    match: { brand_id: brand?.id ?? null, model_id: model_id ?? null, body_type_id: body_type_id ?? null, matched_brand: !!brand, matched_model: !!model_id },
    feature_ids,
    specs: { year: year ?? null, body_type_id: body_type_id ?? null, fuel_type: fuel ?? null, doors: dec.doors ?? cat?.doors ?? null, seats: dec.seats ?? cat?.seats ?? null, transmission: cat?.transmission ?? null },
  })
}

export const GET = handleVin
export const POST = handleVin
