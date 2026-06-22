import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ccConfigured, ccPing } from "../../../lib/connectycube"

// GET /admin/chat-integration — status of the marketplace chat system.
// The chat is FIRST-PARTY (data lives in our own support_chat table → owner
// owns it, and it shows in this admin + the vendor app + the buyer app).
// ConnectyCube is wired on the backend (token endpoint) and can power native
// push / file sharing once the mobile app ships the native SDK.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let stats = { conversations: 0, messages: 0, today: 0, unread: 0 }
  try {
    const since = new Date(Date.now() - 86400000)
    const [conv, msg, today, unread] = await Promise.all([
      pg("support_chat").countDistinct("session_id as c").first(),
      pg("support_chat").count("id as c").first(),
      pg("support_chat").where("created_at", ">", since).count("id as c").first(),
      pg("support_chat").where({ sender: "visitor", read_by_agent: false }).count("id as c").first(),
    ])
    stats = {
      conversations: Number(conv?.c || 0),
      messages: Number(msg?.c || 0),
      today: Number(today?.c || 0),
      unread: Number(unread?.c || 0),
    }
  } catch { /* table may be empty */ }

  let cc: any = { configured: ccConfigured(), app_id: process.env.CONNECTYCUBE_APP_ID || "", ok: false }
  if (cc.configured) {
    try { const p = await ccPing(); cc = { ...cc, ok: p.ok, app_id: p.app_id } } catch { /* offline */ }
  }

  res.json({
    first_party: { active: true, ...stats },
    connectycube: cc,
    dashboard_url: "https://admin.connectycube.com",
  })
}
