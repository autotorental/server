import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@mercurjs/admin/index.css"
import App from "@mercurjs/admin"

// Rebrand "Mercur" → "Auto to Rental" in any text node, and "Products" → "Vehicles".
const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bProduct Variants?\b/g, "Vehicle Variants"],
  [/\bProducts\b/g, "Vehicles"], [/\bProduct\b/g, "Vehicle"],
  [/\bproducts\b/g, "vehicles"], [/\bproduct\b/g, "vehicle"],
  [/Mercur Admin/g, "Auto to Rental"],
  [/Welcome to Medusa/g, "Welcome to Auto to Rental"],
  [/Welcome to Mercur/g, "Welcome to Auto to Rental"],
]

function replaceTextNodes(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n.nodeValue || ""
    if (!t.trim()) continue
    let next = t
    for (const [re, rep] of TEXT_REPLACEMENTS) next = next.replace(re, rep)
    if (next !== t) n.nodeValue = next
  }
}

function customize() {
  replaceTextNodes(document.body)
}

new MutationObserver(customize).observe(document.body, { childList: true, subtree: true })
setInterval(customize, 800)
customize()

// Set the page favicon to our /dashboard/favicon.svg
const fav = (document.querySelector("link[rel=icon]") as HTMLLinkElement) || document.createElement("link")
fav.setAttribute("rel", "icon")
fav.setAttribute("type", "image/svg+xml")
fav.setAttribute("href", "/dashboard/favicon.svg")
if (!fav.parentNode) document.head.appendChild(fav)


// Replace Mercur's "M" brand mark on the login/auth pages with our favicon
function replaceBrandMark() {
  document.querySelectorAll("div, span, a").forEach((el: Element) => {
    const e = el as HTMLElement
    if ((e as any).dataset?.brandReplaced) return
    const text = (e.textContent || "").trim()
    if (text !== "M") return
    const r = e.getBoundingClientRect()
    if (r.width < 28 || r.width > 140) return
    if (Math.abs(r.width - r.height) > 12) return
    const bg = window.getComputedStyle(e).backgroundColor
    if (!bg || bg === "rgba(0, 0, 0, 0)") return
    e.innerHTML = `<img src="/dashboard/favicon.svg" alt="Auto to Rental" style="width:100%;height:100%;object-fit:contain;background:white;border-radius:14%;padding:8%;"/>`
    ;(e as any).dataset.brandReplaced = "1"
  })
}
new MutationObserver(replaceBrandMark).observe(document.body, { childList: true, subtree: true })
setInterval(replaceBrandMark, 800)
setTimeout(replaceBrandMark, 100)


// Ensure browser tab title always uses our brand name (Mercur may update it dynamically).
function syncTitle() {
  const t = document.title || ""
  if (/Mercur/i.test(t)) {
    document.title = t.replace(/Mercur (Admin|Vendor)/i, "Auto to Rental Admin Dashboard").replace(/Mercur/g, "Auto to Rental")
  } else if (!t || t === "Auto to Rental Admin Dashboard") {
    // keep clean default
  }
}
new MutationObserver(syncTitle).observe(document.querySelector("title") || document.head, { childList: true, characterData: true, subtree: true })
setInterval(syncTitle, 1000)
syncTitle()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// === Hide Mercur "Settings → Locations" (we are a rental marketplace, no warehouses) ===
// Targets the sidebar link by its href ending. Safe because it does not touch
// any other selector or DOM tree.
const __HIDE_CSS = document.createElement("style")
__HIDE_CSS.textContent = `
  a[href$="/settings/locations"],
  a[href$="/settings/locations/"],
  a[href*="/settings/locations?"],
  a[href$="/settings/commission-rates"],
  a[href$="/settings/commission-rates/"],
  a[href*="/settings/commission-rates?"],
  a[href$="/edit-address"],
  a[href$="/edit-address/"],
  a[href*="/edit-address?"],
  button[aria-label="Edit Address" i],
  button[aria-label="edit-address" i] {
    display: none !important;
  }
`
document.head.appendChild(__HIDE_CSS)

