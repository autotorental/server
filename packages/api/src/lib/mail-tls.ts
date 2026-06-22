/** VPS Dovecot/Postfix cert is issued for webmail.autotorental.com */
export const DEFAULT_MAIL_TLS_SERVERNAME = "webmail.autotorental.com"

export async function resolveMailTlsServername(
  readSetting: (key: string) => Promise<string>
): Promise<string> {
  return (
    (await readSetting("mail_tls_servername")) ||
    process.env.MAIL_TLS_SERVERNAME ||
    DEFAULT_MAIL_TLS_SERVERNAME
  )
}

export function mailTlsOptions(servername: string, host?: string) {
  const h = (host || "").toLowerCase()
  if (h === "127.0.0.1" || h === "localhost" || h === "::1") {
    return { servername, rejectUnauthorized: true }
  }
  return { servername, rejectUnauthorized: true }
}
