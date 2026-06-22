// Shared caption rendering + filter matching for product (car) posts.

export function renderTemplate(tpl: string, product: any): string {
  const storeUrl = (process.env.STORE_URL || "").replace(/\/$/, "")
  const price =
    product?.variants?.[0]?.calculated_price?.calculated_amount ??
    product?.variants?.[0]?.prices?.[0]?.amount ??
    ""
  const tokens: Record<string, string> = {
    title: product?.title ?? "",
    description: (product?.description ?? "").slice(0, 400),
    handle: product?.handle ?? "",
    url: storeUrl && product?.handle ? `${storeUrl}/products/${product.handle}` : "",
    price: price !== "" ? String(price) : "",
    image: product?.thumbnail ?? product?.images?.[0]?.url ?? "",
  }
  return tpl.replace(/\{(\w+)\}/g, (_, k) => tokens[k] ?? "")
}

export function matchesFilters(product: any, filters: any): boolean {
  if (!filters) {
    return true
  }
  if (filters.status && product?.status !== filters.status) {
    return false
  }
  if (filters.collection_id && product?.collection_id !== filters.collection_id) {
    return false
  }
  if (filters.category_id) {
    const ids = (product?.categories ?? []).map((c: any) => c.id)
    if (!ids.includes(filters.category_id)) {
      return false
    }
  }
  const amount = product?.variants?.[0]?.calculated_price?.calculated_amount
  if (filters.min_price != null && amount != null && amount < filters.min_price) {
    return false
  }
  if (filters.max_price != null && amount != null && amount > filters.max_price) {
    return false
  }
  return true
}

// Fields to request from query.graph for a product to render a post.
export const PRODUCT_POST_FIELDS = [
  "id",
  "title",
  "description",
  "handle",
  "status",
  "thumbnail",
  "collection_id",
  "images.url",
  "categories.id",
  "variants.calculated_price.calculated_amount",
]
