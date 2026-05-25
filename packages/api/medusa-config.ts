import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { DashboardModuleOptions } from "@mercurjs/types"
import path from "path"
loadEnv(process.env.NODE_ENV || "development", process.cwd())

module.exports = defineConfig({
  admin: {
    disable: true
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      // @ts-expect-error: vendorCors is not defined in medusa config module
      vendorCors: process.env.VENDOR_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      sessionOptions: {
        name: "connect.sid",
        resave: false,
        rolling: false,
        saveUninitialized: false,
        cookie: {
          sameSite: "none" as const,
          secure: true,
          httpOnly: true,
          domain: ".autotorental.com",
        }
      },
    }
  },
  featureFlags: {
    rbac: true,
    seller_registration: true
  },
  modules: [
    {
      resolve: "@medusajs/medusa/rbac",
    },
    {
      resolve: "@mercurjs/core/modules/admin-ui",
      options: {
        appDir: path.join(__dirname, "../../apps/admin"),
        path: "/dashboard",
      } as DashboardModuleOptions
    },
    {
      resolve: "@mercurjs/core/modules/vendor-ui",
      options: {
        appDir: path.join(__dirname, "../../apps/vendor"),
        path: "/rental",
      } as DashboardModuleOptions
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM || "no-reply@autotorental.com",
            },
          },
          {
            resolve: "@medusajs/notification-local",
            id: "local",
            options: {
              channels: ["feed", "log"],
            },
          },
        ],
      },
    },
        {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: "/opt/autorental/uploads",
              backend_url: "https://api.autotorental.com/static",
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/analytics",
    },
    ...(process.env.STRIPE_API_KEY ? [{
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              automatic_payment_methods: true,
              capture: true,
            },
          },
        ],
      },
    }] : []),

    {
      resolve: "./src/modules/locations",
    },
    {
      resolve: "./src/modules/catalog",
    },
    {
      resolve: "./src/modules/reports",
    },
    {
      resolve: "./src/modules/reviews",
    },
    {
      resolve: "./src/modules/follows",
    },
  ],
  plugins: [{
    resolve: "@mercurjs/core",
    options: {}
  }]
})
