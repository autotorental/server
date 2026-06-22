import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"
import * as https from "https"
import * as http from "http"
import * as crypto from "crypto"

const execAsync = promisify(exec)
const REELS_DIR  = "/var/www/html/ai-reports"
const REELS_URL  = "https://api.autotorental.com/ai-reports"
const FONT_BOLD  = "/usr/share/fonts/truetype/open-sans/OpenSans-ExtraBold.ttf"
const FONT_REG   = "/usr/share/fonts/truetype/open-sans/OpenSans-Regular.ttf"
const FONT_SEMI  = "/usr/share/fonts/truetype/open-sans/OpenSans-Semibold.ttf"

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    const get = url.startsWith("https") ? https.get : http.get
    get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return downloadFile(res.headers.location!, dest).then(resolve).catch(reject)
      }
      res.pipe(file)
      file.on("finish", () => { file.close(); resolve() })
    }).on("error", (e) => { fs.unlinkSync(dest); reject(e) })
  })
}

function escapeFFmpeg(text: string): string {
  return text.replace(/[:\\'\[\]]/g, (c) => `\\${c}`).replace(/,/g, "\\,")
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const { vehicle_id } = (req.body || {}) as { vehicle_id?: string }
  if (!vehicle_id) return res.status(400).json({ message: "vehicle_id required" })

  // ── Fetch vehicle ──────────────────────────────────────────────────────────
  const veh = await pg("vehicle").where({ id: vehicle_id, seller_id: sellerId }).whereNull("deleted_at").first()
  if (!veh) return res.status(404).json({ message: "Vehicle not found" })

  const seller = await pg("seller").where({ id: sellerId }).first()
  const brand  = veh.brand_id ? await pg("brand").where({ id: veh.brand_id }).first() : null
  const city   = veh.city_id  ? await pg("city").where({ id: veh.city_id }).first()  : null

  const photos: string[] = Array.isArray(veh.photos)
    ? veh.photos.slice(0, 5)
    : typeof veh.photos === "string"
      ? JSON.parse(veh.photos || "[]").slice(0, 5)
      : []

  if (photos.length === 0) return res.status(400).json({ message: "Vehicle has no photos" })

  // ── Setup temp dir ─────────────────────────────────────────────────────────
  const id     = crypto.randomBytes(8).toString("hex")
  const tmpDir = `/tmp/reel_${id}`
  fs.mkdirSync(tmpDir, { recursive: true })
  fs.mkdirSync(REELS_DIR, { recursive: true })

  try {
    // ── Download photos ──────────────────────────────────────────────────────
    const localPhotos: string[] = []
    for (let i = 0; i < Math.min(photos.length, 4); i++) {
      const ext  = photos[i].match(/\.(jpe?g|png|webp)/i)?.[1] || "jpg"
      const dest = `${tmpDir}/photo_${i}.${ext}`
      await downloadFile(photos[i], dest)
      localPhotos.push(dest)
    }

    // ── Build text data ──────────────────────────────────────────────────────
    const carTitle    = veh.title || `${brand?.name || ""} Rental`
    const carPrice    = veh.daily_price ? `AED ${veh.daily_price}/day` : ""
    const cityName    = city?.name || "Dubai"
    const companyName = seller?.name || "AutoToRental"
    const carUrl      = `autotorental.com/cars/${veh.slug || ""}`

    // Duration per slide (seconds)
    const perSlide = 3.5
    const totalDur = localPhotos.length * perSlide

    // ── Build complex FFmpeg filter for Instagram Reels (1080x1920) ──────────
    // Each slide: scale → crop to 1080x1920 → Ken Burns zoom → crossfade transition
    const W = 1080, H = 1920

    // Build inputs
    const inputs = localPhotos.map(p => `-loop 1 -t ${perSlide + 0.5} -i "${p}"`).join(" ")

    // Scale/crop each image to 1080x1920 (portrait) with zoom animation
    const slideFilters = localPhotos.map((_, i) => {
      const startZoom = i % 2 === 0 ? 1.0 : 1.08
      const endZoom   = i % 2 === 0 ? 1.08 : 1.0
      return `[${i}:v]scale=${W * 1.15}:${H * 1.15},crop=${W}:${H},zoompan=z='min(zoom+0.0008,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(perSlide * 25)}:s=${W}x${H}:fps=25[slide${i}]`
    }).join("; ")

    // Crossfade transitions between slides
    let xfadeChain = `[slide0]`
    let xfadeFilters = ""
    for (let i = 1; i < localPhotos.length; i++) {
      const offset = (i * perSlide) - 0.5
      xfadeFilters += `${xfadeChain}[slide${i}]xfade=transition=fade:duration=0.5:offset=${offset}[xf${i}]; `
      xfadeChain = `[xf${i}]`
    }
    xfadeFilters = xfadeFilters.slice(0, -2) // remove last "; "

    // ── Text overlays ────────────────────────────────────────────────────────
    // 1) Top bar: company name
    // 2) Middle: car title (big, animated in)
    // 3) Bottom: price + CTA + city + URL

    const safeTitle   = escapeFFmpeg(carTitle)
    const safePrice   = escapeFFmpeg(carPrice)
    const safeCompany = escapeFFmpeg(companyName)
    const safeCity    = escapeFFmpeg(`📍 ${cityName}`)
    const safeUrl     = escapeFFmpeg(carUrl)
    const safeCta     = escapeFFmpeg("Book Now →")

    const textFilters = [
      // Dark gradient overlay at bottom (semi-transparent black)
      `drawbox=x=0:y=${H - 420}:w=${W}:h=420:color=black@0.72:t=fill`,
      // Dark gradient at top
      `drawbox=x=0:y=0:w=${W}:h=160:color=black@0.55:t=fill`,

      // Gold accent line
      `drawbox=x=0:y=${H - 424}:w=${W}:h=4:color=0xC9A84C@1.0:t=fill`,

      // Company name top (white, small)
      `drawtext=fontfile='${FONT_SEMI}':text='${safeCompany}':fontcolor=white@0.95:fontsize=36:x=(w-text_w)/2:y=55:shadowcolor=black@0.5:shadowx=2:shadowy=2`,

      // AutoToRental logo-style text
      `drawtext=fontfile='${FONT_BOLD}':text='AutoToRental':fontcolor=0xC9A84C@0.9:fontsize=28:x=(w-text_w)/2:y=100`,

      // ── Car title (LARGE CENTER) ─────────────────────────────────────────
      // Title line 1 (main brand+model)
      `drawtext=fontfile='${FONT_BOLD}':text='${safeTitle.split(" ").slice(0, 4).join(" ")}':fontcolor=white:fontsize=68:x=(w-text_w)/2:y=${H - 380}:shadowcolor=black@0.7:shadowx=3:shadowy=3`,
      // Title line 2 (rest of title if long)
      ...(safeTitle.split(" ").length > 4 ? [
        `drawtext=fontfile='${FONT_BOLD}':text='${safeTitle.split(" ").slice(4).join(" ")}':fontcolor=white:fontsize=60:x=(w-text_w)/2:y=${H - 300}:shadowcolor=black@0.7:shadowx=3:shadowy=3`
      ] : []),

      // Price (gold color)
      ...(carPrice ? [
        `drawtext=fontfile='${FONT_BOLD}':text='${safePrice}':fontcolor=0xC9A84C:fontsize=52:x=(w-text_w)/2:y=${H - 230}:shadowcolor=black@0.8:shadowx=2:shadowy=2`
      ] : []),

      // City
      `drawtext=fontfile='${FONT_REG}':text='📍 ${escapeFFmpeg(cityName)}':fontcolor=white@0.85:fontsize=38:x=(w-text_w)/2:y=${H - 170}`,

      // CTA Button background
      `drawbox=x=(w-320)/2:y=${H - 125}:w=320:h=80:color=0x1753b0@1.0:t=fill`,
      `drawbox=x=(w-320)/2:y=${H - 125}:w=320:h=80:color=0x2563eb@0.4:t=fill`,

      // CTA text
      `drawtext=fontfile='${FONT_BOLD}':text='Book Now →':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=${H - 108}`,

      // URL (small, bottom)
      `drawtext=fontfile='${FONT_REG}':text='${safeUrl}':fontcolor=white@0.5:fontsize=26:x=(w-text_w)/2:y=${H - 35}`,
    ].join(",")

    // ── Full FFmpeg command ──────────────────────────────────────────────────
    const outFile  = `${REELS_DIR}/${id}_reel.mp4`
    const lastNode = localPhotos.length === 1 ? "[slide0]" : xfadeChain

    const filterComplex = localPhotos.length === 1
      ? `${slideFilters}; ${lastNode}${textFilters}[vout]`
      : `${slideFilters}; ${xfadeFilters}; ${xfadeChain}${textFilters}[vout]`

    const ffmpegCmd = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[vout]" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -r 25 -t ${totalDur} "${outFile}"`

    await execAsync(ffmpegCmd, { timeout: 180000 })

    // Verify output
    const stat = fs.statSync(outFile)
    if (stat.size < 50000) throw new Error("Video too small, generation failed")

    // Save URL to vehicle
    const videoUrl = `${REELS_URL}/${id}_reel.mp4`
    const existingVideos = Array.isArray(veh.videos) ? veh.videos : (typeof veh.videos === "string" ? JSON.parse(veh.videos || "[]") : [])
    const newVideos = [videoUrl, ...existingVideos].slice(0, 5)
    await pg("vehicle").where({ id: vehicle_id }).update({ videos: JSON.stringify(newVideos) })

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true })

    res.json({
      ok: true,
      video_url: videoUrl,
      duration: `${totalDur.toFixed(1)}s`,
      slides: localPhotos.length,
      message: `Instagram Reel generated! ${localPhotos.length} slides, ${totalDur.toFixed(0)}s, 1080×1920`,
    })
  } catch (e: any) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    res.status(500).json({ ok: false, error: e.message?.slice(0, 300) || "Failed" })
  }
}