// Native-styling tokens — base CSS only (colors filled at runtime from real Mercur cards).
;(function injectAtrTokens() {
  if (document.getElementById("atr-tokens")) return
  const st = document.createElement("style")
  st.id = "atr-tokens"
  st.textContent = `
    .atr-card{
      margin:0 0 16px; padding:24px;
      border-radius:12px; border:1px solid transparent;
      box-shadow: 0 1px 0 0 rgba(0,0,0,.02), 0 1px 2px 0 rgba(0,0,0,.04);
    }
    .atr-card-head{ display:flex;align-items:center;justify-content:space-between; gap:12px;flex-wrap:wrap;margin-bottom:16px; }
    .atr-card-title{ font-size:15px;font-weight:600; letter-spacing:-0.01em; display:flex;align-items:center;gap:8px; }
    .atr-card-sub{ font-size:13px;margin-top:2px; opacity:.7; }
    .atr-link{ font-weight:500;font-size:13px;text-decoration:none; }
    .atr-link:hover{ text-decoration:underline; }
    .atr-table{ width:100%; border-collapse:separate; border-spacing:0; font-size:13px; }
    .atr-table thead th{ text-align:left; padding:8px 12px; font-size:11px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; opacity:.7; }
    .atr-table tbody td{ padding:10px 12px; vertical-align:middle; }
    .atr-pill{ display:inline-block; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; text-transform:capitalize; }
    .atr-grid{ display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; }
    .atr-field-label{ display:block; font-size:12px; font-weight:500; margin-bottom:6px; opacity:.7; }
    .atr-input{ width:100%; padding:8px 10px; border-radius:6px; font-size:13px; font-family:inherit; border-width:1px; border-style:solid; transition:border-color .15s, box-shadow .15s; }
    .atr-input:focus{ outline:none; box-shadow: 0 0 0 3px rgba(23,83,176,.18); }
    .atr-btn{ font-weight:600; font-size:13px; padding:8px 16px; border:0; border-radius:6px; cursor:pointer; transition:filter .15s; }
    .atr-btn:hover{ filter:brightness(0.92); }
    .atr-btn:disabled{ opacity:.6; cursor:not-allowed; }
    .atr-msg{ margin-top:12px; font-size:13px; }
  `
  document.head.appendChild(st)

  // Theme picker — copy actual computed styles from a real Mercur card.
  function applyMercurTheme() {
    // Look for a card-like element on the page: rounded + bordered + non-empty
    const candidates = Array.from(document.querySelectorAll("nav + div *, main *")) as HTMLElement[]
    let probe: HTMLElement | null = null
    for (const el of candidates) {
      const r = window.getComputedStyle(el)
      const radius = parseFloat(r.borderRadius || "0")
      const bgRgba = r.backgroundColor || "rgba(0, 0, 0, 0)"
      if (radius >= 6 && radius <= 24 && bgRgba !== "rgba(0, 0, 0, 0)" &&
          parseFloat(r.borderTopWidth || "0") >= 0.5 &&
          el.getBoundingClientRect().width > 200) {
        probe = el; break
      }
    }
    if (!probe) probe = document.body

    const cs = window.getComputedStyle(probe)
    const bodyCs = window.getComputedStyle(document.body)
    const pageBg = bodyCs.backgroundColor
    const cardBg = cs.backgroundColor || pageBg
    const cardBorder = cs.borderColor || cs.borderTopColor || "rgba(0,0,0,.08)"
    const cardFg = cs.color || bodyCs.color || "#0f172a"

    // Sniff input/field background by looking for an actual input in the page
    const inp = document.querySelector("input[type=text], input[type=email], input:not([type])") as HTMLInputElement | null
    let inputBg = cardBg
    let inputBorder = cardBorder
    let inputFg = cardFg
    if (inp) {
      const inpCs = window.getComputedStyle(inp)
      inputBg = inpCs.backgroundColor || inputBg
      inputBorder = inpCs.borderColor || inpCs.borderTopColor || inputBorder
      inputFg = inpCs.color || inputFg
    }

    // Detect dark mode by sampling card bg lightness
    const m = (cardBg.match(/rgba?\(([^)]+)\)/) || [])[1]
    let dark = false
    if (m) {
      const [r, g, b] = m.split(",").map(s => parseFloat(s))
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      dark = luminance < 0.5
    }

    // Pick a subtle bg for table headers / icons
    const subtleBg = dark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)"
    const linkColor = dark ? "#7dd3fc" : "#1753b0"
    const buttonBg = "#1753b0"

    // Write to a dynamic style element
    let dyn = document.getElementById("atr-tokens-dynamic") as HTMLStyleElement | null
    if (!dyn) {
      dyn = document.createElement("style")
      dyn.id = "atr-tokens-dynamic"
      document.head.appendChild(dyn)
    }
    dyn.textContent = `
      .atr-card{ background:${cardBg}; border-color:${cardBorder}; color:${cardFg}; }
      .atr-card-title{ color:${cardFg}; }
      .atr-card-sub{ color:${cardFg}; opacity:.65; }
      .atr-link{ color:${linkColor}; }
      .atr-table thead th{ color:${cardFg}; opacity:.7; border-bottom:1px solid ${cardBorder}; background:${subtleBg}; }
      .atr-table tbody td{ color:${cardFg}; border-bottom:1px solid ${cardBorder}; }
      .atr-table tbody tr:last-child td{ border-bottom:0; }
      .atr-field-label{ color:${cardFg}; opacity:.7; }
      .atr-input{ background:${inputBg}; color:${inputFg}; border-color:${inputBorder}; }
      .atr-btn{ background:${buttonBg}; color:white; }
    `
  }

  applyMercurTheme()
  setInterval(applyMercurTheme, 2000)
  new MutationObserver(applyMercurTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })
})()


