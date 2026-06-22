import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendEmail } from "./email"
import { sendPushToSeller } from "./push"

const L: Record<string, { ar: string; en: string; body_ar: (n: string) => string; body_en: (n: string) => string }> = {
  approved:  { ar: "تمت الموافقة على إعلانك ✅", en: "Your ad was approved ✅", body_ar: (n) => `تمت الموافقة على حملتك "${n}" وسيبدأ فريقنا بتشغيلها قريباً.`, body_en: (n) => `Your campaign "${n}" was approved and our team will start running it shortly.` },
  active:    { ar: "إعلانك يعمل الآن 🚀", en: "Your ad is now live 🚀", body_ar: (n) => `حملتك "${n}" أصبحت نشطة الآن. تابع الأداء من لوحة الإعلانات.`, body_en: (n) => `Your campaign "${n}" is now live. Track performance in your Ads dashboard.` },
  paused:    { ar: "تم إيقاف إعلانك مؤقتاً ⏸️", en: "Your ad was paused ⏸️", body_ar: (n) => `تم إيقاف حملتك "${n}" مؤقتاً.`, body_en: (n) => `Your campaign "${n}" has been paused.` },
  completed: { ar: "اكتملت حملتك الإعلانية 🎉", en: "Your campaign is complete 🎉", body_ar: (n) => `اكتملت حملتك "${n}". اطّلع على النتائج النهائية في لوحة الإعلانات.`, body_en: (n) => `Your campaign "${n}" is complete. See the final results in your Ads dashboard.` },
  rejected:  { ar: "لم تتم الموافقة على إعلانك", en: "Your ad was not approved", body_ar: (n) => `لم تتم الموافقة على حملتك "${n}". تم إرجاع الرصيد إلى محفظتك.`, body_en: (n) => `Your campaign "${n}" was not approved. Your budget has been refunded to your wallet.` },
}

// Email + push a vendor when their ad campaign changes status.
export async function notifyAdStatus(req: any, campaign: any, status: string, reason?: string) {
  const t = L[status]
  if (!t) return
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = campaign.seller_id
  const name = campaign.name || "Ad"
  try {
    await sendPushToSeller(pg, sellerId, { title: t.ar, body: t.body_ar(name), data: { link: `/ads/${campaign.id}`, type: "ad", ad_id: campaign.id, status } })
  } catch {}
  try {
    const seller = await pg("seller").where({ id: sellerId }).first().catch(() => null)
    const to = seller?.email
    if (to) {
      const reasonHtml = status === "rejected" && reason ? `<p style="color:#b91c1c"><b>السبب / Reason:</b> ${reason}</p>` : ""
      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;padding:22px;border-radius:14px 14px 0 0">
          <h2 style="margin:0">${t.ar}</h2><p style="margin:6px 0 0;opacity:.9">${t.en}</p></div>
        <div style="border:1px solid #e5e7eb;border-top:0;padding:22px;border-radius:0 0 14px 14px">
          <p>${t.body_ar(name)}</p><p style="color:#6b7280">${t.body_en(name)}</p>${reasonHtml}
          <a href="https://autotorental.com/account" style="display:inline-block;margin-top:10px;background:#2563eb;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:bold">لوحة الإعلانات / Ads dashboard</a>
        </div></div>`
      await sendEmail({ to, subject: `${t.ar} — ${t.en}`, html, text: `${t.body_ar(name)}\n${t.body_en(name)}`, scope: req.scope } as any)
    }
  } catch {}
}
