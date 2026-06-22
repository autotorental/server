/** Resolve a seller from URL param (internal id or public handle). */
export async function resolveSellerByParam(pg: any, param: string) {
  if (!param?.trim()) return null
  const key = param.trim()

  const byId = await pg("seller").where({ id: key }).first()
  if (byId) return byId

  const byHandle = await pg("seller").where({ handle: key }).first()
  if (byHandle) return byHandle

  const byHandleCi = await pg("seller").whereRaw("lower(handle) = lower(?)", [key]).first()
  return byHandleCi || null
}

export function sellerPublicSlug(seller: { id: string; handle?: string | null }) {
  return (seller.handle || "").trim() || seller.id
}
