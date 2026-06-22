import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

const execAsync = promisify(exec)


// GET /admin/pagespeed/history?url=...
export const getHistory = async (pg: any, url: string) => {
  try {
    return await pg("pagespeed_history").where({ url }).orderBy("created_at", "desc").limit(20)
  } catch { return [] }
}

async function saveHistory(req: any, data: any) {
  try {
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    await pg("pagespeed_history").insert({
      url: data.url, strategy: data.strategy,
      scores: JSON.stringify(data.scores || {}),
      metrics: JSON.stringify({ lcp: data.lcp, fcp: data.fcp, cls: data.cls, tbt: data.tbt }),
      opportunities: JSON.stringify((data.opportunities || []).slice(0, 10)),
      source: data.source || "lighthouse",
      created_at: new Date(),
    })
  } catch {}
}
// GET /admin/pagespeed?url=...&strategy=mobile
// Uses local Lighthouse (if available) for unlimited free analysis.
// Falls back to Google PSI API (with optional key) if Lighthouse not found.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  // Prevent stale cached responses from before quota fix
  res.setHeader("Cache-Control", "no-store, must-revalidate")
  res.setHeader("Pragma", "no-cache")
  res.setHeader("Expires", "0")
  const q = req.query as any
  let url = String(q.url || "https://autotorental.com").trim()
  if (!/^https?:\/\//i.test(url)) url = "https://" + url
  // Rewrite to localhost when testing autotorental.com from the server itself
  // (avoids Cloudflare → 502 loopback issue).
  const isOwnDomain = /(?:^|\.)autotorental\.com/i.test(url) && !url.includes("api.autotorental.com") && !url.includes("admin.autotorental.com")
  const lhUrl = isOwnDomain ? url.replace(/https?:\/\/(www\.)?autotorental\.com/i, "http://localhost:7100") : url
  const strategy = q.strategy === "desktop" ? "desktop" : "mobile"

  // Try local Lighthouse first (free, no rate limits)
  try {
    const outFile = path.join(os.tmpdir(), `lh_${Date.now()}.json`)
    const formFactor = strategy === "desktop" ? "desktop" : "mobile"
    const cmd = [
      "lighthouse",
      `"${lhUrl}"`,
      "--output", "json",
      `--output-path`, outFile,
      `--form-factor`, formFactor,
      "--chrome-flags=\"--headless --no-sandbox --disable-dev-shm-usage --disable-gpu\"",
      "--only-categories=performance,accessibility,seo,best-practices",
      "--quiet",
    ].join(" ")

    await execAsync(cmd, { timeout: 60000 })
    const raw = JSON.parse(fs.readFileSync(outFile, "utf8"))
    fs.unlink(outFile, () => {})

    const lh = raw.lighthouseResult || raw
    const cats = lh.categories || {}
    const audits = lh.audits || {}

    const score = (k: string) => Math.round((cats[k]?.score || 0) * 100)
    const opportunities = Object.values(audits)
      .filter((a: any) => a.score !== null && a.score < 0.9 && a.details?.type === "opportunity")
      .map((a: any) => ({ id: (a as any).id, title: (a as any).title, value: (a as any).displayValue || "" }))
      .slice(0, 8)
    const diagnostics = Object.values(audits)
      .filter((a: any) => a.score !== null && a.score < 0.9 && a.details?.type !== "opportunity")
      .map((a: any) => ({ id: (a as any).id, title: (a as any).title, value: (a as any).displayValue || "" }))
      .slice(0, 8)
    const passed = Object.values(audits).filter((a: any) => a.score === 1).length

    await saveHistory(req, { url, strategy, source: "lighthouse-local", scores: { performance: score("performance"), accessibility: score("accessibility"), seo: score("seo"), best_practices: score("best-practices") }, opportunities, lcp: audits["largest-contentful-paint"]?.displayValue, fcp: audits["first-contentful-paint"]?.displayValue, cls: audits["cumulative-layout-shift"]?.displayValue })
    return res.json({
      ok: true, url, strategy, source: "lighthouse-local",
      scores: { performance: score("performance"), accessibility: score("accessibility"), seo: score("seo"), "best-practices": score("best-practices") },
      opportunities, diagnostics, passed,
      cls: audits["cumulative-layout-shift"]?.displayValue,
      lcp: audits["largest-contentful-paint"]?.displayValue,
      fid: audits["total-blocking-time"]?.displayValue,
    })
  } catch (lighthouseErr: any) {
    // Free fallback: simple HTTP timing measurement (no Google PSI quota dependency).
    try {
      const target = isOwnDomain ? lhUrl : url
      const t0 = Date.now()
      const r = await fetch(target, { signal: AbortSignal.timeout(30000) })
      const html = await r.text()
      const ms = Date.now() - t0
      const sizeKB = Math.round(html.length / 1024)
      const perfScore = ms < 1000 ? 95 : ms < 2000 ? 80 : ms < 3500 ? 60 : ms < 6000 ? 40 : 20
      const opportunities = [] as any[]
      if (ms > 2000) opportunities.push({ id: "ttfb", title: `Slow first byte (${ms}ms)`, value: `${ms}ms` })
      if (sizeKB > 500) opportunities.push({ id: "large_html", title: `Large HTML response (${sizeKB}KB)`, value: `${sizeKB}KB` })
      if (!html.includes("preload")) opportunities.push({ id: "no_preload", title: "No <link rel=preload> hints", value: "" })
      const imgCount = (html.match(/<img/g) || []).length
      if (imgCount > 25) opportunities.push({ id: "many_images", title: `${imgCount} images on page — consider lazy loading`, value: `${imgCount}` })

      await saveHistory(req, { url, strategy, source: "curl-timing", scores: { performance: perfScore }, opportunities, lcp: `${ms}ms`, fcp: `${ms}ms`, cls: "n/a", tbt: "n/a" })
      return res.json({
        ok: true, url, strategy, source: "curl-timing",
        note: "Lighthouse failed; using simple HTTP timing fallback (no Google PSI used — quota-free).",
        scores: { performance: perfScore, accessibility: 0, seo: 0, "best-practices": 0 },
        opportunities, diagnostics: [], passed: 0,
        lcp: `${ms}ms`, fcp: `${ms}ms`, cls: "n/a", fid: "n/a",
      })
    } catch (e: any) {
      return res.status(200).json({ ok: false, error: "Both Lighthouse and HTTP timing failed: " + (e?.message || "").slice(0, 100), url, strategy })
    }
  }
}
