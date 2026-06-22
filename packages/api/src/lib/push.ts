import admin from "firebase-admin"
import path from "path"

let app: admin.app.App | null = null

function getApp(): admin.app.App {
  if (app) return app
  if (admin.apps.length) {
    app = admin.apps[0]!
    return app
  }
  const saPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(process.cwd(), "firebase-service-account.json")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require(saPath)
  app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  return app
}

export type PushPayload = {
  title: string
  body: string
  data?: Record<string, unknown>
  // When true (incoming calls): send a data-only, high-priority message so the
  // app's background handler wakes and shows a full-screen ringing UI on Android,
  // even when the app is killed. iOS still gets an alert+sound via the apns block.
  dataOnly?: boolean
  image?: string
}

export async function sendPushToTokens(tokens: string[], payload: PushPayload) {
  const valid = Array.from(new Set((tokens || []).filter(Boolean)))
  if (!valid.length) return { sent: 0, failed: 0 }
  getApp()
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(payload.data || {})) data[k] = String(v)

  let message: admin.messaging.MulticastMessage
  if (payload.dataOnly) {
    data.title = payload.title
    data.body = payload.body
    message = {
      tokens: valid,
      data,
      android: { priority: "high" },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { alert: { title: payload.title, body: payload.body }, sound: "default" } },
      },
    }
  } else {
    message = {
      tokens: valid,
      notification: { title: payload.title, body: payload.body },
      data,
      android: { priority: "high", notification: { sound: "default", channelId: "default" } },
      apns: { payload: { aps: { sound: "default" } } },
    }
  }

  if (payload.image && !payload.dataOnly) {
    ;(message.notification as any).imageUrl = payload.image
    ;(message.android as any).notification.imageUrl = payload.image
    ;(message.apns as any).payload.aps.mutableContent = true
    ;(message.apns as any).fcmOptions = { imageUrl: payload.image }
  }

  try {
    const resp = await admin.messaging().sendEachForMulticast(message)
    const results = resp.responses.map((r, i) => ({ token: valid[i], ok: r.success, code: (r.error as any)?.code || null }))
    return { sent: resp.successCount, failed: resp.failureCount, results }
  } catch (e: any) {
    return { sent: 0, failed: valid.length, error: String(e?.message || e) }
  }
}

export async function sendPushToUser(pg: any, userId: string | null, payload: PushPayload) {
  if (!userId) return { sent: 0, failed: 0 }
  const rows = await pg("push_token").where({ user_id: userId }).select("token")
  return sendPushToTokens(rows.map((r: any) => r.token), payload)
}

export async function sendPushToSeller(pg: any, sellerId: string | null, payload: PushPayload) {
  if (!sellerId) return { sent: 0, failed: 0 }
  const rows = await pg("push_token").where({ seller_id: sellerId }).select("token")
  return sendPushToTokens(rows.map((r: any) => r.token), payload)
}
