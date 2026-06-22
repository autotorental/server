import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: "https://f84e3542b3253a8fc47112c468a9ca3b@o4511530588372992.ingest.us.sentry.io/4511530681303040",
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
})
