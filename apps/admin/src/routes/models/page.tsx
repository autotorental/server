import { useEffect } from "react"

// Models and Brands manage the same catalog (brands → models/series).
// The unified manager now lives on the Brands page, so this route just
// forwards there. No `config` export → it no longer appears in the sidebar.
const ModelsRedirect = () => {
  useEffect(() => {
    const target = window.location.pathname.replace(/\/models(\/.*)?$/, "/brands")
    window.location.replace(target || "/dashboard/brands")
  }, [])
  return null
}

export default ModelsRedirect
