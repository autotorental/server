import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@mercurjs/admin/index.css"
import App from "@mercurjs/admin"
import { API } from "./lib/api"
import { initAutoArabic } from "./lib/auto-ar"

// Escape untrusted (vendor-controlled) values before interpolating into innerHTML.
const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

// Single rental-companies list: /stores → /sellers (no second page).
;(function redirectLegacyStoresUrl() {
  const path = window.location.pathname
  if (/^\/stores\/?$/.test(path) || /^\/dashboard\/stores\/?$/.test(path)) {
    window.location.replace("/dashboard/sellers")
    return
  }
  if (/^\/stores\//.test(path)) {
    const rest = path.replace(/^\/stores\//, "")
    const target = rest.endsWith("/edit")
      ? "/dashboard/rental-companies/" + rest.replace(/\/edit\/?$/, "") + "?edit=1"
      : "/dashboard/rental-companies/" + rest
    window.location.replace(target)
    return
  }
  if (/^\/dashboard\/stores\//.test(path)) {
    const rest = path.replace(/^\/dashboard\/stores\//, "")
    const target = rest.endsWith("/edit")
      ? "/dashboard/rental-companies/" + rest.replace(/\/edit\/?$/, "") + "?edit=1"
      : "/dashboard/rental-companies/" + rest
    window.location.replace(target)
    return
  }
})()

;(function redirectCustomersToUsers() {
  const path = window.location.pathname
  if (/^\/(dashboard\/)?customers\/?$/.test(path)) {
    window.location.replace("/dashboard/users")
  }
})()

// Land the admin on Live Traffic instead of the framework default (Vehicles).
;(function landOnLiveTraffic() {
  // Land the admin/vendor on Live Traffic the first time per session, catching
  // BOTH a direct load and the post-login client-side bounce to the default
  // route (Vehicles/Products). A session flag keeps later manual nav working.
  const TARGET = "/dashboard/overview"
  const isDefault = (p: string) =>
    p === "/" || p === "/dashboard" || p === "/dashboard/" ||
    p === "/dashboard/vehicles" || p === "/vehicles" ||
    p === "/dashboard/products" || p === "/products"
  const go = () => { try { sessionStorage.setItem("atr_home_done", "1") } catch {}; window.location.replace(TARGET) }
  try {
    if (sessionStorage.getItem("atr_home_done")) return
    if (isDefault(window.location.pathname) && window.location.pathname !== TARGET) { go(); return }
    let n = 0
    const iv = setInterval(() => {
      const p = window.location.pathname
      if (p === TARGET || sessionStorage.getItem("atr_home_done")) { clearInterval(iv); return }
      if (isDefault(p)) { clearInterval(iv); go(); return }
      if (++n > 40) clearInterval(iv)
    }, 400)
  } catch {}
})()

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

function rewriteStoreLinks() {
  document.querySelectorAll('a[href*="/stores"]').forEach((node) => {
    const a = node as HTMLAnchorElement
    const href = a.getAttribute("href") || ""
    if (!href.includes("/stores")) return
    if (/\/stores\/?$/.test(href)) {
      a.setAttribute("href", href.replace(/\/stores\/?$/, "/sellers"))
    } else if (href.includes("/stores/")) {
      a.setAttribute("href", href.replace("/stores/", "/rental-companies/"))
    }
  })
}

// Place the "Vehicles" nav item directly under "Rental Companies", and remove the
// duplicate "Rental Companies" entry (both link to /dashboard/sellers).
function reorderNav() {
  const companies = [
    document.querySelector('[data-testid="sidebar-nav-item-stores"]'),
    document.querySelector('[data-testid="sidebar-nav-item-sellers"]'),
  ].filter(Boolean) as HTMLElement[]
  const vehicles = document.querySelector('[data-testid="sidebar-nav-item-vehicles"]') as HTMLElement | null
  if (!companies.length || !vehicles) return
  const primary = companies[0]
  // Hide any duplicate "Rental Companies" entries beyond the first.
  for (let i = 1; i < companies.length; i++) {
    if (companies[i].style.display !== "none") companies[i].style.display = "none"
  }
  // Move Vehicles to sit immediately after the primary Rental Companies item.
  if (primary.parentNode && primary.nextElementSibling !== vehicles) {
    primary.parentNode.insertBefore(vehicles, primary.nextSibling)
  }
}

function customize() {
  replaceTextNodes(document.body)
  rewriteStoreLinks()
  reorderNav()
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

const FAVICON_SRC = "/dashboard/favicon.svg"
const FAVICON_MARK =
  "width:44px;height:44px;object-fit:contain;background:#fff;border-radius:10px;padding:4px;display:block;margin:0 auto;"

// Replace Mercur brand mark on login/auth pages with our favicon (original branding).
function replaceBrandMark() {
  document.querySelectorAll('[data-testid="login-container"], [data-testid="invite-container"]').forEach((container) => {
    const host = container as HTMLElement
    if (host.dataset.loginLogo) return
    const mark = host.firstElementChild as HTMLElement | null
    if (!mark) return
    host.dataset.loginLogo = "1"
    mark.outerHTML =
      `<div data-atr-login-logo="1" style="display:flex;justify-content:center;width:100%;margin-bottom:4px;"><img src="${FAVICON_SRC}" alt="Auto to Rental" style="${FAVICON_MARK}"/></div>`
  })
}

function enhanceMobileNavHeader() {
  document.querySelectorAll('[role="dialog"] > div > div.p-3:first-child').forEach((el) => {
    const host = el as HTMLElement
    if (host.dataset.atrNavHeader) return
    const closeBtn = host.querySelector("button")
    if (!closeBtn) return
    host.dataset.atrNavHeader = "1"
    host.style.display = "flex"
    host.style.alignItems = "center"
    host.style.justifyContent = "space-between"
    host.style.gap = "12px"
    if (host.querySelector("[data-atr-nav-logo]")) return
    const brand = document.createElement("div")
    brand.dataset.atrNavLogo = "1"
    brand.style.cssText = "display:flex;align-items:center;min-width:0;flex:1;"
    brand.innerHTML =
      `<img src="${FAVICON_SRC}" alt="Auto to Rental" style="height:28px;width:28px;object-fit:contain;background:#fff;border-radius:6px;padding:2px;"/>`
    host.insertBefore(brand, closeBtn)
    closeBtn.style.marginInlineStart = "auto"
  })
}

function applyBranding() {
  replaceBrandMark()
  enhanceMobileNavHeader()
}
new MutationObserver(applyBranding).observe(document.body, { childList: true, subtree: true })
setInterval(applyBranding, 800)
setTimeout(applyBranding, 100)


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

// === Hide Mercur e-commerce settings (rental marketplace — listings + contact, no sales/returns) ===
const __HIDE_CSS = document.createElement("style")
__HIDE_CSS.textContent = `
  a[href$="/stores"],
  a[href$="/stores/"],
  a[href*="/stores?"],
  a[href*="/dashboard/stores"],
  nav a[href$="/orders"],
  nav a[href$="/orders/"],
  nav a[href$="/products"],
  nav a[href$="/products/"],
  nav a[href$="/inventory"],
  nav a[href$="/inventory/"],
  nav a[href$="/price-lists"],
  nav a[href$="/price-lists/"],
  nav a[href$="/promotions"],
  nav a[href$="/promotions/"],
  nav a[href$="/payouts"],
  nav a[href$="/payouts/"],
  nav a[href$="/models"],
  nav a[href$="/models/"],
  nav a[href$="/ai-assistant"],
  nav a[href$="/ai-assistant/"],
  nav a[href$="/auto-fix"],
  nav a[href$="/auto-fix/"],
  nav a[href$="/ai-settings"],
  nav a[href$="/ai-settings/"],
  nav a[href$="/ai-control"],
  nav a[href$="/ai-control/"],
  nav a[href$="/pages"],
  nav a[href$="/pages/"],
  nav a[href$="/cloudflare-analytics"],
  nav a[href$="/cloudflare-analytics/"],
  nav a[href$="/cloudflare-dns"],
  nav a[href$="/cloudflare-dns/"],
  nav a[href$="/cloudflare-security"],
  nav a[href$="/cloudflare-security/"],
  nav a[href$="/cloudflare-speed"],
  nav a[href$="/cloudflare-speed/"],
  nav a[href$="/country-block"],
  nav a[href$="/country-block/"],
  a[href$="/settings/locations"],
  a[href$="/settings/locations/"],
  a[href*="/settings/locations?"],
  a[href$="/settings/commission-rates"],
  a[href$="/settings/commission-rates/"],
  a[href*="/settings/commission-rates?"],
  a[href$="/settings/return-reasons"],
  a[href$="/settings/return-reasons/"],
  a[href*="/settings/return-reasons?"],
  a[href$="/settings/shipping-profiles"],
  a[href$="/settings/shipping-profiles/"],
  a[href*="/settings/shipping-profiles?"],
  a[href$="/settings/tax-regions"],
  a[href$="/settings/tax-regions/"],
  a[href*="/settings/tax-regions?"],
  a[href$="/edit-address"],
  a[href$="/edit-address/"],
  a[href*="/edit-address?"],
  button[aria-label="Edit Address" i],
  button[aria-label="edit-address" i],
  [data-testid="sidebar-user-menu-documentation"],
  a[href*="docs.mercurjs.com"],
  [data-testid="sidebar-user-menu-changelog"],
  a[href*="mercurjs.com/updates"] {
    display: none !important;
  }
`
document.head.appendChild(__HIDE_CSS)

// Login / invite title: fit "Welcome to Auto to Rental Marketplace" on one line (280px card).
const __LOGIN_TITLE_CSS = document.createElement("style")
__LOGIN_TITLE_CSS.setAttribute("data-css", "login-title-one-line")
__LOGIN_TITLE_CSS.textContent = `
  [data-testid="login-title"],
  [data-testid="invite-title"] {
    font-size: 0.625rem !important;
    line-height: 1rem !important;
    letter-spacing: -0.02em;
    white-space: nowrap;
    text-align: center;
  }
`
document.head.appendChild(__LOGIN_TITLE_CSS)

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
      [data-testid^="sidebar-nav-item-"] svg{ color:${linkColor} !important; }
      [data-testid^="sidebar-nav-item-"] svg *{ stroke:currentColor; }
    `
  }

  applyMercurTheme()
  setInterval(applyMercurTheme, 2000)
  new MutationObserver(applyMercurTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] })
})()


// Belt-and-suspenders: hidden settings routes + legacy URLs.
;(function bounceHidden() {
  const path = window.location.pathname

  // Send the landing /dashboard/settings → /dashboard/integrations.
  if (/^\/dashboard\/settings\/?$/.test(path)) {
    window.location.replace("/dashboard/integrations")
    return
  }
  const reHidden = /^\/dashboard\/settings\/(locations|commission-rates|shipping-profiles|tax-regions)(\/|$)/
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

// === Stores list + detail: Reset password & Delete company in ⋯ menu ===
;(function injectStoreActionMenu() {
    const MENU_ITEM_CLASS =
    "bg-ui-bg-component text-ui-fg-base txt-compact-small relative cursor-pointer select-none rounded-md px-2 py-1.5 outline-none transition-colors focus-visible:bg-ui-bg-component-hover focus:bg-ui-bg-component-hover active:bg-ui-bg-component-hover flex items-center gap-x-2 w-full"

  function sellerIdFromEditLink(edit: HTMLAnchorElement | null): string | null {
    if (!edit) return null
    const href = edit.getAttribute("href") || ""
    const m = href.match(/\/stores\/([^/]+)\/edit/)
    return m?.[1] || null
  }

  function closeMenus() {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
  }

  function showConfirmModal(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
    document.getElementById("atr-confirm-modal")?.remove()
    const box = document.createElement("div")
    box.id = "atr-confirm-modal"
    box.style.cssText =
      "position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;"
    box.innerHTML = `
      <div style="background:var(--bg-base,#fff);color:var(--fg-base,#0f172a);border-radius:12px;max-width:440px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.25);">
        <div style="font-weight:700;font-size:16px;margin-bottom:8px;">${title}</div>
        <p style="font-size:13px;opacity:.85;margin:0 0 16px;line-height:1.5;">${message}</p>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" data-atr-cancel style="padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;background:transparent;cursor:pointer;">Cancel</button>
          <button type="button" data-atr-confirm style="padding:8px 14px;border-radius:8px;border:0;background:#1753b0;color:#fff;cursor:pointer;font-weight:600;">${confirmLabel}</button>
        </div>
      </div>`
    document.body.appendChild(box)
    box.querySelector("[data-atr-cancel]")?.addEventListener("click", () => box.remove())
    box.querySelector("[data-atr-confirm]")?.addEventListener("click", () => {
      box.remove()
      onConfirm()
    })
    box.addEventListener("click", (e) => { if (e.target === box) box.remove() })
  }

  function showErrorModal(message: string) {
    document.getElementById("atr-error-modal")?.remove()
    const box = document.createElement("div")
    box.id = "atr-error-modal"
    box.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;"
    box.innerHTML = `
      <div style="background:var(--bg-base,#fff);color:var(--fg-base,#0f172a);border-radius:12px;max-width:440px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.25);">
        <div style="font-weight:700;font-size:16px;margin-bottom:8px;color:#dc2626;">Could not reset password</div>
        <p style="font-size:13px;opacity:.85;margin:0 0 16px;line-height:1.5;">${message}</p>
        <div style="display:flex;justify-content:flex-end;">
          <button type="button" data-atr-close style="padding:8px 14px;border-radius:8px;border:0;background:#1753b0;color:#fff;cursor:pointer;font-weight:600;">OK</button>
        </div>
      </div>`
    document.body.appendChild(box)
    box.querySelector("[data-atr-close]")?.addEventListener("click", () => box.remove())
    box.addEventListener("click", (e) => { if (e.target === box) box.remove() })
  }

  function makeMenuItem(label: string, icon: string, onClick: () => void, danger = false) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.setAttribute("role", "menuitem")
    btn.setAttribute("tabindex", "-1")
    btn.setAttribute("data-atr-store-action", "1")
    btn.className = MENU_ITEM_CLASS + (danger ? " text-ui-fg-error hover:text-ui-fg-error" : "")
    btn.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span>`
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      e.stopPropagation()
    })
    btn.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      closeMenus()
      setTimeout(onClick, 0)
    })
    return btn
  }

  function showPasswordModal(companyName: string, email: string, password: string, loginEmail?: string) {
    document.getElementById("atr-reset-pw-modal")?.remove()
    const box = document.createElement("div")
    box.id = "atr-reset-pw-modal"
    box.style.cssText =
      "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;"
    const loginHint = loginEmail && loginEmail !== email
      ? `<p style="font-size:12px;opacity:.75;margin:0 0 8px;">Vendor login email: <strong>${loginEmail}</strong></p>`
      : ""
    box.innerHTML = `
      <div style="background:var(--bg-base,#fff);color:var(--fg-base,#0f172a);border-radius:12px;max-width:440px;width:100%;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.25);">
        <div style="font-weight:700;font-size:16px;margin-bottom:8px;">New vendor password</div>
        <p style="font-size:13px;opacity:.8;margin:0 0 12px;">Password for <strong>${companyName}</strong>${email ? ` (${email})` : ""}</p>
        ${loginHint}
        <input id="atr-new-pw" readonly value="${password.replace(/"/g, "&quot;")}" style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:15px;margin-bottom:8px;" />
        <p style="font-size:12px;opacity:.65;margin:0 0 16px;">Share this with the vendor. They log in at partner.autotorental.com and can change it later.</p>
        <div style="display:flex;justify-content:flex-end;gap:8px;">
          <button type="button" data-atr-copy style="padding:8px 14px;border-radius:8px;border:1px solid #e2e8f0;background:transparent;cursor:pointer;">Copy</button>
          <button type="button" data-atr-close style="padding:8px 14px;border-radius:8px;border:0;background:#1753b0;color:#fff;cursor:pointer;font-weight:600;">Done</button>
        </div>
      </div>`
    document.body.appendChild(box)
    const inp = box.querySelector("#atr-new-pw") as HTMLInputElement
    box.querySelector("[data-atr-copy]")?.addEventListener("click", () => {
      inp.select()
      navigator.clipboard?.writeText(password).catch(() => {})
    })
    box.querySelector("[data-atr-close]")?.addEventListener("click", () => box.remove())
    box.addEventListener("click", (e) => { if (e.target === box) box.remove() })
    inp.focus()
    inp.select()
  }

  async function resetPassword(sellerId: string) {
    showConfirmModal(
      "Reset vendor password?",
      "A new random password will be generated. The vendor’s old password will stop working immediately.",
      "Generate password",
      () => void runResetPassword(sellerId),
    )
  }

  async function runResetPassword(sellerId: string) {
    try {
      const r = await fetch(`${API}/admin/sellers/${sellerId}/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        showErrorModal(d.message || "Password reset failed. Make sure you are still logged in as admin.")
        return
      }
      showPasswordModal(
        d.seller_name || "Company",
        d.seller_email || "",
        d.new_password,
        d.login_email,
      )
    } catch (e: any) {
      showErrorModal(e.message || "Password reset failed")
    }
  }

  async function toggleFlag(sellerId: string, key: string) {
    try {
      const r = await fetch(`${API}/admin/sellers/${sellerId}/set-flags`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggle: key }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { showErrorModal(d.message || "Action failed. Make sure you have permission.") ; return }
      window.location.reload()
    } catch (e: any) { showErrorModal(e.message || "Action failed") }
  }

  async function deleteCompany(sellerId: string) {
    if (!confirm("Delete this rental company and ALL their vehicles?\n\nThis cannot be undone.")) return
    try {
      const r = await fetch(`${API}/admin/sellers/${sellerId}/delete-account`, {
        method: "POST",
        credentials: "include",
      })
      const d = await r.json()
      if (!r.ok) {
        alert(d.message || "Delete failed")
        return
      }
      alert(`Deleted "${d.seller_name}"\n${d.vehicles_deleted} vehicle(s) removed.`)
      if (/^\/dashboard\/rental-companies\/[^/]+/.test(window.location.pathname)) {
        window.location.href = "/dashboard/sellers"
      } else {
        window.location.reload()
      }
    } catch (e: any) {
      alert(e.message || "Delete failed")
    }
  }

  function enhanceStoreMenus() {
    document.querySelectorAll('a[role="menuitem"][href*="/stores/"][href$="/edit"]').forEach((edit) => {
      const container = edit.parentElement
      if (!container || (container as HTMLElement).dataset.atrStoreMenu) return
      const sellerId = sellerIdFromEditLink(edit as HTMLAnchorElement)
      if (!sellerId) return
      ;(container as HTMLElement).dataset.atrStoreMenu = sellerId
      const divider = document.createElement("div")
      divider.className = "border-t border-ui-border-base my-1"
      divider.setAttribute("data-atr-store-action", "1")
      container.appendChild(divider)
      const me = (window as any).__ATR_ME || {}
      const can = (k: string) => !me.is_supervisor || (me.perms && me.perms[k])
      if (can("reset_password")) container.appendChild(makeMenuItem("Reset password", "🔑", () => resetPassword(sellerId)))
      if (can("vip")) container.appendChild(makeMenuItem("Toggle VIP / Premium", "⭐", () => toggleFlag(sellerId, "vip")))
      if (can("verified")) container.appendChild(makeMenuItem("Toggle Verified", "✅", () => toggleFlag(sellerId, "verified")))
      if (can("featured")) container.appendChild(makeMenuItem("Toggle Featured", "📌", () => toggleFlag(sellerId, "featured")))
      if (can("suspend")) container.appendChild(makeMenuItem("Suspend / Reactivate", "⛔", () => toggleFlag(sellerId, "suspended")))
      if (!me.is_supervisor) container.appendChild(makeMenuItem("Delete company", "🗑️", () => deleteCompany(sellerId), true))
    })
  }

  new MutationObserver(enhanceStoreMenus).observe(document.body, { childList: true, subtree: true })
  setInterval(enhanceStoreMenus, 400)
})()

// Inject a WhatsApp row + click-to-chat link on the seller detail page (not edit modals).
let __waInjectLock = false
function cleanupWhatsAppInDialogs() {
  document.querySelectorAll('[role="dialog"] [data-atr-wa]').forEach((el) => el.remove())
}

async function injectWhatsAppRow() {
  const m = window.location.pathname.match(/^\/dashboard\/stores\/([a-zA-Z0-9_]+)/)
  cleanupWhatsAppInDialogs()

  if (!m) {
    delete (document.body as any).dataset.waInjectedFor
    return
  }

  const sellerId = m[1]

  // Edit-store modal uses the same URL — never inject there.
  if (document.querySelector('[role="dialog"]')) return
  if ((document.body as any).dataset.waInjectedFor === sellerId) return
  if (__waInjectLock) return
  __waInjectLock = true

  try {
    const labels = Array.from(document.querySelectorAll("div, span, dt, label"))
    const phoneLabel = labels.find((el) => {
      if (el.closest("form") || el.closest('[role="dialog"]')) return false
      return (el.textContent || "").trim().toLowerCase() === "phone"
    })
    if (!phoneLabel) return

    let row: HTMLElement | null = phoneLabel as HTMLElement
    for (let i = 0; i < 4 && row; i++) {
      if (row.tagName === "TR" || (row.className || "").toString().match(/row|grid|flex|cell/i)) break
      row = row.parentElement
    }
    if (!row || row.closest("form") || row.closest('[role="dialog"]')) return
    if (row.parentElement?.querySelector(":scope > [data-atr-wa]")) {
      ;(document.body as any).dataset.waInjectedFor = sellerId
      return
    }

    let waNumber = ""
    try {
      const r = await fetch(`${API}/admin/sellers/${sellerId}`, { credentials: "include" })
      if (r.ok) {
        const d = await r.json()
        waNumber = d?.seller?.company_whatsapp || d?.seller?.phone || ""
      }
    } catch {}

    const clone = row.cloneNode(true) as HTMLElement
    clone.setAttribute("data-atr-wa", "1")
    clone.querySelectorAll("*").forEach((n: any) => {
      const t = (n.textContent || "").trim()
      if (t.toLowerCase() === "phone") n.textContent = "💬 WhatsApp"
    })
    const valueEl = Array.from(clone.querySelectorAll("*")).find((n: any) => {
      const t = (n.textContent || "").trim()
      return t.match(/^\+?\d{6,15}$/) || t.startsWith("+")
    }) as HTMLElement | undefined
    if (valueEl && waNumber) {
      const clean = waNumber.replace(/[^0-9]/g, "")
      valueEl.innerHTML = `<a href="https://wa.me/${esc(clean)}" target="_blank" rel="noopener" style="color:#25d366;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px;">${esc(waNumber)} <span style="font-size:11px;background:#dcfce7;color:#15803d;padding:2px 6px;border-radius:999px;">Open chat ↗</span></a>`
    } else if (valueEl) {
      valueEl.textContent = waNumber || "—"
    }
    row.parentElement?.insertBefore(clone, row.nextSibling)
    ;(document.body as any).dataset.waInjectedFor = sellerId
  } finally {
    __waInjectLock = false
  }
}

new MutationObserver(() => { injectWhatsAppRow().catch(() => {}) }).observe(document.body, { childList: true, subtree: true })
setTimeout(() => { injectWhatsAppRow().catch(() => {}) }, 200)

// === Inject Auto to Rental vehicle list into Mercur stores/[id] page ===
// Renders a "Vehicles listed by this company" section at the TOP of the page.
// Independent of Mercur's tab state — works even when Mercur's default Products tab is empty.
function hideLegacyStoreEmptyState() {
  document.querySelectorAll("tr, div, p, span, td").forEach((node) => {
    const el = node as HTMLElement
    const txt = (el.textContent || "").trim().toLowerCase()
    if (!txt) return
    if (!txt.includes("no vehicles yet")) return
    if (el.closest("[data-atr-vehicles-list]")) return
    const row = el.closest("tr") as HTMLElement | null
    if (row) {
      row.style.display = "none"
      return
    }
    el.style.display = "none"
  })
}

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
  // Match Mercur's content padding rhythm.
  const holder = document.createElement("div")
  holder.style.cssText = "padding:0 24px;margin-top:8px;"
  holder.appendChild(wrap)
  const firstBlock = mount.firstElementChild
  if (firstBlock) {
    mount.insertBefore(holder, firstBlock)
  } else {
    mount.appendChild(holder)
  }

  // Fetch
  let vehicles: any[] = []
  try {
    const r = await fetch(`${API}/admin/vehicles?seller_id=${sellerId}`, { credentials: "include" })
    if (!r.ok) {
      wrap.innerHTML = `<div style="color:#b91c1c;">Could not load vehicles (status ${r.status})</div>`
      return
    }
    const d = await r.json()
    vehicles = d.vehicles || []
  } catch (e: any) {
    wrap.innerHTML = `<div style="color:#b91c1c;">Could not load vehicles: ${esc(e.message)}</div>`
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

  hideLegacyStoreEmptyState()

  wrap.innerHTML = `
    <div class="atr-card-head">
      <div>
        <div class="atr-card-title">🚗 ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} listed</div>
        <div class="atr-card-sub">Loaded from Vehicles module (seller_id=${sellerId}) to avoid empty Products tab confusion.</div>
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
            <td>${photo ? `<img src="${esc(photo)}" alt="" style="width:44px;height:32px;object-fit:cover;border-radius:4px;">` : '<span style="font-size:20px;">🚗</span>'}</td>
            <td style="font-weight:500;">${esc(v.title || v.id)}</td>
            <td><span class="atr-pill" style="${sb}">${esc(v.status)}</span></td>
            <td style="font-variant-numeric:tabular-nums;">${v.daily_price ? `${esc((v.currency_code || "AED").toUpperCase())} ${esc(v.daily_price.toLocaleString())}` : "—"}</td>
            <td style="font-variant-numeric:tabular-nums;">${esc((v.view_count || 0).toLocaleString())}</td>
            <td style="text-align:right;"><a class="atr-link" href="https://autotorental.com/cars/${esc(v.id)}" target="_blank" rel="noopener">View ↗</a></td>
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
    const r = await fetch(`${API}/admin/sellers/${sellerId}/socials`, { credentials: "include" })
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
          <input data-soc="${n.k}" type="url" dir="ltr" value="${esc(socials[n.k] || "")}" placeholder="${n.placeholder}" class="atr-input"/>
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
      const r = await fetch(`${API}/admin/sellers/${sellerId}/socials`, {
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

  // 2) Service worker DISABLED — it caused stale admin builds. Actively remove any
  //    previously-registered SW and wipe its caches so updates always show instantly.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((rs) => rs.forEach((r) => r.unregister()))
      .catch(() => {})
    if (window.caches?.keys) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
    }
  }

  // 3) Custom install prompt
  const DISMISS_KEY = "atr-install-dismissed-" + appName.toLowerCase().replace(/\s/g, "-")
  const DISMISS_DAYS = 15
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true
  if (isStandalone) return
  try {
    const raw = localStorage.getItem(DISMISS_KEY) || "0"
    if (raw === "never") return                 // user opted out permanently
    const t = parseInt(raw, 10)
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
            <button data-atr-close aria-label="Close" style="background:#f1f5f9;border:0;cursor:pointer;color:#475569;font-size:20px;line-height:1;width:30px;height:30px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">×</button>
          </div>
          ${mode === "native"
            ? `<button data-atr-install style="margin-top:12px;width:100%;background:#1753b0;color:white;border:0;border-radius:8px;padding:10px;font-weight:600;font-size:13px;cursor:pointer;">⬇ Install app</button>`
            : `<div style="margin-top:10px;font-size:12px;line-height:1.5;color:#475569;">On iPhone: tap <span style="font-weight:600;">Share</span>, then <span style="font-weight:600;">Add to Home Screen</span>.</div>`
          }
          <div style="margin-top:8px;text-align:center;">
            <button data-atr-never style="background:transparent;border:0;cursor:pointer;color:#94a3b8;font-size:11px;text-decoration:underline;padding:4px;">Don't remind me again</button>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(box)
    box.querySelector("[data-atr-close]")?.addEventListener("click", dismiss)
    box.querySelector("[data-atr-never]")?.addEventListener("click", dontRemind)
    box.querySelector("[data-atr-install]")?.addEventListener("click", async () => {
      if (!deferredEvt) return
      deferredEvt.prompt()
      const c = await deferredEvt.userChoice
      if (c?.outcome === "accepted") { dismiss() }
    })
  }
  function dismiss() {
    // Snooze: hide and don't show again for DISMISS_DAYS (15 days).
    document.getElementById("atr-pwa-prompt")?.remove()
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch {}
  }
  function dontRemind() {
    // Permanent opt-out: never show this prompt again on this browser.
    document.getElementById("atr-pwa-prompt")?.remove()
    try { localStorage.setItem(DISMISS_KEY, "never") } catch {}
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

// Translate the whole admin UI to Arabic when the language is Arabic.
initAutoArabic()


// ── Customer page: hide the empty "Orders" tab (0% commission marketplace = no
// orders) and inject the customer's real activity: calls + WhatsApp/phone contacts.
;(function customerContactsEnhancer() {
  const ICON: Record<string,string> = { call: "📞", whatsapp: "🟢", webrtc: "📲", phone: "📞", registered: "🎉", became_admin: "👑", became_vendor: "🏢", password_reset: "🔑", admin_revoked: "❌" }
  const LABEL: Record<string,string> = { registered: "Registered", became_admin: "Made admin", became_vendor: "Made vendor", password_reset: "Password reset", admin_revoked: "Admin revoked", call: "Call", whatsapp: "WhatsApp", webrtc: "In-app call" }
  const fmt = (x: any) => { try { return new Date(x).toLocaleString() } catch { return String(x || "") } }
  function cardOf(el: any) { let c = el; for (let i=0;i<6 && c && c.parentElement;i++){ c = c.parentElement; const cn = typeof c.className==="string"?c.className:""; if (/rounded-lg|shadow-elevation|bg-ui-bg-base/.test(cn)) return c } return null }
  function render(card: any, d: any) {
    const items = (d && d.items) || []
    const reg = d.registered_at ? fmt(d.registered_at) : "—"
    const head = '<div style="padding:18px 20px;border-bottom:1px solid rgba(125,125,125,.18);display:flex;align-items:center;gap:11px">'
      + '<div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#3b82f6,#60a5fa);display:grid;place-items:center;font-size:17px">🕓</div>'
      + '<div><div style="font-weight:600;font-size:15px">Activity & History</div>'
      + '<div style="font-size:12px;color:#999;margin-top:2px">Registered ' + esc(reg) + ' · ' + (d.calls||0) + ' calls · ' + (d.contacts||0) + ' contacts — no orders (0% commission)</div></div></div>'
    let body
    if (!items.length) body = '<div style="padding:28px;text-align:center;color:#999">No activity yet</div>'
    else body = items.map((it: any) => {
      const isH = !!it.history
      const main = isH ? (LABEL[it.kind] || it.kind) : esc(it.seller || "—")
      const sub = isH ? esc(it.detail || "") : (esc(it.vehicle || "") + (it.country ? (" · " + esc(it.country)) : ""))
      return '<div style="display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid rgba(125,125,125,.10)">'
        + '<span style="font-size:18px">' + (ICON[it.kind]||"•") + '</span>'
        + '<div style="flex:1;min-width:0"><div style="font-weight:500;font-size:13.5px">' + main + '</div>'
        + (sub ? ('<div style="font-size:11.5px;color:#999">' + sub + '</div>') : '') + '</div>'
        + '<span style="font-size:10.5px;color:#aaa;white-space:nowrap">' + esc(fmt(it.at)) + '</span>'
        + '<span style="font-size:10px;font-weight:600;color:' + (isH?"#8b5cf6":"#3b82f6") + ';background:' + (isH?"rgba(139,92,246,.12)":"rgba(59,130,246,.12)") + ';padding:3px 8px;border-radius:6px">' + (isH?"log":esc(it.kind)) + '</span></div>'
    }).join("")
    card.innerHTML = head + body
  }
  let lastId: string | null = null, timer: any = null
  function enhance() {
    const m = location.pathname.match(/\/customers\/(cus_[A-Za-z0-9]+)/)
    if (!m) { lastId = null; return }
    const cusId = m[1]
    const heads = Array.from(document.querySelectorAll("h1,h2,h3")) as any[]
    heads.forEach(h => { const t=(h.textContent||"").trim(); if (t==="Orders"||t==="الطلبات"){ const c=cardOf(h); if (c && c.dataset.atrHidden!=="1"){ c.style.display="none"; c.dataset.atrHidden="1" } } })
    if (document.getElementById("atr-cust-contacts") && lastId===cusId) return
    const old = document.getElementById("atr-cust-contacts"); if (old) old.remove()
    lastId = cusId
    let anchor: any = null
    heads.forEach(h => { const t=(h.textContent||"").trim(); if ((t==="Orders"||t==="الطلبات") && !anchor) anchor=cardOf(h) })
    const card = document.createElement("div")
    card.id = "atr-cust-contacts"
    card.className = "shadow-elevation-card-rest bg-ui-bg-base w-full rounded-lg"
    card.style.cssText = "margin:0 0 16px 0;overflow:hidden;border:1px solid rgba(125,125,125,.18)"
    card.innerHTML = '<div style="padding:20px;color:#999">Loading…</div>'
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(card, anchor)
    else { const main=(document.querySelector("main")||document.body) as any; const f=main.querySelector("[class*=rounded-lg]"); if (f&&f.parentElement) f.parentElement.insertBefore(card,f.nextSibling); else main.appendChild(card) }
    fetch(`${API}/admin/customer-contacts/${cusId}`, { credentials: "include" }).then(r=>r.json()).then(d=>render(card,d)).catch(()=>{ card.innerHTML='<div style="padding:20px;color:#c00">Could not load</div>' })
  }
  const run = () => { clearTimeout(timer); timer=setTimeout(()=>{ try{ enhance() }catch(e){} }, 250) }
  const startObs = () => { try{ new MutationObserver(run).observe(document.body,{childList:true,subtree:true}); run() }catch(e){} }
  if (document.body) startObs(); else window.addEventListener("DOMContentLoaded", startObs)
})()


// ── Self-heal stale deploys: after a new build, old lazy chunks are deleted, so an
// already-open tab throws "Failed to fetch dynamically imported module" → instead of the
// "An error occurred" boundary, reload once to fetch the fresh build.
;(function selfHealChunkErrors() {
  const KEY = "atr_chunk_reload_ts"
  const isChunkErr = (m: any) => /ChunkLoadError|Loading chunk \d|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|dynamically imported module/i.test(String(m || ""))
  function heal(reason: any) {
    if (!isChunkErr(reason)) return
    try { const last = Number(sessionStorage.getItem(KEY) || "0"); if (Date.now() - last < 20000) return; sessionStorage.setItem(KEY, String(Date.now())) } catch {}
    location.reload()
  }
  window.addEventListener("error", (e: any) => heal(e?.message || e?.error?.message || e?.error), true)
  window.addEventListener("unhandledrejection", (e: any) => heal(e?.reason?.message || e?.reason))
})()

// ── Supervisor gating: a limited admin only sees what the owner granted (owner unaffected).
;(function supervisorGating() {
  const OWNER_ONLY = ["supervisors","settings","users","finance","payouts","integrations","stripe","claude-usage","openai-usage","firebase-analytics","cloudflare-analytics","cloudflare-dns","cloudflare-security","cloudflare-speed","country-block","ai-settings","ai-control","marketing","google-ads","ads-studio","ads-conversions"]
  function seg(href: string) { const m = href.match(/\/dashboard\/([^/?#]+)/); return m ? m[1] : "" }
  function apply() {
    const me = (window as any).__ATR_ME
    if (!me || !me.is_supervisor) return
    const allow = new Set(me.nav || [])
    document.querySelectorAll('a[href*="/dashboard/"]').forEach((a) => {
      const sg = seg((a as HTMLAnchorElement).getAttribute("href") || "")
      if (!sg || sg === "dashboard") return
      const ok = allow.has(sg) && OWNER_ONLY.indexOf(sg) === -1
      if (!ok) { const li = (a as HTMLElement).closest("li") || (a.parentElement as HTMLElement); if (li) (li as HTMLElement).style.display = "none" }
    })
  }
  fetch(`${API}/admin/me`, { credentials: "include" }).then((r) => r.json()).then((d) => {
    (window as any).__ATR_ME = d
    if (!d || !d.is_supervisor) return
    apply()
    new MutationObserver(apply).observe(document.body, { childList: true, subtree: true })
    setInterval(apply, 600)
  }).catch(() => {})
})()

// ── Customer page: account actions (reset password · make vendor · make admin).
;(function customerActionsEnhancer() {
  const BTN = "display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid rgba(125,125,125,.3);background:transparent;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit"
  let timer: any = null
  function post(path: string, body: any) {
    return fetch(`${API}/admin/customers/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) }).then(r => r.json())
  }
  function show(el: any, html: string, ok = true) { el.innerHTML = '<div style="margin-top:12px;padding:10px 13px;border-radius:8px;font-size:13px;background:' + (ok?"rgba(16,185,129,.12)":"rgba(220,38,38,.12)") + ';color:' + (ok?"#059669":"#dc2626") + '">' + html + '</div>' }
  function showPw(el: any, title: string, pw: string, email: string) {
    el.innerHTML = '<div style="margin-top:12px;padding:12px 14px;border-radius:8px;font-size:13px;background:rgba(16,185,129,.12);color:#059669">'
      + '<div style="font-weight:600;margin-bottom:8px">' + esc(title) + '</div>'
      + (email ? '<div style="margin-bottom:6px">Login email: <b>' + esc(email) + '</b></div>' : '')
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">Password: '
      + '<code id="atr-pw" style="font-size:15px;font-family:monospace;background:rgba(125,125,125,.16);padding:4px 8px;border-radius:6px;color:inherit">' + esc(pw || "(unchanged)") + '</code>'
      + (pw ? '<button id="atr-pw-copy" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(16,185,129,.5);background:transparent;color:#059669;cursor:pointer;font-size:12px;font-weight:600">📋 Copy password</button>' : '')
      + (pw ? '<button id="atr-pw-copy2" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(16,185,129,.5);background:transparent;color:#059669;cursor:pointer;font-size:12px;font-weight:600">Copy email + password</button>' : '')
      + '</div><div style="margin-top:8px;opacity:.85">Send the login email + password to the customer so they can sign in.</div></div>'
    const b1 = el.querySelector("#atr-pw-copy"); if (b1) b1.addEventListener("click", () => { navigator.clipboard?.writeText(pw).then(() => { b1.textContent = "✅ Copied" }).catch(() => {}) })
    const b2 = el.querySelector("#atr-pw-copy2"); if (b2) b2.addEventListener("click", () => { navigator.clipboard?.writeText("Email: " + email + "\nPassword: " + pw).then(() => { b2.textContent = "✅ Copied" }).catch(() => {}) })
  }
  function build(cusId: string) {
    const card = document.createElement("div")
    card.id = "atr-cust-actions"
    card.className = "shadow-elevation-card-rest bg-ui-bg-base w-full rounded-lg"
    card.style.cssText = "margin:0 0 16px 0;overflow:hidden;border:1px solid rgba(125,125,125,.18)"
    card.innerHTML = '<div style="padding:16px 20px;border-bottom:1px solid rgba(125,125,125,.18);font-weight:600;font-size:15px">⚙️ Account actions</div>'
      + '<div style="padding:16px 20px"><div style="display:flex;gap:10px;flex-wrap:wrap">'
      + '<button id="atr-act-reset" style="' + BTN + '">🔑 Reset password</button>'
      + '<button id="atr-act-vendor" style="' + BTN + '">🏢 Make vendor</button>'
      + '<button id="atr-act-admin" style="' + BTN + ';display:none">👑 Make admin</button>'
      + '<button id="atr-act-unadmin" style="' + BTN + ';color:#dc2626;display:none">Remove admin</button>'
      + '<button id="atr-act-delete" style="' + BTN + ';color:#dc2626;border-color:rgba(220,38,38,.4)">🗑️ Delete client</button>'
      + '</div><div id="atr-act-result"></div></div>'
    const r = () => card.querySelector("#atr-act-result")
    setTimeout(() => {
      card.querySelector("#atr-act-reset")?.addEventListener("click", () => {
        if (!confirm("Generate a login password for this customer? This creates their login if they don't have one yet.")) return
        show(r(), "Working…"); post(cusId + "/reset-password", {}).then(d => d.success ? showPw(r(), d.created ? "✅ Login created!" : "✅ Password reset!", d.new_password || "", d.login_email || "") : show(r(), "❌ " + esc(d.message || "Failed"), false))
      })
      card.querySelector("#atr-act-vendor")?.addEventListener("click", () => {
        if (!confirm("Make this customer a vendor (rental company)? They sign in to the vendor portal with the same email/password.")) return
        show(r(), "Working…"); post(cusId + "/make-vendor", {}).then(d => { if (!d.success) return show(r(), "❌ " + esc(d.message || "Failed"), false); if (d.new_password) return showPw(r(), "✅ Vendor created + login made!", d.new_password, d.login_email || ""); show(r(), "✅ " + esc(d.message || "Now a vendor") + (d.handle ? "<br>Handle: " + esc(d.handle) : "")) })
      })
      card.querySelector("#atr-act-admin")?.addEventListener("click", () => {
        if (!confirm("Grant this customer admin access? They sign in to admin.autotorental.com with the same email/password. (Does not affect the root owner.)")) return
        show(r(), "Working…"); post(cusId + "/make-admin", {}).then(d => d.success ? show(r(), "✅ " + esc(d.message || "Now an admin") + " (" + esc(d.role || "") + ")") : show(r(), "❌ " + esc(d.message || "Failed"), false))
      })
      card.querySelector("#atr-act-unadmin")?.addEventListener("click", () => {
        if (!confirm("Remove admin access from this customer?")) return
        show(r(), "Working…"); post(cusId + "/make-admin", { remove: true }).then(d => d.success ? show(r(), "✅ Admin access removed") : show(r(), "❌ " + esc(d.message || "Failed"), false))
      })
      // Show only the relevant admin button based on the customer's real status.
      fetch(`${API}/admin/customers/${cusId}/make-admin`, { credentials: "include" }).then(r2 => r2.json()).then(d => {
        const a: any = card.querySelector("#atr-act-admin"); const u: any = card.querySelector("#atr-act-unadmin")
        if (d && d.is_admin) { if (u) u.style.display = "inline-flex" } else { if (a) a.style.display = "inline-flex" }
      }).catch(() => { const a: any = card.querySelector("#atr-act-admin"); if (a) a.style.display = "inline-flex" })
      // Delete client — removes all their data; email becomes free to register again.
      card.querySelector("#atr-act-delete")?.addEventListener("click", () => {
        if (!confirm("Delete this client and ALL their data? This cannot be undone. They can register again as a brand-new client.")) return
        show(r(), "Deleting…"); post(cusId + "/delete-client", {}).then(d => { if (d.success) { show(r(), "✅ " + esc(d.message || "Deleted")); setTimeout(() => { location.href = "/dashboard/customers" }, 1600) } else { show(r(), "❌ " + esc(d.message || "Failed"), false) } })
      })
    }, 0)
    return card
  }
  function enhance() {
    const m = location.pathname.match(/\/customers\/(cus_[A-Za-z0-9]+)/)
    if (!m) return
    if (document.getElementById("atr-cust-actions")) return
    const cusId = m[1]
    const card = build(cusId)
    const contacts = document.getElementById("atr-cust-contacts")
    if (contacts && contacts.parentElement) contacts.parentElement.insertBefore(card, contacts)
    else { const main=(document.querySelector("main")||document.body) as any; const f=main.querySelector("[class*=rounded-lg]"); if (f&&f.parentElement) f.parentElement.insertBefore(card, f.nextSibling); else main.appendChild(card) }
  }
  const run = () => { clearTimeout(timer); timer=setTimeout(()=>{ try{ enhance() }catch(e){} }, 300) }
  const start = () => { try{ new MutationObserver(run).observe(document.body,{childList:true,subtree:true}); run() }catch(e){} }
  if (document.body) start(); else window.addEventListener("DOMContentLoaded", start)
})()



// ── Company detail page: inline Subscription card (view + edit, no separate page).
;(function companySubscriptionEnhancer() {
  const SBTN = "display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;border:1px solid rgba(125,125,125,.3);background:transparent;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit"
  const fmt = (d: any) => { try { return d ? new Date(d).toLocaleDateString() : "—" } catch { return "—" } }
  let timer: any = null
  function build(sellerId: string) {
    const card = document.createElement("div")
    card.id = "atr-sub-card"
    card.className = "shadow-elevation-card-rest bg-ui-bg-base w-full rounded-lg"
    card.style.cssText = "margin:0 0 16px 0;overflow:hidden;border:1px solid rgba(125,125,125,.18)"
    card.innerHTML = '<div style="padding:16px 20px;border-bottom:1px solid rgba(125,125,125,.18);font-weight:600;font-size:15px">💳 Subscription</div>'
      + '<div style="padding:16px 20px" id="atr-sub-body"><div style="opacity:.7">Loading…</div></div>'
    fetch(`${API}/admin/subscriptions/${sellerId}`, { credentials: "include" }).then((r) => r.json()).then((d: any) => {
      const body: any = card.querySelector("#atr-sub-body")
      if (!d || d.message) { body.innerHTML = '<div style="opacity:.7">No subscription data for this company.</div>'; return }
      const ends = fmt(d.subscription_ends_at || d.trial_ends_at)
      body.innerHTML =
        '<div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:14px;font-size:14px">'
        + '<div>Status: <b>' + esc(d.subscription_status || "trial") + '</b></div>'
        + '<div>Plan: <b>' + esc(d.subscription_plan || "—") + '</b></div>'
        + '<div>Ends: <b>' + ends + '</b></div></div>'
        + '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">'
        + '<select id="atr-sub-status" style="padding:7px 10px;border-radius:8px;background:transparent;border:1px solid rgba(125,125,125,.3);font-family:inherit"><option value="">Status…</option><option value="active">active</option><option value="trial">trial</option><option value="expired">expired</option></select>'
        + '<select id="atr-sub-plan" style="padding:7px 10px;border-radius:8px;background:transparent;border:1px solid rgba(125,125,125,.3);font-family:inherit"><option value="">Plan…</option><option value="basic">basic</option><option value="plus">plus</option></select>'
        + '<button id="atr-sub-ext" style="' + SBTN + '">➕ Extend 30 days</button>'
        + '<button id="atr-sub-save" style="' + SBTN + ';color:#2563eb;border-color:rgba(37,99,235,.5)">💾 Save</button>'
        + '</div><div id="atr-sub-res" style="margin-top:10px"></div>'
      const resEl = () => card.querySelector("#atr-sub-res") as any
      const save = (extra: any) => {
        const status = (card.querySelector("#atr-sub-status") as any).value
        const plan = (card.querySelector("#atr-sub-plan") as any).value
        const payload: any = { ...extra }
        if (status) payload.subscription_status = status
        if (plan) payload.subscription_plan = plan
        resEl().innerHTML = '<span style="opacity:.7">Saving…</span>'
        fetch(`${API}/admin/subscriptions/${sellerId}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then((r) => r.json()).then(() => { resEl().innerHTML = '<span style="color:#059669">✅ Saved</span>'; setTimeout(() => location.reload(), 900) })
          .catch(() => { resEl().innerHTML = '<span style="color:#dc2626">❌ Failed</span>' })
      }
      ;(card.querySelector("#atr-sub-save") as any)?.addEventListener("click", () => save({}))
      ;(card.querySelector("#atr-sub-ext") as any)?.addEventListener("click", () => save({ extend_days: 30 }))
    }).catch(() => {})
    return card
  }
  function enhance() {
    const m = location.pathname.match(/\/rental-companies\/([^/?#]+)/)
    if (!m) return
    if (document.getElementById("atr-sub-card")) return
    const card = build(m[1])
    const main: any = document.querySelector("main") || document.body
    const f = main.querySelector("[class*=rounded-lg]")
    if (f && f.parentElement) f.parentElement.insertBefore(card, f.nextSibling)
    else main.appendChild(card)
  }
  const run = () => { clearTimeout(timer); timer = setTimeout(() => { try { enhance() } catch (e) {} }, 350) }
  const start = () => { try { new MutationObserver(run).observe(document.body, { childList: true, subtree: true }); run() } catch (e) {} }
  if (document.body) start(); else window.addEventListener("DOMContentLoaded", start)
})()


// ── Move "Mail Server" out of the top-level sidebar and surface it inside Settings.
;(function mailServerIntoSettings() {
  function hideTopNav() {
    document.querySelectorAll('[data-testid^="sidebar-nav-item-"]').forEach((item: any) => {
      if (/mail\s*server/i.test(item.textContent || "")) item.style.display = "none"
    })
  }
  function injectIntoSettings() {
    if (!/\/dashboard\/settings(\/|$)/.test(location.pathname)) return
    if (document.getElementById("atr-mail-settings")) return
    const main: any = document.querySelector("main") || document.body
    const card: any = document.createElement("a")
    card.id = "atr-mail-settings"
    card.setAttribute("data-atr-mailcard", "1")
    card.href = "/dashboard/mail-server"
    card.className = "shadow-elevation-card-rest bg-ui-bg-base w-full rounded-lg"
    card.style.cssText = "display:flex;align-items:center;gap:14px;margin:16px 0;padding:16px 20px;border:1px solid rgba(125,125,125,.18);text-decoration:none;color:inherit;cursor:pointer"
    card.innerHTML = '<div style="width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:rgba(37,99,235,.14);font-size:20px">📧</div>'
      + '<div style="flex:1"><div style="font-weight:600;font-size:15px">Mail Server</div>'
      + '<div style="opacity:.7;font-size:13px">Configure the company-email mail server</div></div>'
      + '<div style="opacity:.5;font-size:18px">›</div>'
    card.addEventListener("click", (e: any) => { e.preventDefault(); location.href = "/dashboard/mail-server" })
    main.appendChild(card)
  }
  const run = () => { try { hideTopNav(); injectIntoSettings() } catch (e) {} }
  try { new MutationObserver(run).observe(document.body, { childList: true, subtree: true }) } catch (e) {}
  run()
})()
