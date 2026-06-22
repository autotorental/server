import fs from "fs"; import path from "path"; import pg from "pg";
const DB = process.env.DBURL;
const ROOTS = ["/opt/autorental/packages/api/src"];
const OLLAMA = "http://localhost:11434", EMB = "nomic-embed-text";
function walk(d, acc=[]) { for (const f of fs.readdirSync(d)) { const p=path.join(d,f); const st=fs.statSync(p); if (st.isDirectory()) { if (["node_modules",".medusa","dist"].includes(f)) continue; walk(p,acc);} else if (/\.(ts|tsx)$/.test(f) && !f.endsWith(".d.ts")) acc.push(p);} return acc; }
function chunk(t, size=1500){ const o=[]; for(let i=0;i<t.length;i+=size) o.push(t.slice(i,i+size)); return o; }
async function embed(t){ try{ const r=await fetch(`${OLLAMA}/api/embeddings`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:EMB,prompt:t.slice(0,8000)})}); const d=await r.json(); return d.embedding||[]; }catch{return[];} }
const c=new pg.Client({connectionString:DB}); await c.connect();
await c.query("DELETE FROM code_embedding");
const files=ROOTS.flatMap(r=>walk(r));
let n=0;
for(const f of files){ const rel=f.replace("/opt/autorental/",""); const txt=fs.readFileSync(f,"utf8"); if(txt.length<40)continue; const ch=chunk(txt); for(let i=0;i<ch.length;i++){ const e=await embed(rel+"\n"+ch[i]); if(!e.length)continue; await c.query("INSERT INTO code_embedding(path,chunk_idx,content,embedding) VALUES($1,$2,$3,$4)",[rel,i,ch[i],JSON.stringify(e)]); n++; if(n%200===0)console.log("indexed",n);} }
console.log("DONE: indexed",n,"chunks from",files.length,"files");
await c.end();
