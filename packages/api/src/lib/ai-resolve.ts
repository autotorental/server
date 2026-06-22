import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export type AiCfg = { enabled: boolean; provider: string; base: string; key: string; model: string; isClaude: boolean }

// Resolve which AI engine should run a given task, per the AI Control Center
// per-task assignment (ai_task_<key>), falling back to the global ai_provider.
export async function resolveAiTask(pg: any, taskKey: string): Promise<AiCfg> {
  const wanted = ["ai_master", "ai_task_" + taskKey, "ai_feat_" + taskKey, "ai_provider", "openai_api_key", "openai_model", "claude_api_key", "ollama_cloud_api_key", "ollama_model"]
  const m: Record<string, string> = {}
  try { const rows = await pg("app_setting").whereIn("key", wanted); for (const r of rows) m[r.key] = r.value } catch {}
  const off: AiCfg = { enabled: false, provider: "off", base: "", key: "", model: "", isClaude: false }
  if (m["ai_master"] === "0") return off
  let provider = String(m["ai_task_" + taskKey] || "").trim().toLowerCase()
  if (!provider) provider = m["ai_feat_" + taskKey] === "0" ? "off" : ((m["openai_api_key"] || "").length > 20 ? "openai" : (m["claude_api_key"] || "").length > 20 ? "claude" : "local")
  if (provider === "off") return off
  if (provider.startsWith("claude")) return { enabled: true, provider: "claude", base: "https://api.anthropic.com", key: m["claude_api_key"] || "", model: "claude-haiku-4-5-20251001", isClaude: true }
  if (provider === "openai") return { enabled: true, provider, base: "https://api.openai.com/v1", key: m["openai_api_key"] || "", model: m["openai_model"] || "gpt-4o-mini", isClaude: false }
  if (provider === "ollama_cloud") return { enabled: true, provider, base: "https://ollama.com/v1", key: m["ollama_cloud_api_key"] || "", model: m["ollama_model"] || "gpt-oss:120b", isClaude: false }
  return { enabled: true, provider: "local", base: "http://localhost:11434/v1", key: "ollama", model: m["ollama_model"] || "qwen2.5:3b", isClaude: false }
}

// One call that handles both Claude (Anthropic) and OpenAI-compatible providers.
export async function aiComplete(cfg: AiCfg, system: string, user: string, opts?: { maxTokens?: number; json?: boolean; temperature?: number; timeoutMs?: number }): Promise<string> {
  const maxTokens = opts?.maxTokens ?? 1200
  const temperature = opts?.temperature ?? 0.6
  const timeoutMs = opts?.timeoutMs ?? 60000
  const wantJson = !!opts?.json
  if (cfg.isClaude) {
    const r = await fetch(cfg.base + "/v1/messages", {
      method: "POST",
      headers: { "x-api-key": cfg.key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, temperature, system, messages: [{ role: "user", content: user + (wantJson ? "\n\nReturn ONLY the JSON object, no markdown." : "") }] }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!r.ok) throw new Error("claude " + r.status + " " + (await r.text().catch(() => "")).slice(0, 200))
    const j: any = await r.json()
    return (j.content || []).map((c: any) => c.text || "").join("")
  }
  const body: any = { model: cfg.model, temperature, max_tokens: maxTokens, messages: [{ role: "system", content: system }, { role: "user", content: user + (wantJson && cfg.provider !== "openai" ? "\n\nReturn ONLY valid JSON, no markdown, no code fences." : "") }] }
  if (wantJson && cfg.provider === "openai") body.response_format = { type: "json_object" }
  const r = await fetch(cfg.base.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + cfg.key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) throw new Error("ai " + r.status + " " + (await r.text().catch(() => "")).slice(0, 200))
  const j: any = await r.json()
  return j?.choices?.[0]?.message?.content || ""
}
