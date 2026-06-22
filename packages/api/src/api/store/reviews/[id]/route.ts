import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

import { StoreReviewDeleteResponse, StoreReviewResponse } from '../../../../modules/reviews/types'
import {
  deleteReviewWorkflow,
  updateReviewWorkflow
} from '../../../../workflows/review/workflows'
import { validateCustomerReview } from '../helpers'
import { StoreGetReviewsParamsType, StoreUpdateReviewType } from '../validators'

// Public review editing is DISABLED (spam/bot prevention). Admins manage reviews.
export const POST = async (
  _req: AuthenticatedMedusaRequest<StoreUpdateReviewType>,
  res: MedusaResponse<StoreReviewResponse>
) => {
  res.status(403).json({ message: "Reviews can only be edited by the Auto to Rental team." } as any)
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<StoreReviewDeleteResponse>
) => {
  const { id } = req.params

  await validateCustomerReview(req.scope, req.auth_context.actor_id, id!)

  await deleteReviewWorkflow.run({
    container: req.scope,
    input: id
  })

  res.json({
    id: id!,
    object: 'review',
    deleted: true
  })
}

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetReviewsParamsType>,
  res: MedusaResponse<StoreReviewResponse>
) => {
  const { id } = req.params

  await validateCustomerReview(req.scope, req.auth_context.actor_id, id!)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [review]
  } = await query.graph({
    entity: 'review',
    fields: req.queryConfig.fields,
    filters: {
      id
    }
  })

  res.json({
    review
  })
}
