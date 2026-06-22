import crypto from "crypto"
// Append an event to a user's history timeline. Best-effort (never throws).
export async function logUserEvent(pg: any, subjectId: string, subjectType: string, event: string, detail?: string, actor?: string): Promise<void> {
  try {
    await pg("user_history").insert({
      id: "uh_" + crypto.randomBytes(13).toString("hex").toUpperCase(),
      subject_id: subjectId, subject_type: subjectType, event,
      detail: detail || null, actor: actor || "admin", created_at: new Date(),
    })
  } catch { /* ignore */ }
}