// Belt-and-suspenders: if anyone lands on this URL directly, push them home.
;(function bounceHidden() {
  const path = window.location.pathname
  // Mercur's Settings index crashes after we removed some submodules.
  // Send the landing /dashboard/settings → /dashboard/integrations.
  if (/^\/dashboard\/settings\/?$/.test(path)) {
    window.location.replace("/dashboard/integrations")
    return
  }
  const reHidden = /^\/dashboard\/settings\/(locations|commission-rates)(\/|$)/
  if (reHidden.test(path)) {
    window.history.replaceState({}, "", "/dashboard/")
    window.dispatchEvent(new PopStateEvent("popstate"))
  }
})()

// === Clean up the Mercur stores/seller detail page ===
// We are a rental marketplace — no sales, no payouts, no SWIFT/BIC.
// Hide payment/billing/orders controls, and add a WhatsApp row next to Phone.
;(function storesNoPayments() {
  const css = document.createElement("style")
  css.setAttribute("data-css", "stores-no-payments")
  css.textContent = `
    /* Hide tabs/buttons that don't make sense for rentals */
    a[href*="/stores/"][href$="/edit-payment-details"],
    button[aria-label="Edit Payment Details"],
    button[aria-label="edit-payment-details"],
    [role="tab"][data-state][value="orders"],
    a[href*="/stores/"][href$="/orders"] {
      display: none !important;
    }
  `
  document.head.appendChild(css)
})()

