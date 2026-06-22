import "./globals.css"
import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { headers } from "next/headers"
import Nav from "@/components/nav"
import Footer from "@/components/footer"
import InstallPrompt from "@/components/install-prompt"
import ChunkRecovery from "@/components/chunk-recovery"
import Tracking from "@/components/tracking"
import LiveChat from "@/components/live-chat"
import TawkWidget from "@/components/TawkWidget"
import UtmTracker from "@/components/utm-tracker"
import { OrganizationJsonLd, WebsiteJsonLd, CustomSchemaJsonLd } from "@/components/jsonld"
import ConsentBanner from "@/components/consent-banner"
import WebPush from "@/components/web-push"
import { getPathInfo } from "@/lib/locale-server"
import { LOCALE_INFO, localizedPath, DEFAULT_LOCALE } from "@/lib/locales"
import { hreflangFor, SITE } from "@/lib/seo"
import { t } from "@/lib/i18n"

const sans = Inter({ subsets: ["latin"], weight: ["300","400","500","600","700","800","900"], variable: "--font-sans" })

// Root metadata is locale-aware: canonical/hreflang/og:locale reflect the active
// language. Pages that export their own generateMetadata (via seoFor) override this.
export async function generateMetadata(): Promise<Metadata> {
  const { locale, rest } = await getPathInfo()
  const info = LOCALE_INFO[locale]
  const canonical = `${SITE.url}${localizedPath(rest, locale)}`
  const { canonicalLocaleUrls, xDefault } = hreflangFor(rest)
  return {
    title: { default: t(locale, "site_title"), template: `%s | Auto to Rental` },
    description: t(locale, "site_description"),
    metadataBase: new URL(SITE.url),
    icons: {
      icon: [{ url: "/favicon.ico" }, { url: "/favicon.png", type: "image/png", sizes: "32x32" }],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Auto to Rental" },
    applicationName: "Auto to Rental",
    keywords: ["car rental UAE","rent a car Dubai","car hire Dubai","monthly car rental Dubai","luxury car rental Dubai","car rental Abu Dhabi","car rental Syria","rent car Damascus"],
    authors: [{ name: "Auto to Rental", url: SITE.url }],
    category: "transportation",
    alternates: { canonical, languages: { ...canonicalLocaleUrls, "x-default": xDefault } },
    openGraph: { title: t(locale, "site_title"), description: t(locale, "site_og_description"), url: canonical, siteName: "Auto to Rental", type: "website", locale: info.ogLocale },
    twitter: { card: "summary_large_image", title: "Auto to Rental", description: t(locale, "site_og_description") },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION, other: { "msvalidate.01": "BE02E3B32257508B46515E7C7147B40F" } },
  }
}

export const viewport: Viewport = {
  themeColor: "#1753b0",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const pathname = hdrs.get("x-pathname") || "/"
  const { locale } = await getPathInfo()
  const info = LOCALE_INFO[locale] || LOCALE_INFO[DEFAULT_LOCALE]
  return (
    <html lang={info.hreflang} dir={info.dir} className={sans.variable} suppressHydrationWarning>
      <head>
        {/* Google tag (gtag.js) — static in <head> so Google detects it and it runs for
            every visitor. send_page_view is false; page_view events (incl. client-side
            route changes) are sent by the Tracking component. */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-7JX4MY0Z2T"></script>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-7JX4MY0Z2T',{anonymize_ip:true,send_page_view:false});",
          }}
        />
        <script id="atr-rec" dangerouslySetInnerHTML={{ __html: "(function(){try{if(window.__atrRec)return;window.__atrRec=1;if(navigator.doNotTrack==='1'||navigator.webdriver)return;var sid=sessionStorage.getItem('atr_sid');if(!sid){sid='rec_'+Date.now().toString(36)+Math.random().toString(36).slice(2,9);sessionStorage.setItem('atr_sid',sid);}var API='https://api.autotorental.com',PK='pk_b9c89660573c5c7d3f54d11eb3132be59d6d919d4bb40c98b14877a2048feea1';function start(){if(!(window.rrweb&&window.rrweb.record))return;var buf=[];window.rrweb.record({emit:function(e){buf.push(e);},maskAllInputs:true,sampling:{mousemove:80,scroll:200,input:'last'}});function send(b,ka){return fetch(API+'/store/rec',{method:'POST',keepalive:ka,headers:{'content-type':'application/json','x-publishable-api-key':PK},body:JSON.stringify({session_id:sid,events:b,path:location.pathname})});}function flush(ka){if(!buf.length)return;var b=buf.splice(0,buf.length);if(ka){try{send(b,true).catch(function(){});}catch(e){}return;}try{send(b,false).then(function(r){if(!r||!r.ok)buf.unshift.apply(buf,b);}).catch(function(){buf.unshift.apply(buf,b);});}catch(e){buf.unshift.apply(buf,b);}}setTimeout(function(){flush(false);},900);setInterval(function(){flush(false);},5000);window.addEventListener('pagehide',function(){flush(true);});document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')flush(true);});}var s=document.createElement('script');s.src='/rrweb.min.js';s.onload=start;s.onerror=function(){};document.head.appendChild(s);}catch(e){}})()" }} />
      </head>
      <body className="font-sans bg-white dark:bg-ink-950 text-ink-900 dark:text-ink-100 antialiased transition-colors"><ChunkRecovery/><link rel="preconnect" href="https://api.autotorental.com" crossOrigin="" /><link rel="dns-prefetch" href="https://api.autotorental.com" /><link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" /><link rel="dns-prefetch" href="https://images.unsplash.com" /><script id="theme-init-script" dangerouslySetInnerHTML={{ __html: "(function(){try{var m=localStorage.getItem(\"theme\")||(window.matchMedia(\"(prefers-color-scheme: dark)\").matches?\"dark\":\"light\");if(m===\"dark\")document.documentElement.classList.add(\"dark\")}catch(e){}})()" }}/>
        <Nav locale={locale} />
        <main className="min-h-screen">{children}</main>
        <Footer locale={locale} />
        <OrganizationJsonLd/>
        <WebsiteJsonLd/>
        <Suspense fallback={null}><CustomSchemaJsonLd path={pathname}/></Suspense>
        <UtmTracker/>
        <Suspense fallback={null}><Tracking/></Suspense>
        <ConsentBanner/>
        <WebPush/>
        <InstallPrompt/>
        {process.env.NEXT_PUBLIC_TAWK_ID ? <TawkWidget/> : <LiveChat/>}
      </body>
    </html>
  )
}
