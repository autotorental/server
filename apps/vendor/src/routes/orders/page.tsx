import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

// Redirect-only stub for the legacy /orders route. No `config` export, so it
// does NOT appear in the sidebar.
const Page = () => {
  const navigate = useNavigate()
  useEffect(() => { navigate("/vehicles", { replace: true }) }, [navigate])
  return null
}
export default Page
