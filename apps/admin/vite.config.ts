import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { mercurDashboardPlugin } from "@mercurjs/dashboard-sdk"

const FORCE_BASE = "/dashboard"

export default defineConfig({
  base: FORCE_BASE + "/",
  build: {
    chunkSizeWarningLimit: 1800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store)\//.test(id)) return "vendor-react"
          if (id.includes("@medusajs/icons")) return "vendor-icons"
          if (id.includes("@medusajs/ui") || id.includes("@radix-ui") || id.includes("react-aria") || id.includes("react-stately") || id.includes("tailwind-merge") || id.includes("class-variance-authority") || id.includes("clsx")) return "vendor-ui"
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory") || id.includes("internmap")) return "vendor-charts"
          if (id.includes("i18next") || id.includes("date-fns") || id.includes("@tanstack") || id.includes("zod") || id.includes("lodash")) return "vendor-libs"
          return undefined // keep Medusa lazy route-splitting intact
        },
      },
    },
  },
  plugins: [
    react(),
    mercurDashboardPlugin({
      medusaConfigPath: "../../packages/api/medusa-config.ts",
      backendUrl: "https://admin.autotorental.com",
      base: FORCE_BASE,
    } as any),
    {
      name: "force-base-override",
      enforce: "post",
      config() {
        return { define: { __BASE__: JSON.stringify(FORCE_BASE) } }
      },
    },
  ],
})