// Inject a WhatsApp row + click-to-chat link on the seller detail page
async function injectWhatsAppRow() {
  const m = window.location.pathname.match(/^\/dashboard\/stores\/([a-zA-Z0-9_]+)/)
  if (!m) return
  const sellerId = m[1]
  // Only run once per seller view
  if ((document.body as any).dataset.waInjectedFor === sellerId) return

  // Find a Phone cell to anchor next to
  const labels = Array.from(document.querySelectorAll("div, span, dt, label"))
  const phoneLabel = labels.find((el) => (el.textContent || "").trim().toLowerCase() === "phone")
  if (!phoneLabel) return
  // Row container: nearest grid/row parent (4 levels up)
  let row: HTMLElement | null = phoneLabel as HTMLElement
  for (let i = 0; i < 4 && row; i++) {
    if (row.tagName === "TR" || (row.className || "").toString().match(/row|grid|flex|cell/i)) break
    row = row.parentElement
  }
  if (!row) return
  // Avoid duplicate
  if (row.parentElement?.querySelector("[data-atr-wa]")) {
    ;(document.body as any).dataset.waInjectedFor = sellerId
    return
  }

  // Fetch seller (our extended /admin/sellers/:id endpoint OR fall back to /admin/stores/:id with our column)
  let waNumber = ""
  try {
    const r = await fetch(`https://api.autotorental.com/admin/sellers/${sellerId}`, { credentials: "include" })
    if (r.ok) {
      const d = await r.json()
      waNumber = d?.seller?.company_whatsapp || d?.seller?.phone || ""
    }
  } catch {}

  // Clone the Phone row layout so we match the design exactly
  const clone = row.cloneNode(true) as HTMLElement
  clone.setAttribute("data-atr-wa", "1")
  // Find inner text nodes and rewrite
  const texts = clone.querySelectorAll("*")
  texts.forEach((n: any) => {
    const t = (n.textContent || "").trim()
    if (t.toLowerCase() === "phone") n.textContent = "💬 WhatsApp"
  })
  // Replace the value field with a wa.me link
  const valueEl = Array.from(clone.querySelectorAll("*")).find((n: any) => {
    const t = (n.textContent || "").trim()
    return t.match(/^\+?\d{6,15}$/) || t.startsWith("+")
  }) as HTMLElement | undefined
  if (valueEl && waNumber) {
    const clean = waNumber.replace(/[^0-9]/g, "")
    valueEl.innerHTML = `<a href="https://wa.me/${clean}" target="_blank" rel="noopener" style="color:#25d366;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">${waNumber} <span style="font-size:11px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:999px;">Open chat ↗</span></a>`
  } else if (valueEl) {
    valueEl.textContent = waNumber || "—"
  }
  row.parentElement?.insertBefore(clone, row.nextSibling)
  ;(document.body as any).dataset.waInjectedFor = sellerId
}

new MutationObserver(() => { injectWhatsAppRow().catch(() => {}) }).observe(document.body, { childList: true, subtree: true })
setInterval(() => { injectWhatsAppRow().catch(() => {}) }, 1500)
setTimeout(() => { injectWhatsAppRow().catch(() => {}) }, 200)

