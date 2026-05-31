import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/livekit/token?call_id=xxx  OR  ?room=veh-xxx (legacy)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = req.query as Record<string, string | undefined>
  const callId = q.call_id
  let room = q.room
  let identity = q.identity || "Guest-" + Math.random().toString(36).slice(2, 8)

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  if (callId) {
    const call = await pg("vendor_call").where({ id: callId }).first()
    if (!call) return res.status(404).json({ message: "Call not found" })
    if (!["ringing", "active"].includes(call.status)) {
      return res.status(400).json({ message: "Call is no longer active" })
    }
    room = call.room_name
    if (q.identity) identity = q.identity
    else identity = "guest-" + callId.slice(-8)
  }

  if (!room) return res.status(400).json({ message: "call_id or room is required" })

  const expectedPrefix = "veh-"
  if (room.startsWith(expectedPrefix)) {
    const vehicleId = room.slice(expectedPrefix.length)
    const call = await pg("vendor_call")
      .where({ room_name: room })
      .whereIn("status", ["ringing", "active"])
      .orderBy("created_at", "desc")
      .first()
    if (!call) {
      const vehicle = await pg("vehicle").where({ id: vehicleId, status: "active" }).first()
      if (!vehicle?.livekit_enabled) {
        return res.status(403).json({ message: "Video call not available for this listing" })
      }
    }
  } else if (room.startsWith("cb-")) {
    const call = await pg("vendor_call")
      .where({ room_name: room })
      .whereIn("status", ["ringing", "active"])
      .first()
    if (!call) {
      return res.status(403).json({ message: "Callback room not available" })
    }
  }

  try {
    const tkRes = await fetch(
      "http://127.0.0.1:7888/token?room=" +
        encodeURIComponent(room) +
        "&identity=" +
        encodeURIComponent(identity)
    )
    const data = await tkRes.json()
    if (!tkRes.ok || !data.token) {
      return res.status(500).json({ message: "Failed to generate token" })
    }
    res.json({
      token: data.token,
      room: data.room,
      identity: data.identity,
      serverUrl: "wss://livekit.autotorental.com",
    })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Token server unreachable" })
  }
}
