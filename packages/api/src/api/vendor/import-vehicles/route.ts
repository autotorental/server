import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"
import { assertPublicHost } from "../../../lib/ssrf-guard"

async function scrapeCars(domain: string, sellerId: string): Promise<any[]> {
  await assertPublicHost(domain)
  const cars: any[] = []
  const visited = new Set<string>()
  const toVisit = [`https://${domain}`, `https://www.${domain}`]

  for (const startUrl of toVisit) {
    if (visited.has(startUrl)) continue
    try {
      const r = await fetch(startUrl, {
        headers: { "User-Agent": "AutoToRental-Import/1.0 (+https://autotorental.com/import)" },
        signal: AbortSignal.timeout(15000),
        redirect: "follow",
      })
      if (!r.ok) continue
      const html = await r.text()
      visited.add(startUrl)

      // 1. Try JSON-LD schema.org/Car or schema.org/Product
      const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
      for (const m of jsonLdMatches) {
        try {
          const data = JSON.parse(m[1])
          const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data]
          for (const item of items) {
            const type = (item["@type"] || "").toLowerCase()
            if (type === "car" || type === "vehicle" || type === "product" || type === "offer") {
              const car: any = {
                title: item.name || item.headline || "",
                description: item.description || "",
                price: null,
                photos: [],
                url: item.url || startUrl,
                brand: item.brand?.name || item.manufacturer || "",
              }
              if (item.offers) {
                const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers
                car.price = offer?.price || offer?.lowPrice
                car.currency = offer?.priceCurrency || "AED"
              }
              if (item.image) {
                const imgs = Array.isArray(item.image) ? item.image : [item.image]
                car.photos = imgs.map((i: any) => typeof i === "string" ? i : i.url).filter(Boolean).slice(0, 5)
              }
              if (car.title) cars.push(car)
            }
          }
        } catch {}
      }

      // 2. OG/Meta tags for single car pages
      if (cars.length === 0 || html.includes('og:type" content="car') || html.includes('og:type" content="product')) {
        const ogTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1]
        const ogDesc  = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)?.[1]
        const ogImage = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)?.[1]
        const ogUrl   = html.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/i)?.[1]
        // Price patterns
        const priceMatch = html.match(/(?:AED|aed|د\.إ|price[^>]*>)\s*[\s,]*(\d[\d,]+)/i)
        if (ogTitle && /car|rental|rent/i.test(ogTitle + (ogDesc || ""))) {
          cars.push({
            title: ogTitle, description: ogDesc || "",
            price: priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null,
            currency: "AED", photos: ogImage ? [ogImage] : [],
            url: ogUrl || startUrl, brand: "",
          })
        }
      }

      // 3. Find car listing links to crawl
      if (cars.length < 50) {
        const linkMatches = html.matchAll(/href="([^"]+)"/gi)
        for (const lm of linkMatches) {
          const href = lm[1]
          if (!href || href.startsWith("#") || href.startsWith("mailto") || href.startsWith("tel")) continue
          const abs = href.startsWith("http") ? href : `https://${domain}${href.startsWith("/") ? href : "/" + href}`
          if (!abs.includes(domain)) continue
          if (/car|vehicle|rental|fleet|inventory|rent/i.test(abs) && !visited.has(abs) && cars.length < 50) {
            visited.add(abs)
            try {
              const subR = await fetch(abs, {
                headers: { "User-Agent": "AutoToRental-Import/1.0" },
                signal: AbortSignal.timeout(8000),
              })
              if (!subR.ok) continue
              const subHtml = await subR.text()
              // Extract from sub-page
              const ogT = subHtml.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)?.[1]
              const ogD = subHtml.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)?.[1]
              const ogI = subHtml.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)?.[1]
              const prM = subHtml.match(/(?:AED|aed|price[^>]*>)\s*[\s,]*(\d[\d,]+)/i)
              if (ogT && /car|rental|rent|vehicle/i.test(ogT + (ogD || "") + abs)) {
                if (!cars.find(c => c.title === ogT)) {
                  cars.push({
                    title: ogT, description: ogD || "",
                    price: prM ? Number(prM[1].replace(/,/g, "")) : null,
                    currency: "AED", photos: ogI ? [ogI] : [],
                    url: abs, brand: "",
                  })
                }
              }
            } catch {}
          }
        }
      }
      break
    } catch {}
  }
  return cars.filter(c => c.title && c.title.length > 3).slice(0, 50)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  // Verify domain ownership first
  const dv = await pg("domain_verification").where({ seller_id: sellerId, verified: true }).first()
  if (!dv) return res.status(403).json({ message: "Domain not verified. Please verify your domain ownership first." })

  const { action } = (req.body || {}) as { action?: "preview" | "import" }
  const domain = dv.domain

  // PREVIEW — scrape and return without saving
  if (action === "preview" || !action) {
    try {
      const cars = await scrapeCars(domain, sellerId)
      return res.json({ ok: true, domain, found: cars.length, cars: cars.slice(0, 20) })
    } catch (e: any) {
      return res.status(500).json({ ok: false, message: e.message || "Scraping failed" })
    }
  }

  // IMPORT — scrape and create draft vehicles
  if (action === "import") {
    const jobId = `imp_${Date.now()}`
    await pg("import_job").insert({ id: jobId, seller_id: sellerId, domain, status: "running", created_at: new Date(), updated_at: new Date() }).catch(() => {})

    try {
      const cars = await scrapeCars(domain, sellerId)
      const seller = await pg("seller").where({ id: sellerId }).first()
      const cityRow = await pg("city").where({ country_code: "ae" }).whereILike("name", "%dubai%").first()
      let imported = 0
      const results: any[] = []

      for (const car of cars.slice(0, 30)) {
        try {
          const vehicleId = `veh_imp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          await pg("vehicle").insert({
            id: vehicleId,
            seller_id: sellerId,
            title: car.title,
            description: car.description || "",
            daily_price: car.price || null,
            currency_code: (car.currency || "AED").toLowerCase(),
            photos: JSON.stringify(car.photos || []),
            city_id: cityRow?.id || null,
            status: "draft",
            metadata: JSON.stringify({ imported_from: car.url, import_job: jobId }),
            created_at: new Date(),
            updated_at: new Date(),
          })
          imported++
          results.push({ title: car.title, price: car.price, status: "imported" })
        } catch (e: any) {
          results.push({ title: car.title, status: "failed", error: e.message?.slice(0, 100) })
        }
      }

      await pg("import_job").where({ id: jobId }).update({
        status: "done", total_found: cars.length, total_imported: imported,
        results: JSON.stringify(results), updated_at: new Date(),
      }).catch(() => {})

      return res.json({ ok: true, domain, found: cars.length, imported, results })
    } catch (e: any) {
      await pg("import_job").where({ id: jobId }).update({ status: "failed", error: e.message, updated_at: new Date() }).catch(() => {})
      return res.status(500).json({ ok: false, message: e.message || "Import failed" })
    }
  }

  return res.status(400).json({ message: "Invalid action" })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const jobs = await pg("import_job").where({ seller_id: sellerId }).orderBy("created_at", "desc").limit(5)
  const dv = await pg("domain_verification").where({ seller_id: sellerId }).first()
  res.json({ jobs, domain_verified: dv?.verified || false, domain: dv?.domain || null })
}
