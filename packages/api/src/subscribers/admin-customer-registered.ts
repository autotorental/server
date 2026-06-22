import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyAdminFeed } from "../lib/admin-feed"

export default async function adminCustomerRegisteredHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name"],
      filters: { id: data.id },
    })
    const c = customers?.[0]
    const name = [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim()
    const desc = name ? name + " (" + (c?.email || "") + ")" : (c?.email || data.id)
    await notifyAdminFeed(container, "New customer registered", desc)
  } catch (e: any) {
    console.error("[admin-customer-registered] failed:", e?.message || e)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
