import { MedusaService } from "@medusajs/framework/utils"
import { SellerFollow } from "./models/follow"
class FollowsModuleService extends MedusaService({ SellerFollow }) {}
export default FollowsModuleService
