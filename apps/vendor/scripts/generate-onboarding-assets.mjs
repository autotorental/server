import sharp from "sharp"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dir, "../public/onboarding")

/** Dubai skyline + premium cars — car rental marketplace mood */
const BG_PHOTO =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=2400&q=85"

const SLIDES = [
  {
    file: "1.png",
    badge: "Step 1 · Rental company",
    title: "List your fleet on Auto to Rental",
    lines: [
      "Create your company profile in minutes",
      "Add vehicles, photos, and daily rates",
      "Reach customers across UAE & Syria",
    ],
  },
  {
    file: "2.png",
    badge: "Step 2 · Location",
    title: "Set pickup and delivery areas",
    lines: [
      "Add your office or showroom address",
      "Pin your location on the map",
      "Offer airport and hotel delivery",
    ],
  },
  {
    file: "3.png",
    badge: "Step 3 · Verification",
    title: "Get verified and build trust",
    lines: [
      "Upload trade license details",
      "Show the blue verified badge",
      "Win more enquiries from renters",
    ],
  },
  {
    file: "4.png",
    badge: "Step 4 · Go live",
    title: "Start receiving direct leads",
    lines: [
      "Customers contact you on WhatsApp",
      "Zero commission — you keep 100%",
      "Manage vehicles from your dashboard",
    ],
  },
]

function esc(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function slideSvg({ badge, title, lines, hero }) {
  const lineItems = lines
    .map(
      (line, i) =>
        `<text x="72" y="${248 + i * 34}" fill="#475569" font-family="system-ui,sans-serif" font-size="22">${esc(line)}</text>`
    )
    .join("")

  const carPanel = hero
    ? `<rect x="520" y="120" width="520" height="460" rx="20" fill="#0f172a" opacity="0.06"/>
  <rect x="540" y="140" width="480" height="280" rx="16" fill="#f1f5f9" stroke="#e2e8f0"/>
  <text x="560" y="180" fill="#1753b0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">LIVE LISTINGS</text>
  <rect x="560" y="200" width="440" height="72" rx="12" fill="white" stroke="#e2e8f0"/>
  <rect x="576" y="216" width="88" height="40" rx="8" fill="#dbeafe"/>
  <text x="680" y="232" fill="#0f172a" font-family="system-ui,sans-serif" font-size="16" font-weight="700">BMW 430i · 2024</text>
  <text x="680" y="256" fill="#1753b0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">AED 650 / day</text>
  <rect x="560" y="288" width="440" height="72" rx="12" fill="white" stroke="#e2e8f0"/>
  <rect x="576" y="304" width="88" height="40" rx="8" fill="#dbeafe"/>
  <text x="680" y="320" fill="#0f172a" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Range Rover Sport</text>
  <text x="680" y="344" fill="#1753b0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">AED 1,200 / day</text>
  <rect x="560" y="376" width="440" height="72" rx="12" fill="white" stroke="#e2e8f0"/>
  <rect x="576" y="392" width="88" height="40" rx="8" fill="#dbeafe"/>
  <text x="680" y="408" fill="#0f172a" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Toyota Camry · 2023</text>
  <text x="680" y="432" fill="#1753b0" font-family="system-ui,sans-serif" font-size="14" font-weight="700">AED 180 / day</text>
  <rect x="560" y="468" width="140" height="36" rx="10" fill="#22c55e"/>
  <text x="630" y="491" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="13" font-weight="700">WhatsApp lead</text>
  <rect x="716" y="468" width="120" height="36" rx="10" fill="#1753b0"/>
  <text x="776" y="491" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="13" font-weight="700">12 vehicles</text>`
    : `<rect x="72" y="360" width="420" height="210" rx="18" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="96" y="400" fill="#1753b0" font-family="system-ui,sans-serif" font-size="18" font-weight="700">AUTO TO RENTAL</text>
  <text x="96" y="428" fill="#64748b" font-family="system-ui,sans-serif" font-size="14">Vendor Portal</text>
  <rect x="96" y="458" width="120" height="10" rx="5" fill="#dbeafe"/>
  <rect x="96" y="480" width="180" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="96" y="502" width="150" height="10" rx="5" fill="#e2e8f0"/>
  <rect x="96" y="536" width="110" height="36" rx="10" fill="#1753b0"/>
  <text x="151" y="559" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="14" font-weight="700">Continue</text>`

  const width = hero ? 1100 : 1100
  const height = hero ? 620 : 620

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#020617" flood-opacity="0.28"/>
    </filter>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1753b0"/>
      <stop offset="100%" stop-color="#2563c7"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="24" fill="white" filter="url(#shadow)"/>
  <rect x="0" y="0" width="${width}" height="8" rx="24" fill="url(#brand)"/>
  <rect x="48" y="48" width="280" height="44" rx="22" fill="#eff6ff"/>
  <text x="188" y="77" text-anchor="middle" fill="#1753b0" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${esc(badge)}</text>
  <text x="72" y="168" fill="#0f172a" font-family="system-ui,sans-serif" font-size="${hero ? 34 : 38}" font-weight="800">${esc(title)}</text>
  ${lineItems}
  ${carPanel}
</svg>`)
}

async function download(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function main() {
  await mkdir(outDir, { recursive: true })

  const bgPhoto = await download(BG_PHOTO)

  const bgBase64 = (
    await sharp(bgPhoto).resize(1920, 1080, { fit: "cover" }).jpeg({ quality: 84 }).toBuffer()
  ).toString("base64")

  const bgSvg = `<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="overlay" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#0c2044" stop-opacity="0.72"/>
      <stop offset="55%" stop-color="#1753b0" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.82"/>
    </linearGradient>
    <linearGradient id="glow" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#1753b0" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <image href="data:image/jpeg;base64,${bgBase64}" x="0" y="0" width="1920" height="1080" preserveAspectRatio="xMidYMid slice"/>
  <rect width="1920" height="1080" fill="url(#overlay)"/>
  <rect width="1920" height="1080" fill="url(#glow)"/>
  <text x="96" y="120" fill="white" font-family="system-ui,sans-serif" font-size="28" font-weight="800" opacity="0.95">AUTO TO RENTAL</text>
  <text x="96" y="158" fill="#93c5fd" font-family="system-ui,sans-serif" font-size="18" font-weight="600">Car rental marketplace · UAE &amp; Syria</text>
</svg>`

  await writeFile(join(outDir, "bg.svg"), bgSvg)

  for (const slide of SLIDES) {
    await sharp(slideSvg(slide)).png().toFile(join(outDir, slide.file))
    console.log("wrote", slide.file)
  }

  console.log("Onboarding assets generated in", outDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
