const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PLANS_DIR = path.join(ROOT, 'Plans');
const JOBFILES_DIR = path.join(ROOT, 'JobFiles');
function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function defaultStore(){return {items:[],orders:[],colors:[]};}
function ensureData(){ if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore(),null,2)); }
function send(res,code,body,type='text/plain'){res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store'});res.end(body)}
function json(res,code,obj){send(res,code,JSON.stringify(obj),'application/json; charset=utf-8')}
function getJson(req,max=25*1024*1024){return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>max){reject(new Error('Request body too large.'));req.destroy();}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{})}catch(e){reject(e)}});req.on('error',reject);});}
function safeFileName(name){return String(name||'file').replace(/[\\/:*?"<>|]/g,'_').replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,180)}
function allowed(name){const ext=path.extname(String(name||'')).toLowerCase();return ['.pdf','.doc','.docx','.xls','.xlsx','.csv','.txt','.zip','.png','.jpg','.jpeg','.webp','.gif','.svg','.dxf','.stl','.3mf'].includes(ext)}
function splitBuffer(buffer, sep){const parts=[];let start=0,idx;while((idx=buffer.indexOf(sep,start))!==-1){parts.push(buffer.slice(start,idx));start=idx+sep.length}parts.push(buffer.slice(start));return parts}
function uploadMultipart(req,res,dir,fieldName='files'){
  ensureDir(dir); const ct=req.headers['content-type']||''; const m=ct.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i); if(!m) return json(res,400,{ok:false,error:'Missing upload boundary.'});
  const boundary=Buffer.from('--'+(m[1]||m[2])); const chunks=[]; let size=0; const max=100*1024*1024;
  req.on('data',c=>{size+=c.length;if(size>max){req.destroy();return;}chunks.push(c)});
  req.on('end',()=>{try{const body=Buffer.concat(chunks);const raw=splitBuffer(body,boundary).slice(1,-1);const files=[];for(let part of raw){if(part.slice(0,2).toString()==='\r\n')part=part.slice(2);if(part.slice(-2).toString()==='\r\n')part=part.slice(0,-2);const hEnd=part.indexOf(Buffer.from('\r\n\r\n'));if(hEnd<0)continue;const header=part.slice(0,hEnd).toString('utf8');const data=part.slice(hEnd+4);const fm=header.match(/filename="([^"]*)"/i);if(!fm||!fm[1])continue;const original=path.basename(fm[1]);if(!allowed(original))continue;const clean=safeFileName(original);const stored=`${Date.now()}_${Math.random().toString(16).slice(2,8)}_${clean}`;fs.writeFileSync(path.join(dir,stored),data);const base=dir===JOBFILES_DIR?'JobFiles':'Plans';files.push({name:clean,storedName:stored,url:`/${base}/${encodeURIComponent(stored)}`,size:data.length,type:path.extname(clean).toLowerCase()});}json(res,200,{ok:true,files});}catch(e){json(res,500,{ok:false,error:e.message})}});
  req.on('error',e=>json(res,500,{ok:false,error:e.message}));
}
function listFiles(dir){ensureDir(dir);return fs.readdirSync(dir,{withFileTypes:true}).filter(d=>d.isFile()).map(d=>d.name).filter(allowed).sort((a,b)=>a.localeCompare(b));}
function fileStoredName(f){if(!f)return'';if(typeof f==='string')return path.basename(decodeURIComponent(f));if(f.storedName)return path.basename(String(f.storedName));if(f.url){const clean=String(f.url).split('?')[0].split('#')[0];return path.basename(decodeURIComponent(clean));}if(f.name)return path.basename(String(f.name));return'';}
function safePath(dir,name){const base=path.basename(String(name||''));if(!base)return null;const full=path.normalize(path.join(dir,base));if(!full.startsWith(dir))return null;return full;}
function deleteFile(dir,name){const full=safePath(dir,name);if(!full)return {ok:false,deleted:false,error:'Invalid file name.'};if(!fs.existsSync(full))return {ok:true,deleted:false,missing:true,storedName:path.basename(name)};fs.unlinkSync(full);return {ok:true,deleted:true,storedName:path.basename(name)};}
function usageFromItems(items,ignore){const usage={};(Array.isArray(items)?items:[]).forEach(item=>{if(ignore&&String(item.id)===String(ignore))return;(Array.isArray(item.plans)?item.plans:[]).forEach(p=>{const n=fileStoredName(p);if(!n)return;(usage[n]=usage[n]||[]).push({id:item.id||'',itemId:item.itemId||'',name:item.name||item.itemId||'Unnamed Item'});});});return usage;}
function usageFromJobs(jobs,ignore){const usage={};(Array.isArray(jobs)?jobs:[]).forEach(job=>{if(ignore&&(String(job.id)===String(ignore)||String(job.jobId)===String(ignore)||String(job.orderId)===String(ignore)))return;(Array.isArray(job.files)?job.files:[]).forEach(f=>{const n=fileStoredName(f);if(!n)return;(usage[n]=usage[n]||[]).push({id:job.id||'',jobId:job.jobId||job.orderId||'',title:job.project||job.title||job.customer||'Job',customer:job.customer||''});});});return usage;}
async function scanDir(req,res,dir,type){try{const body=await getJson(req);const usage=type==='jobs'?usageFromJobs(body.jobs||[],body.ignoreJobId||''):usageFromItems(body.items||[],body.ignoreItemId||'');const base=type==='jobs'?'JobFiles':'Plans';const rows=listFiles(dir).map(storedName=>({storedName,name:storedName.replace(/^\d+_[a-f0-9]+_/i,''),url:`/${base}/${encodeURIComponent(storedName)}`,usedBy:usage[storedName]||[],status:(usage[storedName]&&usage[storedName].length)?'used':'unused'}));json(res,200,{ok:true,total:rows.length,usedCount:rows.filter(r=>r.status==='used').length,unusedCount:rows.filter(r=>r.status==='unused').length,rows});}catch(e){json(res,500,{ok:false,error:e.message})}}
async function deleteChecked(req,res,dir,type){try{const body=await getJson(req);const name=fileStoredName(body.file||body.plan||body.storedName);if(!name)return json(res,400,{ok:false,error:'Missing file name.'});const usage=type==='jobs'?usageFromJobs(body.jobs||[],body.ignoreJobId||''):usageFromItems(body.items||[],body.ignoreItemId||'');const usedBy=usage[name]||[];if(usedBy.length&&!body.force)return json(res,409,{ok:false,deleted:false,error:'File is still used.',storedName:name,usedBy});json(res,200,deleteFile(dir,name));}catch(e){json(res,500,{ok:false,error:e.message})}}
async function deleteAttached(req,res,dir,type){try{const body=await getJson(req);const usage=type==='jobs'?usageFromJobs(body.jobs||[],body.ignoreJobId||body.jobId||''):usageFromItems(body.items||[],body.ignoreItemId||body.itemId||'');const files=Array.isArray(body.files)?body.files:(Array.isArray(body.plans)?body.plans:[]);const results=[];files.forEach(f=>{const name=fileStoredName(f);if(!name)return;const usedBy=usage[name]||[];if(usedBy.length){results.push({ok:true,deleted:false,skipped:true,storedName:name,usedBy,reason:'Still used.'});return;}results.push(deleteFile(dir,name));});json(res,200,{ok:true,results});}catch(e){json(res,500,{ok:false,error:e.message})}}
function readStore(){ensureData();try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}catch{return defaultStore()}}
function writeStore(data){fs.writeFileSync(DATA_FILE,JSON.stringify({items:Array.isArray(data.items)?data.items:[],orders:Array.isArray(data.orders)?data.orders:[],colors:Array.isArray(data.colors)?data.colors:[]},null,2))}
function serve(req,res){let urlPath=decodeURIComponent(req.url.split('?')[0]);if(urlPath==='/')urlPath='/index.html';const file=path.normalize(path.join(ROOT,urlPath));if(!file.startsWith(ROOT))return send(res,403,'Forbidden');fs.readFile(file,(err,data)=>{if(err)return send(res,404,'Not found');const ext=path.extname(file).toLowerCase();const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.svg':'image/svg+xml','.pdf':'application/pdf','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','.xls':'application/vnd.ms-excel','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.txt':'text/plain; charset=utf-8','.zip':'application/zip'};res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'});res.end(data);});}
ensureData();ensureDir(PLANS_DIR);ensureDir(JOBFILES_DIR);
const server=http.createServer((req,res)=>{const clean=req.url.split('?')[0];
 if(req.method==='GET'&&clean==='/api/store')return json(res,200,readStore());
 if(req.method==='POST'&&clean==='/api/store'){let body='';req.on('data',c=>{body+=c;if(body.length>50*1024*1024)req.destroy();});req.on('end',()=>{try{writeStore(JSON.parse(body||'{}'));json(res,200,{ok:true})}catch(e){json(res,400,{ok:false,error:e.message})}});return;}
 if(req.method==='POST'&&clean==='/api/upload-plan')return uploadMultipart(req,res,PLANS_DIR,'plans');
 if(req.method==='POST'&&clean==='/api/plans/scan')return scanDir(req,res,PLANS_DIR,'items');
 if(req.method==='POST'&&clean==='/api/plans/delete-file')return deleteChecked(req,res,PLANS_DIR,'items');
 if(req.method==='POST'&&clean==='/api/plans/delete-attached')return deleteAttached(req,res,PLANS_DIR,'items');
 if(req.method==='POST'&&clean==='/api/upload-job-file')return uploadMultipart(req,res,JOBFILES_DIR,'files');
 if(req.method==='POST'&&clean==='/api/job-files/scan')return scanDir(req,res,JOBFILES_DIR,'jobs');
 if(req.method==='POST'&&clean==='/api/job-files/delete-file')return deleteChecked(req,res,JOBFILES_DIR,'jobs');
 if(req.method==='POST'&&clean==='/api/job-files/delete-attached')return deleteAttached(req,res,JOBFILES_DIR,'jobs');
 if(req.method==='POST'&&(clean==='/api/shutdown'||clean==='/shutdown')){json(res,200,{ok:true});setTimeout(()=>server.close(()=>process.exit(0)),200);return;}
 serve(req,res);
});
server.listen(PORT,'0.0.0.0',()=>{console.log(`CajunVeteran site running at http://localhost:${PORT}`);console.log(`Plans folder: ${PLANS_DIR}`);console.log(`JobFiles folder: ${JOBFILES_DIR}`);});
