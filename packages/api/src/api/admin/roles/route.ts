import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Lightweight role → permission matrix for platform staff/users.
// Stored as JSON in app_setting("role_permissions"). Editable from /dashboard/users.
const ROLES = ["root", "admin", "supervisor", "support", "client"] as const
const PERMISSIONS = [
  { key: "manage_companies",    label: "Manage rental companies" },
  { key: "manage_vehicles",     label: "Manage cars / listings" },
  { key: "approve_listings",    label: "Approve pending listings" },
  { key: "manage_users",        label: "Manage users & permissions" },
  { key: "manage_emails",       label: "Inbox & emails" },
  { key: "view_analytics",      label: "Analytics & live traffic" },
  { key: "manage_marketing",    label: "Marketing, SEO & Google Ads" },
  { key: "use_ai_agent",        label: "AI Assistant & Auto-Heal" },
  { key: "manage_settings",     label: "Platform & AI settings" },
  { key: "manage_subscriptions",label: "Subscriptions & billing" },
]
const ALL = PERMISSIONS.map((p) => p.key)
const DEFAULTS: Record<string, string[]> = {
  root:       [...ALL],
  admin:      [...ALL],
  supervisor: ["manage_companies", "manage_vehicles", "approve_listings", "view_analytics", "manage_emails"],
  support:    ["manage_emails", "view_analytics"],
  client:     [],
}
const KEY = "role_permissions"

function clean(input: any): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const r of ROLES) {
    const arr = Array.isArray(input?.[r]) ? input[r] : DEFAULTS[r]
    out[r] = ALL.filter((k) => arr.includes(k))
  }
  out.root = [...ALL] // root always has everything
  return out
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let matrix: Record<string, string[]> = { ...DEFAULTS }
  try {
    const row = await pg("app_setting").where({ key: KEY }).first()
    if (row?.value) matrix = clean(JSON.parse(row.value))
  } catch { /* defaults */ }
  res.json({ roles: ROLES, permissions: PERMISSIONS, matrix })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as { matrix?: any }
  if (!body.matrix || typeof body.matrix !== "object") return res.status(400).json({ message: "matrix required" })
  const matrix = clean(body.matrix)
  await pg("app_setting")
    .insert({ key: KEY, value: JSON.stringify(matrix), updated_at: new Date() })
    .onConflict("key").merge({ value: JSON.stringify(matrix), updated_at: new Date() })
  res.json({ ok: true, matrix })
}
