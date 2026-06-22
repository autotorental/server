import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../../modules/catalog"
import { sendPushToUser } from "../../../../../lib/push"

function getSellerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.app_metadata?.seller_id || auth?.actor_id || null
}

// POST /vendor/calls/:id/callback — vendor calls back the client of a (missed) call.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = getSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const sourceId = req.params.id
  if (!sourceId) return res.status(400).json({ message: "Call ID required" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cat: any = req.scope.resolve(CATALOG_MODULE)

  const [source] = await pg("vendor_call").where({ id: sourceId, seller_id: sellerId }).select("*")
  if (!source) return res.status(404).json({ message: "Call not found" })
  if (!source.client_id) {
    return res.status(400).json({ message: "This call has no registered client to call back" })
  }

  const callId = "cb_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
  const roomName = "cb-" + callId

  await pg("vendor_call").insert({
    id: callId,
    vehicle_id: source.vehicle_id,
    seller_id: sellerId,
    client_id: source.client_id,
    room_name: roomName,
    client_name: source.client_name || null,
    client_phone: source.client_phone || null,
    direction: "outbound",
    status: "ringing",
    created_at: new Date(),
    updated_at: new Date(),
  })

  void sendPushToUser(pg, source.client_id, {
    title: "Callback",
    body: (source.client_name || "The rental company") + " is calling you back",
    data: { type: "incoming_call", callId, title: "Callback", client_name: source.client_name || "" },
  }).catch(() => {})

  const identity = "vendor-" + sellerId.slice(-8)
  let token = ""
  try {
    const tkRes = await fetch("http://127.0.0.1:7888/token?room=" + encodeURIComponent(roomName) + "&identity=" + encodeURIComponent(identity))
    const tkData = await tkRes.json()
    token = tkData.token || ""
  } catch {}

  let vehicle = null
  try {
    if (source.vehicle_id) vehicle = await cat.retrieveVehicle(source.vehicle_id)
  } catch {}

  res.status(201).json({
    call_id: callId,
    token,
    room: roomName,
    serverUrl: "wss://livekit.autotorental.com",
    vehicle,
  })
}
