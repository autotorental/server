import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { mercurDashboardPlugin } from "@mercurjs/dashboard-sdk"

const FORCE_BASE = "/dashboard"

export default defineConfig({
  base: FORCE_BASE + "/",
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
