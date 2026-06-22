import { MedusaService } from "@medusajs/framework/utils"
import { Report } from "./models/report"
class ReportsModuleService extends MedusaService({ Report }) {}
export default ReportsModuleService
