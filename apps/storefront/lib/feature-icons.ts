// Map common feature/equipment names to emojis (works everywhere, no extra dependency)
const MAP: Record<string, string> = {
  // Safety
  abs: "🛞", airbag: "🎈", airbags: "🎈", "parking sensors": "📡", "parking sensor": "📡",
  "360° camera": "📷", "360 camera": "📷", camera: "📷", "rear camera": "📷",
  "lane assist": "🛣️", "blind spot monitor": "👁️", "blind spot": "👁️",
  "cruise control": "🚙", "adaptive cruise": "🚙", "traction control": "🛞", "stability control": "🛡️",
  // Comfort
  "climate control": "❄️", "dual climate": "❄️", "air conditioning": "❄️", ac: "❄️",
  "heated seats": "🔥", "ventilated seats": "💨", "leather seats": "🪑", "memory seats": "🪑",
  "panoramic roof": "🌌", sunroof: "☀️", moonroof: "🌙",
  // Tech
  bluetooth: "🔵", "apple carplay": "📱", "android auto": "📱", wifi: "📶", "wireless charging": "🔋",
  "touchscreen": "📺", navigation: "🧭", gps: "🧭", "head-up display": "✨", "head up display": "✨",
  "premium sound": "🔊", "premium audio": "🔊", "sound system": "🔊",
  // Performance
  "sport mode": "⚡", "all wheel drive": "4️⃣", awd: "4️⃣", "4wd": "4️⃣", "4x4": "4️⃣",
  // Convenience
  "keyless entry": "🔑", "push start": "🔘", "remote start": "📲", "auto parking": "🅿️",
  "power tailgate": "🚪", "auto wipers": "🌧️", "auto headlights": "💡", led: "💡", "led headlights": "💡",
}

export function featureIcon(name: string): string {
  const k = name.toLowerCase().trim()
  if (MAP[k]) return MAP[k]
  for (const [key, val] of Object.entries(MAP)) {
    if (k.includes(key)) return val
  }
  return "✓"
}

/** Uploaded image-URL icon (rendered as <img> by the caller). */
export function isImageIcon(icon?: string | null): boolean {
  return !!icon && /^https?:\/\//i.test(icon.trim())
}

/**
 * Render-safe glyph for the web. The stored `icon` may be an emoji (use it),
 * an image URL (handled separately), or an Ionicons glyph name like
 * "disc-outline" (mobile-only — must NOT leak as raw text). For anything that
 * is not an emoji, derive a consistent emoji from the feature name.
 */
export function featureGlyph(icon: string | null | undefined, name: string): string {
  const ic = (icon || "").trim()
  if (ic && !isImageIcon(ic) && !/^[\x00-\x7F]+$/.test(ic)) return ic
  return featureIcon(name)
}
