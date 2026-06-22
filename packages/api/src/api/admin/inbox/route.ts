import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const status = (req.query.status as string) || ""
  const view = (req.query.view as string) || "all" // all | inbox | sent | contact | deleted
  const q = (req.query.q as string) || ""

  const query = knex("contact_message").orderBy("created_at", "desc").limit(300)

  if (view === "deleted") {
    // Trash folder: only soft-deleted messages.
    query.whereNotNull("deleted_at")
  } else {
    // Every normal view hides trashed messages.
    query.whereNull("deleted_at")

    if (status && status !== "all") query.where("status", status)

    if (view === "inbox") {
      query.where(function (this: any) {
        this.where("direction", "inbound").orWhereIn("source", [
          "contact_form",
          "zoho_imap_inbox",
          "imap_inbox",
          "inbound_email",
        ])
      })
    } else if (view === "sent") {
      query.where(function (this: any) {
        this.where("direction", "outbound")
          .orWhere("status", "sent")
          .orWhereIn("source", ["outbound", "zoho_imap_sent", "imap_sent"])
      })
    } else if (view === "contact") {
      query.where("source", "contact_form")
    }
  }

  if (q.trim()) {
    const term = `%${q.trim().toLowerCase()}%`
    query.where(function (this: any) {
      this.whereRaw("LOWER(name) LIKE ?", [term])
        .orWhereRaw("LOWER(email) LIKE ?", [term])
        .orWhereRaw("LOWER(COALESCE(subject,'')) LIKE ?", [term])
        .orWhereRaw("LOWER(message) LIKE ?", [term])
    })
  }

  const items = await query

  // Status counts exclude trashed messages so the KPIs stay accurate.
  const counts = await knex("contact_message")
    .whereNull("deleted_at")
    .select("status")
    .count("* as count")
    .groupBy("status")
  const directionCounts = await knex("contact_message")
    .whereNull("deleted_at")
    .select("direction")
    .count("* as count")
    .groupBy("direction")
  const deletedRow = await knex("contact_message").whereNotNull("deleted_at").count("* as count").first()

  const countsObj = counts.reduce((a: any, r: any) => {
    a[r.status] = parseInt(r.count, 10)
    return a
  }, {} as Record<string, number>)
  countsObj.deleted = parseInt((deletedRow as any)?.count || "0", 10)

  res.json({
    items,
    mailbox: "info@autotorental.com",
    counts: countsObj,
    direction_counts: directionCounts.reduce((a: any, r: any) => {
      const key = r.direction || "unknown"
      a[key] = parseInt(r.count, 10)
      return a
    }, {} as Record<string, number>),
  })
}
