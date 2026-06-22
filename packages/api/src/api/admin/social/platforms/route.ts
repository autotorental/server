import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { ALL_PLATFORMS } from "../../../../modules/social/types"
import { PLATFORM_INFO } from "../../../../modules/social/lib/platform-info"

// GET /admin/social/platforms — list every supported platform and how it
// connects, so the dashboard can render the right buttons/forms.
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.json({ platforms: ALL_PLATFORMS.map((p) => PLATFORM_INFO[p]) })
}
