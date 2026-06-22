import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/users-segmented — all platform users classified as vendor vs client.
// Vendor = has a seller member account OR customer.metadata.role === "vendor".
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try {
    const customers = await pg("customer")
      .whereNull("deleted_at")
      .select("id", "email", "first_name", "last_name", "phone", "metadata", "created_at")
      .orderBy("created_at", "desc")

    let members: any[] = []
    try {
      members = await pg("member")
        .whereNull("deleted_at")
        .select("id", "email", "first_name", "last_name", "created_at")
    } catch { members = [] }

    const memberByEmail = new Map<string, any>()
    for (const m of members) if (m.email) memberByEmail.set(String(m.email).toLowerCase(), m)

    const users: any[] = customers.map((c: any) => {
      const email = (c.email || "").toLowerCase()
      const meta = c.metadata || {}
      const member = memberByEmail.get(email)
      const isVendor = meta?.role === "vendor" || !!member
      const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || (member?.first_name || "")
      return {
        id: c.id,
        email: c.email,
        name: name || "—",
        phone: c.phone || null,
        role: isVendor ? "vendor" : "client",
        company: isVendor ? (member?.first_name || meta?.company_name || null) : null,
        country: meta?.country || null,
        created_at: c.created_at,
        source: "customer",
      }
    })

    // Vendor member accounts that are not also customers
    const customerEmails = new Set(customers.map((c: any) => (c.email || "").toLowerCase()))
    for (const m of members) {
      const email = (m.email || "").toLowerCase()
      if (email && !customerEmails.has(email)) {
        users.push({
          id: m.id, email: m.email, name: m.first_name || "—", phone: null,
          role: "vendor", company: m.first_name || null, country: null,
          created_at: m.created_at, source: "member",
        })
      }
    }

    // Dashboard staff — the people who can log into THIS admin (user table)
    let staff: any[] = []
    try {
      staff = await pg("user").whereNull("deleted_at")
        .select("id", "email", "first_name", "last_name", "created_at")
    } catch { staff = [] }
    for (const u of staff) {
      users.push({
        id: u.id, email: u.email,
        name: [u.first_name, u.last_name].filter(Boolean).join(" ") || "—",
        phone: null, role: "staff", company: "Dashboard", country: null,
        created_at: u.created_at, source: "user",
      })
    }

    const vendors = users.filter((u) => u.role === "vendor").length
    const staffCount = users.filter((u) => u.role === "staff").length
    const clients = users.filter((u) => u.role === "client").length
    res.json({ users, counts: { all: users.length, staff: staffCount, vendors, clients } })
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Could not load users" })
  }
}
