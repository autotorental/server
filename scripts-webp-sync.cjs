// Idempotent: generate .webp for any upload missing one. Safe to run repeatedly.
const fs=require("fs"), path=require("path"), sharp=require("/opt/autorental/packages/api/node_modules/sharp")
const DIR="/opt/autorental/uploads"
;(async()=>{
  let made=0
  for(const f of fs.readdirSync(DIR).filter(f=>/\.(png|jpe?g)$/i.test(f))){
    const w=path.join(DIR,f.replace(/\.(png|jpe?g)$/i,".webp"))
    if(fs.existsSync(w))continue
    try{await sharp(path.join(DIR,f)).webp({quality:82}).toFile(w);made++}catch(e){}
  }
  if(made)console.log(new Date().toISOString(),"webp-sync created",made)
})()
