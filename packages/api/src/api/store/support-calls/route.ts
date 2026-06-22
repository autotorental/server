import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail, isEmailConfiguredForScope } from "../../../lib/email"

const FROM =
  process.env.MAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.RESEND_FROM ||
  "Auto to Rental <info@autotorental.com>"
const SUPPORT_ADMIN_EMAIL = process.env.SUPPORT_NOTIFY_EMAIL || "admin@autotorental.com"
const LIVEKIT_WS = "wss://livekit.autotorental.com"

function getClientIp(req: MedusaRequest): string | null {
  const fwd = (req.headers["x-forwarded-for"] as string) || ""
  const first = fwd.split(",")[0]?.trim()
  if (first) return first
  return (req.socket as any)?.remoteAddress || null
}

async function mintToken(room: string, identity: string): Promise<string> {
  try {
    const r = await fetch(
      "http://127.0.0.1:7888/token?room=" +
        encodeURIComponent(room) +
        "&identity=" +
        encodeURIComponent(identity)
    )
    const d: any = await r.json()
    return d?.token || ""
  } catch {
    return ""
  }
}

// POST /store/support-calls — a customer starts a free WebRTC support call that
// rings the admin dashboard. Creates a support call row (no seller/vehicle) and
// returns a LiveKit token for the customer to join the room.
import { rateLimited, clientIp as rlIp } from "../../../lib/rate-limit"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("support_calls", rlIp(req), 3, 60000)) return res.status(429).json({ message: "Too many call attempts — please wait a moment" })
  const body = (req.body || {}) as {
    client_name?: string
    client_phone?: string
    client_id?: string
  }
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const callId = "scall_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36)
  const roomName = "support-" + callId.slice(-10)

  await pg("vendor_call").insert({
    id: callId,
    vehicle_id: null,
    seller_id: null,
    room_name: roomName,
    client_name: body.client_name || null,
    client_phone: body.client_phone || null,
    client_id: body.client_id || null,
    client_ip: getClientIp(req),
    direction: "inbound",
    status: "ringing",
    created_at: new Date(),
    updated_at: new Date(),
  })

  const token = await mintToken(roomName, "client-" + callId.slice(-8))

  void (async () => {
    try {
      if (await isEmailConfiguredForScope(req.scope)) {
        await sendEmail({
          scope: req.scope,
          from: FROM,
          to: SUPPORT_ADMIN_EMAIL,
          subject: "Incoming support call",
          html: `<p>A customer started a free support call${
            body.client_name ? " (" + body.client_name + ")" : ""
          }.</p>
            <p>Open the <a href="https://admin.autotorental.com/dashboard/support-calls">Support Calls</a> page to answer.</p>`,
        })
      }
    } catch {}
  })()

  res.json({ call_id: callId, token, room: roomName, serverUrl: LIVEKIT_WS })
}
