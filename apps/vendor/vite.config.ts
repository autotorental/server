import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { mercurDashboardPlugin } from "@mercurjs/dashboard-sdk"

const FORCE_BASE = "/rental"

export default defineConfig({
  base: FORCE_BASE + "/",
  plugins: [
    react(),
    mercurDashboardPlugin({
      medusaConfigPath: "../../packages/api/medusa-config.ts",
      backendUrl: "https://api.autotorental.com",
      base: FORCE_BASE,
    } as any),
    // Force __BASE__ override AFTER Mercur plugin (which sets it to "/" because medusa-config modules is an array)
    {
      name: "force-base-override",
      enforce: "post",
      config(_, env) {
        return {
          define: {
            __BASE__: JSON.stringify(FORCE_BASE),
          },
        }
      },
    },
  ],
})
