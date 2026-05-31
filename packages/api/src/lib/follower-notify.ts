// Helper: notify all followers of a seller about a new car or price drop.
// Fire-and-forget — caller does NOT await.
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail, isEmailConfiguredForScope } from "./email"

type V = {
  id: string
  title: string
  slug?: string | null
  photos?: string[] | null
  currency_code?: string | null
  daily_price?: number | null
  sale_daily_price?: number | null
  brand_id?: string | null
  city_id?: string | null
  city_name?: string | null
  brand_name?: string | null
}

type S = {
  id: string
  name: string
  handle?: string | null
  logo?: string | null
}

type EventKind = "new_vehicle" | "price_drop"

function carUrl(v: V): string {
  return `https://autotorental.com/cars/${v.slug || v.id}`
}
function companyUrl(s: S): string {
  return `https://autotorental.com/companies/${s.handle || s.id}`
}
function fmt(amount: number | null | undefined, ccy: string): string {
  if (amount == null) return ""
  return `${(ccy || "AED").toUpperCase()} ${amount.toLocaleString()}`
}

function emailHTML(kind: EventKind, v: V, s: S, oldPrice?: number) {
  const ccy = v.currency_code || "AED"
  const newPrice = v.sale_daily_price || v.daily_price
  const photo = v.photos?.[0] || ""
  const isPrice = kind === "price_drop"
  const heading = isPrice ? `💸 Price drop on ${v.title}` : `🚗 ${s.name} just listed a new car`
  const intro = isPrice
    ? `<strong>${s.name}</strong> just dropped the price on a car you might love.`
    : `<strong>${s.name}</strong>, a rental company you follow on Auto to Rental, has just listed a new vehicle.`

  return `<!doctype html>
<html><body style="margin:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:24px 12px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08);">
        <tr><td style="padding:24px 24px 0;">
          <div style="font-size:13px;color:#64748b;font-weight:600;letter-spacing:.05em;text-transform:uppercase;">Auto to Rental</div>
          <h1 style="margin:6px 0 0;font-size:22px;color:#0f172a;">${heading}</h1>
          <p style="margin:8px 0 0;color:#475569;font-size:15px;line-height:1.5;">${intro}</p>
        </td></tr>
        ${photo ? `<tr><td style="padding:18px 24px 0;"><a href="${carUrl(v)}"><img src="${photo}" alt="" style="display:block;width:100%;height:auto;border-radius:12px;"/></a></td></tr>` : ""}
        <tr><td style="padding:18px 24px 0;">
          <div style="font-size:18px;font-weight:700;color:#0f172a;">${v.title}</div>
          <div style="color:#475569;font-size:14px;margin-top:4px;">
            ${v.brand_name ? v.brand_name + " · " : ""}${v.city_name || ""}
          </div>
          <div style="margin-top:12px;display:flex;align-items:baseline;gap:8px;">
            ${isPrice && oldPrice ? `<span style="text-decoration:line-through;color:#94a3b8;font-size:16px;">${fmt(oldPrice, ccy)}</span>` : ""}
            <span style="color:#1753b0;font-size:24px;font-weight:800;">${fmt(newPrice, ccy)} / day</span>
            ${isPrice && oldPrice && newPrice ? `<span style="background:#fee2e2;color:#b91c1c;font-size:12px;padding:3px 8px;border-radius:999px;font-weight:700;">SAVE ${Math.round((1 - (newPrice / oldPrice)) * 100)}%</span>` : ""}
          </div>
        </td></tr>
        <tr><td style="padding:24px;">
          <a href="${carUrl(v)}" style="display:block;text-align:center;background:#1753b0;color:#fff;text-decoration:none;font-weight:700;padding:14px 24px;border-radius:10px;font-size:16px;">View this car →</a>
          <div style="margin-top:14px;text-align:center;font-size:13px;color:#64748b;">
            Or visit <a href="${companyUrl(s)}" style="color:#1753b0;text-decoration:underline;">${s.name}'s page</a> for all their vehicles.
          </div>
        </td></tr>
        <tr><td style="padding:0 24px 24px;border-top:1px solid #e2e8f0;">
          <div style="padding-top:16px;font-size:12px;color:#94a3b8;text-align:center;">
            You receive this because you follow ${s.name} on Auto to Rental.<br/>
            <a href="https://autotorental.com/account" style="color:#1753b0;">Manage notifications</a> · <a href="${companyUrl(s)}#unfollow" style="color:#1753b0;">Unfollow</a>
          </div>
        </td></tr>
      </table>
      <div style="margin-top:14px;font-size:12px;color:#94a3b8;">Auto to Rental · UAE &amp; Syria</div>
    </td></tr>
  </table>
</body></html>`
}

export async function notifyFollowers(
  scope: any,
  sellerId: string,
  vehicle: V,
  kind: EventKind,
  oldPrice?: number
): Promise<{ sent: number; skipped: number }> {
  let sent = 0, skipped = 0
  try {
    const from = process.env.ZOHO_FROM || process.env.SMTP_FROM || process.env.RESEND_FROM || "Auto to Rental <updates@autotorental.com>"
    if (!(await isEmailConfiguredForScope(scope))) { return { sent: 0, skipped: 0 } }

    const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

    // Load seller details
    const seller = await pg("seller").where({ id: sellerId }).first()
    if (!seller) return { sent: 0, skipped: 0 }

    // Followers with email + notify_email = true
    const followers = await pg("seller_follow")
      .where({ seller_id: sellerId, notify_email: true })
      .whereNotNull("follower_email")
      .whereNull("deleted_at")
      .select("follower_email", "follower_name")
    if (followers.length === 0) return { sent: 0, skipped: 0 }

    // Enrich vehicle with brand + city names
    try {
      if (vehicle.brand_id) {
        const b = await pg("brand").where({ id: vehicle.brand_id }).first()
        if (b) vehicle.brand_name = b.name
      }
      if (vehicle.city_id) {
        const c = await pg("city").where({ id: vehicle.city_id }).first()
        if (c) vehicle.city_name = c.name
      }
    } catch {}

    const html = emailHTML(kind, vehicle, { id: seller.id, name: seller.name, handle: seller.handle, logo: seller.logo }, oldPrice)
    const subject = kind === "price_drop"
      ? `💸 Price drop: ${vehicle.title}`
      : `🚗 ${seller.name} just listed: ${vehicle.title}`

    for (const f of followers) {
      try {
        await sendEmail({
          scope,
          from,
          to: f.follower_email,
          subject,
          html,
        })
        sent++
      } catch (e: any) {
        console.error(`[follower-notify] failed to send to ${f.follower_email}:`, e?.message || e)
        skipped++
      }
    }
  } catch (e: any) {
    console.error("[follower-notify]", e?.message || e)
  }
  return { sent, skipped }
}
