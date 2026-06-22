import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { tt } from "../../lib/lang"
import { Buildings } from "@medusajs/icons"
import RentalCompaniesListPage from "../../components/rental-companies-list-page"

export const config: RouteConfig = { label: tt("Rental Companies", "شركات التأجير"), icon: Buildings, rank: 11 }

export default RentalCompaniesListPage
