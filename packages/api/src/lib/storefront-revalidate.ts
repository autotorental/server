// Trigger Next.js on-demand revalidation for specific pages only.
// Only clears cache for the seller's company page + cars — not the whole site.
export async function revalidateSellerPages(sellerId: string, handle?: string | null, extraPaths?: string[]): Promise<void> {
  const base = process.env.STOREFRONT_URL || "https://autotorental.com"
  const secret = process.env.REVALIDATION_SECRET || ""
  if (!secret) return

  const paths: string[] = ["/companies", "/cars"]
  if (handle) {
    paths.push(`/companies/${handle}`)
  }
  // Also revalidate by seller id path (in case accessed by id)
  paths.push(`/companies/${sellerId}`)
  // Caller-supplied pages (e.g. a specific /cars/:slug detail page)
  for (const ep of extraPaths || []) { if (ep) paths.push(ep) }

  try {
    await fetch(`${base}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, paths }),
      signal: AbortSignal.timeout(5000),
    })
  } catch {
    // Non-fatal: storefront will still revalidate on its own schedule
  }
}
