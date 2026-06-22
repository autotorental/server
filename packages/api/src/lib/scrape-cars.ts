import { assertPublicHost } from "./ssrf-guard"

export function cleanDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, "").toLowerCase()
  } catch { return url.toLowerCase().replace(/^www\./, "").replace(/[^a-z0-9.-]/g, "") }
}

const BRANDS = ["mercedes","benz","maybach","bmw","audi","toyota","nissan","range rover","land rover","rolls royce","rolls-royce","bentley","ferrari","lamborghini","porsche","cadillac","gmc","lexus","land cruiser","patrol","kia","hyundai","ford","chevrolet","mclaren","maserati","jaguar","mini cooper","volkswagen","mazda","honda","mitsubishi","infiniti","jeep","dodge","chrysler","vito","escalade","yukon","ghost","cullinan","urus","g class","g63","g 63","defender","tesla","genesis","suburban","tahoe","camry","corolla","accord","civic","sonata","elantra","fortuner","prado","pajero","x5","x6","x7","a8","s class","e class","c class","7 series","5 series","flying spur","continental","panamera","cayenne","macan","huracan","aventura","revuelto"]
const JUNK = /(archive|categor|\/blog|\/about|\/contact|\/terms|privacy|\/page\/|\/tag\/|\/author\/|all rights|sitemap|cookie|faq|\/wp-|services?\b|service company|for rent in|cars for rent|book now|home\b|gallery|fleet$)/i

function looksLikeCar(title: string): boolean {
  const t = (title || "").toLowerCase()
  if (!t || t.length < 4) return false
  if (/\b(19|20)\d{2}\b/.test(t)) return true          // has a model year
  return BRANDS.some((b) => t.includes(b))             // or a known brand/model
}

// Robust price detection from raw HTML (handles "AED 400", "400 AED", "400/day", "from 400").
function extractPrice(html: string): number | null {
  const txt = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
  const pats = [
    /AED[\s:]*([0-9][0-9,]{1,7})/i,
    /([0-9][0-9,]{1,7})\s*AED/i,
    /د\.إ[\s:]*([0-9][0-9,]{1,7})/,
    /(?:price|from|starting at|rent(?:al)? (?:from|price))[^0-9]{0,18}([0-9][0-9,]{2,7})/i,
    /([0-9][0-9,]{2,7})\s*\/?\s*(?:per\s*)?day/i,
  ]
  for (const re of pats) {
    const m = txt.match(re)
    if (m) { const n = Number(m[1].replace(/,/g, "")); if (n >= 20 && n <= 300000) return n }
  }
  return null
}

const META = (html: string, prop: string) =>
  html.match(new RegExp(`<meta[^>]*property="${prop}"[^>]*content="([^"]+)"`, "i"))?.[1] ||
  html.match(new RegExp(`<meta[^>]*content="([^"]+)"[^>]*property="${prop}"`, "i"))?.[1] || ""

// Crawl a rental-company website and extract REAL car listings (JSON-LD → car detail pages).
export async function scrapeCars(domain: string): Promise<any[]> {
  await assertPublicHost(domain)
  const cars: any[] = []
  const visited = new Set<string>()
  const seenTitle = new Set<string>()
  const push = (c: any) => {
    const key = (c.title || "").trim().toLowerCase()
    if (!key || seenTitle.has(key)) return
    if (JUNK.test(c.title) || JUNK.test(c.url || "")) return
    if (!looksLikeCar(c.title)) return
    seenTitle.add(key); cars.push(c)
  }

  for (const startUrl of [`https://${domain}`, `https://www.${domain}`]) {
    if (visited.has(startUrl)) continue
    try {
      const r = await fetch(startUrl, { headers: { "User-Agent": "AutoToRental-Import/1.0 (+https://autotorental.com/import)" }, signal: AbortSignal.timeout(15000), redirect: "follow" })
      if (!r.ok) continue
      const html = await r.text()
      visited.add(startUrl)

      // 1. JSON-LD Car/Vehicle/Product
      for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
          const data = JSON.parse(m[1])
          const items = Array.isArray(data) ? data : data["@graph"] ? data["@graph"] : [data]
          for (const item of items) {
            const type = (item["@type"] || "").toString().toLowerCase()
            if (["car", "vehicle", "product"].includes(type)) {
              let price: number | null = null
              if (item.offers) { const o = Array.isArray(item.offers) ? item.offers[0] : item.offers; price = Number(o?.price || o?.lowPrice) || null }
              const imgs = item.image ? (Array.isArray(item.image) ? item.image : [item.image]).map((i: any) => typeof i === "string" ? i : i.url).filter(Boolean) : []
              push({ title: item.name || item.headline || "", description: item.description || "", price, currency: "AED", photos: imgs.slice(0, 5), url: item.url || startUrl, brand: item.brand?.name || "" })
            }
          }
        } catch {}
      }

      // 2. Crawl car-detail links
      for (const lm of html.matchAll(/href="([^"]+)"/gi)) {
        if (cars.length >= 60) break
        const href = lm[1]
        if (!href || href.startsWith("#") || href.startsWith("mailto") || href.startsWith("tel")) continue
        const abs = href.startsWith("http") ? href : `https://${domain}${href.startsWith("/") ? href : "/" + href}`
        if (!abs.includes(domain) || visited.has(abs) || JUNK.test(abs)) continue
        if (!/car|vehicle|rental|fleet|rent|limo|/.test(abs)) { /* keep crawling broadly */ }
        visited.add(abs)
        try {
          const sub = await fetch(abs, { headers: { "User-Agent": "AutoToRental-Import/1.0" }, signal: AbortSignal.timeout(8000) }).then((x) => x.ok ? x.text() : "")
          if (!sub) continue
          const title = META(sub, "og:title") || sub.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || ""
          if (!looksLikeCar(title)) continue
          push({
            title: title.trim(), description: META(sub, "og:description"),
            price: extractPrice(sub), currency: "AED",
            photos: [META(sub, "og:image")].filter(Boolean), url: abs, brand: "",
          })
        } catch {}
      }
      break
    } catch {}
  }
  return cars.slice(0, 60)
}
