import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveSellerByParam } from "../../../../../lib/resolve-seller"
import { isEmailConfiguredForScope, sendEmail } from "../../../../../lib/email"

const FROM = process.env.ZOHO_FROM || process.env.SMTP_FROM || process.env.RESEND_FROM || "Auto to Rental <info@autotorental.com>"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as any
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerRow = await resolveSellerByParam(pg, req.params.id as string)
  if (!sellerRow) return res.status(404).json({ message: "Seller not found" })
  const id = sellerRow.id

  const update: any = { updated_at: new Date() }

  if (body.action === "approve") {
    update.trade_license_verified = true
    update.trade_license_verified_at = new Date()
    update.trade_license_rejection_reason = null
    update.status = "open"
  } else if (body.action === "reject") {
    update.trade_license_verified = false
    update.trade_license_verified_at = null
    update.trade_license_rejection_reason = body.reason || "Trade license invalid or expired"
  } else {
    return res.status(400).json({ message: "action must be 'approve' or 'reject'" })
  }

  await pg("seller").where({ id }).update(update)
  const [seller] = await pg("seller").where({ id }).select("*")

  // Send welcome email on approval
  if (body.action === "approve" && seller?.email) {
    if (await isEmailConfiguredForScope(req.scope)) {
      try {
        await sendEmail({
          scope: req.scope,
          from: FROM,
          to: seller.email,
          subject: "Welcome to Auto to Rental — Your Account Is Approved!",
          html: `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,system-ui,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:32px 16px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e5e7eb;max-width:600px">
      <tr><td style="padding:32px 32px 16px">
        <a href="https://autotorental.com" style="font-weight:900;font-size:20px;color:#1753b0;text-decoration:none">AUTO TO RENTAL</a>
      </td></tr>
      <tr><td style="padding:0 32px 32px;color:#111;font-size:15px;line-height:1.6">
        <p>Hi ${seller.name || "there"},</p>
        <p>Great news! Your trade license has been verified and your rental company account on <strong>Auto to Rental</strong> is now <strong>active</strong>.</p>
        <p>You can now:</p>
        <ul>
          <li><strong>List your cars</strong> — add vehicles to your catalog and make them visible to thousands of renters.</li>
          <li><strong>Manage your profile</strong> — update your company info, logo, photos, and contact details.</li>
          <li><strong>Receive inquiries</strong> — customers can call or WhatsApp you directly from your listings.</li>
        </ul>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:16px 0">
            <a href="https://seller.autotorental.com/rental/login" style="display:inline-block;background:#1753b0;color:#fff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:10px;font-size:15px">Go to Your Dashboard</a>
          </td></tr>
        </table>
        <p style="color:#64748b;font-size:13px">If you have any questions, reply to this email or contact our support team.</p>
        <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
        <p style="font-size:12px;color:#666">— Auto to Rental Team<br><a href="https://autotorental.com" style="color:#1753b0">autotorental.com</a></p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#999;margin-top:16px">Auto to Rental · Car rental marketplace · UAE &amp; Syria</p>
  </td></tr>
</table>
</body></html>`,
        })
        console.log(`[verify-license] welcome email sent to ${seller.email}`)
      } catch (e: any) {
        console.error("[verify-license] failed to send welcome email:", e?.message)
      }
    }
  }

  res.json({ seller })
}
