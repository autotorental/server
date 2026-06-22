import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/analytics/behavior?range=1d|3d|7d|30d
// A native Microsoft-Clarity-style behavioural dashboard from OUR OWN data:
//  - Users overview (sessions, unique users, live now, new vs returning) from `pageview`
//  - Behaviour insights (rage clicks, dead clicks, excessive scrolling, quick backs)
//    computed from the rrweb event streams in `session_recording`
//  - Top pages / countries / devices / browsers + a sessions trend
const RANGES: Record<string, number> = { "1d": 1, "3d": 3, "7d": 7, "30d": 30 }
const cache: Record<string, { at: number; data: any }> = {}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const rangeKey = (typeof req.query.range === "string" && RANGES[req.query.range]) ? req.query.range : "3d"
  if (cache[rangeKey] && Date.now() - cache[rangeKey].at < 120000) { res.json(cache[rangeKey].data); return }
  const days = RANGES[rangeKey]
  const since = `now() - interval '${days} days'`
  const q = (sql: string) => pg.raw(sql).then((r: any) => (r && r.rows ? r.rows : Array.isArray(r) ? r : []))

  try {
    const [tot] = await q(`SELECT count(*) pv, count(DISTINCT session_id) sessions FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since}`)
    const [live] = await q(`SELECT count(DISTINCT session_id) n FROM pageview WHERE is_bot IS NOT TRUE AND created_at > now() - interval '5 minutes'`)
    const [nr] = await q(`
      WITH firsts AS (SELECT session_id, min(created_at) fs FROM pageview WHERE is_bot IS NOT TRUE GROUP BY session_id),
           win AS (SELECT DISTINCT session_id FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since})
      SELECT count(*) FILTER (WHERE f.fs > ${since}) new_users,
             count(*) FILTER (WHERE f.fs <= ${since}) returning_users
      FROM win w JOIN firsts f USING (session_id)`)
    const topCountries = await q(`SELECT coalesce(country,'—') name, count(DISTINCT session_id) sessions FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since} GROUP BY country ORDER BY sessions DESC LIMIT 8`)
    const topPages = await q(`SELECT path name, count(*) views, count(DISTINCT session_id) sessions FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since} GROUP BY path ORDER BY views DESC LIMIT 10`)
    const devices = await q(`SELECT coalesce(device,'unknown') name, count(DISTINCT session_id) sessions FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since} GROUP BY device ORDER BY sessions DESC LIMIT 6`)
    const browsers = await q(`SELECT coalesce(browser,'unknown') name, count(DISTINCT session_id) sessions FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since} GROUP BY browser ORDER BY sessions DESC LIMIT 6`)
    const bucket = days <= 1 ? "hour" : "day"
    const fmt = days <= 1 ? "HH24:00" : "MM-DD"
    const trend = await q(`SELECT to_char(date_trunc('${bucket}', created_at), '${fmt}') t, count(DISTINCT session_id) sessions, count(*) views FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since} GROUP BY 1 ORDER BY 1`)
    const [topUser] = await q(`SELECT session_id, coalesce(country,'—') country, coalesce(device,'unknown') device, count(*) views FROM pageview WHERE is_bot IS NOT TRUE AND created_at > ${since} GROUP BY session_id, country, device ORDER BY views DESC LIMIT 1`)

    // --- behavioural scan of recent recordings (bounded for speed) ---
    const recs = await pg("session_recording")
      .where("updated_at", ">", new Date(Date.now() - days * 86400000))
      .andWhere("event_count", ">", 3)
      .orderBy("updated_at", "desc").limit(90)
      .select("id", "events", "duration_ms")

    let rage = 0, dead = 0, scrollx = 0, quick = 0, scanned = 0
    const ex: any = { rage: [], dead: [], scroll: [], quick: [] }
    for (const r of recs) {
      let ev = Array.isArray(r.events) ? r.events : (() => { try { return JSON.parse(r.events) } catch { return [] } })()
      if (!ev.length) continue
      ev = ev.slice().sort((a: any, b: any) => ((a && a.timestamp) || 0) - ((b && b.timestamp) || 0))
      scanned++
      const clicks = ev.filter((x: any) => x.type === 3 && x.data && x.data.source === 2 && x.data.type === 2).map((x: any) => ({ t: x.timestamp, x: x.data.x, y: x.data.y }))
      const scrolls = ev.filter((x: any) => x.type === 3 && x.data && x.data.source === 3)
      // Rage: >=3 clicks within 1s within 30px
      let isRage = false
      for (let i = 0; i < clicks.length && !isRage; i++) { let c = 1; for (let j = i + 1; j < clicks.length && clicks[j].t - clicks[i].t <= 1000; j++) { if (Math.abs(clicks[j].x - clicks[i].x) < 30 && Math.abs(clicks[j].y - clicks[i].y) < 30) c++ } if (c >= 3) isRage = true }
      if (isRage) { rage++; if (ex.rage.length < 6) ex.rage.push(r.id) }
      // Dead: a click with no mutation/scroll/nav within 1.2s after it
      let isDead = false
      for (const c of clicks) { const reacted = ev.some((x: any) => x.timestamp > c.t && x.timestamp <= c.t + 1200 && ((x.type === 3 && x.data && (x.data.source === 0 || x.data.source === 3)) || x.type === 4)); if (!reacted) { isDead = true; break } }
      if (isDead) { dead++; if (ex.dead.length < 6) ex.dead.push(r.id) }
      // Excessive scrolling: >25 scroll events or >5 up/down reversals
      let reversals = 0, lastDir = 0
      for (let i = 1; i < scrolls.length; i++) { const d = Math.sign(((scrolls[i].data.y) || 0) - ((scrolls[i - 1].data.y) || 0)); if (d && lastDir && d !== lastDir) reversals++; if (d) lastDir = d }
      if (scrolls.length > 25 || reversals > 5) { scrollx++; if (ex.scroll.length < 6) ex.scroll.push(r.id) }
      // Quick back: very short engaged session (<8s)
      if ((r.duration_ms || 0) > 0 && (r.duration_ms || 0) < 8000) { quick++; if (ex.quick.length < 6) ex.quick.push(r.id) }
    }
    const pct = (n: number) => (scanned ? Math.round((n / scanned) * 1000) / 10 : 0)

    const data = {
      ok: true, range: rangeKey, days,
      users: { pageviews: +(tot?.pv || 0), sessions: +(tot?.sessions || 0), live: +(live?.n || 0), new_users: +(nr?.new_users || 0), returning_users: +(nr?.returning_users || 0), topUser: topUser || null },
      insights: {
        scanned,
        rage: { sessions: rage, pct: pct(rage), examples: ex.rage },
        dead: { sessions: dead, pct: pct(dead), examples: ex.dead },
        scroll: { sessions: scrollx, pct: pct(scrollx), examples: ex.scroll },
        quick: { sessions: quick, pct: pct(quick), examples: ex.quick },
      },
      topCountries, topPages, devices, browsers, trend,
    }
    cache[rangeKey] = { at: Date.now(), data }
    res.json(data)
  } catch (e: any) {
    res.json({ ok: false, error: e?.message || "failed" })
  }
}
