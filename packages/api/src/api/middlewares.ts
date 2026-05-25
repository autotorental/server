import { defineMiddlewares } from "@medusajs/medusa"
import { adminReviewsMiddlewares } from "./admin/reviews/middlewares"
import { storeReviewMiddlewares } from "./store/reviews/middlewares"
import { vendorReviewsMiddlewares } from "./vendor/reviews/middlewares"

export default defineMiddlewares({
  routes: [
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
    // Reviews middlewares (query validation + filterableFields)
    ...adminReviewsMiddlewares,
    ...storeReviewMiddlewares,
    ...vendorReviewsMiddlewares,
  ],
})
