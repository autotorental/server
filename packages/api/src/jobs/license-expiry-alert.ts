import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isEmailConfiguredForScope, sendEmail } from "../lib/email"

const FROM =
  process.env.MAIL_FROM ||
  process.env.SMTP_FROM ||
  process.env.RESEND_FROM ||
  "Auto to Rental <info@autotorental.com>"

const TO = process.env.ADMIN_NOTIFY_EMAIL || "admin@autotorental.com"

// Warn this many days before the license expires.
const WARN_DAYS = 7
// Keep including expired licenses for this many days so they aren't forgotten,
// but stop eventually to avoid forever-daily spam.
const KEEP_EXPIRED_DAYS = 60

type Row = {
  id: string
  name: string
  email: string | null
  handle: string | null
  trade_license_number: string | null
  trade_license_expiry: string // YYYY-MM-DD (date column)
  trade_license_verified: boolean
}

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const exp = new Date(dateStr + "T00:00:00")
  return Math.round((exp.getTime() - today.getTime()) / 86400000)
}

export default async function licenseExpiryAlert(container: MedusaContainer) {
  const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const rows: Row[] = await pg("seller")
    .whereNull("deleted_at")
    .whereNotNull("trade_license_expiry")
    .whereRaw(`trade_license_expiry <= CURRENT_DATE + INTERVAL '${WARN_DAYS} days'`)
    .whereRaw(`trade_license_expiry >= CURRENT_DATE - INTERVAL '${KEEP_EXPIRED_DAYS} days'`)
    .select(
      "id",
      "name",
      "email",
      "handle",
      "trade_license_number",
      "trade_license_expiry",
      "trade_license_verified"
    )
    .orderBy("trade_license_expiry", "asc")

  if (!rows.length) {
    console.log("[license-expiry-alert] no licenses expiring within", WARN_DAYS, "days")
    return
  }

  if (!(await isEmailConfiguredForScope(container))) {
    console.warn("[license-expiry-alert] email not configured — skipping. Affected:", rows.length)
    return
  }

  const expired = rows.filter((r) => daysUntil(r.trade_license_expiry) < 0)
  const soon = rows.filter((r) => daysUntil(r.trade_license_expiry) >= 0)

  const rowHtml = (r: Row) => {
    const d = daysUntil(r.trade_license_expiry)
    const status =
      d < 0
        ? `<span style="color:#b91c1c;font-weight:700">Expired ${Math.abs(d)} day(s) ago</span>`
        : d === 0
        ? `<span style="color:#b91c1c;font-weight:700">Expires today</span>`
        : `<span style="color:#b45309;font-weight:700">Expires in ${d} day(s)</span>`
    const link = r.handle
      ? `https://admin.autotorental.com/dashboard/rental-companies/${encodeURIComponent(r.handle)}`
      : `https://admin.autotorental.com/dashboard/rental-companies`
    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f4;font-size:14px">
          <a href="${link}" style="color:#1753b0;font-weight:600;text-decoration:none">${r.name}</a>
          ${r.handle ? `<div style="color:#94a3b8;font-size:12px">@${r.handle}</div>` : ""}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f4;font-size:14px;color:#475569">${r.trade_license_number || "—"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f4;font-size:14px;color:#475569">${r.trade_license_expiry}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eef0f4;font-size:14px">${status}</td>
      </tr>`
  }

  const subject =
    expired.length > 0
      ? `⚠️ ${expired.length} trade license(s) expired, ${soon.length} expiring soon`
      : `⏰ ${soon.length} trade license(s) expiring within ${WARN_DAYS} days`

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px">
  <tr><td align="center">
    <table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;max-width:640px">
      <tr><td style="padding:28px 32px 8px">
        <a href="https://autotorental.com" style="font-weight:900;font-size:20px;color:#1753b0;text-decoration:none">AUTO TO RENTAL</a>
      </td></tr>
      <tr><td style="padding:0 32px 8px;color:#111;font-size:18px;font-weight:700">Trade license expiry alert</td></tr>
      <tr><td style="padding:0 32px 16px;color:#475569;font-size:14px;line-height:1.6">
        The following rental companies have a trade license that is expired or will expire within the next ${WARN_DAYS} days. Review and request renewed documents where needed.
      </td></tr>
      <tr><td style="padding:0 24px 24px">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef0f4;border-radius:10px;border-collapse:separate;overflow:hidden">
          <tr style="background:#f8fafc">
            <th align="left" style="padding:10px 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Company</th>
            <th align="left" style="padding:10px 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">License no.</th>
            <th align="left" style="padding:10px 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Expiry</th>
            <th align="left" style="padding:10px 12px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Status</th>
          </tr>
          ${[...expired, ...soon].map(rowHtml).join("")}
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 28px">
        <a href="https://admin.autotorental.com/dashboard/rental-companies" style="display:inline-block;background:#1753b0;color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px;font-size:14px">Open Rental Companies</a>
      </td></tr>
      <tr><td style="padding:0 32px 28px;border-top:1px solid #e5e7eb">
        <p style="font-size:12px;color:#94a3b8;margin:16px 0 0">You receive this because you are the admin contact for Auto to Rental. This is an automated daily check.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`

  const text =
    `Trade license expiry alert\n\n` +
    [...expired, ...soon]
      .map((r) => {
        const d = daysUntil(r.trade_license_expiry)
        const s = d < 0 ? `expired ${Math.abs(d)}d ago` : d === 0 ? "expires today" : `in ${d}d`
        return `- ${r.name} (${r.trade_license_number || "no number"}) — ${r.trade_license_expiry} (${s})`
      })
      .join("\n")

  try {
    await sendEmail({ scope: container, from: FROM, to: TO, subject, html, text })
    console.log(`[license-expiry-alert] sent digest to ${TO} (${rows.length} companies)`)
  } catch (e: any) {
    console.error("[license-expiry-alert] failed to send:", e?.message)
  }
}

export const config = {
  name: "license-expiry-alert",
  schedule: "0 8 * * *", // every day at 08:00 server time
}
