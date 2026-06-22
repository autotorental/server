import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as https from "https"
import * as crypto from "crypto"

// SSE safety helper — avoids "Cannot set headers" when the client disconnects
// mid-stream. Tracks the close state on the response object itself.
function safeWrite(res: any, chunk: string): boolean {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return false
  try { res.write(chunk); return true } catch { (res as any).__closed = true; return false }
}
function safeEnd(res: any): void {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return
  try { res.end() } catch {}
  ;(res as any).__closed = true
}


const execAsync = promisify(exec)
const OUT_DIR = "/var/www/html/ai-reports"
const OUT_URL = "https://api.autotorental.com/ai-reports"
const MUSIC   = "/opt/autorental/assets/music/upbeat-ad.mp3"
const MODEL   = "fal-ai/kling-video/v1.6/pro/image-to-video"
const FB = "/usr/share/fonts/truetype/open-sans/OpenSans-ExtraBold.ttf"
const FR = "/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf"

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const f = fs.createWriteStream(dest)
    const mod = url.startsWith("https") ? https : require("http")
    mod.get(url, (r: any) => {
      if (r.statusCode === 301 || r.statusCode === 302) { f.close(); return download(r.headers.location, dest).then(resolve).catch(reject) }
      r.pipe(f); f.on("finish", () => { f.close(); resolve() })
    }).on("error", (e: any) => { try { fs.unlinkSync(dest) } catch {}; reject(e) })
  })
}

