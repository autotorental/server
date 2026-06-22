import os, json, urllib.request, subprocess, sys
DB=os.environ["DBURL"]; ROOT="/opt/autorental/packages/api/src"; OLLAMA="http://localhost:11434"
def embed(t):
    try:
        req=urllib.request.Request(OLLAMA+"/api/embeddings",data=json.dumps({"model":"nomic-embed-text","prompt":t[:8000]}).encode(),headers={"Content-Type":"application/json"})
        return json.loads(urllib.request.urlopen(req,timeout=30).read()).get("embedding",[])
    except Exception: return []
def walk(d):
    out=[]
    for r,ds,fs in os.walk(d):
        ds[:]=[x for x in ds if x not in("node_modules",".medusa","dist")]
        for f in fs:
            if f.endswith((".ts",".tsx")) and not f.endswith(".d.ts"): out.append(os.path.join(r,f))
    return out
def psql(sql):
    subprocess.run(["psql",DB,"-v","ON_ERROR_STOP=0","-q"],input=sql.encode(),capture_output=True)
psql("DELETE FROM code_embedding;")
files=walk(ROOT); n=0
buf=[]
for f in files:
    rel=f.replace("/opt/autorental/","")
    try: txt=open(f,encoding="utf-8").read()
    except: continue
    if len(txt)<40: continue
    for i in range(0,len(txt),1500):
        ch=txt[i:i+1500]; e=embed(rel+"\n"+ch)
        if not e: continue
        # dollar-quote content safely; embedding as json string
        tag="$x"+str(n%97)+"$"
        while tag in ch: tag="$y"+str(n)+"$"
        buf.append(f"INSERT INTO code_embedding(path,chunk_idx,content,embedding) VALUES('{rel}',{i//1500},{tag}{ch}{tag},'{json.dumps(e)}'::jsonb);")
        n+=1
        if len(buf)>=50:
            psql("\n".join(buf)); buf=[]
            if n%200==0: print("indexed",n,flush=True)
if buf: psql("\n".join(buf))
print("DONE: indexed",n,"chunks from",len(files),"files",flush=True)
