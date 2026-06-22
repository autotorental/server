import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/locations/active-countries
// Returns EVERY country (any ISO code) that has at least one ACTIVE listed
// vehicle — derived from BOTH the vehicle's city country AND the listing
// company's own country. The storefront country switcher only offers these,
// so a visitor can only pick a country that actually has cars. Not limited to
// any preset list — works for any country a vendor lists in.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const set = new Set<string>()
  const add = (v: any) => {
    const cc = String(v || "").toLowerCase()
    if (/^[a-z]{2}$/.test(cc)) set.add(cc)
  }
  try {
    // 1) Country of the city each active vehicle is listed in.
    const byCity = await pg("vehicle as v")
      .join("city as c", "c.id", "v.city_id")
      .whereNull("v.deleted_at")
      .where("v.status", "active")
      .whereNotNull("c.country_code")
      .distinct(pg.raw("lower(c.country_code) as cc"))
    for (const r of byCity || []) add(r.cc)
  } catch { /* ignore */ }
  try {
    // 2) Country of the rental company (seller.metadata.country) for any seller
    //    that has at least one active vehicle — covers vendors in new countries
    //    even before dedicated cities exist for them.
    const bySeller = await pg("seller as s")
      .whereNull("s.deleted_at")
      .whereRaw("(s.metadata->>'country') is not null")
      .whereExists(function (this: any) {
        this.select(pg.raw("1")).from("vehicle as v").whereRaw("v.seller_id = s.id").whereNull("v.deleted_at").where("v.status", "active")
      })
      .distinct(pg.raw("lower(s.metadata->>'country') as cc"))
    for (const r of bySeller || []) add(r.cc)
  } catch { /* ignore */ }

  res.json({ countries: Array.from(set) })
}
