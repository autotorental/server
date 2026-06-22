const { withSentryConfig } = require("@sentry/nextjs")

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Allows zero-downtime deploys: build into a separate dir via NEXT_DIST,
  // then atomically swap. Defaults to ".next" for normal `next start`.
  distDir: process.env.NEXT_DIST || ".next",
  reactStrictMode: true,
  compiler: { 
    removeConsole: { exclude: ["error"] }
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // ✅ تحسينات الصور - WebP + Lazy Loading
  images: {
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/webp", "image/avif"], // إضافة AVIF للجودة العالية
    minimumCacheTTL: 2592000,
  },
  
  // ✅ تحسينات JavaScript - Code Splitting + Tree Shaking
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@sentry/nextjs",
      "react-dom"
    ],
    webpackBuildWorker: true, // بناء متعدد الخيوط - أسرع
  },

  // ✅ ضغط أفضل للـ JS
  compress: true,
  

  // ✅ تقسيم الـ Chunks بشكل أذكى
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // مكتبات React في chunk منفصل
            framework: {
              name: 'framework',
              chunks: 'all',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40,
              enforce: true,
            },
            // Sentry في chunk منفصل (يُحمّل فقط عند الحاجة)
            sentry: {
              name: 'sentry',
              test: /[\\/]node_modules[\\/](@sentry)[\\/]/,
              priority: 30,
              reuseExistingChunk: true,
            },
            // المكتبات الكبيرة الأخرى
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1]
                return `npm.${packageName?.replace('@', '')}`
              },
              priority: 20,
            },
            // كود التطبيق المشترك
            commons: {
              name: 'commons',
              minChunks: 2,
              priority: 10,
            },
          },
        },
      }
    }
    return config
  },

  async redirects() {
    return [
      // /car-rental breadcrumb levels have no page.tsx (would 404) → send to the real pages.
      { source: "/car-rental", destination: "/cars", permanent: true },
      { source: "/car-rental/:city", destination: "/cars/city/:city", permanent: true },
      { source: "/car-rental/:city/:brand", destination: "/cars/brand/:brand", permanent: true },
      // 'weekly' is not a valid combo intent (daily/monthly/luxury) → redirect, never 404.
      { source: "/car-rental/:city/:brand/weekly", destination: "/car-rental/:city/:brand/monthly", permanent: true },
    ]
  },

  async rewrites() {
    return [{
      source: "/api/store/:path*",
      destination: "https://api.autotorental.com/store/:path*"
    }]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: "auto-to-rerntal",
  project: "javascript-nextjs",
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
  
  // ✅ Tree-shaking لـ Sentry - إزالة Debug code من الإنتاج
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
