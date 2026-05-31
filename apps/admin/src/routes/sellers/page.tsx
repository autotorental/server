import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Buildings } from "@medusajs/icons"
import RentalCompaniesListPage from "../../components/rental-companies-list-page"

export const config: RouteConfig = { label: "Rental Companies", icon: Buildings, rank: 3 }

export default RentalCompaniesListPage
