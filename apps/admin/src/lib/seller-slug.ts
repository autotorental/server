/** Public URL slug for a rental company (handle from signup, fallback to id). */
export function sellerSlug(seller: { id: string; handle?: string | null; name?: string | null }) {
  const handle = (seller.handle || "").trim()
  if (handle) return handle
  return seller.id
}

export function rentalCompanyPath(seller: { id: string; handle?: string | null; name?: string | null }) {
  return `/rental-companies/${sellerSlug(seller)}`
}

export function publicCompanyPath(seller: { id: string; handle?: string | null }) {
  return `/companies/${sellerSlug(seller)}`
}
