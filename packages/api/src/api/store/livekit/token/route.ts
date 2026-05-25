import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /store/livekit/token?room=xxx&identity=xxx
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = req.query as any
  const room = q.room
  const identity = q.identity || "Guest-" + Math.random().toString(36).slice(2, 8)

  if (!room) return res.status(400).json({ message: "room is required" })

  try {
    const tkRes = await fetch("http://127.0.0.1:7888/token?room=" + encodeURIComponent(room) + "&identity=" + encodeURIComponent(identity))
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
