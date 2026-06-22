import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { loadCpanelConfig, saveCpanelConfig, cpanelTest, maskToken, type CpanelConfig } from "../../../../lib/cpanel"

// Admin: view / update / test the cPanel mail-server credentials.
// GET  /admin/settings/cpanel-mail            -> { host, user, domain, token_masked, token_set }
// POST /admin/settings/cpanel-mail            -> save (blank token keeps current)
// POST /admin/settings/cpanel-mail {action:"test", ...overrides} -> connection test
// The token is never returned in plaintext.

const publicView = (c: CpanelConfig) => ({ host: c.host, user: c.user, domain: c.domain, token_masked: maskToken(c.token), token_set: !!c.token })

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  res.json(publicView(await loadCpanelConfig(pg)))
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as any
  const cur = await loadCpanelConfig(pg)

  // Build the candidate config, merging any provided fields onto the saved ones.
  const candidate: CpanelConfig = {
    host: ((body.host ?? cur.host) || "").trim(),
    user: ((body.user ?? cur.user) || "").trim(),
    domain: ((body.domain ?? cur.domain) || "").trim(),
    token: (typeof body.token === "string" && body.token.trim()) ? body.token.trim() : cur.token,
  }

  if (body.action === "test") {
    const result = await cpanelTest(candidate)
    return res.json(result)
  }

  if (!candidate.host || !candidate.user || !candidate.domain) {
    return res.status(400).json({ message: "Host, username and domain are required" })
  }
  await saveCpanelConfig(pg, candidate)
  res.json({ ok: true, ...publicView(candidate) })
}
