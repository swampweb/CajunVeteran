const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PLANS_DIR = path.join(ROOT, 'Plans');
const JOBFILES_DIR = path.join(ROOT, 'JobFiles');

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
function defaultData(){ return {version:2,items:[],orders:[],colors:[],woodworkingJobs:[],woodworkingItems:[],woodworkingMaterialInventory:[]}; }
function normalizeData(data){
  data = Object.assign(defaultData(), data || {});
  for (const key of ['items','orders','colors','woodworkingJobs','woodworkingItems','woodworkingMaterialInventory']) {
    if (!Array.isArray(data[key])) data[key] = [];
  }
  data.version = data.version || 2;
  return data;
}
function ensureData(){ if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2)); }
function readData(){ ensureData(); try { return normalizeData(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch { return defaultData(); } }
function writeData(data){ fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeData(data), null, 2)); }
function send(res, code, body, type='text/plain; charset=utf-8') { res.writeHead(code, {'Content-Type':type,'Cache-Control':'no-store'}); res.end(body); }
function json(res, code, obj){ send(res, code, JSON.stringify(obj), 'application/json; charset=utf-8'); }
function getBody(req, max=100*1024*1024){ return new Promise((resolve,reject)=>{ let body=''; req.on('data', c=>{ body += c; if(body.length>max){ reject(new Error('Request body too large')); req.destroy(); } }); req.on('end',()=>resolve(body)); req.on('error',reject); }); }
async function getJson(req){ const body = await getBody(req); return body ? JSON.parse(body) : {}; }
function safeFileName(name){ return String(name||'file').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,180); }
function allowed(name){ const ext=path.extname(String(name||'')).toLowerCase(); return ['.pdf','.doc','.docx','.xls','.xlsx','.csv','.txt','.zip','.png','.jpg','.jpeg','.webp','.gif','.svg','.dxf','.stl','.3mf','.lbrn','.lbrn2'].includes(ext); }
function safeStoredName(file){ if(!file) return ''; if(typeof file==='string') return path.basename(decodeURIComponent(file)); if(file.storedName) return path.basename(String(file.storedName)); if(file.url){ const clean=String(file.url).split('?')[0].split('#')[0]; return path.basename(decodeURIComponent(clean)); } if(file.name) return path.basename(String(file.name)); return ''; }
function safePath(dir,name){ const base=path.basename(String(name||'')); if(!base) return null; const full=path.normalize(path.join(dir,base)); if(!full.startsWith(dir)) return null; return full; }
function deleteFile(dir,name){ const full=safePath(dir,name); if(!full) return {ok:false,error:'Invalid file name'}; if(!fs.existsSync(full)) return {ok:true,deleted:false,missing:true,storedName:path.basename(name)}; fs.unlinkSync(full); return {ok:true,deleted:true,storedName:path.basename(name)}; }
function listFiles(dir){ ensureDir(dir); return fs.readdirSync(dir,{withFileTypes:true}).filter(d=>d.isFile()).map(d=>d.name).filter(allowed).sort((a,b)=>a.localeCompare(b)); }
function useMapFromFiles(records, prop, ignoreId){ const usage={}; (Array.isArray(records)?records:[]).forEach(rec=>{ if(ignoreId && (String(rec.id)===String(ignoreId)||String(rec.jobId)===String(ignoreId)||String(rec.orderId)===String(ignoreId))) return; (Array.isArray(rec[prop])?rec[prop]:[]).forEach(f=>{ const n=safeStoredName(f); if(!n) return; (usage[n]=usage[n]||[]).push({id:rec.id||'',jobId:rec.jobId||rec.orderId||'',title:rec.project||rec.title||rec.name||rec.customer||'Record',customer:rec.customer||''}); }); }); return usage; }
function splitBuffer(buffer, sep){ const parts=[]; let start=0, idx; while((idx=buffer.indexOf(sep,start))!==-1){ parts.push(buffer.slice(start,idx)); start=idx+sep.length; } parts.push(buffer.slice(start)); return parts; }
function uploadMultipart(req,res,dir,baseUrl){
  ensureDir(dir); const ct=req.headers['content-type']||''; const m=ct.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i); if(!m) return json(res,400,{ok:false,error:'Missing upload boundary'});
  const boundary=Buffer.from('--'+(m[1]||m[2])); const chunks=[]; let size=0; const max=150*1024*1024;
  req.on('data',c=>{ size+=c.length; if(size>max){ req.destroy(); return; } chunks.push(c); });
  req.on('end',()=>{ try { const body=Buffer.concat(chunks); const raw=splitBuffer(body,boundary).slice(1,-1); const files=[]; for(let part of raw){ if(part.slice(0,2).toString()==='\r\n') part=part.slice(2); if(part.slice(-2).toString()==='\r\n') part=part.slice(0,-2); const hEnd=part.indexOf(Buffer.from('\r\n\r\n')); if(hEnd<0) continue; const header=part.slice(0,hEnd).toString('utf8'); const data=part.slice(hEnd+4); const fm=header.match(/filename="([^"]*)"/i); if(!fm||!fm[1]) continue; const original=path.basename(fm[1]); if(!allowed(original)) continue; const clean=safeFileName(original); const stored=`${Date.now()}_${Math.random().toString(16).slice(2,8)}_${clean}`; fs.writeFileSync(path.join(dir,stored),data); files.push({name:clean,storedName:stored,url:`/${baseUrl}/${encodeURIComponent(stored)}`,size:data.length,type:path.extname(clean).toLowerCase()}); } json(res,200,{ok:true,files}); } catch(e){ json(res,500,{ok:false,error:e.message}); }});
  req.on('error',e=>json(res,500,{ok:false,error:e.message}));
}
function serveStatic(req,res){
  let urlPath=decodeURIComponent(req.url.split('?')[0]); if(urlPath==='/') urlPath='/index.html';
  const file=path.normalize(path.join(ROOT,urlPath)); if(!file.startsWith(ROOT)) return send(res,403,'Forbidden');
  fs.readFile(file,(err,data)=>{ if(err) return send(res,404,'Not found'); const ext=path.extname(file).toLowerCase(); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.zip':'application/zip','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}; res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'}); res.end(data); });
}

ensureDir(PLANS_DIR); ensureDir(JOBFILES_DIR); ensureData();
const server=http.createServer(async (req,res)=>{
  const clean=req.url.split('?')[0];
  try {
    if(req.method==='GET' && clean==='/api/kv') return json(res,200,{ok:true,data:readData()});
    if(req.method==='POST' && clean==='/api/kv') { const body=await getJson(req); writeData(body.data||body); return json(res,200,{ok:true,data:readData()}); }
    // Backward-compatible endpoint for older 3D Print code.
    if(req.method==='GET' && clean==='/api/store') { const d=readData(); return json(res,200,{items:d.items,orders:d.orders,colors:d.colors}); }
    if(req.method==='POST' && clean==='/api/store') { const old=readData(); const body=await getJson(req); old.items=Array.isArray(body.items)?body.items:old.items; old.orders=Array.isArray(body.orders)?body.orders:old.orders; old.colors=Array.isArray(body.colors)?body.colors:old.colors; writeData(old); return json(res,200,{ok:true}); }
    if(req.method==='POST' && clean==='/api/upload-plan') return uploadMultipart(req,res,PLANS_DIR,'Plans');
    if(req.method==='POST' && clean==='/api/upload-job-file') return uploadMultipart(req,res,JOBFILES_DIR,'JobFiles');
    if(req.method==='POST' && clean==='/api/plans/scan') { const body=await getJson(req); const usage=useMapFromFiles(body.items||readData().woodworkingItems,'plans',body.ignoreItemId||''); const rows=listFiles(PLANS_DIR).map(storedName=>({storedName,name:storedName.replace(/^\d+_[a-f0-9]+_/i,''),url:`/Plans/${encodeURIComponent(storedName)}`,usedBy:usage[storedName]||[],status:(usage[storedName]&&usage[storedName].length)?'used':'unused'})); return json(res,200,{ok:true,total:rows.length,usedCount:rows.filter(r=>r.status==='used').length,unusedCount:rows.filter(r=>r.status==='unused').length,rows}); }
    if(req.method==='POST' && clean==='/api/job-files/scan') { const body=await getJson(req); const all=[...(body.jobs||readData().woodworkingJobs), ...(readData().orders||[])]; const usage=useMapFromFiles(all,'files',body.ignoreJobId||''); const rows=listFiles(JOBFILES_DIR).map(storedName=>({storedName,name:storedName.replace(/^\d+_[a-f0-9]+_/i,''),url:`/JobFiles/${encodeURIComponent(storedName)}`,usedBy:usage[storedName]||[],status:(usage[storedName]&&usage[storedName].length)?'used':'unused'})); return json(res,200,{ok:true,total:rows.length,usedCount:rows.filter(r=>r.status==='used').length,unusedCount:rows.filter(r=>r.status==='unused').length,rows}); }
    if(req.method==='POST' && clean==='/api/plans/delete-file') { const body=await getJson(req); const name=safeStoredName(body.plan||body.file||body.storedName); const usage=useMapFromFiles(body.items||readData().woodworkingItems,'plans',body.ignoreItemId||''); if((usage[name]||[]).length&&!body.force) return json(res,409,{ok:false,error:'File is still used',usedBy:usage[name]}); return json(res,200,deleteFile(PLANS_DIR,name)); }
    if(req.method==='POST' && clean==='/api/job-files/delete-file') { const body=await getJson(req); const name=safeStoredName(body.file||body.storedName); const all=[...(body.jobs||readData().woodworkingJobs), ...(readData().orders||[])]; const usage=useMapFromFiles(all,'files',body.ignoreJobId||''); if((usage[name]||[]).length&&!body.force) return json(res,409,{ok:false,error:'File is still used',usedBy:usage[name]}); return json(res,200,deleteFile(JOBFILES_DIR,name)); }
    if(req.method==='POST' && (clean==='/api/shutdown'||clean==='/shutdown')) { json(res,200,{ok:true}); setTimeout(()=>server.close(()=>process.exit(0)),200); return; }
    serveStatic(req,res);
  } catch(e) { json(res,500,{ok:false,error:e.message}); }
});
server.listen(PORT,'0.0.0.0',()=>{ console.log(`CajunVeteran site running at http://localhost:${PORT}`); console.log(`Data file: ${DATA_FILE}`); });
