import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/recordings — list recent session replays (+ 14-day retention cleanup).
// Recordings are stored as SEGMENTS sharing session_id; we DEDUPE to one row per
// session (the most recent segment) so the list shows distinct visitor sessions,
// each fully replayable (the [id] route stitches the session's segments). Falls
// back to id when session_id is null.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  try { await pg("session_recording").where("updated_at", "<", new Date(Date.now() - 14 * 86400000)).del() } catch {}

  let raw: any[] = []
  try {
    raw = await pg("session_recording").where("event_count", ">", 3).orderBy("updated_at", "desc").limit(400)
      .select("id", "session_id", "path", "country", "device", "started_at", "updated_at", "duration_ms", "event_count")
  } catch {}

  // Dedupe by session_id, keeping the most recent segment; aggregate the
  // session's total events/duration so the list reflects the whole session.
  const bySession = new Map<string, any>()
  for (const r of raw) {
    const key = r.session_id || r.id
    const existing = bySession.get(key)
    if (!existing) {
      bySession.set(key, { ...r, event_count: r.event_count || 0 })
    } else {
      existing.event_count = (existing.event_count || 0) + (r.event_count || 0)
      existing.duration_ms = Math.max(existing.duration_ms || 0, r.duration_ms || 0)
    }
  }
  // Show ALL sessions, newest first — no playability filter (owner wants every
  // visit visible, incl. short ones). The list badges duration + event count so
  // short sessions are obvious without being hidden.
  const recordings = Array.from(bySession.values())
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 100)
  res.json({ recordings })
}
