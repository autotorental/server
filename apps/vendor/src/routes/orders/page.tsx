import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"

export const config: RouteConfig = { label: "Orders" }

const Page = () => {
  const navigate = useNavigate()
  useEffect(() => { navigate("/", { replace: true }) }, [navigate])
  return null
}
export default Page
