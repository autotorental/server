import { lazy } from 'react'

export const LazyVehicles = lazy(() => import('../routes/vehicles/page'))
export const LazyBrands = lazy(() => import('../routes/brands/page'))
export const LazyAnalytics = lazy(() => import('../routes/analytics/page'))
export const LazySearchConsole = lazy(() => import('../routes/search-console/page'))
export const LazyFirebaseAnalytics = lazy(() => import('../routes/firebase-analytics/page'))
export const LazyTrafficReports = lazy(() => import('../routes/traffic-reports/page'))

// Prefetch on hover
export const prefetchRoute = (component: any) => {
  import(/* @vite-ignore */ component).catch(() => {})
}
