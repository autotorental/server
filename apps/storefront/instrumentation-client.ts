import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://f84e3542b3253a8fc47112c468a9ca3b@o4511530588372992.ingest.us.sentry.io/4511530681303040",
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  environment: process.env.NODE_ENV || "production",
  release: "autotorental@1.0.0",
  enabled: process.env.NODE_ENV === "production",
})

// Next.js navigation instrumentation (v8+)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
