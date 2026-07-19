const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PLANS_DIR = path.join(ROOT, 'Plans');

function defaultStore(){
  return { items: [], orders: [], colors: [] };
}

function ensureDataFile(){
  if(!fs.existsSync(DATA_FILE)){
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultStore(), null, 2));
  }
}

function ensurePlansDir(){
  if(!fs.existsSync(PLANS_DIR)){
    fs.mkdirSync(PLANS_DIR, { recursive: true });
  }
}

function readStore(){
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return defaultStore();
  }
}

function normalizeStore(data){
  if(!data || typeof data !== 'object') data = {};

  // Preserve any future keys, then normalize the existing shared-store arrays.
  return {
    ...data,
    items: Array.isArray(data.items) ? data.items : [],
    orders: Array.isArray(data.orders) ? data.orders : [],
    colors: Array.isArray(data.colors) ? data.colors : []
  };
}

function writeStore(data){
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalizeStore(data), null, 2));
}

function send(res, code, body, type='text/plain'){
  res.writeHead(code, {
    'Content-Type': type,
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function safeFileName(name){
  return String(name || 'plan')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 160);
}

function isAllowedPlanFile(name){
  const ext = path.extname(String(name || '')).toLowerCase();
  return ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
}

function splitBuffer(buffer, separator){
  const parts = [];
  let start = 0;
  let index;
  while((index = buffer.indexOf(separator, start)) !== -1){
    parts.push(buffer.slice(start, index));
    start = index + separator.length;
  }
  parts.push(buffer.slice(start));
  return parts;
}

function handlePlanUpload(req, res){
  ensurePlansDir();

  const contentType = req.headers['content-type'] || '';
  const match = contentType.match(/boundary=(?:(?:"([^"]+)")|([^;]+))/i);
  if(!match){
    return send(res, 400, JSON.stringify({ ok:false, error:'Missing upload boundary.' }), 'application/json; charset=utf-8');
  }

  const boundary = Buffer.from('--' + (match[1] || match[2]));
  const chunks = [];
  let size = 0;
  const maxSize = 75 * 1024 * 1024;

  req.on('data', chunk => {
    size += chunk.length;
    if(size > maxSize){
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      const rawParts = splitBuffer(body, boundary).slice(1, -1);
      const uploaded = [];

      for(let part of rawParts){
        if(part.slice(0, 2).toString() === '\r\n') part = part.slice(2);
        if(part.slice(-2).toString() === '\r\n') part = part.slice(0, -2);

        const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
        if(headerEnd < 0) continue;

        const header = part.slice(0, headerEnd).toString('utf8');
        const fileData = part.slice(headerEnd + 4);
        const filenameMatch = header.match(/filename="([^"]*)"/i);
        if(!filenameMatch || !filenameMatch[1]) continue;

        const originalName = path.basename(filenameMatch[1]);
        if(!isAllowedPlanFile(originalName)) continue;

        const cleanName = safeFileName(originalName);
        const storedName = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}_${cleanName}`;
        const savePath = path.join(PLANS_DIR, storedName);

        fs.writeFileSync(savePath, fileData);

        uploaded.push({
          name: cleanName,
          storedName,
          url: `/Plans/${encodeURIComponent(storedName)}`,
          size: fileData.length,
          type: path.extname(cleanName).toLowerCase()
        });
      }

      send(res, 200, JSON.stringify({ ok:true, files: uploaded }), 'application/json; charset=utf-8');
    } catch(err){
      send(res, 500, JSON.stringify({ ok:false, error:err.message }), 'application/json; charset=utf-8');
    }
  });

  req.on('error', err => {
    send(res, 500, JSON.stringify({ ok:false, error:err.message }), 'application/json; charset=utf-8');
  });
}

function serveFile(req, res){
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if(urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));
  if(!filePath.startsWith(ROOT)) return send(res, 403, 'Forbidden');

  fs.readFile(filePath, (err, data) => {
    if(err) return send(res, 404, 'Not found');

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      '.html':'text/html; charset=utf-8',
      '.css':'text/css; charset=utf-8',
      '.js':'application/javascript; charset=utf-8',
      '.json':'application/json; charset=utf-8',
      '.png':'image/png',
      '.jpg':'image/jpeg',
      '.jpeg':'image/jpeg',
      '.webp':'image/webp',
      '.gif':'image/gif',
      '.pdf':'application/pdf',
      '.doc':'application/msword',
      '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function shutdownServer(res){
  send(res, 200, JSON.stringify({ ok:true, message:'Server shutdown requested.' }), 'application/json; charset=utf-8');
  setTimeout(() => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1000);
  }, 250);
}

ensureDataFile();
ensurePlansDir();

const server = http.createServer((req, res) => {
  const cleanUrl = req.url.split('?')[0];

  if(req.method === 'GET' && cleanUrl === '/api/store'){
    return send(res, 200, JSON.stringify(readStore()), 'application/json; charset=utf-8');
  }

  if(req.method === 'POST' && cleanUrl === '/api/store'){
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if(body.length > 50 * 1024 * 1024){ req.destroy(); }
    });
    req.on('end', () => {
      try {
        writeStore(JSON.parse(body || '{}'));
        send(res, 200, JSON.stringify({ ok:true }), 'application/json; charset=utf-8');
      } catch(err){
        send(res, 400, JSON.stringify({ ok:false, error:err.message }), 'application/json; charset=utf-8');
      }
    });
    return;
  }

  // Woodworking Plans upload route.
  // Accepts multipart/form-data with field name "plans".
  if(req.method === 'POST' && cleanUrl === '/api/upload-plan'){
    return handlePlanUpload(req, res);
  }

  // Keeps compatibility with the Admin close button, if you are using it.
  if(req.method === 'POST' && (cleanUrl === '/api/shutdown' || cleanUrl === '/shutdown')){
    return shutdownServer(res);
  }

  serveFile(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CajunVeteran 3D Printing site running:`);
  console.log(`  This PC: http://localhost:${PORT}`);
  console.log(`  Other house PCs: http://<THIS-PC-IP>:${PORT}`);
  console.log(`  Woodworking Plans folder: ${PLANS_DIR}`);
});
