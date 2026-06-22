import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../modules/catalog"
import { lookupCatalogSpecs } from "../../../../lib/vehicle-specs"

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "")

const FUELS = ["petrol", "diesel", "electric", "hybrid", "plugin_hybrid"]
const TRANS = ["automatic", "manual", "cvt", "dual_clutch", "smg", "tiptronic", "semi_automatic"]

async function aiConfig(req: MedusaRequest) {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  return {
    api_key: row?.api_key || process.env.OPENAI_API_KEY || "",
    base_url: row?.base_url || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: row?.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
  }
}

/**
 * AI fallback for specs the static lookup table doesn't cover. Returns accurate
 * factory specs (fuel, transmission, body, seats, doors) for the most common
 * GCC trim — so e.g. a Tesla pre-fills "electric", a Prius "hybrid", a diesel
 * pickup "diesel" instead of defaulting to petrol.
 */
async function aiSpecs(
  req: MedusaRequest,
  brand: string,
  model: string,
  year?: number
): Promise<{ fuel?: string; transmission?: string; bodyType?: string; seats?: number; doors?: number } | null> {
  const cfg = await aiConfig(req)
  if (!cfg.api_key || (!brand && !model)) return null
  const car = [year, brand, model].filter(Boolean).join(" ")
  const sys =
    "You return realistic FACTORY specifications for a specific car as strict JSON only. " +
    'Format: {"fuel_type": one of ["petrol","diesel","electric","hybrid","plugin_hybrid"], ' +
    '"transmission": one of ["automatic","manual","cvt","dual_clutch","smg","tiptronic","semi_automatic"], ' +
    '"body_type": one of ["Sedan","SUV","Hatchback","Coupe","Convertible","Pickup","Van","Wagon","Crossover","Sports"], ' +
    '"seats": integer, "doors": integer}. ' +
    "Use the most common trim sold in the UAE / GCC. Be accurate by model: Tesla/EV models = electric; " +
    "Prius/hybrid badges = hybrid; most full-size pickups & large diesel SUVs = diesel; high-performance/supercars often dual_clutch; " +
    "most modern cars = automatic. If a value is genuinely uncertain, still return the single MOST LIKELY value (never null)."
  try {
    const url = `${cfg.base_url.replace(/\/$/, "")}/chat/completions`
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Car: ${car}` },
        ],
      }),
    })
    if (!r.ok) return null
    const j = await r.json()
    const p = JSON.parse(j.choices?.[0]?.message?.content || "{}")
    const fuel = FUELS.includes(String(p.fuel_type)) ? String(p.fuel_type) : undefined
    const transmission = TRANS.includes(String(p.transmission)) ? String(p.transmission) : undefined
    const seats = Number.isFinite(Number(p.seats)) ? Number(p.seats) : undefined
    const doors = Number.isFinite(Number(p.doors)) ? Number(p.doors) : undefined
    const bodyType = typeof p.body_type === "string" && p.body_type ? p.body_type : undefined
    return { fuel, transmission, bodyType, seats, doors }
  } catch {
    return null
  }
}

/**
 * GET /{store|vendor}/catalog/specs?brand_id=&model_id=&year=
 *   (or ?brand=Name&model=Name&year=)
 *
 * Returns suggested specs for a brand + model (+ optional year) so the
 * "list a car" form can pre-fill. Static lookup first; AI fills whatever the
 * table is missing (esp. fuel & transmission). Every value is a SUGGESTION.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const q = req.query as Record<string, string | undefined>
  const brand_id = q.brand_id
  const model_id = q.model_id
  let brandName = q.brand || ""
  let modelName = q.model || ""
  const year = q.year ? parseInt(String(q.year), 10) : undefined

  try {
    if (!brandName && brand_id) {
      const [b] = await svc.listBrands({ id: brand_id })
      brandName = b?.name || ""
    }
    if (!modelName && model_id) {
      const [m] = await svc.listCarModels({ id: model_id })
      modelName = m?.name || ""
    }
  } catch {
    // best-effort resolve
  }

  const base = lookupCatalogSpecs(brandName, modelName, year)
  let fuel = base?.fuel
  let transmission = base?.transmission
  let bodyType = base?.bodyType
  let seats = base?.seats
  let doors = base?.doors

  // Fill gaps with AI (accurate fuel/transmission for models not in the table).
  if (!fuel || !transmission || !bodyType) {
    const ai = await aiSpecs(req, brandName, modelName, year)
    if (ai) {
      fuel = fuel || ai.fuel
      transmission = transmission || ai.transmission
      bodyType = bodyType || ai.bodyType
      seats = seats ?? ai.seats
      doors = doors ?? ai.doors
    }
  }

  if (!fuel && !transmission && !bodyType && seats == null && doors == null) {
    res.json({ specs: null })
    return
  }

  // Map bodyType NAME -> body_type_id so clients can pre-select directly.
  let body_type_id: string | undefined
  if (bodyType) {
    try {
      const bts = await svc.listBodyTypes({})
      const match = bts.find((b: any) => norm(b.name) === norm(bodyType as string))
      body_type_id = match?.id
    } catch {
      // ignore
    }
  }

  res.json({
    specs: {
      body_type: bodyType ?? null,
      body_type_id: body_type_id ?? null,
      seats: seats ?? null,
      doors: doors ?? null,
      fuel_type: fuel ?? null,
      transmission: transmission ?? null,
    },
  })
}
