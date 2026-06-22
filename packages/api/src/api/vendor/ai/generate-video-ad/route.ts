import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"
import { getSetting } from "../../../../lib/settings"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as https from "https"
import * as crypto from "crypto"

const execAsync = promisify(exec)
const OUT_DIR  = "/var/www/html/ai-reports"
const OUT_URL  = "https://api.autotorental.com/ai-reports"
const MUSIC    = "/opt/autorental/assets/music/cinematic-beat.mp3"

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const f = fs.createWriteStream(dest)
    https.get(url, (r) => {
      if (r.statusCode === 301 || r.statusCode === 302) {
        f.close(); return download(r.headers.location!, dest).then(resolve).catch(reject)
      }
      r.pipe(f); f.on("finish", () => { f.close(); resolve() })
    }).on("error", (e) => { try { fs.unlinkSync(dest) } catch {}; reject(e) })
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const { vehicle_id } = (req.body || {}) as { vehicle_id?: string }
  if (!vehicle_id) return res.status(400).json({ message: "vehicle_id required" })

  // Vendor isolation — must own the vehicle
  const vehicle = await pg("vehicle").where({ id: vehicle_id, seller_id: sellerId }).whereNull("deleted_at").first()
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found or not yours" })

  const falKey = await getSetting(req.scope, "fal_api_key").catch(() => "")
  if (!falKey) return res.status(503).json({ message: "AI video not available — contact admin" })

  const photos: string[] = (() => {
    try { return Array.isArray(vehicle.photos) ? vehicle.photos : JSON.parse(vehicle.photos || "[]") }
    catch { return [] }
  })()
  if (photos.length === 0) return res.status(400).json({ message: "Add at least one photo first" })
  const carPhoto = photos[0]

  const bodyRow  = await pg("body_type").where({ id: vehicle.body_type_id }).first().catch(() => null)
  const bodyType = (bodyRow?.name || "").toLowerCase()
  const title    = (vehicle.title || "").toLowerCase()
  const isSUV    = /suv|crossover|patrol|urus|g63|g-class|range|defender|cruiser/i.test(bodyType + title)
  const isSports = /sport|supercar|coupe|convertible|lambo|ferrari|porsche|revuelto|sl /i.test(bodyType + title)

  const motionPrompt = isSports
    ? `The supercar accelerates forward fast and dynamic, low aggressive camera tracking the car, wheels spinning rapidly, dramatic motion blur, dust kicking up, cinematic high-energy car commercial, golden hour lighting, smooth professional gimbal movement`
    : isSUV
      ? `The SUV drives forward powerfully and dynamic, camera tracks alongside the moving vehicle, large wheels spinning, dust and motion blur, imposing presence, cinematic action commercial, dramatic sweeping camera, golden hour`
      : `The car drives forward smoothly and elegant, dynamic camera glides alongside the moving vehicle, wheels spinning, subtle motion blur, premium cinematic commercial, professional smooth camera movement, dramatic lighting`

  const id      = crypto.randomBytes(6).toString("hex")
  const rawFile = `/tmp/aiv_${id}_raw.mp4`
  const outFile = `${OUT_DIR}/aiv_${id}.mp4`

  try {
    const falRes = await fetch("https://fal.run/fal-ai/kling-video/v1.6/pro/image-to-video", {
      method: "POST",
      headers: { "Authorization": `Key ${falKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: motionPrompt,
        image_url: carPhoto,
        duration: "10",
        aspect_ratio: "16:9",
        negative_prompt: "different car, wrong color, morphing, distorted car shape, static, parked, blurry, text overlay, watermark, people, deformed",
        cfg_scale: 0.5,
      }),
      signal: AbortSignal.timeout(300000),
    })
    if (!falRes.ok) {
      const err = await falRes.json().catch(() => ({}))
      return res.status(falRes.status).json({ message: err.detail || err.error || "AI error" })
    }
    const result = await falRes.json()
    const rawUrl: string = result?.video?.url
    if (!rawUrl) return res.status(502).json({ message: "No video returned" })

    fs.mkdirSync(OUT_DIR, { recursive: true })
    await download(rawUrl, rawFile)

    const hasMusic = fs.existsSync(MUSIC)
    if (hasMusic) {
      await execAsync(
        `ffmpeg -y -i "${rawFile}" -stream_loop -1 -i "${MUSIC}" ` +
        `-filter_complex "[1:a]volume=0.6,afade=in:0:1,afade=out:st=8:d=2[mus]" ` +
        `-map 0:v -map "[mus]" -c:v copy -c:a aac -b:a 192k -shortest -t 20 "${outFile}"`,
        { timeout: 120000 }
      )
      try { fs.unlinkSync(rawFile) } catch {}
    } else {
      fs.renameSync(rawFile, outFile)
    }

    const finalUrl = `${OUT_URL}/aiv_${id}.mp4`
    const existing: string[] = (() => {
      try { return Array.isArray(vehicle.videos) ? vehicle.videos : JSON.parse(vehicle.videos || "[]") }
      catch { return [] }
    })()
    const videos = [finalUrl, ...existing.filter((v: string) => v !== finalUrl)].slice(0, 5)
    await pg("vehicle").where({ id: vehicle_id }).update({ videos: JSON.stringify(videos), updated_at: new Date() })

    return res.json({ ok: true, video_url: finalUrl, method: "image-to-video", has_music: hasMusic, message: "✅ AI video from your car photo — with music!" })
  } catch (e: any) {
    try { fs.unlinkSync(rawFile) } catch {}
    return res.status(500).json({ message: e?.message?.slice(0, 200) || "Failed" })
  }
}
