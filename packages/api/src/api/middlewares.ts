import { defineMiddlewares, authenticate } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import multer from "multer"

// In-memory multipart parser so the native Mercur store-profile editor (which
// POSTs logo/banner as multipart/form-data to /vendor/uploads) populates
// req.files. Without this the upload returned no files and the form crashed
// with "Cannot read properties of null (reading 'files')".
const vendorUpload = multer({ storage: multer.memoryStorage() })
// Wrap multer so an interrupted/truncated upload (client disconnects mid-stream —
// busboy throws "Unexpected end of form") returns a clean 400 instead of an
// unhandled 500 that floods Sentry. This is a client/network condition, not a bug.
const vendorUploadArray = vendorUpload.array("files")
const safeVendorUpload = (req: any, res: any, next: any) => {
  vendorUploadArray(req, res, (err: any) => {
    if (err) {
      const msg = String(err?.message || "")
      const benign = /Unexpected end of form|aborted|ECONNRESET|request aborted|Unexpected end of multipart|Multipart: Boundary not found/i.test(msg)
      return res.status(400).json({ message: benign ? "Upload was interrupted — please try again." : ("Upload failed: " + msg) })
    }
    next()
  })
}
import { adminReviewsMiddlewares } from "./admin/reviews/middlewares"
import { storeReviewMiddlewares } from "./store/reviews/middlewares"
import { vendorReviewsMiddlewares } from "./vendor/reviews/middlewares"
import { getAdminActor } from "../lib/supervisor"

// Resolve seller_id from member_id and inject into auth_context.app_metadata so
// that all /vendor routes (which read app_metadata.seller_id) work. Mercur vendor
// JWTs only carry member_id, not seller_id.
const injectSellerId = async (req: any, _res: any, next: any) => {
  try {
    const auth = req.auth_context
    if (auth && !auth.app_metadata?.seller_id) {
      const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      let sellerId: string | null = null
      const memberId =
        auth.app_metadata?.member_id ||
        (auth.actor_type === "member" ? auth.actor_id : null)
      if (memberId) {
        const row = await pg("seller_member")
          .where({ member_id: memberId })
          .whereNull("deleted_at")
          .select("seller_id")
          .first()
        sellerId = row?.seller_id || null
      }
      // Fallback: a customer-scoped token (e.g. the mobile app) whose unified auth
      // identity ALSO owns a seller. Resolve seller_id from the shared identity.
      if (!sellerId) {
        const customerId =
          auth.app_metadata?.customer_id ||
          (auth.actor_type === "customer" ? auth.actor_id : null)
        if (customerId) {
          const row = await pg("auth_identity")
            .whereRaw("app_metadata->>'customer_id' = ?", [customerId])
            .whereRaw("app_metadata->>'seller_id' is not null")
            .select(pg.raw("app_metadata->>'seller_id' as seller_id"))
            .first()
          sellerId = row?.seller_id || null
        }
      }
      if (sellerId) {
        auth.app_metadata = { ...(auth.app_metadata || {}), seller_id: sellerId }
      }
    }
  } catch {
    /* best-effort */
  }
  next()
}

// ---- AI Control Center gate: block any AI endpoint whose toggle is OFF ----
const AI_GATE_MAP: Array<[RegExp, string]> = [
  [/^\/admin\/ai\/(chat|agent)/, "assistant"],
  [/^\/admin\/ai\/(generate-description|suggest-features)/, "descriptions"],
  [/^\/admin\/ai\/optimize-seo/, "seo"],
  [/^\/admin\/ai\/optimize-image/, "images"],
  [/^\/admin\/ai\/generate-video-ad/, "video"],
  [/^\/admin\/ai\/sentry-autofix/, "sentry"],
  [/^\/admin\/ai\/auto-fix/, "autofix"],
  [/^\/admin\/blog\/generate/, "blog"],
  [/^\/admin\/legal-pages\/generate/, "legal"],
  [/^\/admin\/pagespeed\/autofix/, "pagespeed"],
  [/^\/store\/assistant/, "public_chat"],
]
const aiGate = async (req: any, res: any, next: any) => {
  try {
    const p = String(req.originalUrl || req.url || req.path || "").split("?")[0]
    const hit = AI_GATE_MAP.find(([re]) => re.test(p))
    if (hit) {
      const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      const rows = await pg("app_setting").whereIn("key", ["ai_master", "ai_feat_" + hit[1]])
      const m: Record<string, string> = {}
      for (const r of rows) m[r.key] = r.value
      if (m["ai_master"] === "0" || m["ai_feat_" + hit[1]] === "0") {
        return res.status(403).json({ error: "ai_disabled", message: "This AI feature is turned off in the AI Control Center." })
      }
    }
  } catch { /* fail-open */ }
  next()
}

