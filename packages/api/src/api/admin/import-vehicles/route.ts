import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { scrapeCars, cleanDomain } from "../../../lib/scrape-cars"

// POST /admin/import-vehicles — OWNER import (no domain verification). Pick a seller, preview the
// scraped cars, then import ONLY the ones the owner selected (sent back in `cars`).
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as { domain?: string; seller_id?: string; action?: "preview" | "import"; cars?: any[] }
  const { seller_id, action } = body

  if (!seller_id) return res.status(400).json({ message: "Pick a rental company (seller_id) first." })
  const seller = await pg("seller").where({ id: seller_id }).first()
  if (!seller) return res.status(404).json({ message: "Rental company not found." })

  // PREVIEW — scrape and return (owner then picks which to import)
  if (action === "preview" || !action) {
    if (!body.domain) return res.status(400).json({ message: "Enter the website/domain to import from." })
    const domain = cleanDomain(body.domain)
    if (!domain) return res.status(400).json({ message: "Invalid domain." })
    try {
      const cars = await scrapeCars(domain)
      return res.json({ ok: true, domain, seller_id, seller_name: seller.name, found: cars.length, cars: cars.slice(0, 40) })
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e?.message || "Scraping failed" })
    }
  }

  // IMPORT — insert ONLY the selected cars sent from the preview
  if (action === "import") {
    let cars = Array.isArray(body.cars) ? body.cars.filter((c) => c && c.title) : []
    // Fallback: if the client sent no selection, re-scrape (back-compat)
    if (!cars.length && body.domain) { try { cars = await scrapeCars(cleanDomain(body.domain)) } catch {} }
    if (!cars.length) return res.status(400).json({ message: "No cars selected to import." })

    const jobId = `imp_${Date.now()}`
    await pg("import_job").insert({ id: jobId, seller_id, domain: cleanDomain(body.domain || ""), status: "running", created_at: new Date(), updated_at: new Date() }).catch(() => {})
    const cityRow = await pg("city").where({ country_code: "ae" }).whereILike("name", "%dubai%").first()
    let imported = 0
    const results: any[] = []
    for (const car of cars.slice(0, 60)) {
      try {
        const vehicleId = `veh_imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        await pg("vehicle").insert({
          id: vehicleId, seller_id,
          title: String(car.title).slice(0, 250),
          description: car.description || "",
          daily_price: Number(car.price) || null,
          currency_code: (car.currency || "AED").toLowerCase(),
          photos: JSON.stringify(Array.isArray(car.photos) ? car.photos.filter(Boolean).slice(0, 6) : []),
          city_id: cityRow?.id || null, status: "draft",
          metadata: JSON.stringify({ imported_from: car.url, import_job: jobId, imported_by: "admin" }),
          created_at: new Date(), updated_at: new Date(),
        })
        imported++; results.push({ title: car.title, status: "imported" })
      } catch (e: any) { results.push({ title: car.title, status: "failed", error: e?.message?.slice(0, 80) }) }
    }
    await pg("import_job").where({ id: jobId }).update({ status: "done", total_found: cars.length, total_imported: imported, results: JSON.stringify(results), updated_at: new Date() }).catch(() => {})
    return res.json({ ok: true, seller_id, seller_name: seller.name, imported, results })
  }

  return res.status(400).json({ message: "Invalid action" })
}

// GET /admin/import-vehicles — sellers list (dropdown) + recent import jobs
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellers = await pg("seller").whereNull("deleted_at").select("id", "name", "handle").orderBy("name", "asc")
  const jobs = await pg("import_job").orderBy("created_at", "desc").limit(10).catch(() => [])
  res.json({ sellers, jobs })
}
