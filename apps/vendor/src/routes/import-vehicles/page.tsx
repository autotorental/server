import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Heading, Text, Badge, Button, Input } from "@medusajs/ui"
import { ArrowDownTray } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Import Vehicles", icon: ArrowDownTray, rank: 3 }

type Step = "domain" | "verify" | "verified" | "preview" | "done"

export default function ImportVehiclesPage() {
  const [step, setStep]         = useState<Step>("domain")
  const [domain, setDomain]     = useState("")
  const [token, setToken]       = useState("")
  const [method, setMethod]     = useState<"meta"|"file"|"dns">("meta")
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting]   = useState(false)
  const [error, setError]       = useState("")
  const [cars, setCars]         = useState<any[]>([])
  const [result, setResult]     = useState<any>(null)
  const [jobs, setJobs]         = useState<any[]>([])

  useEffect(() => {
    fetch(`${API}/vendor/domain-verify`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.row) {
          setDomain(d.row.domain)
          setToken(d.row.token)
          setStep(d.row.verified ? "verified" : "verify")
        }
      }).catch(() => {})
    fetch(`${API}/vendor/import-vehicles`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.jobs) setJobs(d.jobs) })
      .catch(() => {})
  }, [])

  const registerDomain = async () => {
    if (!domain.trim()) return
    setLoading(true); setError("")
    try {
      const r = await fetch(`${API}/vendor/domain-verify`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim(), action: "register" }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.message || "Failed")
      if (d.already_verified) { setStep("verified"); return }
      setToken(d.token)
      setStep("verify")
    } catch(e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const verifyDomain = async () => {
    setChecking(true); setError("")
    try {
      const r = await fetch(`${API}/vendor/domain-verify`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, action: "verify" }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.message || "Failed")
      if (d.verified) { setStep("verified") }
      else setError(d.error || "Token not found. Make sure you added it correctly and try again.")
    } catch(e: any) { setError(e.message) }
    finally { setChecking(false) }
  }

  const previewCars = async () => {
    setPreviewing(true); setError(""); setCars([])
    try {
      const r = await fetch(`${API}/vendor/import-vehicles`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview" }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.message || "Preview failed")
      setCars(d.cars || [])
      setStep("preview")
    } catch(e: any) { setError(e.message) }
    finally { setPreviewing(false) }
  }

  const importCars = async () => {
    setImporting(true); setError("")
    try {
      const r = await fetch(`${API}/vendor/import-vehicles`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import" }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.message || "Import failed")
      setResult(d); setStep("done")
    } catch(e: any) { setError(e.message) }
    finally { setImporting(false) }
  }

  const INSTRUCTIONS = {
    meta: {
      label: "Meta tag",
      code: `<meta name="autotorental-site-verification" content="${token}">`,
      desc: "Add this inside the <head> of your homepage",
    },
    file: {
      label: "Verification file",
      code: `https://${domain}/${token}.txt`,
      desc: `Create a file named ${token}.txt at your website root containing only: ${token}`,
    },
    dns: {
      label: "DNS TXT record",
      code: `autotorental-site-verification=${token}`,
      desc: 'Add this as a TXT record in your domain DNS settings (Host: "@" or domain root)',
    },
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-ui-border-base bg-ui-bg-base shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ui-fg-base flex items-center justify-center shrink-0">
            <ArrowDownTray size={18} className="text-ui-bg-base"/>
          </div>
          <div>
            <Heading level="h1" className="text-lg font-bold">Import Vehicles from Your Website</Heading>
            <Text size="small" className="text-ui-fg-muted mt-0.5">
              Verify you own the domain, then we scan your site and import your car listings as drafts.
            </Text>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mt-5">
          {[
            { id: "domain", label: "1. Enter domain" },
            { id: "verify", label: "2. Verify ownership" },
            { id: "verified", label: "3. Preview cars" },
            { id: "done", label: "4. Import done" },
          ].map((s, i) => {
            const active = step === s.id || (step === "preview" && s.id === "verified")
            const done = (step === "verify" && i === 0) || (step === "verified" && i <= 1) || (step === "preview" && i <= 2) || step === "done"
            return (
              <div key={s.id} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${done ? "bg-ui-fg-interactive" : "bg-ui-border-base"}`}/>}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  active ? "bg-ui-fg-base text-ui-bg-base border-ui-fg-base" :
                  done ? "bg-ui-fg-interactive/10 text-ui-fg-interactive border-ui-fg-interactive/30" :
                  "text-ui-fg-muted border-ui-border-base"
                }`}>
                  {done && !active ? "✓ " : ""}{s.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 px-6 py-6 w-full max-w-3xl mx-auto">
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* STEP 1: Enter domain */}
        {step === "domain" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
              <Text className="font-semibold text-ui-fg-base mb-1">Your website URL</Text>
              <Text size="small" className="text-ui-fg-muted mb-4">
                Enter the domain of your car rental website. We'll verify you own it before importing.
              </Text>
              <div className="flex gap-2">
                <Input
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  placeholder="yourwebsite.com or https://yourwebsite.com"
                  dir="ltr"
                  onKeyDown={e => e.key === "Enter" && registerDomain()}
                  className="flex-1"
                />
                <Button onClick={registerDomain} disabled={loading || !domain.trim()}>
                  {loading ? "Loading..." : "Continue →"}
                </Button>
              </div>
            </div>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 text-sm text-ui-fg-subtle">
              <strong className="text-ui-fg-base">Why verify?</strong>
              <br/>We verify domain ownership to prevent unauthorized scraping of other companies' websites.
              Only the verified domain owner can import their car listings.
            </div>
          </div>
        )}

        {/* STEP 2: Verify */}
        {step === "verify" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
              <div className="flex items-center justify-between mb-4">
                <Text className="font-semibold">Verifying ownership of: <span className="text-ui-fg-interactive">{domain}</span></Text>
                <button onClick={() => setStep("domain")} className="text-xs text-ui-fg-muted hover:text-ui-fg-base">Change domain</button>
              </div>

              <Text size="small" className="text-ui-fg-muted mb-4">
                Choose one of these methods to prove you own <strong>{domain}</strong>:
              </Text>

              {/* Method tabs */}
              <div className="flex gap-2 mb-4">
                {(["meta", "file", "dns"] as const).map(m => (
                  <button key={m} onClick={() => setMethod(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      method === m ? "bg-ui-fg-base text-ui-bg-base border-ui-fg-base" : "border-ui-border-base text-ui-fg-muted hover:border-ui-fg-interactive"
                    }`}>
                    {INSTRUCTIONS[m].label}
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-ui-bg-subtle border border-ui-border-base p-4 mb-4">
                <Text size="xsmall" className="text-ui-fg-muted mb-2">{INSTRUCTIONS[method].desc}</Text>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-ui-bg-base border border-ui-border-base rounded-lg px-3 py-2 font-mono text-ui-fg-base break-all">
                    {INSTRUCTIONS[method].code}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(INSTRUCTIONS[method].code)}
                    className="shrink-0 px-3 py-2 rounded-lg border border-ui-border-base text-xs text-ui-fg-muted hover:bg-ui-bg-base-hover transition"
                  >Copy</button>
                </div>
              </div>

              <Button onClick={verifyDomain} disabled={checking} className="w-full">
                {checking ? "Checking..." : "✓ I've added it — verify now"}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Verified — Preview */}
        {(step === "verified" || step === "preview") && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <Text className="font-semibold text-green-800 dark:text-green-300">Domain verified!</Text>
                <Text size="small" className="text-green-700 dark:text-green-400">{domain} — you are the verified owner</Text>
              </div>
              <Badge color="green" className="ml-auto">Verified</Badge>
            </div>

            {step === "verified" && (
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
                <Text className="font-semibold mb-2">Scan your website for car listings</Text>
                <Text size="small" className="text-ui-fg-muted mb-4">
                  We'll scan <strong>{domain}</strong> and find all car listings. Preview them before importing.
                </Text>
                <Button onClick={previewCars} disabled={previewing}>
                  {previewing ? "Scanning website..." : "🔍 Scan & Preview cars"}
                </Button>
              </div>
            )}

            {step === "preview" && cars.length > 0 && (
              <div className="rounded-xl border border-ui-border-base overflow-hidden">
                <div className="px-5 py-3 bg-ui-bg-subtle border-b border-ui-border-base flex items-center justify-between">
                  <Text className="font-semibold">{cars.length} cars found on {domain}</Text>
                  <Button onClick={importCars} disabled={importing}>
                    {importing ? "Importing..." : `⬇ Import all ${cars.length} as drafts`}
                  </Button>
                </div>
                <div className="divide-y divide-ui-border-base max-h-96 overflow-y-auto">
                  {cars.map((car, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      {car.photos?.[0]
                        ? <img src={car.photos[0]} alt="" className="w-14 h-10 object-cover rounded shrink-0"/>
                        : <div className="w-14 h-10 bg-ui-bg-subtle rounded shrink-0 flex items-center justify-center text-lg">🚗</div>
                      }
                      <div className="flex-1 min-w-0">
                        <Text className="font-medium text-sm truncate">{car.title}</Text>
                        {car.description && <Text size="xsmall" className="text-ui-fg-muted truncate">{car.description.slice(0, 80)}</Text>}
                      </div>
                      {car.price && (
                        <Text className="text-sm font-semibold text-ui-fg-interactive shrink-0">
                          {car.price} {car.currency || "AED"}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === "preview" && cars.length === 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-5 text-center">
                <Text className="font-semibold text-amber-800 dark:text-amber-300">No car listings found</Text>
                <Text size="small" className="text-amber-700 dark:text-amber-400 mt-1">
                  We couldn't automatically detect car listings on {domain}. Make sure your site uses standard HTML or schema.org markup.
                </Text>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Done */}
        {step === "done" && result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-5 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <Text className="font-bold text-lg text-green-800 dark:text-green-300">Import Complete!</Text>
              <Text size="small" className="text-green-700 dark:text-green-400 mt-2">
                Found {result.found} cars · Imported {result.imported} as drafts
              </Text>
              <Text size="xsmall" className="text-green-600 dark:text-green-500 mt-1">
                Go to Vehicles → filter by "Draft" to review and publish your imported cars
              </Text>
            </div>
            {result.results && (
              <div className="rounded-xl border border-ui-border-base overflow-hidden">
                <div className="px-4 py-3 bg-ui-bg-subtle border-b border-ui-border-base">
                  <Text className="font-semibold text-sm">Import results</Text>
                </div>
                <div className="divide-y divide-ui-border-base max-h-72 overflow-y-auto">
                  {result.results.map((r: any, i: number) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                      <Text size="small" className="truncate">{r.title}</Text>
                      <Badge color={r.status === "imported" ? "green" : "red"} size="small">{r.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Past import jobs */}
        {jobs.length > 0 && step !== "done" && (
          <div className="mt-6 rounded-xl border border-ui-border-base overflow-hidden">
            <div className="px-4 py-3 bg-ui-bg-subtle border-b border-ui-border-base">
              <Text className="font-semibold text-sm text-ui-fg-muted">Previous imports</Text>
            </div>
            {jobs.map((j: any) => (
              <div key={j.id} className="px-4 py-3 flex items-center gap-3 border-b border-ui-border-base last:border-0">
                <Badge color={j.status === "done" ? "green" : j.status === "failed" ? "red" : "orange"} size="small">
                  {j.status}
                </Badge>
                <Text size="small" className="flex-1">{j.domain}</Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {j.total_imported || 0}/{j.total_found || 0} imported
                </Text>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
