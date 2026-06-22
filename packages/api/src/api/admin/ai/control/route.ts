import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET/POST /admin/ai/control — master switch + PER-TASK AI provider assignment.
// Each task -> off | openai | ollama_cloud | claude | local.
// aiGate middleware blocks a task when its provider is "off" (ai_feat_<key>="0").
export const FEATURES = [
  "descriptions", "blog", "seo", "images", "video", "legal",
  "public_chat", "assistant", "pagespeed", "sentry", "autofix",
  "pricing", "market_analytics", "search_console", "cloudflare",
]
const VALID = ["off", "openai", "ollama_cloud", "claude", "local"]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const keys = ["ai_master", "ai_provider", "openai_api_key", "claude_api_key", "ollama_cloud_api_key", "ollama_model",
    ...FEATURES.flatMap((f) => [`ai_feat_${f}`, `ai_task_${f}`])]
  const m: Record<string, string> = {}
  try { const rows = await pg("app_setting").whereIn("key", keys); for (const r of rows) m[r.key] = r.value } catch {}
  const def = (m["openai_api_key"] || "").length > 20 ? "openai" : (m["claude_api_key"] || "").length > 20 ? "claude" : "local"
  const tasks: Record<string, string> = {}
  for (const f of FEATURES) {
    let p = String(m[`ai_task_${f}`] || "").trim()
    if (!p) p = m[`ai_feat_${f}`] === "0" ? "off" : def
    tasks[f] = p
  }
  res.json({
    master: m["ai_master"] !== "0",
    providers: {
      openai_set: !!(m["openai_api_key"] && m["openai_api_key"].length > 20),
      claude_set: !!(m["claude_api_key"] && m["claude_api_key"].length > 20),
      ollama_cloud_set: !!(m["ollama_cloud_api_key"] && m["ollama_cloud_api_key"].length > 10),
    },
    ollama_model: m["ollama_model"] || "",
    tasks,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body as any) || {}
  const set = async (key: string, value: string, secret = false) => {
    await pg("app_setting").insert({ key, value, is_secret: secret, updated_at: new Date() }).onConflict("key").merge({ value, updated_at: new Date() })
  }
  if (typeof body.master === "boolean") await set("ai_master", body.master ? "1" : "0")
  if (body.tasks && typeof body.tasks === "object") {
    for (const f of FEATURES) {
      const p = body.tasks[f]
      if (typeof p === "string" && VALID.includes(p)) {
        await set(`ai_task_${f}`, p)
        await set(`ai_feat_${f}`, p === "off" ? "0" : "1")
        if (f === "public_chat") await set("public_chat_provider", p === "off" ? "" : (p === "local" ? "ollama" : p))
      }
    }
  }
  if (typeof body.ollama_model === "string") await set("ollama_model", body.ollama_model.trim())
  if (body.ollama_cloud_api_key && String(body.ollama_cloud_api_key).length > 10) {
    await set("ollama_cloud_api_key", String(body.ollama_cloud_api_key).trim(), true)
  }
  res.json({ ok: true })
}