// === Inject Auto to Rental vehicle list into Mercur stores/[id] page ===
// Always renders a "Vehicles listed by this company" section at the BOTTOM of the page.
// Independent of Mercur's tab state — works no matter which tab is selected.
async function injectStoreVehicles() {
  const m = window.location.pathname.match(/^\/dashboard\/stores\/([a-zA-Z0-9_]+)/)
  if (!m) return
  const sellerId = m[1]

  // Already injected for this seller?
  if (document.querySelector(`[data-atr-vehicles-list="${sellerId}"]`)) return

  // Find the main content area
  const main = document.querySelector("main") || document.querySelector("[role='main']") || document.body.lastElementChild
  if (!main) return

  // Build the container immediately so user sees a loading state
  const wrap = document.createElement("section")
  wrap.setAttribute("data-atr-vehicles-list", sellerId)
  wrap.className = "atr-card"
  wrap.innerHTML = '<div class="atr-card-sub">Loading vehicles…</div>' 
  const mount = main.querySelector(":scope > div, :scope > section") || main
  // Match Mercur's content padding rhythm: insert a wrapper with margin
  const holder = document.createElement("div")
  holder.style.cssText = "padding:0 24px;margin-top:8px;"
  holder.appendChild(wrap)
  mount.appendChild(holder)

  // Fetch
  let vehicles: any[] = []
  try {
    const r = await fetch(`https://api.autotorental.com/admin/vehicles?seller_id=${sellerId}`, { credentials: "include" })
    if (!r.ok) {
      wrap.innerHTML = `<div style="color:#b91c1c;">Could not load vehicles (status ${r.status})</div>`
      return
    }
    const d = await r.json()
    vehicles = d.vehicles || []
  } catch (e: any) {
    wrap.innerHTML = `<div style="color:#b91c1c;">Could not load vehicles: ${e.message}</div>`
    return
  }

  const STATUS_BG: Record<string, string> = {
    active: "background:#dcfce7;color:#15803d",
    pending_approval: "background:#fef3c7;color:#92400e",
    draft: "background:#e2e8f0;color:#475569",
    rejected: "background:#fee2e2;color:#b91c1c",
    paused: "background:#fef3c7;color:#92400e",
    rented: "background:#dbeafe;color:#1e40af",
    unavailable: "background:#fee2e2;color:#b91c1c",
  }

  if (vehicles.length === 0) {
    wrap.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--colors-fg-subtle,#64748b);">
      <div style="font-size:36px;margin-bottom:8px;">🚗</div>
      <div style="font-weight:600;color:var(--colors-fg-base,#0f172a);">No vehicles listed yet</div>
      <div class="atr-card-sub" style="margin-top:4px;">When this rental company lists cars, they will appear here.</div>
    </div>`
    return
  }

  wrap.innerHTML = `
    <div class="atr-card-head">
      <div>
        <div class="atr-card-title">🚗 ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} listed</div>
        <div class="atr-card-sub">All vehicles published by this rental company on Auto to Rental.</div>
      </div>
      <a class="atr-link" href="/dashboard/vehicles?seller_id=${sellerId}">Manage in Vehicles →</a>
    </div>
    <table class="atr-table">
      <thead>
        <tr>
          <th>Photo</th><th>Title</th><th>Status</th><th>Daily</th><th>Views</th><th style="text-align:right">Open</th>
        </tr>
      </thead>
      <tbody>
        ${vehicles.map((v) => {
          const photo = v.photos?.[0]
          const sb = STATUS_BG[v.status] || "background:#e2e8f0;color:#475569"
          return `<tr>
            <td>${photo ? `<img src="${photo}" alt="" style="width:44px;height:32px;object-fit:cover;border-radius:4px;">` : '<span style="font-size:20px;">🚗</span>'}</td>
            <td style="font-weight:500;">${v.title || v.id}</td>
            <td><span class="atr-pill" style="${sb}">${v.status}</span></td>
            <td style="font-variant-numeric:tabular-nums;">${v.daily_price ? `${(v.currency_code || "AED").toUpperCase()} ${v.daily_price.toLocaleString()}` : "—"}</td>
            <td style="font-variant-numeric:tabular-nums;">${(v.view_count || 0).toLocaleString()}</td>
            <td style="text-align:right;"><a class="atr-link" href="https://autotorental.com/cars/${v.id}" target="_blank" rel="noopener">View ↗</a></td>
          </tr>`
        }).join("")}
      </tbody>
    </table>
  `
}

// Re-run on URL change (Mercur SPA navigation)
let __lastPathStore = ""
function maybeRunStoreInjector() {
  const p = window.location.pathname
  if (p !== __lastPathStore) {
    __lastPathStore = p
    // Remove previous injection on URL change
    document.querySelectorAll("[data-atr-vehicles-list]").forEach((el) => el.remove())
  }
  injectStoreVehicles().catch(() => {})
}
new MutationObserver(maybeRunStoreInjector).observe(document.body, { childList: true, subtree: true })
setInterval(maybeRunStoreInjector, 1500)
setTimeout(maybeRunStoreInjector, 300)

// === Inject Social Media editor into Mercur stores/[id] page ===
async function injectStoreSocials() {
  const m = window.location.pathname.match(/^\/dashboard\/stores\/([a-zA-Z0-9_]+)/)
  if (!m) return
  const sellerId = m[1]
  if (document.querySelector(`[data-atr-socials="${sellerId}"]`)) return

  const main = document.querySelector("main") || document.querySelector("[role='main']") || document.body.lastElementChild
  if (!main) return

  const wrap = document.createElement("section")
  wrap.setAttribute("data-atr-socials", sellerId)
  wrap.className = "atr-card"
  wrap.innerHTML = '<div class="atr-card-sub">Loading social media…</div>' 
  const mount = main.querySelector(":scope > div, :scope > section") || main
  // Match Mercur's content padding rhythm: insert a wrapper with margin
  const holder = document.createElement("div")
  holder.style.cssText = "padding:0 24px;margin-top:8px;"
  holder.appendChild(wrap)
  mount.appendChild(holder)

  // Fetch current socials
  let socials: Record<string, string> = {}
  try {
    const r = await fetch(`https://api.autotorental.com/admin/sellers/${sellerId}/socials`, { credentials: "include" })
    if (r.ok) { const d = await r.json(); socials = d.social || {} }
  } catch {}

  const NETWORKS = [
    { k: "website",   label: "Website",   emoji: "🌐", placeholder: "https://yourcompany.com" },
    { k: "facebook",  label: "Facebook",  emoji: "📘", placeholder: "https://facebook.com/yourpage" },
    { k: "instagram", label: "Instagram", emoji: "📷", placeholder: "https://instagram.com/yourhandle" },
    { k: "tiktok",    label: "TikTok",    emoji: "🎵", placeholder: "https://tiktok.com/@yourhandle" },
    { k: "youtube",   label: "YouTube",   emoji: "▶️", placeholder: "https://youtube.com/@yourchannel" },
    { k: "whatsapp",  label: "WhatsApp",  emoji: "💬", placeholder: "https://wa.me/971501234567" },
    { k: "twitter",   label: "X / Twitter", emoji: "🐦", placeholder: "https://x.com/yourhandle" },
    { k: "telegram",  label: "Telegram",  emoji: "✈️", placeholder: "https://t.me/yourhandle" },
    { k: "snapchat",  label: "Snapchat",  emoji: "👻", placeholder: "https://snapchat.com/add/yourhandle" },
  ]

  wrap.innerHTML = `
    <div class="atr-card-head">
      <div>
        <div class="atr-card-title">🔗 Social media</div>
        <div class="atr-card-sub">Links shown on the public company page (autotorental.com/companies/${sellerId}).</div>
      </div>
      <button data-action="save-socials" class="atr-btn">💾 Save</button>
    </div>
    <div class="atr-grid">
      ${NETWORKS.map(n => `
        <div>
          <label class="atr-field-label">${n.emoji} ${n.label}</label>
          <input data-soc="${n.k}" type="url" dir="ltr" value="${(socials[n.k] || "").replace(/"/g, "&quot;")}" placeholder="${n.placeholder}" class="atr-input"/>
        </div>`).join("")}
    </div>
    <div data-soc-msg class="atr-msg"></div>
  `

  const saveBtn = wrap.querySelector("[data-action='save-socials']") as HTMLButtonElement
  const msg = wrap.querySelector("[data-soc-msg]") as HTMLDivElement
  saveBtn.addEventListener("click", async () => {
    const body: Record<string, string> = {}
    wrap.querySelectorAll("[data-soc]").forEach((el: any) => { body[el.dataset.soc] = (el.value || "").trim() })
    saveBtn.disabled = true
    saveBtn.textContent = "Saving…"
    try {
      const r = await fetch(`https://api.autotorental.com/admin/sellers/${sellerId}/socials`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error("Save failed")
      msg.textContent = "✅ Saved"
      msg.style.color = "#15803d"
    } catch (e: any) {
      msg.textContent = "⚠️ " + (e.message || "Save failed")
      msg.style.color = "#b91c1c"
    } finally {
      saveBtn.disabled = false
      saveBtn.textContent = "💾 Save"
      setTimeout(() => { msg.textContent = "" }, 3000)
    }
  })
}

