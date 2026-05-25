import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function authPasswordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)

  const resetUrl =
    data.actor_type === "user"
      ? `https://admin.autotorental.com/dashboard/reset-password?token=${data.token}&email=${encodeURIComponent(data.entity_id)}`
      : `https://seller.autotorental.com/seller/reset-password?token=${data.token}&email=${encodeURIComponent(data.entity_id)}`

  const productName = data.actor_type === "user" ? "Auto Rental Admin" : "Auto Rental Seller Portal"

  const html = `
<!doctype html>
<html>
<body style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#f6f7fb;color:#111">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 16px;font-size:22px">Reset your password</h1>
    <p>Hello,</p>
    <p>We received a request to reset the password for your <strong>${productName}</strong> account (${data.entity_id}).</p>
    <p>Click the button below to set a new password:</p>
    <p style="text-align:center;margin:32px 0">
      <a href="${resetUrl}" style="background:#2563eb;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Reset Password</a>
    </p>
    <p style="font-size:12px;color:#666">Or copy and paste this URL into your browser:<br><a href="${resetUrl}" style="word-break:break-all">${resetUrl}</a></p>
    <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="font-size:12px;color:#666">If you didn't request a password reset, you can ignore this email — your password won't change.</p>
    <p style="font-size:12px;color:#666">— Auto Rental Team</p>
  </div>
</body>
</html>`.trim()

  await notificationModuleService.createNotifications({
    to: data.entity_id,
    channel: "email",
    template: "password-reset",
    data: {
      subject: `Reset your ${productName} password`,
      html,
      text: `Reset your password: ${resetUrl}`,
    },
  })
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
