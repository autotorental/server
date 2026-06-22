import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET  /store/rental-tracking/:token → get session info (consent page)
// POST /store/rental-tracking/:token { otp } → verify OTP
// PUT  /store/rental-tracking/:token { lat, lng, accuracy } → update location

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const session = await pg("rental_tracking as rt")
    .leftJoin("seller as s", "s.id", "rt.seller_id")
    .where("rt.tracking_token", req.params.token)
    .whereIn("rt.status", ["pending", "active"])
    .select("rt.id", "rt.client_name", "rt.otp_verified", "rt.status", "s.name as seller_name", "s.logo as seller_logo")
    .first()
  if (!session) return res.status(404).json({ message: "Session not found or expired" })
  res.json({ session })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { otp } = (req.body || {}) as { otp?: string }
  if (!otp) return res.status(400).json({ message: "OTP required" })
  const session = await pg("rental_tracking").where({ tracking_token: req.params.token }).whereIn("status", ["pending", "active"]).first()
  if (!session) return res.status(404).json({ message: "Session not found" })
  if (new Date(session.otp_expires_at) < new Date()) return res.status(400).json({ message: "OTP expired — ask the rental company to resend" })
  if (session.otp !== otp.trim()) return res.status(400).json({ message: "Invalid OTP" })
  await pg("rental_tracking").where({ id: session.id }).update({ otp_verified: true, status: "active", updated_at: new Date() })
  res.json({ ok: true, message: "Verified! Location tracking enabled." })
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { lat, lng, accuracy } = (req.body || {}) as { lat?: number; lng?: number; accuracy?: number }
  if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" })
  const updated = await pg("rental_tracking")
    .where({ tracking_token: req.params.token, otp_verified: true, status: "active" })
    .update({ lat, lng, accuracy_m: accuracy || null, location_at: new Date(), updated_at: new Date() })
  if (!updated) return res.status(404).json({ message: "Session not found or not verified" })
  res.json({ ok: true })
}
