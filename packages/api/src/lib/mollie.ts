// Minimal Mollie REST helper. Works with BOTH normal API keys (test_/live_) and
// profile-restricted Organization access tokens (access_). Access tokens require
// an explicit `testmode` flag on every call — we add it automatically.
// Docs: https://docs.mollie.com/reference/v2/

const BASE = "https://api.mollie.com/v2"

export type MollieAmount = { currency: string; value: string }

// Mollie wants a fixed-2-decimal string ("25.00"), not cents.
export function mollieAmount(currency: string, value: number | string): MollieAmount {
  const n = typeof value === "string" ? parseFloat(value) : value
  return { currency: (currency || "EUR").toUpperCase().slice(0, 3), value: (isFinite(n) ? n : 0).toFixed(2) }
}

export function mollieClient(apiKey: string, testmode?: boolean) {
  const isAccess = (apiKey || "").startsWith("access_")
  // testmode only applies to access tokens; test_/live_ keys are already scoped.
  const tm: boolean | undefined = isAccess ? !!testmode : undefined

  async function call(path: string, method = "GET", body?: any): Promise<any> {
    let url = `${BASE}${path}`
    let payload = body
    if (typeof tm === "boolean") {
      if (method === "GET" || method === "DELETE") {
        url += (url.includes("?") ? "&" : "?") + `testmode=${tm}`
      } else {
        payload = { ...(body || {}), testmode: tm }
      }
    }
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json?.detail || json?.title || `Mollie HTTP ${res.status}`)
    return json
  }

  return {
    ping: () => call("/methods?resource=payments", "GET"),
    createPayment: (data: any) => call("/payments", "POST", data),
    getPayment: (id: string) => call(`/payments/${encodeURIComponent(id)}`, "GET"),
    createCustomer: (data: any) => call("/customers", "POST", data),
  }
}
