import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "@mercurjs/vendor/index.css"
import "./vendor-overrides.css"
import App from "@mercurjs/vendor"

// Rebrand to "Auto to Rental" and rename "Products" → "Vehicles" everywhere.
const TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bProduct Variants?\b/g, "Vehicle Variants"],
  [/\bProducts\b/g, "Vehicles"], [/\bProduct\b/g, "Vehicle"],
  [/\bproducts\b/g, "vehicles"], [/\bproduct\b/g, "vehicle"],
  [/\bStores\b/g, "Rental Companies"], [/\bStore\b/g, "Rental Company"],
  [/\bstores\b/g, "rental companies"], [/\bstore\b/g, "rental company"],
  [/\bSellers\b/g, "Rental Companies"], [/\bSeller\b/g, "Rental Company"],
  [/\bsellers\b/g, "rental companies"], [/\bseller\b/g, "rental company"],
  [/\bVendors\b/g, "Rental Companies"], [/\bVendor\b/g, "Rental Company"],
  [/\bvendors\b/g, "rental companies"], [/\bvendor\b/g, "rental company"],
  [/Mercur Admin/g, "Auto to Rental"],
  [/Join Mercur!?/g, "Join Auto to Rental!"],
  [/Welcome to Medusa/g, "Welcome to Auto to Rental"],
  [/Welcome to Mercur/g, "Welcome to Auto to Rental"],
]

// Never rewrite text the user is editing (inputs, textareas, contenteditable)
// or non-display nodes (script/style) — only mutate static UI labels.
function isEditableContext(node: Node | null): boolean {
  let el = node instanceof Element ? node : node?.parentElement
  while (el) {
    const tag = el.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SCRIPT" || tag === "STYLE") return true
    if ((el as HTMLElement).isContentEditable) return true
    el = el.parentElement
  }
  return false
}

function replaceTextNodes(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      isEditableContext(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  })
  let n: Node | null
  while ((n = walker.nextNode())) {
    const t = n.nodeValue || ""
    if (!t.trim()) continue
    let next = t
    for (const [re, rep] of TEXT_REPLACEMENTS) next = next.replace(re, rep)
    if (next !== t) n.nodeValue = next
  }
}

/** Remove Mercur default onboarding card image — keep bg only */
function removeOnboardingHero() {
  document.querySelectorAll('img[src*="onboarding/0.png"]').forEach((el) => el.remove())
}

/** Routes hidden in this market (no transactions / no orders yet). */
const HIDDEN_ROUTES = ["payouts", "orders", "settings/store"]

/** Remove hidden routes' sidebar links + block direct navigation to them. */
function removeHiddenRoutes() {
  for (const route of HIDDEN_ROUTES) {
    document
      .querySelectorAll(
        `a[href$="/${route}"], a[href*="/${route}/"], a[href*="/${route}?"]`
      )
      .forEach((el) => {
        // Never hide the Settings layout "back" button: it is a Link to
        // /orders rendered inside this unique wrapper. Hiding /orders in the
        // main sidebar must not remove the settings back arrow.
        if (el.closest(".bg-ui-bg-subtle.p-3")) return
        const li = el.closest("li") || el
        ;(li as HTMLElement).style.display = "none"
      })
  }
}

function customize() {
  replaceTextNodes(document.body)
  removeOnboardingHero()
  removeHiddenRoutes()
}

new MutationObserver(customize).observe(document.body, { childList: true, subtree: true })
setInterval(customize, 800)
customize()

const fav = (document.querySelector("link[rel=icon]") as HTMLLinkElement) || document.createElement("link")
fav.setAttribute("rel", "icon")
fav.setAttribute("type", "image/svg+xml")
fav.setAttribute("href", "/rental/favicon.svg")
if (!fav.parentNode) document.head.appendChild(fav)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

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
})("/rental/", "Auto to Rental Vendor", "/rental/favicon.png")

