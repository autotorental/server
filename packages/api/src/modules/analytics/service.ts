import { MedusaService } from "@medusajs/framework/utils"
import { ContactEvent } from "./models/contact-event"

class AnalyticsModuleService extends MedusaService({
  ContactEvent,
}) {}

export default AnalyticsModuleService
