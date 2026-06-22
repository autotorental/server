import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendPushToUser, sendPushToSeller } from "../../../../lib/push"

// POST /store/call-code/dial  { code, caller_name }
// Resolves the code's owner, inserts a ringing vendor_call scoped to that owner
// (so their existing incoming-call overlay picks it up via polling), rings them
// via push, and returns the LiveKit room for the caller to join.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body as any) || {}
  const code = String(body.code || "").replace(/\D/g, "")
  if (!code) return res.status(400).json({ message: "code required" })

  const row = await pg("call_code").where({ code }).first()
  if (!row) return res.status(404).json({ message: "No user found for this code" })
  if (!row.user_id && !row.seller_id) {
    return res.status(409).json({ message: "This code can't receive calls yet" })
  }

  const callId = "call_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
  const room = "code-" + code + "-" + Date.now().toString(36)
  const callerName = String(body.caller_name || "Someone")

  // Insert a ringing call the owner's incoming overlay will poll & answer.
  const base: any = {
    id: callId,
    room_name: room,
    client_name: callerName,
    status: "ringing",
  }
  if (row.user_id) {
    await pg("vendor_call").insert({ ...base, client_id: row.user_id, direction: "outbound" })
  } else if (row.seller_id) {
    await pg("vendor_call").insert({ ...base, seller_id: row.seller_id, direction: "inbound" })
  }

  const payload = {
    title: "Incoming free call",
    body: `${callerName} is calling you`,
    data: { type: "incoming_call", callId, room, client_name: callerName, via: "code" },
  }
  try {
    if (row.user_id) await sendPushToUser(pg, row.user_id, payload)
    if (row.seller_id) await sendPushToSeller(pg, row.seller_id, payload)
  } catch {
    /* push failure shouldn't block the caller */
  }

  res.json({ call_id: callId, room })
}
