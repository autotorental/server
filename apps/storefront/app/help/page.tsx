import { seoFor } from "@/lib/seo-helper"
import { getLocale } from "@/lib/locale-server"
import { localizedPath } from "@/lib/locales"
import { helpContent } from "@/lib/static-i18n-2"
import HelpClient from "./help-client"

export const revalidate = 60

export async function generateMetadata() {
  const locale = await getLocale()
  const c = helpContent(locale)
  return seoFor("/help", {
    title: c.metaTitle,
    description: c.metaDesc,
  })
}

export default async function HelpPage() {
  const locale = await getLocale()
  const lp = (p: string) => localizedPath(p, locale)
  const c = helpContent(locale)
  return <HelpClient c={c} homeHref={lp("/")} contactHref={lp("/contact")} />
}
