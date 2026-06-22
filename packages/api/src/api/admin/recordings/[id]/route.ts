import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/recordings/:id — full rrweb event stream for the player.
// rrweb records ONE FullSnapshot (type 2) at the start of a session, then
// streams incremental mutations. We persist a session as SEGMENTS (rows sharing
// session_id), so later segments contain only incrementals and cannot replay on
// their own (blank player). Fix: STITCH every segment of the session together,
// then SORT by timestamp — guaranteeing the Meta + FullSnapshot come first.
const parseEvents = (raw: any): any[] =>
  Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw) } catch { return [] } })()

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = String((req.params as any).id || "")
  const row = await pg("session_recording").where({ id }).first()
  if (!row) return res.status(404).json({ message: "not found" })

  // Gather all segments of this session (fallback to just this row).
  let segments = [row]
  if (row.session_id) {
    try {
      const all = await pg("session_recording").where({ session_id: row.session_id }).orderBy("started_at", "asc")
      if (all && all.length) segments = all
    } catch { /* keep single row */ }
  }

  let events: any[] = []
  for (const seg of segments) events.push(...parseEvents(seg.events))
  events.sort((a, b) => ((a && a.timestamp) || 0) - ((b && b.timestamp) || 0))

  res.json({
    id: row.id,
    events,
    meta: { path: row.path, country: row.country, device: row.device, started_at: row.started_at, duration_ms: row.duration_ms, segments: segments.length },
  })
}
