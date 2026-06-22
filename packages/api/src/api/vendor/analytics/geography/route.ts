// GET /admin/analytics/geography?days=30&seller_id=optional
// Returns counts by country + device + hour-of-day
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"
import { isPlatformAdmin } from "../../../../lib/platform-admin"

function regionName(code: string): string {
  const cc = String(code || "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return cc || "Unknown"
  try { return new (Intl as any).DisplayNames(["en"], { type: "region" }).of(cc) || cc } catch { return cc }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const days = parseInt(q.days || "30", 10)
  const from = new Date(Date.now() - days * 86400000)

  // Platform owner/admin sees SITE-WIDE traffic (all visits to the website),
  // sourced from the pageview table — not scoped to a single company.
  if (await isPlatformAdmin(req)) {
    const base = () => knex("pageview").whereNot("is_bot", true).where("created_at", ">=", from)
    const [countriesRows, devicesRows, hourlyRows, totalRow, visRow] = await Promise.all([
      base().whereNotNull("country").whereNot("country", "").select("country").count("* as count").groupBy("country").orderBy("count", "desc").limit(60),
      base().whereNotNull("device").whereNot("device", "").select("device").count("* as count").groupBy("device"),
      base().select(knex.raw("extract(hour from created_at)::int as hour")).count("* as count").groupByRaw("1").orderByRaw("1"),
      base().count("* as c").first(),
      base().countDistinct("session_id as c").first(),
    ])
    const onlineAdminRow = await knex("pageview").whereNot("is_bot", true).where("created_at", ">=", new Date(Date.now() - 5 * 60000)).countDistinct("session_id as c").first()
    const onlineNowAdmin = Number(onlineAdminRow?.c || 0)
    return res.json({
      site_wide: true,
      online_now: onlineNowAdmin,
      total_visits: Number(totalRow?.c || 0),
      visitors: Number(visRow?.c || 0),
      countries: countriesRows.map((c: any) => ({ code: String(c.country).toUpperCase(), name: regionName(c.country), count: parseInt(c.count, 10) })),
      devices: devicesRows.map((d: any) => ({ type: d.device, count: parseInt(d.count, 10) })),
      hourly: hourlyRows.map((h: any) => ({ hour: h.hour, count: parseInt(h.count, 10) })),
      heatmap: [],
      days,
    })
  }

  const sellerId = await resolveVendorSellerId(req); if (!sellerId) return res.status(401).json({ message: "unauthenticated" }); const sellerFilter = { seller_id: sellerId }

  // Merge in PAGE-VIEW geography (company profile + this seller's car pages) so
  // Countries / Top reflect real visitor activity even before any call/WhatsApp
  // contact events exist. Scoped strictly to this seller's own paths.
  let pageviewCountries: { code: string; name: string; count: number }[] = []
  let onlineNow = 0
  let onlineCountries: { code: string; name: string; count: number }[] = []
  try {
    const sellerRow = await knex("seller").where({ id: sellerId }).whereNull("deleted_at").first("handle")
    const carRows = await knex("vehicle").where({ seller_id: sellerId }).whereNull("deleted_at").select("slug", "id")
    const likeClauses: string[] = []
    const params: any[] = []
    if (sellerRow?.handle) { likeClauses.push("path LIKE ?"); params.push(`%/companies/${sellerRow.handle}%`) }
    for (const car of carRows) {
      const key = car.slug || car.id
      if (key) { likeClauses.push("path LIKE ?"); params.push(`%/cars/${key}%`) }
    }
    if (likeClauses.length) {
      const rows = await knex("pageview")
        .whereNot("is_bot", true)
        .where("created_at", ">=", from)
        .whereNotNull("country").whereNot("country", "")
        .whereRaw(`(${likeClauses.join(" OR ")})`, params)
        .select("country").count("* as count")
        .groupBy("country").orderBy("count", "desc").limit(50)
      pageviewCountries = rows.map((r: any) => ({ code: String(r.country).toUpperCase(), name: regionName(r.country), count: parseInt(r.count, 10) }))
      // Visitors active on this company's pages within the last 5 minutes.
      const onlineRow = await knex("pageview")
        .whereNot("is_bot", true)
        .where("created_at", ">=", new Date(Date.now() - 5 * 60000))
        .whereRaw(`(${likeClauses.join(" OR ")})`, params)
        .countDistinct("session_id as c").first()
      onlineNow = Number(onlineRow?.c || 0)
      // Which countries those currently-online visitors are in (last 5 min).
      const onlineCountryRows = await knex("pageview")
        .whereNot("is_bot", true)
        .where("created_at", ">=", new Date(Date.now() - 5 * 60000))
        .whereRaw(`(${likeClauses.join(" OR ")})`, params)
        .whereNotNull("country").whereNot("country", "")
        .select("country").countDistinct("session_id as c")
        .groupBy("country").orderBy("c", "desc").limit(10)
      onlineCountries = onlineCountryRows.map((r: any) => ({ code: String(r.country).toUpperCase(), name: regionName(r.country), count: Number(r.c) }))
    }
  } catch { /* ignore — fall back to contact-event only */ }

  const [countries, devices, hourly, dow] = await Promise.all([
    knex("contact_event")
      .select("country_code", "country_name")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("country_code")
      .groupBy("country_code", "country_name")
      .orderBy("count", "desc")
      .limit(50),
    knex("contact_event")
      .select("device_type")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("device_type")
      .groupBy("device_type"),
    knex("contact_event")
      .select("hour")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("hour")
      .groupBy("hour")
      .orderBy("hour"),
    knex("contact_event")
      .select("day_of_week", "hour")
      .count("* as count")
      .whereNull("deleted_at")
      .where("created_at", ">=", from)
      .modify((qb: any) => { if (sellerFilter.seller_id) qb.where(sellerFilter) })
      .whereNotNull("hour")
      .whereNotNull("day_of_week")
      .groupBy("day_of_week", "hour"),
  ])

  // Combine contact-event countries with page-view countries (sum by code).
  const contactCountries = countries.map((c: any) => ({ code: String(c.country_code).toUpperCase(), name: c.country_name || regionName(c.country_code), count: parseInt(c.count, 10) }))
  const mergedMap = new Map<string, { code: string; name: string; count: number }>()
  for (const row of [...contactCountries, ...pageviewCountries]) {
    if (!row.code) continue
    const ex = mergedMap.get(row.code)
    if (ex) ex.count += row.count
    else mergedMap.set(row.code, { ...row })
  }
  const mergedCountries = Array.from(mergedMap.values()).sort((a, b) => b.count - a.count)

  res.json({
    online_now: onlineNow,
    online_countries: onlineCountries,
    countries: mergedCountries,
    devices: devices.map((d: any) => ({ type: d.device_type, count: parseInt(d.count, 10) })),
    hourly: hourly.map((h: any) => ({ hour: h.hour, count: parseInt(h.count, 10) })),
    heatmap: dow.map((h: any) => ({ day: h.day_of_week, hour: h.hour, count: parseInt(h.count, 10) })),
    days,
  })
}
