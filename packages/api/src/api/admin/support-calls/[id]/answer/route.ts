import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const LIVEKIT_WS = "wss://livekit.autotorental.com"

// POST /admin/support-calls/:id/answer — admin answers a support call, returns a
// LiveKit token so the admin can join the room from the browser.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const callId = req.params.id
  if (!callId) return res.status(400).json({ message: "Call ID required" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const call = await pg("vendor_call").where({ id: callId }).first()
  if (!call || !String(call.room_name || "").startsWith("support-")) {
    return res.status(404).json({ message: "Support call not found" })
  }
  if (call.status !== "ringing") {
    return res.status(400).json({ message: "Call is no longer ringing" })
  }

  await pg("vendor_call").where({ id: callId }).update({ status: "active", updated_at: new Date() })

  let token = ""
  try {
    const r = await fetch(
      "http://127.0.0.1:7888/token?room=" +
        encodeURIComponent(call.room_name) +
        "&identity=admin-support"
    )
    const d: any = await r.json()
    token = d?.token || ""
  } catch {}

  res.json({ token, room: call.room_name, serverUrl: LIVEKIT_WS })
}
