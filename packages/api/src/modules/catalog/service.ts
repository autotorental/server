import { MedusaService } from "@medusajs/framework/utils"
import { Brand } from "./models/brand"
import { BodyType } from "./models/body-type"
import { Feature } from "./models/feature"
import { CarModel } from "./models/car-model"
import { Vehicle } from "./models/vehicle"

class CatalogModuleService extends MedusaService({ Brand, BodyType, Feature, CarModel, Vehicle }) {}
export default CatalogModuleService
