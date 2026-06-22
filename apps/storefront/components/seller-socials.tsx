import { Globe, Facebook, Instagram, Youtube, Music2, Send, Camera, X as XIcon } from "lucide-react"

type Socials = {
  website?: string; facebook?: string; instagram?: string; twitter?: string; tiktok?: string; youtube?: string; whatsapp?: string; telegram?: string; snapchat?: string;
}

type Platform = { key: keyof Socials; label: string; Icon: any; color: string }

// Full brand identity order — every platform a rental company can have.
const PLATFORMS: Platform[] = [
  { key: "website",   label: "Website",   Icon: Globe,         color: "bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-200" },
  { key: "instagram", label: "Instagram", Icon: Instagram,     color: "bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] text-white hover:opacity-90" },
  { key: "facebook",  label: "Facebook",  Icon: Facebook,      color: "bg-[#1877F2] text-white hover:bg-[#0d65d9]" },
  { key: "tiktok",    label: "TikTok",    Icon: Music2,        color: "bg-black text-white hover:bg-ink-800" },
  { key: "youtube",   label: "YouTube",   Icon: Youtube,       color: "bg-[#FF0000] text-white hover:bg-[#cc0000]" },
  { key: "twitter",   label: "X (Twitter)", Icon: XIcon,       color: "bg-ink-900 text-white hover:bg-ink-700" },
  { key: "telegram",  label: "Telegram",  Icon: Send,          color: "bg-[#0088cc] text-white hover:bg-[#006699]" },
  { key: "snapchat",  label: "Snapchat",  Icon: Camera,        color: "bg-[#FFFC00] text-black hover:bg-yellow-300" },
]

function normalize(key: keyof Socials, raw: string): string {
  const v = raw.trim()
  if (!v) return ""
  if (key === "whatsapp") {
    const digits = v.replace(/[^\d+]/g, "")
    if (/^https?:\/\//.test(v)) return v
    return digits ? `https://wa.me/${digits.replace(/^\+/, "")}` : ""
  }
  if (/^https?:\/\//.test(v) || v.startsWith("mailto:")) return v
  return `https://${v.replace(/^\/+/, "")}`
}

export default function SellerSocials({
  socials,
  size = "md",
  showAll = false,
}: {
  socials?: Socials
  size?: "sm" | "md"
  showAll?: boolean
}) {
  const cls = size === "sm" ? "w-9 h-9" : "w-10 h-10"
  const ic = size === "sm" ? 15 : 16

  const getUrl = (k: keyof Socials): string => {
    const raw = socials?.[k]
    return typeof raw === "string" && raw.trim() ? normalize(k, raw) : ""
  }

  // Default behaviour (header/compact): only platforms the vendor actually added.
  // showAll (full identity): render every platform; missing ones become disabled
  // placeholders so visitors can see what the company has and hasn\x27t added.
  const list = showAll ? PLATFORMS : PLATFORMS.filter((p) => getUrl(p.key))
  if (!list.length) return null

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((p) => {
        const url = getUrl(p.key)
        if (url) {
          return (
            <a
              key={p.key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={p.label}
              title={p.label}
              className={`${cls} inline-flex items-center justify-center rounded-lg transition ${p.color}`}
            >
              <p.Icon size={ic} />
            </a>
          )
        }
        // Not added yet — shown in full brand colour (looks active) but is not a
        // link, so it only becomes clickable once the vendor adds their detail.
        return (
          <span
            key={p.key}
            aria-label={`${p.label} — not added by the company yet`}
            title={`Not added yet — the company hasn\x27t added their ${p.label}`}
            className={`${cls} inline-flex items-center justify-center rounded-lg cursor-default ${p.color}`}
          >
            <p.Icon size={ic} />
          </span>
        )
      })}
    </div>
  )
}
