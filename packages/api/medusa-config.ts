import { loadEnv, defineConfig } from "@medusajs/framework/utils"
import { DashboardModuleOptions } from "@mercurjs/types"
import path from "path"
loadEnv(process.env.NODE_ENV || "development", process.cwd())

const isProd = process.env.NODE_ENV === "production"
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "supersecret")) {
  throw new Error("JWT_SECRET must be set to a strong value in production")
}
if (isProd && (!process.env.COOKIE_SECRET || process.env.COOKIE_SECRET === "supersecret")) {
  throw new Error("COOKIE_SECRET must be set to a strong value in production")
}

module.exports = defineConfig({
  admin: {
    disable: true
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    sessionOptions: {
      name: "connect.sid",
      resave: false,
      rolling: false,
      saveUninitialized: false,
      ttl: 10 * 60 * 60 * 1000,
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      // @ts-expect-error: vendorCors is not defined in medusa config module
      vendorCors: process.env.VENDOR_CORS!,
      jwtSecret: process.env.JWT_SECRET!,
      cookieSecret: process.env.COOKIE_SECRET!,
    },
    cookieOptions: {
      sameSite: "lax" as const,
      secure: true,
      httpOnly: true,
      domain: ".autotorental.com",
    },
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
              from:
                process.env.ZOHO_FROM ||
                "Auto to Rental <info@autotorental.com>",
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
    {
      resolve: "./src/modules/social",
    },
    ...((process.env.STRIPE_API_KEY || process.env.PAYPAL_CLIENT_ID || process.env.BTCPAY_URL) ? [{
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          ...(process.env.STRIPE_API_KEY ? [{
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
              webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
              automatic_payment_methods: true,
              capture: true,
            },
          }] : []),
          // PayPal (Alphabite plugin) — only loads when PayPal keys are set, so
          // the backend boots cleanly without it. Keys come from .env, editable
          // via the dashboard Payments → PayPal settings.
          ...(process.env.PAYPAL_CLIENT_ID ? [{
            resolve: "@alphabite/medusa-paypal/providers/paypal",
            id: "paypal",
            options: {
              clientId: process.env.PAYPAL_CLIENT_ID,
              clientSecret: process.env.PAYPAL_CLIENT_SECRET,
              isSandbox: process.env.PAYPAL_IS_SANDBOX === "true",
              webhookId: process.env.PAYPAL_WEBHOOK_ID,
              includeShippingData: false,
              includeCustomerData: false,
            },
          }] : []),
          // BTCPay (Bitcoin) — only loads when a BTCPay server URL is set. Keys
          // come from .env, editable via the dashboard Payments → BTCPay settings.
          ...(process.env.BTCPAY_URL ? [{
            resolve: "medusa-plugin-btcpay/providers/payment-btcpay/src",
            id: "btcpay",
            // NOTE: this plugin validates these EXACT keys at boot (the README's
            // url/storeId/webhookSecret names are wrong). storefront_url +
            // refundVariant + refund_charges_percentage are defaulted so boot
            // only needs BTCPAY_URL + BTCPAY_API_KEY + BTCPAY_WEBHOOK_SECRET.
            options: {
              basePath: process.env.BTCPAY_URL,
              apiKey: process.env.BTCPAY_API_KEY,
              default_store_id: process.env.BTCPAY_STORE_ID,
              webhook_secret: process.env.BTCPAY_WEBHOOK_SECRET,
              storefront_url: process.env.STOREFRONT_URL || "https://autotorental.com",
              refundVariant: process.env.BTCPAY_REFUND_VARIANT || "manual",
              refund_charges_percentage: process.env.BTCPAY_REFUND_PCT || "0",
              crypto_currency: process.env.BTCPAY_CURRENCY || "BTC",
            },
          }] : []),
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
  plugins: [
    {
      resolve: "@mercurjs/core",
      options: {}
    },
    // PayPal plugin (admin UI + store client-token route). Gated on env so it
    // only loads once PayPal keys are configured.
    ...(process.env.PAYPAL_CLIENT_ID ? [{
      resolve: "@alphabite/medusa-paypal",
      options: {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        isSandbox: process.env.PAYPAL_IS_SANDBOX === "true",
        webhookId: process.env.PAYPAL_WEBHOOK_ID,
        includeShippingData: false,
        includeCustomerData: false,
      },
    }] : []),
    // BTCPay (Bitcoin) plugin — admin UI; gated on a configured BTCPay server URL.
    ...(process.env.BTCPAY_URL ? [{
      resolve: "medusa-plugin-btcpay",
      options: {
        basePath: process.env.BTCPAY_URL,
        apiKey: process.env.BTCPAY_API_KEY,
        default_store_id: process.env.BTCPAY_STORE_ID,
        webhook_secret: process.env.BTCPAY_WEBHOOK_SECRET,
        storefront_url: process.env.STOREFRONT_URL || "https://autotorental.com",
        refundVariant: process.env.BTCPAY_REFUND_VARIANT || "manual",
        refund_charges_percentage: process.env.BTCPAY_REFUND_PCT || "0",
        crypto_currency: process.env.BTCPAY_CURRENCY || "BTC",
      },
    }] : []),
  ]
})
