// Daily Clarity cache warmer. Clarity allows only 10 export calls/project/day.
// We make 3 calls once/day and store them so the admin reads cache (never 429s).
const fs=require("fs")
const {Client}=require("/opt/autorental/node_modules/.bun/pg@8.21.0+089ae586d7e96dbe/node_modules/pg")
const url=fs.readFileSync("/opt/autorental/packages/api/.env","utf8").split("\n").find(l=>l.startsWith("DATABASE_URL=")).slice(13).trim().replace(/^["\x27]|["\x27]$/g,"")
const URL="https://www.clarity.ms/export-data/api/v1/project-live-insights"
const DB_KEY="clarity_insights_cache", DAYS=3
const call=async(token,dims)=>{
  const p=new URLSearchParams({numOfDays:String(DAYS)}); dims.forEach((d,i)=>p.set(`dimension${i+1}`,d))
  const r=await fetch(`${URL}?${p}`,{headers:{Authorization:`Bearer ${token}`}})
  if(!r.ok){const t=await r.text().catch(()=>""); throw new Error(`Clarity ${r.status}: ${t.slice(0,120)}`)}
  return r.json()
}
;(async()=>{
  const c=new Client({connectionString:url}); await c.connect()
  const row=await c.query("select value from app_setting where key=\x27clarity_api_token\x27")
  const token=row.rows[0]?.value
  if(!token){console.log("no token"); await c.end(); return}
  try{
    const [overall,byDevice,byCountry]=await Promise.all([call(token,[]),call(token,["Device"]),call(token,["Country/Region"])])
    const payload=JSON.stringify({at:Date.now(),days:DAYS,data:{days:DAYS,overall,byDevice,byCountry}})
    await c.query("insert into app_setting(key,value,is_secret,created_at,updated_at) values($1,$2,false,now(),now()) on conflict(key) do update set value=$2, updated_at=now()",[DB_KEY,payload])
    console.log(new Date().toISOString(),"clarity cache OK")
  }catch(e){ console.log(new Date().toISOString(),"clarity warm failed:",e.message) }
  await c.end()
})().catch(e=>{console.error(e.message);process.exit(1)})
