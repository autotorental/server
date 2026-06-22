import { Module } from "@medusajs/framework/utils"

import SocialModuleService from "./service"

export const SOCIAL_MODULE = "social"

export * from "./types"
export { SocialModuleService }

export default Module(SOCIAL_MODULE, {
  service: SocialModuleService,
})
