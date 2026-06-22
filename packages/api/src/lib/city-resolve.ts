import crypto from "crypto"

export function slugifyCity(s: string): string {
  return String(s || "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

// Find an existing city by (country_code, name/slug) — or create it on the fly.
// This is what powers "auto-create on selection": when a vendor or client picks
// a city that isn't in the catalog yet, it gets added automatically.
export async function findOrCreateCity(
  pg: any,
  input: { name: string; country_code: string; name_ar?: string | null }
): Promise<{ id: string; name: string; slug: string; country_code: string; created: boolean } | null> {
  const name = String(input.name || "").trim()
  const cc = String(input.country_code || "").trim().toLowerCase()
  if (!name || !/^[a-z]{2}$/.test(cc)) return null

  const slug = slugifyCity(name)
  if (!slug) return null

  // 1) Try to match an existing city in the same country (by slug or case-insensitive name)
  const existing = await pg("city")
    .whereNull("deleted_at")
    .where("country_code", cc)
    .where((qb: any) => {
      qb.where("slug", slug).orWhereRaw("LOWER(name) = ?", [name.toLowerCase()])
    })
    .first()
  if (existing) {
    return { id: existing.id, name: existing.name, slug: existing.slug, country_code: existing.country_code, created: false }
  }

  // 2) Create it. Guard against a slug clash across countries by suffixing the cc.
  let finalSlug = slug
  const slugClash = await pg("city").whereNull("deleted_at").where("slug", slug).first()
  if (slugClash) finalSlug = `${slug}-${cc}`

  const id = "city_" + crypto.randomBytes(13).toString("hex")
  const [city] = await pg("city").insert({
    id,
    country_code: cc,
    name,
    name_ar: input.name_ar || null,
    slug: finalSlug,
    sort_order: 999,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  }).returning("*")
  return { id: city.id, name: city.name, slug: city.slug, country_code: city.country_code, created: true }
}
