import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as any
  if (!body?.seller_id || !body?.vehicle_id) {
    return res.status(400).json({ message: "seller_id and vehicle_id required" })
  }

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const [seller] = await pg("seller").where({ id: body.seller_id }).select("id")
  if (!seller) return res.status(404).json({ message: "Seller not found" })

  const [vehicle] = await pg("vehicle").where({ id: body.vehicle_id }).select("*")
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" })

  const callId = "call_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
  const roomName = "veh-" + body.vehicle_id

  await pg("vendor_call").insert({
    id: callId,
    vehicle_id: body.vehicle_id,
    seller_id: body.seller_id,
    room_name: roomName,
    client_name: body.client_name || null,
    client_phone: body.client_phone || null,
    status: "ringing",
    created_at: new Date(),
    updated_at: new Date(),
  })

  res.status(201).json({
    call: {
      id: callId,
      room: roomName,
      vehicle_id: body.vehicle_id,
      status: "ringing",
    },
  })
}
