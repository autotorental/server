import { Navigate } from "react-router-dom"

/** Legacy URL — native Mercur store profile lives at /settings/store */
export default function CompanyRedirect() {
  return <Navigate to="/settings/store" replace />
}
