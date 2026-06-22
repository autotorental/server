import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isPlatformAdmin, getAuthEmail } from "../../../../lib/platform-admin"
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const is_admin = await isPlatformAdmin(req)
  res.json({ is_admin, email: await getAuthEmail(req) })
}
