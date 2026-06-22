import { Navigate } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { BuildingStorefront } from "@medusajs/icons"

// Surface the company/store profile as a top-level menu item (home dashboard)
// instead of being buried under Settings. The actual editor still lives at the
// native /settings/store path, so we just redirect there.
export const config: RouteConfig = { label: "Store", icon: BuildingStorefront, rank: 2 }

export default function StoreTop() {
  return <Navigate to="/settings/store" replace />
}
