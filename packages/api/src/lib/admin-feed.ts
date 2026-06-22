import { Modules } from "@medusajs/framework/utils"

/**
 * Pushes a notification to the admin dashboard bell (feed channel).
 * The dashboard Notification component requires data.title and shows
 * an optional data.description, so both are provided here.
 */
export async function notifyAdminFeed(
  container: any,
  title: string,
  description: string
): Promise<void> {
  try {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    await notificationModuleService.createNotifications({
      to: "",
      channel: "feed",
      template: "admin-ui",
      data: { title, description },
    })
  } catch (e: any) {
    console.error("[admin-feed] failed:", e?.message || e)
  }
}
