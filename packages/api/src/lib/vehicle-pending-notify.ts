import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail, isEmailConfiguredForScope } from "./email"
import { getSetting } from "./settings"
import { sendPushToTokens } from "./push"

// The admin dashboard page where pending cars are reviewed & approved.
const APPROVALS_URL = "https://admin.autotorental.com/dashboard/pending-approvals"

async function readSetting(scope: any, key: string): Promise<string> {
  try {
    return (await getSetting(scope, key)) || ""
  } catch {
    return ""
  }
}

async function resolveAdminEmail(scope: any): Promise<string> {
  return (
    (await readSetting(scope, "admin_notify_email")) ||
    process.env.ADMIN_NOTIFY_EMAIL ||
    "admin@autotorental.com"
  )
}

/**
 * Push tokens for the platform owner's device(s). The owner signs into the
 * mobile app as a seller/member (role is stored as "vendor"), so we can't rely
 * on role alone — we target the configured login email(s) too. Adjust the
 * `admin_push_emails` setting (comma-separated) to the email you log into the
 * mobile app with if you don't receive the push.
 */
async function resolveAdminPushTokens(scope: any): Promise<string[]> {
  const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const raw =
    (await readSetting(scope, "admin_push_emails")) ||
    process.env.ADMIN_PUSH_EMAILS ||
    "admin@autotorental.com,alkhudarigroupuae@gmail.com"
  const emails = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const rows = await pg("push_token").select("token", "email", "role")
  const tokens = new Set<string>()
  for (const r of rows) {
    const email = String(r.email || "").toLowerCase()
    const role = String(r.role || "").toLowerCase()
    if ((email && emails.includes(email)) || role === "admin" || role === "owner") {
      if (r.token) tokens.add(String(r.token))
    }
  }
  return Array.from(tokens)
}

function fmtMoney(v: unknown): string {
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return ""
  return n.toLocaleString("en-US")
}

function escapeHtml(s: string): string {
  return String(s || "").replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  )
}

/**
 * Fire-and-forget: when a vendor submits a car for approval, email the owner
 * and push to the owner's mobile device(s). The push carries
 * { type: "vehicle_pending", vehicle_id } so tapping it opens that car in the app.
 */
export async function notifyAdminVehiclePending(
  scope: any,
  vehicle: any,
  seller: any
): Promise<void> {
  const company = escapeHtml(seller?.name || "A company")
  const title = escapeHtml(vehicle?.title || "New vehicle")
  const price = fmtMoney(vehicle?.daily_price)
  const cur = String(vehicle?.currency_code || "").toUpperCase()
  const priceLine = price ? `${price} ${cur}/day` : ""
  const cover =
    Array.isArray(vehicle?.photos) && vehicle.photos[0] ? String(vehicle.photos[0]) : ""
  const vehicleId = String(vehicle?.id || "")

  // 1) Email the owner
  ;(async () => {
    try {
      if (!(await isEmailConfiguredForScope(scope))) return
      const to = await resolveAdminEmail(scope)
      await sendEmail({
        scope,
        to,
        subject: `🚗 New car pending approval: ${vehicle?.title || "New vehicle"}`,
        html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#1e3a8a;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center">
      <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:.5px">AUTO TO RENTAL</div>
      <div style="color:#bfdbfe;font-size:11px;letter-spacing:2px;margin-top:4px">NEW LISTING · NEEDS APPROVAL</div>
    </div>
    <div style="background:#fff;border-radius:0 0 16px 16px;padding:28px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      ${
        cover
          ? `<img src="${escapeHtml(cover)}" alt="${title}" style="width:100%;max-height:240px;object-fit:cover;border-radius:12px;margin-bottom:18px"/>`
          : ""
      }
      <h1 style="margin:0 0 6px;font-size:20px;color:#0f172a">${title}</h1>
      <p style="margin:0 0 4px;color:#475569;font-size:14px"><strong>${company}</strong> added a new car.</p>
      ${priceLine ? `<p style="margin:0 0 16px;color:#1d4ed8;font-weight:800;font-size:16px">${priceLine}</p>` : ""}
      <p style="margin:16px 0 8px;color:#334155;line-height:1.6;font-size:15px">It's waiting for your approval before it goes live on the marketplace.</p>
      <p style="margin:18px 0 8px">
        <a href="${APPROVALS_URL}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;font-weight:800;padding:13px 26px;border-radius:10px;font-size:15px">Open &amp; approve</a>
      </p>
      <p style="margin:14px 0 0;color:#94a3b8;font-size:12px;line-height:1.6">Or open it on your phone — you'll get a notification too. Tap it to review the car.</p>
    </div>
  </div>
</body></html>`,
      })
    } catch (e: any) {
      console.error("[vehicle-pending] email failed:", e?.message || e)
    }
  })()

  // 2) Push to the owner's mobile device(s) — tap opens the car for review
  ;(async () => {
    try {
      const tokens = await resolveAdminPushTokens(scope)
      if (!tokens.length) return
      const company2 = seller?.name || "A company"
      const title2 = vehicle?.title || "New vehicle"
      await sendPushToTokens(tokens, {
        title: "New car pending approval",
        body: `${company2} added "${title2}"${priceLine ? " · " + priceLine : ""}. Tap to review & approve.`,
        data: { type: "vehicle_pending", vehicle_id: vehicleId },
      })
    } catch (e: any) {
      console.error("[vehicle-pending] push failed:", e?.message || e)
    }
  })()
}
