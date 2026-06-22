import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
import { startCallRecording } from "../../../../../lib/egress"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

// POST /api/vendor/calls/:id/answer — vendor answers a call, returns LiveKit token
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const callId = req.params.id
  if (!callId) return res.status(400).json({ message: "Call ID required" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cat: any = req.scope.resolve(CATALOG_MODULE)

  const [call] = await pg("vendor_call").where({ id: callId, seller_id: sellerId }).select("*")
  if (!call) return res.status(404).json({ message: "Call not found" })
  if (call.status !== "ringing") return res.status(400).json({ message: "Call is no longer ringing" })

  // Update status to active
  await pg("vendor_call").where({ id: callId }).update({ status: "active", updated_at: new Date() })

  void (async () => {
    const rec = await startCallRecording(call.room_name, callId)
    if (rec) {
      await pg("vendor_call").where({ id: callId }).update({ egress_id: rec.egressId, recording_file: rec.file, updated_at: new Date() })
    }
  })()

  // Get LiveKit token from the token server
  const identity = "vendor-" + sellerId.slice(-8)
  let token = ""
  try {
    const tkRes = await fetch("http://127.0.0.1:7888/token?room=" + encodeURIComponent(call.room_name) + "&identity=" + encodeURIComponent(identity))
    const tkData = await tkRes.json()
    token = tkData.token || ""
  } catch {
    // fallback — return empty token
  }

  // Load vehicle info
  let vehicle = null
  try {
    if (call.vehicle_id) {
      vehicle = await cat.retrieveVehicle(call.vehicle_id)
    }
  } catch {}

  res.json({
    token,
    room: call.room_name,
    vehicle,
  })
}
