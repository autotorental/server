import { Module } from "@medusajs/framework/utils"
import LocationsModuleService from "./service"

export const LOCATIONS_MODULE = "locations"
export default Module(LOCATIONS_MODULE, { service: LocationsModuleService })
