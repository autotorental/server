import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// POST /admin/ui-translate { texts: string[], to: "fr"|"es"|... }
// Translates ADMIN UI STRINGS (never live data) to any language via Google
// Translate v2, cached in ui_translation. Arabic ships hand-translated client-side,
// so this powers French/Spanish/etc. -> { map: { [en]: translated } }
const GKEY = process.env.GOOGLE_TRANSLATE_API_KEY || ""

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as any
  const to = String(body?.to || "").slice(0, 5).toLowerCase()
  const texts: string[] = Array.isArray(body?.texts) ? body.texts : []
  if (!to || to.startsWith("en") || !texts.length) return res.json({ map: {} })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const uniq = Array.from(new Set(texts.filter((t) => typeof t === "string" && t.trim()))).slice(0, 600)
  const map: Record<string, string> = {}

  try {
    const cached = await pg("ui_translation").select("en", "value").where("lang", to).whereIn("en", uniq)
    cached.forEach((r: any) => { map[r.en] = r.value })
  } catch { /* ignore */ }

  const missing = uniq.filter((t) => !(t in map))
  if (missing.length && GKEY) {
    for (let i = 0; i < missing.length; i += 100) {
      const chunk = missing.slice(i, i + 100)
      const params = new URLSearchParams()
      params.set("key", GKEY); params.set("target", to); params.set("format", "text")
      chunk.forEach((q) => params.append("q", q))
      try {
        const r = await fetch("https://translation.googleapis.com/language/translate/v2", { method: "POST", body: params })
        const j: any = await r.json()
        const trans = j?.data?.translations || []
        for (let k = 0; k < chunk.length; k++) {
          const v = trans[k]?.translatedText
          if (v && typeof v === "string") {
            map[chunk[k]] = v
            try { await pg("ui_translation").insert({ en: chunk[k], lang: to, value: v }).onConflict(["en", "lang"]).merge() } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
  }
  res.json({ map })
}
