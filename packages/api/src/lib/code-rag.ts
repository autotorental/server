const OLLAMA = "http://localhost:11434"
const EMB_MODEL = "nomic-embed-text"

export async function embed(text: string): Promise<number[]> {
  try {
    const r = await fetch(`${OLLAMA}/api/embeddings`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMB_MODEL, prompt: text.slice(0, 8000) }),
      signal: AbortSignal.timeout(30000),
    })
    const d: any = await r.json()
    return Array.isArray(d.embedding) ? d.embedding : []
  } catch { return [] }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9)
}

// Retrieve the most relevant code chunks for a query — the agent reads YOUR
// actual backend code before answering ("study our backend").
export async function retrieveCode(pg: any, query: string, k = 5): Promise<Array<{ path: string; content: string; score: number }>> {
  const qv = await embed(query)
  if (!qv.length) return []
  let rows: any[] = []
  try { rows = await pg("code_embedding").select("path", "content", "embedding") } catch { return [] }
  const scored = rows.map((r) => {
    let e = r.embedding
    if (typeof e === "string") { try { e = JSON.parse(e) } catch { e = [] } }
    return { path: r.path, content: r.content, score: cosine(qv, e) }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, k)
}
