import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { exec } from "child_process"
import { promisify } from "util"

// SSE safety helper — avoids "Cannot set headers" when the client disconnects
// mid-stream. Tracks the close state on the response object itself.
function safeWrite(res: any, chunk: string): boolean {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return false
  try { res.write(chunk); return true } catch { (res as any).__closed = true; return false }
}
function safeEnd(res: any): void {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return
  try { res.end() } catch {}
  ;(res as any).__closed = true
}

const execAsync = promisify(exec)

const OLLAMA_BASE = "https://ai.sirizone.com/ollama/v1"
const OLLAMA_KEY  = "sk-f171498a5cb5e5f93461e0ef12d4ba30c3374dafb2d0d01c"

async function callClaude(key: string, model: string, system: string, msgs: any[]): Promise<string> {
  const m = ({"claude-haiku":"claude-haiku-4-5","claude-sonnet":"claude-sonnet-4-5","claude-opus":"claude-opus-4-5"} as any)[model]||"claude-haiku-4-5"
  const r = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST", headers:{"x-api-key":key,"anthropic-version":"2023-06-01","content-type":"application/json"},
    body:JSON.stringify({model:m,max_tokens:8000,system,messages:msgs}), signal:AbortSignal.timeout(90000),
  })
  const d = await r.json(); if(!r.ok) throw new Error(d.error?.message||"Claude error")
  return d.content?.[0]?.text||""
}

