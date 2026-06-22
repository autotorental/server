import { Navigate } from "react-router-dom"

/** /stores removed — single list lives at /sellers only */
export default function StoresRedirect() {
  return <Navigate to="/sellers" replace />
}
