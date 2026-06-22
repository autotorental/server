// Facebook Catalog + Google Merchant compatible XML feed
// Submit at: https://business.facebook.com/commerce_manager (catalog → data sources)
//        and https://merchants.google.com (products → feeds)

import { api } from "@/lib/api"

export const revalidate = 1800 // 30 minutes

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const [v, b, c, bt] = await Promise.all([
    api.vehicles({ limit: 5000 }).catch(() => ({ vehicles: [] as any[] })),
    api.brands().catch(() => ({ brands: [] as any[] })),
    api.cities().catch(() => ({ cities: [] as any[] })),
    api.body_types().catch(() => ({ body_types: [] as any[] })),
  ])
  const brandMap = new Map(b.brands.map((x: any) => [x.id, x.name]))
  const cityMap = new Map(c.cities.map((x: any) => [x.id, x]))
  const bodyMap = new Map(bt.body_types.map((x: any) => [x.id, x.name]))

  const items = v.vehicles.map((x: any) => {
    const brand = brandMap.get(x.brand_id) || "Car"
    const cityObj: any = cityMap.get(x.city_id) || {}
    const cityName = cityObj?.name || "UAE"
    const country = cityObj?.country_code === "sy" ? "SY" : "AE"
    const body = bodyMap.get(x.body_type_id) || "Vehicle"
    const photo = x.photos?.[0] || ""
    const photos = (x.photos || []).slice(0, 10)
    const price = x.sale_daily_price ?? x.daily_price ?? 0
    const orig = x.daily_price ?? price
    const ccy = (x.currency_code || "AED").toUpperCase()
    const url = `https://autotorental.com/cars/${x.id}`
    const title = `${x.title} — ${cityName}`
    const desc = (x.description || `Rent ${brand} ${x.title} in ${cityName} from ${ccy} ${price}/day. Daily, weekly, monthly. Direct contact with verified rental company. No commission.`).slice(0, 999)

    return `
  <item>
    <g:id>${escapeXml(x.id)}</g:id>
    <g:title>${escapeXml(title.slice(0, 150))}</g:title>
    <g:description>${escapeXml(desc)}</g:description>
    <g:link>${escapeXml(url)}</g:link>
    <g:image_link>${escapeXml(photo)}</g:image_link>
    ${photos.slice(1).map((p: string) => `<g:additional_image_link>${escapeXml(p)}</g:additional_image_link>`).join("\n    ")}
    <g:availability>in stock</g:availability>
    <g:price>${price} ${ccy}</g:price>
    ${orig > price ? `<g:sale_price>${price} ${ccy}</g:sale_price>` : ""}
    <g:condition>used</g:condition>
    <g:brand>${escapeXml(brand)}</g:brand>
    <g:product_type>${escapeXml(body)} &gt; ${escapeXml(brand)}</g:product_type>
    <g:google_product_category>5613</g:google_product_category>
    <g:custom_label_0>${escapeXml(cityName)}</g:custom_label_0>
    <g:custom_label_1>${escapeXml(country)}</g:custom_label_1>
    <g:custom_label_2>${escapeXml(body)}</g:custom_label_2>
    <g:custom_label_3>${x.is_featured ? "featured" : "standard"}</g:custom_label_3>
    <g:identifier_exists>no</g:identifier_exists>
    <g:item_group_id>${escapeXml(brand)}</g:item_group_id>
    <g:shipping>
      <g:country>${country}</g:country>
      <g:service>Pickup or Delivery</g:service>
      <g:price>0 ${ccy}</g:price>
    </g:shipping>
  </item>`
  }).join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>Auto to Rental — UAE &amp; Syria Car Rental</title>
  <link>https://autotorental.com</link>
  <description>1,200+ rental cars from verified companies across UAE and Syria.</description>
  ${items}
</channel>
</rss>`

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=1800" },
  })
}
