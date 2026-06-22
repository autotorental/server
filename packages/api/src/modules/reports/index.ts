import { Module } from "@medusajs/framework/utils"
import ReportsModuleService from "./service"
export const REPORTS_MODULE = "reports"
export default Module(REPORTS_MODULE, { service: ReportsModuleService })