// ---- HARD SECURITY: a supervisor may only WRITE to their permitted vendor actions.
// Every other admin mutation (settings, users, products, deletes, other vendors via
// standard endpoints, creating supervisors, etc.) is rejected at the API layer.
// The owner (a full admin, not a supervisor) is never restricted.
const SUPERVISOR_WRITE_ALLOW: RegExp[] = [
  /^\/admin\/sellers\/[^/]+\/set-flags\/?$/,
  /^\/admin\/sellers\/[^/]+\/reset-password\/?$/,
]
// Sensitive reads a supervisor must NOT enumerate (other admins, API keys, invites).
const SUPERVISOR_READ_DENY: RegExp[] = [
  /^\/admin\/users(\/|$)/,
  /^\/admin\/api-keys(\/|$)/,
  /^\/admin\/invites(\/|$)/,
]
// Guards EVERY method (closes HTTP method-override tricks): reads pass except the
// sensitive denylist; writes are rejected unless they hit the explicit allowlist
// (and those routes still enforce country + permission themselves).
const supervisorWriteGuard = async (req: any, res: any, next: any) => {
  try {
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const actor = await getAdminActor(req, pg)
    if (!actor.isSupervisor) return next() // owner / full admin — unrestricted
    const path = String(req.originalUrl || req.url || req.path || "").split("?")[0]
    const method = String(req.method || "GET").toUpperCase()
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      if (path === "/admin/users/me" || path.startsWith("/admin/users/me")) return next()
      if (SUPERVISOR_READ_DENY.some((re) => re.test(path))) {
        return res.status(403).json({ message: "Not permitted for supervisors." })
      }
      return next() // other reads are allowed (the dashboard needs them; the UI hides pages)
    }
    if (SUPERVISOR_WRITE_ALLOW.some((re) => re.test(path))) return next()
    return res.status(403).json({ message: "Not permitted. Supervisors can only manage vendors in their assigned country." })
  } catch {
    return next() // never lock out the owner on an unexpected error
  }
}

export default defineMiddlewares({
  routes: [
    { matcher: "/admin/*", middlewares: [supervisorWriteGuard] },
    { matcher: "/admin/ai/*", middlewares: [aiGate] },
    { matcher: "/admin/blog/*", middlewares: [aiGate] },
    { matcher: "/admin/legal-pages/*", middlewares: [aiGate] },
    { matcher: "/admin/pagespeed/*", middlewares: [aiGate] },
    { matcher: "/store/assistant", middlewares: [aiGate] },
    { matcher: "/store/rec", method: "POST", bodyParser: { sizeLimit: "25mb" } },
    { matcher: "/admin/call-audio", method: "POST", bodyParser: { sizeLimit: "16mb" } },
    {
      matcher: "/vendor/*",
      middlewares: [injectSellerId],
    },
    // Parse multipart/form-data uploads (logo/banner from the native store editor),
    // and allow large base64 JSON bodies (images inflate ~33% as base64).
    {
      matcher: "/vendor/uploads",
      method: ["POST"],
      bodyParser: { sizeLimit: "70mb" },
      middlewares: [safeVendorUpload],
    },
    // Lock callback-call endpoints to the authenticated client (prevents IDOR
    // where a client_id query/body param could read or answer another user's calls).
    {
      matcher: "/store/calls/incoming",
      method: ["GET"],
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      matcher: "/store/calls/*/answer",
      method: ["POST"],
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    // Push-token registration: verify the bearer if present so we can trust the
    // owner identity, but allow unauthenticated (guest) calls through too.
    {
      matcher: "/api/auth/push-token",
      method: ["POST"],
      middlewares: [
        authenticate(["customer", "member"], ["bearer", "session"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    // Verify the customer bearer/session if present so follow/unfollow can be
    // bound to the real account email; guests (device_id) still pass through.
    {
      matcher: "/store/sellers/*/follow",
      method: ["POST", "DELETE", "GET"],
      middlewares: [
        authenticate("customer", ["bearer", "session"], {
          allowUnauthenticated: true,
        }),
      ],
    },
    // 16 MB JSON body for the public seller-signup file upload
    {
      matcher: "/store/seller-signup-upload",
      method: ["POST"],
      bodyParser: { sizeLimit: "16mb" },
    },
    {
      matcher: "/signup/upload",
      method: ["POST"],
      bodyParser: { sizeLimit: "16mb" },
    },
    {
      matcher: "/vendor/vehicles/media",
      method: ["POST"],
      bodyParser: { sizeLimit: "70mb" },
    },
    {
      matcher: "/admin/vehicles/media",
      method: ["POST"],
      bodyParser: { sizeLimit: "70mb" },
    },
    {
      matcher: "/admin/splash-upload",
      method: ["POST"],
      bodyParser: { sizeLimit: "70mb" },
    },
    {
      // Stripe needs the raw request body to verify the webhook signature.
      matcher: "/webhooks/stripe",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
    {
      // Mollie posts `id=tr_xxx` as form-urlencoded; keep the raw body so we can
      // read the id even though the default JSON parser leaves req.body empty.
      matcher: "/webhooks/mollie",
      method: ["POST"],
      bodyParser: { preserveRawBody: true },
    },
    // rrweb session-replay ingest: the FIRST batch carries the full-page DOM
    // snapshot (type 2) which can be several MB. Default body limit rejected it,
    // so recordings had no FullSnapshot and could not replay. 16 MB fixes that.
    {
      matcher: "/store/analytics/rrweb",
      method: ["POST"],
      bodyParser: { sizeLimit: "16mb" },
    },
    ...adminReviewsMiddlewares,
    ...storeReviewMiddlewares,
    ...vendorReviewsMiddlewares,
  ],
})
