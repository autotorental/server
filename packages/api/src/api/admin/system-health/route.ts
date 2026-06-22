import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import * as os from "os"
import { execSync } from "child_process"

// GET /admin/system-health — server metrics for the platform owner dashboard.
function sh(cmd: string): string { try { return execSync(cmd, { timeout: 4000, encoding: "utf8" }).toString() } catch { return "" } }

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const totalMem = os.totalmem(), freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const cpus = os.cpus() || []
  const load = os.loadavg() // [1m,5m,15m]

  // Disk usage of root
  let disk = { total: 0, used: 0, pct: 0 }
  try {
    const out = sh("df -k /").trim().split("\n")
    const line = out[out.length - 1].split(/\s+/)
    const totalK = Number(line[1]) * 1024, usedK = Number(line[2]) * 1024
    disk = { total: totalK, used: usedK, pct: totalK ? Math.round((usedK / totalK) * 100) : 0 }
  } catch { /* ignore */ }

  // pm2 processes
  let processes: any[] = []
  try {
    const raw = sh("pm2 jlist") || sh("/usr/bin/pm2 jlist") || sh("/root/.bun/bin/pm2 jlist")
    const arr = JSON.parse(raw || "[]")
    processes = arr.map((p: any) => ({
      name: p.name,
      status: p.pm2_env?.status,
      cpu: p.monit?.cpu ?? 0,
      memory: p.monit?.memory ?? 0,
      restarts: p.pm2_env?.restart_time ?? 0,
      uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
    }))
  } catch { /* pm2 not reachable */ }

  res.json({
    cpu: { cores: cpus.length, model: cpus[0]?.model || "", load1: load[0], load5: load[1], load15: load[2], pct: cpus.length ? Math.min(100, Math.round((load[0] / cpus.length) * 100)) : 0 },
    memory: { total: totalMem, used: usedMem, free: freeMem, pct: Math.round((usedMem / totalMem) * 100) },
    disk,
    uptime_sec: os.uptime(),
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()}`,
    node: process.version,
    processes,
    fetched_at: new Date().toISOString(),
  })
}
