import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import customerReview from "../../../links/customer-review";
import { StoreReviewListResponse, StoreReviewResponse } from "../../../modules/reviews/types";
import { createReviewWorkflow } from "../../../workflows/review/workflows";
import { StoreCreateReviewType, StoreGetReviewsParamsType } from "./validators";

// Public review creation is DISABLED. This marketplace has no online checkout,
// so an open review endpoint is only a spam/bot vector. Reviews are managed by
// admins only (admin dashboard). Returns 403 to any public/customer attempt.
export const POST = async (
  _req: AuthenticatedMedusaRequest<StoreCreateReviewType>,
  res: MedusaResponse<StoreReviewResponse>
) => {
  res.status(403).json({ message: "Reviews can only be added by the Auto to Rental team." } as any);
};

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetReviewsParamsType>,
  res: MedusaResponse<StoreReviewListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: reviews, metadata } = await query.graph({
    entity: customerReview.entryPoint,
    fields: req.queryConfig.fields.map((field) => `review.${field}`),
    filters: {
      customer_id: req.auth_context.actor_id,
    },
    pagination: req.queryConfig.pagination,
  });

  res.json({
    reviews: reviews.map((relation) => relation.review),
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  });
};
