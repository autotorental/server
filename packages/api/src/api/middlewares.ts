import { defineMiddlewares, authenticate } from "@medusajs/medusa"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { adminReviewsMiddlewares } from "./admin/reviews/middlewares"
import { storeReviewMiddlewares } from "./store/reviews/middlewares"
import { vendorReviewsMiddlewares } from "./vendor/reviews/middlewares"

// Resolve seller_id from member_id and inject into auth_context.app_metadata so
// that all /vendor routes (which read app_metadata.seller_id) work. Mercur vendor
// JWTs only carry member_id, not seller_id.
const injectSellerId = async (req: any, _res: any, next: any) => {
  try {
    const auth = req.auth_context
    if (auth && !auth.app_metadata?.seller_id) {
      const memberId =
        auth.app_metadata?.member_id ||
        (auth.actor_type === "member" ? auth.actor_id : null)
      if (memberId) {
        const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
        const row = await pg("seller_member")
          .where({ member_id: memberId })
          .whereNull("deleted_at")
          .select("seller_id")
          .first()
        if (row?.seller_id) {
          auth.app_metadata = { ...(auth.app_metadata || {}), seller_id: row.seller_id }
        }
      }
    }
  } catch {
    /* best-effort */
  }
  next()
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/vendor/*",
      middlewares: [injectSellerId],
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
    ...adminReviewsMiddlewares,
    ...storeReviewMiddlewares,
    ...vendorReviewsMiddlewares,
  ],
})