// FREE fallback: cinematic slideshow from the REAL car photos + music (no API cost, always correct car)
async function makeReelFallback(photos: string[], title: string, price: string, outFile: string, tmpDir: string): Promise<void> {
  fs.mkdirSync(tmpDir, { recursive: true })
  const local: string[] = []
  for (let i = 0; i < Math.min(photos.length, 5); i++) {
    const d = `${tmpDir}/p${i}.jpg`
    await download(photos[i], d); local.push(d)
  }
  const W = 1280, H = 720, dur = 3.0
  const total = local.length * dur
  const inputs = local.map(p => `-loop 1 -t ${dur + 0.6} -i "${p}"`).join(" ")
  const slides = local.map((_, i) =>
    `[${i}:v]scale=${W*1.2}:${H*1.2},crop=${W}:${H},zoompan=z='min(zoom+0.0008,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(dur*25)}:s=${W}x${H}:fps=25[s${i}]`
  ).join("; ")
  let chain = "[s0]", xf = ""
  for (let i = 1; i < local.length; i++) {
    const off = (i * dur) - 0.5
    xf += `${chain}[s${i}]xfade=transition=fade:duration=0.5:offset=${off}[x${i}]; `
    chain = `[x${i}]`
  }
  if (xf) xf = xf.slice(0, -2)
  const safeTitle = title.replace(/[:\\']/g, "").slice(0, 40)
  const txt = [
    `drawbox=x=0:y=${H-110}:w=${W}:h=110:color=black@0.75:t=fill`,
    `drawbox=x=0:y=${H-114}:w=${W}:h=4:color=0xC9A84C:t=fill`,
    `drawtext=fontfile='${FB}':text='${safeTitle}':fontcolor=white:fontsize=34:x=40:y=${H-90}:shadowcolor=black@0.8:shadowx=2:shadowy=2`,
    price ? `drawtext=fontfile='${FB}':text='${price.replace(/[:\\']/g,"")}':fontcolor=0xC9A84C:fontsize=28:x=40:y=${H-48}` : "",
    `drawtext=fontfile='${FR}':text='autotorental.com':fontcolor=white@0.6:fontsize=22:x=${W-260}:y=${H-44}`,
  ].filter(Boolean).join(",")
  const fcFile = `${tmpDir}/fc.txt`
  const fc = local.length === 1 ? `${slides}; [s0]${txt}[v]` : `${slides}; ${xf}; ${chain}${txt}[v]`
  fs.writeFileSync(fcFile, fc)
  const hasMusic = fs.existsSync(MUSIC)
  const audio = hasMusic ? `-stream_loop -1 -i "${MUSIC}"` : ""
  const amap = hasMusic ? `-map "[v]" -map ${local.length}:a -c:a aac -b:a 192k -shortest` : `-map "[v]"`
  await execAsync(
    `ffmpeg -y ${inputs} ${audio} -filter_complex_script "${fcFile}" ${amap} -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -movflags +faststart -t ${Math.min(total, 18)} "${outFile}"`,
    { timeout: 120000 }
  )
  try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { vehicle_id } = (req.body || {}) as { vehicle_id?: string }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  
  req.on("close", () => { (res as any).__closed = true })
const emit = (d: any) => safeWrite(res, `data: ${JSON.stringify(d)}\n\n`)
  const done = () => { safeWrite(res, "data: [DONE]\n\n"); safeEnd(res) }

  if (!vehicle_id) { emit({ event: "error", message: "vehicle_id required" }); return done() }
  const vehicle = await pg("vehicle").where({ id: vehicle_id }).whereNull("deleted_at").first()
  if (!vehicle) { emit({ event: "error", message: "Vehicle not found" }); return done() }

  const photos: string[] = (() => { try { return Array.isArray(vehicle.photos) ? vehicle.photos : JSON.parse(vehicle.photos || "[]") } catch { return [] } })()
  if (!photos.length) { emit({ event: "error", message: "Add at least one photo first" }); return done() }

  const id = crypto.randomBytes(6).toString("hex")
  const rawFile = `/tmp/aiv_${id}_raw.mp4`
  const outFile = `${OUT_DIR}/aiv_${id}.mp4`
  const finalUrl = `${OUT_URL}/aiv_${id}.mp4`
  const started = Date.now()
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const saveAndFinish = async () => {
    const existing: string[] = (() => { try { return Array.isArray(vehicle.videos) ? vehicle.videos : JSON.parse(vehicle.videos || "[]") } catch { return [] } })()
    const videos = [finalUrl, ...existing.filter((v: string) => v !== finalUrl)].slice(0, 5)
    await pg("vehicle").where({ id: vehicle_id }).update({ videos: JSON.stringify(videos), updated_at: new Date() })
    emit({ event: "done", pct: 100, video_url: finalUrl, message: "✅ AI video ready — your real car + music!" })
    return done()
  }

  const falKey = await getSetting(req.scope, "fal_api_key").catch(() => "")
  const carPhoto = photos[0]
  const priceStr = vehicle.daily_price ? `AED ${vehicle.daily_price}/day` : ""

  // ── Try FAL Kling (premium) ──
  let falWorked = false
  if (falKey) {
    try {
      emit({ event: "progress", pct: 3, phase: "Submitting to AI…" })
      const bodyRow = await pg("body_type").where({ id: vehicle.body_type_id }).first().catch(() => null)
      const brandRow = await pg("brand").where({ id: vehicle.brand_id }).first().catch(() => null)
      const modelRow = await pg("model").where({ id: vehicle.model_id }).first().catch(() => null)
      const t = ((bodyRow?.name || "") + (vehicle.title || "")).toLowerCase()
      const isSports = /sport|supercar|coupe|lambo|ferrari|porsche|revuelto|sl /i.test(t)
      const isSUV = /suv|patrol|urus|g63|range|defender|cruiser/i.test(t)
      const carName = [vehicle.color, brandRow?.name, modelRow?.name].filter(Boolean).join(" ").trim() || (vehicle.title || "luxury car")
      const energy = isSports ? "aggressive exotic supercar energy, " : isSUV ? "powerful commanding presence, " : "smooth premium glide, "
      // Optimized cinematic image-to-video prompt — one continuous true driving shot (no slideshow).
      const prompt = `Cinematic luxury car rental commercial. The ${carName} drives realistically and fast through Dubai at golden hour — accelerating along Dubai Marina past glass skyscrapers toward the Burj Khalifa and palm-lined streets, the city skyline reflecting on its glossy body. Dynamic low-angle tracking shot following the moving car, wheels spinning, real motion blur, moving traffic, moving shadows, natural reflections. ${energy}ultra-realistic, photorealistic, Hollywood-quality automotive cinematography, smooth dynamic camera. The car is fully animated and driving forward fast — a true driving video, NOT a static image.`
      // Vidu reference-to-video lets the AI SEE up to 3 of the car's real photos (multi-angle);
      // falls back to Kling image-to-video for a single photo.
      const refImgs = (Array.isArray(photos) ? photos.filter(Boolean) : []).slice(0, 3)
      const useVidu = refImgs.length >= 2
      if (useVidu) {
        // ── 30s cinematic reel: 6 AI scenes of the REAL car (Vidu sees its photos) → concat + music, 9:16 ──
        const base = `Cinematic luxury car rental commercial of the ${carName}, ${energy.replace(/, *$/, "")}, ultra-realistic, photorealistic, Hollywood-quality automotive cinematography, real motion blur, natural reflections, golden hour in Dubai. The car is fully animated and really moving — a true driving video, NOT a static image. Keep the car's real license plate, badges and details exactly as in the photos, correct and readable; do NOT mirror or flip the image, keep the original orientation. No on-screen text, no captions, no subtitles, no watermark, no logos, no added numbers or letters.`
        const SCENES = [
          `${base} It accelerates out of a luxury hotel entrance, dramatic low-angle tracking shot.`,
          `${base} It speeds through Dubai Marina, glass skyscrapers reflecting on its glossy body, dynamic side tracking shot.`,
          `${base} High-speed cinematic side tracking shot on Sheikh Zayed Road with moving traffic and motion blur.`,
          `${base} Extreme close-up of the spinning wheels, brake calipers and aerodynamic body details while driving fast.`,
          `${base} Aerial drone shot following it through the Dubai city skyline.`,
          `${base} Cruising a palm-lined Dubai boulevard, smooth gliding tracking shot with lens flare.`,
          `${base} Driving through Dubai at night, glowing neon city lights reflecting on the glossy paint.`,
          `${base} It arrives in front of the Burj Khalifa at golden sunset, dramatic slow cinematic reveal.`,
        ]
        emit({ event: "progress", pct: 4, phase: `Generating ${SCENES.length} cinematic scenes with AI…` })
        const subs = (await Promise.all(SCENES.map((sp) =>
          fetch(`https://queue.fal.run/fal-ai/vidu/reference-to-video`, { method: "POST", headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ prompt: sp, reference_image_urls: refImgs, aspect_ratio: "9:16", movement_amplitude: "auto" }), signal: AbortSignal.timeout(30000) }).then(r => r.json()).catch(() => null)
        ))).filter((x: any) => x && x.request_id)
        if (!subs.length) throw new Error("No scenes queued")
        const clipUrls: string[] = new Array(subs.length).fill("")
        const finished = new Set<number>()
        for (let i = 0; i < 130 && finished.size < subs.length; i++) {
          await new Promise(r => setTimeout(r, 4000))
          await Promise.all(subs.map(async (s: any, idx: number) => {
            if (finished.has(idx)) return
            const st = await fetch(s.status_url, { headers: { "Authorization": `Key ${falKey}` }, signal: AbortSignal.timeout(15000) }).then(r => r.json()).catch(() => ({}))
            if (st.status === "COMPLETED") { finished.add(idx); const d = await fetch(s.response_url, { headers: { "Authorization": `Key ${falKey}` }, signal: AbortSignal.timeout(30000) }).then(r => r.json()).catch(() => null); const u = d?.video?.url; if (u) clipUrls[idx] = u }
            else if (st.status === "FAILED" || st.status === "ERROR") { finished.add(idx) }
          }))
          emit({ event: "progress", pct: Math.min(86, 6 + Math.floor((finished.size / subs.length) * 78)), phase: `Rendering scenes ${finished.size}/${subs.length}…`, elapsed_s: Math.floor((Date.now() - started) / 1000) })
        }
        const valid = clipUrls.filter(Boolean)
        if (valid.length >= 2) {
          emit({ event: "progress", pct: 90, phase: "Editing your 30-second reel…" })
          const tmp = `/tmp/reel_${id}`; fs.mkdirSync(tmp, { recursive: true })
          const normd: string[] = []
          for (let k = 0; k < valid.length; k++) {
            const raw = `${tmp}/c${k}.mp4`, norm = `${tmp}/n${k}.mp4`
            await download(valid[k], raw)
            await execAsync(`ffmpeg -y -i "${raw}" -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,setsar=1" -an -c:v libx264 -preset veryfast -crf 22 -pix_fmt yuv420p "${norm}"`, { timeout: 120000 })
            normd.push(norm)
          }
          // CapCut-style: probe each clip, chain xfade transitions between scenes + loud energetic music
          const durs: number[] = []
          for (const f of normd) {
            const o: any = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`, { timeout: 20000 }).catch(() => ({ stdout: "" }))
            durs.push(parseFloat(String(o.stdout || "").trim()) || 4)
          }
          const TR = 0.45
          const TRANS = ["fade", "slideleft", "smoothup", "circleopen", "slideright", "wiperight", "fadeblack", "smoothleft"]
          const segs: string[] = []
          let prevL = "[0:v]", acc = durs[0]
          for (let i = 1; i < normd.length; i++) {
            const out = i === normd.length - 1 ? "[vv]" : `[x${i}]`
            segs.push(`${prevL}[${i}:v]xfade=transition=${TRANS[(i - 1) % TRANS.length]}:duration=${TR}:offset=${(acc - TR).toFixed(2)}${out}`)
            prevL = out
            acc = acc + durs[i] - TR
          }
          const vfilt = segs.join(";")
          const total = Math.max(acc, 1)
          const inputs = normd.map(f => `-i "${f}"`).join(" ")
          if (fs.existsSync(MUSIC)) {
            const fc = `${vfilt};[${normd.length}:a]volume=1.0,afade=in:0:1,afade=out:st=${Math.max(total - 2, 0).toFixed(2)}:d=2[a]`
            await execAsync(`ffmpeg -y ${inputs} -stream_loop -1 -i "${MUSIC}" -filter_complex "${fc}" -map "[vv]" -map "[a]" -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -t ${total.toFixed(2)} "${outFile}"`, { timeout: 180000 })
          } else {
            await execAsync(`ffmpeg -y ${inputs} -filter_complex "${vfilt.replace("[vv]", "[v]")}" -map "[v]" -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -movflags +faststart -t ${total.toFixed(2)} "${outFile}"`, { timeout: 180000 })
          }
          try { fs.rmSync(tmp, { recursive: true, force: true }) } catch {}
          falWorked = true
        }
      } else {
        const fbody: any = { prompt, image_url: carPhoto, duration: "10", aspect_ratio: "9:16", cfg_scale: 0.5, negative_prompt: "slideshow, static image, image panning, ken burns, zoom effect, parked, still, frozen, no movement, different car, wrong color, distorted, morphing, extra wheels, blurry, low quality, text, watermark, logo, people, crowd, duplicate car" }
        const submit = await fetch(`https://queue.fal.run/${MODEL}`, { method: "POST", headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" }, body: JSON.stringify(fbody), signal: AbortSignal.timeout(30000) })
        const sub = await submit.json()
        if (!sub.request_id) throw new Error(sub.detail || "FAL unavailable")
        const reqId = sub.request_id, EST = 200_000
        let result: any = null
        for (let i = 0; i < 110; i++) {
          await new Promise(r => setTimeout(r, 3000))
          const st = await fetch((sub.status_url || `https://queue.fal.run/${MODEL}/requests/${reqId}/status`), { headers: { "Authorization": `Key ${falKey}` }, signal: AbortSignal.timeout(15000) }).then(r => r.json()).catch(() => ({}))
          const elapsed = Date.now() - started
          if (st.status === "IN_PROGRESS") emit({ event: "progress", pct: Math.min(92, 10 + Math.floor((elapsed/EST)*82)), phase: "AI rendering your car…", elapsed_s: Math.floor(elapsed/1000) })
          else if (st.status === "COMPLETED") { emit({ event: "progress", pct: 93, phase: "Downloading…" }); result = await fetch((sub.response_url || `https://queue.fal.run/${MODEL}/requests/${reqId}`), { headers: { "Authorization": `Key ${falKey}` }, signal: AbortSignal.timeout(30000) }).then(r => r.json()).catch(() => null); break }
        }
        const rawUrl = result?.video?.url
        if (rawUrl) {
          await download(rawUrl, rawFile)
          if (fs.existsSync(MUSIC)) { await execAsync(`ffmpeg -y -i "${rawFile}" -stream_loop -1 -i "${MUSIC}" -filter_complex "[1:a]volume=0.6,afade=in:0:1,afade=out:st=8:d=2[mus]" -map 0:v -map "[mus]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest -t 12 "${outFile}"`, { timeout: 120000 }); try { fs.unlinkSync(rawFile) } catch {} }
          else { await execAsync(`ffmpeg -y -i "${rawFile}" -c copy -movflags +faststart "${outFile}"`, { timeout: 60000 }); try { fs.unlinkSync(rawFile) } catch {} }
          falWorked = true
        }
      }
    } catch (e: any) {
      emit({ event: "progress", pct: 8, phase: "Premium AI unavailable — using free cinematic mode…" })
    }
  }

  // ── FREE fallback: cinematic reel from real photos + music ──
  if (!falWorked) {
    try {
      emit({ event: "progress", pct: 20, phase: "Creating cinematic video from your photos…" })
      await makeReelFallback(photos, vehicle.title || "", priceStr, outFile, `/tmp/reel_${id}`)
      emit({ event: "progress", pct: 95, phase: "Finalizing…" })
    } catch (e: any) {
      emit({ event: "error", message: "Video generation failed: " + (e?.message?.slice(0, 120) || "") })
      return done()
    }
  }

  return saveAndFinish()
}
