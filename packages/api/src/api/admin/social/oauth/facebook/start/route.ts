import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { buildAuthUrl } from "../../../../../../modules/social/lib/meta-oauth"
import { signState } from "../../../../../../modules/social/lib/oauth-state"

// POST /admin/social/oauth/facebook/start
// Called by the admin dashboard (authenticated). Returns the Facebook login
// URL; the dashboard then does window.location = url to start the flow.
export const POST = async (_req: MedusaRequest, res: MedusaResponse) => {
  try {
    const url = buildAuthUrl(signState({ platform: "facebook" }))
    res.json({ url })
  } catch (e: any) {
    res.status(400).json({ message: e?.message || "Failed to build auth URL" })
  }
}
