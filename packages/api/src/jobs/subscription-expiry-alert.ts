import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isEmailConfiguredForScope, sendEmail } from "../lib/email"

const FROM = process.env.MAIL_FROM || process.env.SMTP_FROM || process.env.RESEND_FROM || "Auto to Rental <info@autotorental.com>"
const TO = process.env.ADMIN_NOTIFY_EMAIL || "admin@autotorental.com"

// Daily: (1) flip trials/subscriptions whose end date passed to "expired" (enforces the paywall),
// (2) email the owner a summary of who expired today and whose trial ends within 7 days.
export default async function subscriptionExpiry(container: MedusaContainer) {
  const pg: any = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  // 1) Expire trials past their end date
  const expiredTrials = await pg("seller")
    .whereNull("deleted_at")
    .where("subscription_status", "trial")
    .whereNotNull("trial_ends_at")
    .whereRaw("trial_ends_at < now()")
    .update({ subscription_status: "expired" }, ["id", "name"])
    .catch(() => [])

  // 2) Expire paid subscriptions past their end date
  const expiredSubs = await pg("seller")
    .whereNull("deleted_at")
    .where("subscription_status", "active")
    .whereNotNull("subscription_ends_at")
    .whereRaw("subscription_ends_at < now()")
    .update({ subscription_status: "expired" }, ["id", "name"])
    .catch(() => [])

  // 3) Trials ending within the next 7 days (warn the owner)
  const ending: { name: string; trial_ends_at: string }[] = await pg("seller")
    .whereNull("deleted_at")
    .where("subscription_status", "trial")
    .whereNotNull("trial_ends_at")
    .whereRaw("trial_ends_at >= now() AND trial_ends_at <= now() + INTERVAL '7 days'")
    .orderBy("trial_ends_at", "asc")
    .select("name", "trial_ends_at")
    .catch(() => [])

  const expired = [...(expiredTrials || []), ...(expiredSubs || [])]
  console.log(`[subscription-expiry] expired now: ${expired.length}, trials ending ≤7d: ${ending.length}`)

  if (!expired.length && !ending.length) return
  try {
    if (!(await isEmailConfiguredForScope(container))) return
    const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    const html = `
      <h2>Subscription status — daily summary</h2>
      ${expired.length ? `<p><strong>${expired.length}</strong> vendor(s) just expired (now hidden from the storefront):</p>
        <ul>${expired.map((s: any) => `<li>${s.name}</li>`).join("")}</ul>` : ""}
      ${ending.length ? `<p><strong>${ending.length}</strong> trial(s) ending within 7 days:</p>
        <ul>${ending.map((s) => `<li>${s.name} — ${fmt(s.trial_ends_at)}</li>`).join("")}</ul>
        <p>Reach out before they lapse.</p>` : ""}`
    await sendEmail({ scope: container, from: FROM, to: TO, subject: `Subscriptions: ${expired.length} expired, ${ending.length} ending soon`, html })
  } catch (e) {
    console.warn("[subscription-expiry] email failed", e)
  }
}

export const config = {
  name: "subscription-expiry-alert",
  schedule: "0 9 * * *", // every day at 09:00 server time
}
