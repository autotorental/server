import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail, isEmailConfiguredForScope } from "../lib/email"
import { getSystemMap } from "../lib/system-map-checks"

// Runs every 5 minutes. If a configured service goes DOWN (a real failure, not "off"),
// email the owner once per new failure. Recovery clears the state so it can alert again later.
const STATE_KEY = "system_monitor_down"
const FROM = process.env.MAIL_FROM || "Auto to Rental <info@autotorental.com>"

export default async function systemMonitor(container: MedusaContainer) {
  const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let data: any
  try { data = await getSystemMap(pg, true) } catch { return }

  const down = (data.nodes || []).filter((n: any) => n.status === "down")
  const downIds = down.map((n: any) => n.id).sort()

  let prev: string[] = []
  try { const row = await pg("app_setting").where({ key: STATE_KEY }).first(); prev = row?.value ? JSON.parse(row.value) : [] } catch { /* */ }

  // persist current down set
  try {
    const exists = await pg("app_setting").where({ key: STATE_KEY }).first()
    if (exists) await pg("app_setting").where({ key: STATE_KEY }).update({ value: JSON.stringify(downIds), updated_at: new Date() })
    else await pg("app_setting").insert({ key: STATE_KEY, value: JSON.stringify(downIds), is_secret: false })
  } catch { /* */ }

  const isNew = downIds.some((id: string) => !prev.includes(id))
  if (!down.length || !isNew) return

  if (!(await isEmailConfiguredForScope(container))) { console.warn("[system-monitor] services down but email not configured:", downIds); return }

  let to = (process.env.ADMIN_NOTIFY_EMAIL || "").trim()
  if (!to) { try { const row = await pg("app_setting").where({ key: "admin_emails" }).first(); to = row?.value || "admin@autotorental.com" } catch { to = "admin@autotorental.com" } }

  const items = down.map((n: any) => `<li><b>${n.label}</b> — ${n.detail}</li>`).join("")
  const html = `<h2 style="color:#ef4444;margin:0 0 8px">⚠️ System alert — ${down.length} service(s) down</h2>`
    + `<p>Auto to Rental detected a connection problem:</p><ul>${items}</ul>`
    + `<p>Open the live map: <a href="https://admin.autotorental.com/dashboard/system-map">System Map</a></p>`
  const text = `System alert — down:\n` + down.map((n: any) => `- ${n.label} — ${n.detail}`).join("\n") + `\n\nhttps://admin.autotorental.com/dashboard/system-map`

  try {
    await sendEmail({ scope: container, from: FROM, to, subject: `⚠️ ATR alert: ${down.map((n: any) => n.label).join(", ")} down`, html, text })
    console.log("[system-monitor] alert emailed:", downIds)
  } catch (e: any) { console.error("[system-monitor] email failed:", e?.message) }
}

export const config = { name: "system-monitor", schedule: "*/5 * * * *" }