// Re-run on URL change
let __lastPathSoc = ""
function maybeRunSocialsInjector() {
  const p = window.location.pathname
  if (p !== __lastPathSoc) {
    __lastPathSoc = p
    document.querySelectorAll("[data-atr-socials]").forEach((el) => el.remove())
  }
  injectStoreSocials().catch(() => {})
}
new MutationObserver(maybeRunSocialsInjector).observe(document.body, { childList: true, subtree: true })
setInterval(maybeRunSocialsInjector, 1500)
setTimeout(maybeRunSocialsInjector, 400)

// === PWA: register service worker + show install prompt ===
;(function setupPwa(scope, appName, logoSrc) {
  // 1) Inject the manifest link
  const manifestPath = scope + "manifest.json"
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement("link")
    link.rel = "manifest"
    link.href = manifestPath
    document.head.appendChild(link)
  }
  // theme-color meta
  if (!document.querySelector('meta[name="theme-color"]')) {
    const meta = document.createElement("meta")
    meta.name = "theme-color"
    meta.content = "#1753b0"
    document.head.appendChild(meta)
  }

  // 2) Register the service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(scope + "sw.js", { scope }).catch(() => {})
  }

  // 3) Custom install prompt
  const DISMISS_KEY = "atr-install-dismissed-" + appName.toLowerCase().replace(/\s/g, "-")
  const DISMISS_DAYS = 14
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
  if (isStandalone) return
  try {
    const t = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10)
    if (t && Date.now() - t < DISMISS_DAYS * 86400000) return
  } catch {}

  let deferredEvt: any = null

  function show(mode: "native" | "ios") {
    if (document.getElementById("atr-pwa-prompt")) return
    const box = document.createElement("div")
    box.id = "atr-pwa-prompt"
    box.style.cssText = "position:fixed;right:20px;bottom:20px;z-index:99999;width:340px;background:#fff;color:#0f172a;border-radius:14px;box-shadow:0 12px 40px -6px rgba(0,0,0,.3);border:1px solid #e2e8f0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;animation:atrSlideUp .35s cubic-bezier(.2,.85,.3,1.05);"
    box.innerHTML = `
      <style>@keyframes atrSlideUp{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <img src="${logoSrc}" alt="" style="width:48px;height:48px;border-radius:10px;flex-shrink:0;box-shadow:0 4px 12px rgba(0,0,0,.12);"/>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
              <div style="font-weight:700;font-size:14px;">Install ${appName}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Add to your home screen for faster access.</div>
            </div>
            <button data-atr-close style="background:transparent;border:0;cursor:pointer;color:#94a3b8;font-size:16px;line-height:1;padding:4px;">×</button>
          </div>
          ${mode === "native"
            ? `<button data-atr-install style="margin-top:12px;width:100%;background:#1753b0;color:white;border:0;border-radius:8px;padding:10px;font-weight:600;font-size:13px;cursor:pointer;">⬇ Install app</button>`
            : `<div style="margin-top:10px;font-size:12px;line-height:1.5;color:#475569;">On iPhone: tap <span style="font-weight:600;">Share</span>, then <span style="font-weight:600;">Add to Home Screen</span>.</div>`
          }
        </div>
      </div>
    `
    document.body.appendChild(box)
    box.querySelector("[data-atr-close]")?.addEventListener("click", dismiss)
    box.querySelector("[data-atr-install]")?.addEventListener("click", async () => {
      if (!deferredEvt) return
      deferredEvt.prompt()
      const c = await deferredEvt.userChoice
      if (c?.outcome === "accepted") { dismiss() }
    })
  }
  function dismiss() {
    document.getElementById("atr-pwa-prompt")?.remove()
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }

  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault()
    deferredEvt = e
    setTimeout(() => show("native"), 8000)
  })
  if (isIOS) {
    setTimeout(() => show("ios"), 14000)
  }
})("/dashboard/", "Auto to Rental Admin", "/dashboard/favicon.png")

