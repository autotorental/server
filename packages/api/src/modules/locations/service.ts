import { MedusaService } from "@medusajs/framework/utils"
import { City } from "./models/city"

class LocationsModuleService extends MedusaService({ City }) {}
export default LocationsModuleService