async function callOllama(model: string, system: string, msgs: any[]): Promise<string> {
  const r = await fetch(`${OLLAMA_BASE}/chat/completions`,{
    method:"POST", headers:{"Authorization":`Bearer ${OLLAMA_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model,messages:[{role:"system",content:system},...msgs],stream:false,max_tokens:3000,temperature:0.2}),
    signal:AbortSignal.timeout(120000),
  })
  const d = await r.json(); return d.choices?.[0]?.message?.content||""
}

async function callModel(model: string, key: string, sys: string, msgs: any[]): Promise<string> {
  if(model.startsWith("claude")&&key) return callClaude(key,model,sys,msgs)
  return callOllama(model,sys,msgs)
}

async function getRoles(pg: any) {
  const rows = await pg("app_setting").whereIn("key",["ai_role_planner","ai_role_coder","ai_role_reviewer","claude_api_key","ai_provider"]).select("key","value")
  const m = Object.fromEntries(rows.map((r:any)=>[r.key,r.value]))
  return { planner:m.ai_role_planner||m.ai_provider||"hermes3", coder:m.ai_role_coder||"qwen2.5-coder:14b", reviewer:m.ai_role_reviewer||m.ai_provider||"hermes3", claudeKey:m.claude_api_key||"" }
}

function emit(res: any, event: string, data: any){ safeWrite(res, `data: ${JSON.stringify({event,...data})}\n\n`) }


// SECURITY: only allow a fixed allowlist of safe operations to be executed.
// The agent plans commands via an AI model — never run arbitrary root commands.
function isSafeCommand(cmd: string): boolean {
  const c = cmd.trim()
  // Block dangerous tokens outright
  if (/[;&|`$><]|\brm\b|\bdd\b|\bmkfs\b|\bsudo\b|\bchmod\b|\bchown\b|\bcurl\b|\bwget\b|\bnc\b|\beval\b|\bkill\b|\bshutdown\b|\breboot\b|\bsystemctl\b|\buseradd\b|\bpasswd\b|\bcrontab\b|\.\.|\/etc\/|\/root\/\.ssh/i.test(c)) return false
  // Allow only these safe prefixes
  const allow = [
    /^cd \/opt\/autorental(\/[\w./-]+)? && (npm run build|bun run build|pm2 restart [\w-]+)/,
    /^pm2 restart [\w-]+( --update-env)?$/,
    /^pm2 (list|status)$/,
    /^cd \/opt\/autorental[\w./-]* && (git status|git log|git diff|ls -la?|cat [\w./-]+)$/,
    /^git -C \/opt\/autorental[\w./-]* (status|log|diff)$/,
  ]
  return allow.some(re => re.test(c))
}

const PLATFORM = `Auto to Rental (autotorental.com) — a luxury car-rental marketplace in the UAE.
ARCHITECTURE
- Storefront: Next.js 15 App Router (ISR, output standalone), built with "npm run build", served by pm2 "storefront" on :7100. Path: /opt/autorental/apps/storefront
- API: Medusa 2.x (v2.13.4), custom routes are src/api/**/route.ts files. MUST run "bunx medusa build" after editing backend, then "pm2 restart autorental-api". Path: /opt/autorental/packages/api
- Admin dashboard: React + Vite + @medusajs/ui, built with "bun run build" (output dist/ served by nginx). Path: /opt/autorental/apps/admin
- Vendor dashboard: React + Vite, built with "bun run build". Path: /opt/autorental/apps/vendor
DATA: PostgreSQL via knex (ContainerRegistrationKeys.PG_CONNECTION). Key tables: seller, vehicle, brand, model, seller_follow, vendor_call, notification, app_setting, push_token.
CONVENTIONS
- Brand colors: navy #1E3A8A, blue #2563EB, indigo #4F46E5. Use @medusajs/ui tokens (text-ui-fg-base, bg-ui-bg-base, border-ui-border-base) + Tailwind.
- Custom API routes export named POST/GET/PUT/DELETE handlers typed (MedusaRequest, MedusaResponse).
- A broken TypeScript file fails the WHOLE "medusa build" — always keep edits type-correct.
- NEVER hardcode secrets; read them from app_setting via getSetting().`

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { task } = (req.body||{}) as {task:string}

  if(!task?.trim()){
    res.setHeader("Content-Type","text/event-stream")
    safeWrite(res, `data: ${JSON.stringify({event:"error",message:"Task required"})}\n\n`)
    safeWrite(res, "data: [DONE]\n\n"); safeEnd(res); return
  }

  const roles = await getRoles(pg)

  res.setHeader("Content-Type","text/event-stream")
  res.setHeader("Cache-Control","no-cache")
  res.setHeader("Connection","keep-alive")
  res.setHeader("X-Accel-Buffering","no")

  
  req.on("close", () => { (res as any).__closed = true })
try {
    emit(res,"step",{step:1,title:"Planning",model:roles.planner,status:"running"})
    const plan = await callModel(roles.planner,roles.claudeKey,
      `You are a STAFF software engineer who knows this codebase intimately:\n${PLATFORM}\n\nProduce a precise, minimal, production-grade implementation plan. Think about: exact files to touch, the smallest correct change, build/deploy steps required, type-safety, and what could break. Prefer editing existing files over creating new ones. Return ONLY valid JSON, no prose around it:\n{"summary":"one-sentence what & why","steps":["concrete ordered actions"],"files_to_change":["absolute paths"],"build_commands":["exact build/restart commands needed"],"risks":"what could break and how to avoid it"}`,
      [{role:"user",content:`TASK:\n${task}`}]
    )
    let planJson: any={}; try{ const mx=plan.match(/\{[\s\S]*\}/); if(mx) planJson=JSON.parse(mx[0]) }catch{}
    emit(res,"step",{step:1,status:"done",result:plan,json:planJson})

    emit(res,"step",{step:2,title:"Writing code",model:roles.coder,status:"running"})
    const code = await callModel(roles.coder,roles.claudeKey,
      `You are an EXPERT full-stack engineer writing production code for:\n${PLATFORM}\n\nRULES:\n- Output the COMPLETE final content of each changed file (not a diff, not a snippet).\n- Keep TypeScript strictly type-correct — a single type error fails the entire build.\n- Match the existing code style, imports, and @medusajs/ui design tokens.\n- Make the smallest change that fully solves the task. Do not refactor unrelated code.\n- Include EVERY build/deploy command needed, in order (e.g. "cd /opt/autorental/packages/api && bun run build" then "pm2 restart autorental-api"; admin/vendor need "bun run build").\nReturn ONLY valid JSON, no prose:\n{"changes":[{"file":"absolute path","content":"complete final file content"}],"commands":["exact deploy commands in order"]}`,
      [{role:"user",content:`TASK:\n${task}\n\nAPPROVED PLAN:\n${plan}`}]
    )
    let codeJson: any={}; try{ const mx=code.match(/\{[\s\S]*\}/); if(mx) codeJson=JSON.parse(mx[0]) }catch{}
    emit(res,"step",{step:2,status:"done",result:code,json:codeJson})

    const deployLog: string[] = []
    if((codeJson.commands||[]).length>0) {
      emit(res,"step",{step:3,title:"Deploying",status:"running"})
      for(const cmd of (codeJson.commands||[]).slice(0,6)) {
        if(!isSafeCommand(cmd)){ deployLog.push(`🚫 Blocked (not in allowlist): ${cmd}`); continue }
        try{
          const {stdout,stderr} = await execAsync(`ssh -o BatchMode=yes -o ConnectTimeout=15 root@76.13.184.134 '${cmd.replace(/'/g,"'\\''")}'`,{timeout:120000})
          deployLog.push(`✅ ${cmd}: ${((stdout||stderr||"ok").trim()).slice(0,150)}`)
        }catch(e:any){ deployLog.push(`❌ ${cmd}: ${(e.message||"failed").slice(0,100)}`) }
      }
      emit(res,"step",{step:3,status:"done",log:deployLog})
    }

    emit(res,"step",{step:4,title:"Reviewing",model:roles.reviewer,status:"running"})
    const review = await callModel(roles.reviewer,roles.claudeKey,
      `You are a SENIOR code reviewer for:\n${PLATFORM}\nReview the change for correctness, type-safety, security (no secret leaks, no injection), and whether it actually fulfils the task. Be concise and specific — reference files/lines. Use exactly this format:\n✅ What worked\n⚠️ Risks / bugs (or "none")\n🔧 Recommended improvements (or "none")\n🚦 Verdict: SHIP or NEEDS-FIX`,
      [{role:"user",content:`TASK:\n${task}\n\nCODE PRODUCED:\n${code}\n\nDEPLOY RESULT:\n${deployLog.join("\n")||"not deployed"}`}]
    )
    emit(res,"step",{step:4,status:"done",result:review})
    emit(res,"done",{summary:planJson.summary||`Completed: ${task.slice(0,60)}`})
  }catch(e:any){ emit(res,"error",{message:e?.message||"Agent failed"}) }

  safeWrite(res, "data: [DONE]\n\n"); safeEnd(res)
}
