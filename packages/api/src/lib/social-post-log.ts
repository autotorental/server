// Wrapper that calls postVehicleToSocial AND records each network result to social_post_log.
import { postVehicleToSocial, VehicleForPost } from "./social-post"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const NETWORKS = ["facebook", "instagram", "google", "linkedin", "pinterest"] as const
const NETWORK_DB: Record<string, string> = {
  google: "google_business",
  linkedin: "linkedin",
  pinterest: "pinterest",
}

export async function postAndLog(
  scope: any,
  v: VehicleForPost & { seller_id?: string },
  triggeredBy: "approve" | "manual" | "retry"
) {
  const results = await postVehicleToSocial(scope, v)
  try {
    const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const rows: any[] = []
    for (const network of NETWORKS) {
      const r = (results as any)[network]
      if (!r) continue
      if (!r.ok && /credentials missing/i.test(r.error || "")) continue
      rows.push({
        vehicle_id: v.id,
        seller_id: v.seller_id || null,
        network: NETWORK_DB[network] || network,
        success: !!r.ok,
        post_id: r.id || null,
        error_msg: r.error || null,
        triggered_by: triggeredBy,
        created_at: new Date(),
      })
    }
    if (rows.length) await pg("social_post_log").insert(rows)
  } catch (e: any) {
    console.error("[social-log] failed to record:", e?.message || e)
  }
  return results
}
