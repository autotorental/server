#!/usr/bin/env node
// Background media worker: transcodes uploaded videos to optimized WebM (VP9 + Opus).
// Produces a "<base>.webm" sibling next to each uploaded video, leaving the original
// in place as a fallback (older browsers / native apps). The storefront <video> player
// prefers the .webm source and falls back to the original automatically.
//
// Robust by design:
//  - one transcode at a time (CPU-friendly), scans every SCAN_MS
//  - writes to <out>.tmp then atomically renames -> never serves a partial file
//  - on failure writes <out>.webm.failed so it won't retry forever
//  - 10-min hard timeout per file
const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")

const DIR = process.env.UPLOAD_DIR || "/opt/autorental/uploads"
const SCAN_MS = 15000
const MAX_MS = 10 * 60 * 1000
// Source containers we transcode. ".webm" is already the target → skipped.
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".avi", ".mkv", ".ogv", ".ogg"])

const log = (...a) => console.log(new Date().toISOString(), ...a)

function convert(input, output) {
  return new Promise((resolve) => {
    const tmp = output + ".tmp"
    const args = [
      "-y", "-i", input,
      "-c:v", "libvpx-vp9", "-crf", "33", "-b:v", "0",
      "-row-mt", "1", "-tile-columns", "2", "-threads", "4",
      "-deadline", "good", "-cpu-used", "4", "-pix_fmt", "yuv420p",
      "-vf", "scale='min(1280,iw)':-2",
      "-c:a", "libopus", "-b:a", "96k",
      "-f", "webm", tmp,
    ]
    log("converting", path.basename(input))
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "ignore"] })
    let killed = false
    const timer = setTimeout(() => { killed = true; ff.kill("SIGKILL") }, MAX_MS)
    ff.on("close", (code) => {
      clearTimeout(timer)
      try {
        if (code === 0 && fs.existsSync(tmp) && fs.statSync(tmp).size > 0) {
          const inSz = fs.statSync(input).size
          const outSz = fs.statSync(tmp).size
          // Only keep the WebM if it is actually smaller. Some sources (already
          // efficient H.264) transcode larger in VP9 — in that case discard the
          // WebM and keep the original (player falls back to it).
          if (outSz >= inSz * 0.97) {
            try { fs.unlinkSync(tmp) } catch {}
            fs.writeFileSync(output + ".skipped", `webm not smaller (${inSz} -> ${outSz}) ${new Date().toISOString()}`)
            log("skipped (webm not smaller)", path.basename(input), `${inSz} -> ${outSz}`)
            resolve(false)
          } else {
            fs.renameSync(tmp, output)
            log("done", path.basename(output), `${inSz} -> ${outSz} bytes (${Math.round((1 - outSz / inSz) * 100)}% smaller)`)
            resolve(true)
          }
        } else {
          if (fs.existsSync(tmp)) { try { fs.unlinkSync(tmp) } catch {} }
          fs.writeFileSync(output + ".failed", `code=${code}${killed ? " timeout" : ""} ${new Date().toISOString()}`)
          log("FAILED", path.basename(input), "code", code, killed ? "(timeout)" : "")
          resolve(false)
        }
      } catch (e) { log("post-convert error", e.message); resolve(false) }
    })
    ff.on("error", (e) => {
      clearTimeout(timer)
      log("spawn error", e.message)
      try { fs.writeFileSync(output + ".failed", "spawn:" + e.message) } catch {}
      resolve(false)
    })
  })
}

let busy = false
async function scan() {
  if (busy) return
  let files
  try { files = fs.readdirSync(DIR) } catch { return }
  const haveWebm = new Set(
    files.filter((f) => f.toLowerCase().endsWith(".webm")).map((f) => f.slice(0, -5))
  )
  for (const f of files) {
    const ext = path.extname(f).toLowerCase()
    if (!VIDEO_EXT.has(ext)) continue
    const base = f.slice(0, -ext.length)
    if (haveWebm.has(base)) continue
    const output = path.join(DIR, base + ".webm")
    if (fs.existsSync(output) || fs.existsSync(output + ".failed") || fs.existsSync(output + ".skipped") || fs.existsSync(output + ".tmp")) continue
    busy = true
    await convert(path.join(DIR, f), output)
    busy = false
    return // one file per pass
  }
}

log("media-worker started — scanning", DIR, "every", SCAN_MS + "ms")
scan()
setInterval(scan, SCAN_MS)
