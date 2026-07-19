const STORAGE_KEY='inventory_orders_store_v9';
const DEFAULT_STORE={items:[],orders:[],colors:[]};
let __cvStoreCache=null;
let __cvCloudAvailable=false;
let __cvSaveTimer=null;
function normalizeStore(data){
  if(!data || typeof data!=='object') data={};
  const s={items:Array.isArray(data.items)?data.items:[],orders:Array.isArray(data.orders)?data.orders:[],colors:Array.isArray(data.colors)?data.colors:[]};
  s.items=s.items.map(i=>({...i,colors:Array.isArray(i.colors)?i.colors:[]}));
  s.orders=s.orders.map(o=>({...o,lines:Array.isArray(o.lines)?o.lines:[],paid:!!o.paid,discountType:o.discountType||'none',discountValue:Number(o.discountValue||0)||0,surchargeType:o.surchargeType||'none',surchargeValue:Number(o.surchargeValue||0)||0}));
  return s;
}
function loadStore(){
  if(__cvStoreCache) return __cvStoreCache;
  const r=localStorage.getItem(STORAGE_KEY);
  if(!r){__cvStoreCache=normalizeStore(DEFAULT_STORE);localStorage.setItem(STORAGE_KEY,JSON.stringify(__cvStoreCache));return __cvStoreCache;}
  try{__cvStoreCache=normalizeStore(JSON.parse(r));return __cvStoreCache;}catch(e){__cvStoreCache=normalizeStore(DEFAULT_STORE);return __cvStoreCache;}
}
function postStoreToServer(store){
  if(!__cvCloudAvailable) return;
  clearTimeout(__cvSaveTimer);
  __cvSaveTimer=setTimeout(()=>{fetch('/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(store)}).catch(err=>console.warn('Shared save failed; local browser copy was kept.',err));},150);
}
function saveStore(s){__cvStoreCache=normalizeStore(s);localStorage.setItem(STORAGE_KEY,JSON.stringify(__cvStoreCache));postStoreToServer(__cvStoreCache)}
async function initSharedStore(){
  try{
    const res=await fetch('/api/store',{cache:'no-store'});
    if(!res.ok) throw new Error('No shared API found');
    const data=await res.json();
    __cvCloudAvailable=true;
    __cvStoreCache=normalizeStore(data);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(__cvStoreCache));
    return __cvStoreCache;
  }catch(err){__cvCloudAvailable=false;return loadStore();}
}
function rerenderAllViews(){try{renderItemsPublic?.();}catch(e){} try{renderOrdersPublic?.();}catch(e){} try{renderAdminTables?.();}catch(e){} try{refreshColorSelects?.();}catch(e){} try{refreshOrderItemSelects?.();}catch(e){} try{suggestNextOrderId?.();}catch(e){} try{suggestNextSku?.();}catch(e){}}
if(typeof document!=='undefined'){document.addEventListener('DOMContentLoaded',()=>{initSharedStore().then(()=>rerenderAllViews());});}

const DEFAULT_ITEM_PREVIEW='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" rx="18" fill="%230a1827"/><path d="M48 123h84l-20-26-17 19-23-31-24 38z" fill="%233b5f83"/><circle cx="124" cy="57" r="14" fill="%23f0b429"/><text x="90" y="153" text-anchor="middle" fill="%2393a3b5" font-family="Segoe UI,Arial" font-size="14">No Image</text></svg>';
function setDefaultItemPreview(){ const img=document.getElementById('imgPreview'); if(img && !img.getAttribute('src')) img.src=DEFAULT_ITEM_PREVIEW; }
function currency(v){if(v===''||v===null||v===undefined)return'';return `$${Number(v).toFixed(2)}`}
function byPriority(a,b){return Number(a.priority||9)-Number(b.priority||9)}
function fmtDate(s){ if(!s) return ''; if(/^\d{4}-\d{2}-\d{2}$/.test(s)){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString(); } try{ return new Date(s).toLocaleDateString(); }catch{ return s; } }
function statusLabel(v){if(v==='in_progress')return'In Process';if(v==='completed'||v==='ready')return'Completed';if(v==='shipped')return'Shipped';return'New'}
function orderSubtotal(store, order){ try{ const lines=Array.isArray(order.lines)?order.lines:[]; return lines.reduce((sum,l)=>{ const it=(store.items||[]).find(i=>i.sku===l.sku); const price=Number(it?.price||0); const qty=Number(l?.qty||0); return sum + (isNaN(price)||isNaN(qty)?0: price*qty); },0);}catch(e){return 0;} }
function orderAdjustment(order, subtotal){ const t=order?.discountType||'none'; const v=Number(order?.discountValue||0); if(t==='percent') return Math.max(0, subtotal*(isNaN(v)?0:v/100)); if(t==='amount') return Math.max(0, isNaN(v)?0:v); return 0; }
function orderSurcharge(order, subtotal){ const t=order?.surchargeType||'none'; const v=Number(order?.surchargeValue||0); if(t==='percent') return Math.max(0, subtotal*(isNaN(v)?0:v/100)); if(t==='amount') return Math.max(0, isNaN(v)?0:v); return 0; }
function orderFinalTotal(store, order){ const sub=orderSubtotal(store,order); const adj=orderAdjustment(order, sub); const sur=orderSurcharge(order, sub); return Math.max(0, sub - adj + sur); }
function ordersStatusSelectHtml(order){return `<select data-act="pvStatus" data-id="${order.orderId}" style="background:#0a1827;color:#e9edf2;border:1px solid #28415e;border-radius:4px;padding:3px 6px">`+`<option value="new" ${order.status==='new'?'selected':''}>New</option>`+`<option value="in_progress" ${order.status==='in_progress'?'selected':''}>In Process</option>`+`<option value="completed" ${order.status==='completed'?'selected':''}>Completed</option>`+`<option value="shipped" ${order.status==='shipped'?'selected':''}>Shipped/Delivered</option>`+`</select>`}
function ordersPaidToggleHtml(order){return `${order.paid?`<span class="badge ok">Paid</span>`:`<span class="badge muted">Unpaid</span>`} `+`<label class="paid-toggle" style="margin-left:6px;cursor:pointer;"><input type="checkbox" data-act="togglePaid" data-id="${order.orderId}" ${order.paid?'checked':''}/> paid</label>`}
function renderItemsPublic(){const s=loadStore();const q=(document.getElementById('searchItems')?.value||'').toLowerCase();const f=document.getElementById('filterAvailability')?.value||'all';const tbody=document.getElementById('itemsTable');if(!tbody)return;tbody.innerHTML='';let count=0;s.items.filter(i=>i.visible!==false).filter(i=>{if(f==='in')return Number(i.qty||0)>0;if(f==='out')return Number(i.qty||0)<=0;return true}).filter(i=>`${i.sku} ${i.name} ${i.desc||''}`.toLowerCase().includes(q)).forEach(i=>{const tr=document.createElement('tr');const dims=[i.length,i.width,i.height].filter(v=>v!==''&&v!==undefined&&v!==null).join(' x ');const colors=(i.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(', ');tr.innerHTML=`<td class="img-cell">${i.image?`<img class="img-thumb" src="${i.image}" alt="${i.name||'item'}"/>`:``}</td><td>${i.sku||''}</td><td>${i.name||''}</td><td><span class="desc">${i.desc||''}</span></td><td>${i.size||''}</td><td><span class="dim-badge">${dims}</span></td><td class="colors-list">${colors}</td><td>${currency(i.price)}</td><td>${Number(i.qty||0)>0?`<span class="badge ok">In stock (${i.qty})</span>`:`<span class="badge muted">Out of stock</span>`}</td>`;tbody.appendChild(tr);count++;});const ci=document.getElementById('countItems'); if(ci) ci.textContent=String(count);tbody.querySelectorAll('.img-thumb').forEach(img=>{img.style.cursor='pointer';img.addEventListener('click',()=>openImageModal(img.src,img.alt))})}
function renderOrdersPublic(){const s=loadStore();const filter=document.getElementById('orderStatusFilter')?.value||'all';const tbodyA=document.getElementById('ordersTableActive');const tbodyC=document.getElementById('ordersTableCompleted');if(!tbodyA||!tbodyC)return;tbodyA.innerHTML='';tbodyC.innerHTML='';let countA=0, countC=0;s.orders.slice().sort(byPriority).forEach(o=>{const lines=Array.isArray(o.lines)?o.lines:[];const items=lines.map(l=>{const it=s.items.find(ii=>ii.sku===l.sku),name=it?it.name:l.sku;return `${name} × ${l.qty}`}).join('<br>');const total=orderFinalTotal(s,o).toFixed(2);const tr=document.createElement('tr');tr.className=`st-${o.status}`;tr.innerHTML=`<td><strong>${o.priority||''}</strong></td><td>${o.orderId||''}</td><td>${o.customer||''}</td><td>${ordersStatusSelectHtml(o)}</td><td>${fmtDate(o.orderDate)}</td><td>${fmtDate(o.dueDate)}</td><td>${items}</td><td>${total}</td><td>${ordersPaidToggleHtml(o)}</td>`;if(o.status==='shipped') { tbodyC.appendChild(tr); countC++; } else if(filter==='all' || o.status===filter || (filter==='completed'&&(o.status==='completed'||o.status==='ready'))) { tbodyA.appendChild(tr); countA++; }});const ca=document.getElementById('countActive'); if(ca) ca.textContent=String(countA);const cc=document.getElementById('countCompleted'); if(cc) cc.textContent=String(countC);} 
if (typeof document !== 'undefined'){
 document.addEventListener('change', function(e){ var t=e.target; if(!t||!t.getAttribute) return; if(t.getAttribute('data-act')==='togglePaid'){ var id=t.getAttribute('data-id'); var s=loadStore(); var j=s.orders.findIndex(o=>String(o.orderId)==String(id)); if(j>=0){ s.orders[j].paid=!!t.checked; saveStore(s); renderOrdersPublic?.(); renderAdminTables?.(); } } if(t.getAttribute('data-act')==='pvStatus'){ var id2=t.getAttribute('data-id'); var s2=loadStore(); var k=s2.orders.findIndex(o=>String(o.orderId)==String(id2)); if(k>=0){ s2.orders[k].status=t.value; saveStore(s2); renderOrdersPublic?.(); renderAdminTables?.(); } } });
}
function openImageModal(src,cap){const m=document.getElementById('imgModal'),i=document.getElementById('modalImg'),c=document.getElementById('modalCaption');if(!m)return;i.src=src;c.textContent=cap||'';m.classList.remove('hidden');m.style.display='flex';m.setAttribute('aria-hidden','false')}
function closeImageModal(){const m=document.getElementById('imgModal');if(!m)return;m.classList.add('hidden');m.style.display='none';m.setAttribute('aria-hidden','true');const i=document.getElementById('modalImg');if(i)i.src=''}
function setupAdmin(){ renderAdminTables();setupForms();setupBackup();refreshColorSelects();refreshOrderItemSelects();suggestNextOrderId();suggestNextSku(); document.getElementById('adminItemSearch')?.addEventListener('input',()=>renderAdminTables()); setDefaultItemPreview(); }
function setTotalsBadges(activeTotal, completedTotal, shippedTotal){ const inject=(id,total)=>{const badge=document.getElementById(id); if(!badge) return; badge.title=`Total value: $${total.toFixed(2)}`; const sumId=id+'Sum'; let span=document.getElementById(sumId); if(!span){ span=document.createElement('span'); span.id=sumId; span.className='muted'; span.style.marginLeft='8px'; badge.parentNode.insertBefore(span, badge.nextSibling); } span.textContent=`— Total: $${total.toFixed(2)}`; }; inject('adminCountActive', activeTotal); inject('adminCountCompleted', completedTotal); inject('adminCountShipped', shippedTotal); }
function updateDashboardCards(activeCount, completedCount, shippedCount, activeTotal, completedTotal, shippedTotal, itemsCount, colorsCount){ const set=(id,val)=>{const el=document.getElementById(id); if(el) el.textContent=val;}; set('dashActiveCount',String(activeCount)); set('dashCompletedCount',String(completedCount)); set('dashShippedCount',String(shippedCount)); set('dashActiveTotal',`Total: $${activeTotal.toFixed(2)}`); set('dashCompletedTotal',`Total: $${completedTotal.toFixed(2)}`); set('dashShippedTotal',`Total: $${shippedTotal.toFixed(2)}`); set('dashItemsCount',String(itemsCount)); set('dashColorsCount',`Colors: ${colorsCount}`); }


function colorToCssSwatch(colorName){
  const raw = String(colorName || '').trim();
  const c = raw.toLowerCase();
  const map = {
    black:'#111827', white:'#f8fafc', red:'#dc2626', blue:'#2563eb', green:'#16a34a', yellow:'#facc15', orange:'#f97316', purple:'#7c3aed', pink:'#ec4899', brown:'#92400e', gray:'#6b7280', grey:'#6b7280', silver:'#c0c0c0', gold:'#f0b429', tan:'#d2b48c', beige:'#d7c4a3', cream:'#fff7df', clear:'rgba(255,255,255,.15)', transparent:'rgba(255,255,255,.15)',
    maroon:'#7f1d1d', burgundy:'#800020', navy:'#1e3a8a', teal:'#0f766e', cyan:'#06b6d4', lime:'#84cc16', olive:'#556b2f', bronze:'#b08d57', copper:'#b87333'
  };
  for(const key of Object.keys(map)){ if(c.includes(key)) return map[key]; }
  // Mardi Gras / specialty hints
  if(c.includes('mardi')) return 'linear-gradient(90deg,#6d28d9 0 33%,#facc15 33% 66%,#16a34a 66%)';
  if(c.includes('rainbow')) return 'linear-gradient(90deg,#ef4444,#f97316,#facc15,#22c55e,#3b82f6,#8b5cf6)';
  if(c.includes('glow')) return '#a7f3d0';
  return '#64748b';
}
function colorSwatchHtml(colorName){
  const css = colorToCssSwatch(colorName);
  return `<span class="color-swatch" style="background:${css}"></span><span class="color-name-text">${colorName || ''}</span>`;
}
function renderAdminTables(){const s=loadStore(); const tc=document.getElementById('colorsTable'); if(tc){ tc.innerHTML=''; s.colors.forEach((c,idx)=>{ const tr=document.createElement('tr'); tr.innerHTML=`<td>${c.brand}</td><td>${c.type}</td><td class="color-cell">${colorSwatchHtml(c.color)}</td><td class="action-cell color-actions"><button class="mini-action edit-action icon-action" title="Edit color" aria-label="Edit color" data-act="editColor" data-idx="${idx}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete color" aria-label="Delete color" data-act="delColor" data-idx="${idx}">🗑</button></td>`; tc.appendChild(tr); }); document.querySelectorAll('[data-act="editColor"]').forEach(b=>b.addEventListener('click',onEditColor)); document.querySelectorAll('[data-act="delColor"]').forEach(b=>b.addEventListener('click',onDelColor)); const cc=document.getElementById('adminCountColors'); if(cc) cc.textContent=String(s.colors.length); } const ti=document.getElementById('adminItemsTable'); if(ti){ ti.innerHTML=''; const q=(document.getElementById('adminItemSearch')?.value||'').toLowerCase().trim(); const adminItems=s.items.map((item,idx)=>({item,idx})).filter(({item})=>{ if(!q) return true; const colorText=(item.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(' '); return `${item.sku||''} ${item.name||''} ${item.size||''} ${item.desc||''} ${item.price||''} ${item.qty||''} ${colorText}`.toLowerCase().includes(q); }); adminItems.forEach(({item:i,idx})=>{ const tr=document.createElement('tr'); const dims=[i.length,i.width,i.height].filter(v=>v!==''&&v!==undefined&&v!==null).join(' x '); const colors=(i.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(', '); tr.innerHTML=`<td class="img-cell">${i.image?`<img class="img-thumb" src="${i.image}" alt="${i.name||'item'}"/>`:``}</td><td>${i.sku||''}</td><td>${i.name||''}</td><td>${i.size||''}</td><td><span class="dim-badge">${Number(i.printHours||0)}h ${Number(i.printMinutes||0)}m</span></td><td>${i.grams?`${i.grams}g`:''}</td><td class="colors-list">${colors}</td><td><span class="desc">${i.desc||''}</span></td><td><span class="dim-badge">${dims}</span></td><td>${currency(i.price)}</td><td>${i.qty||0}</td><td><label class="item-active-check" title="Toggle active"><input type="checkbox" data-act="toggleItemActive" data-idx="${idx}" ${i.visible===false?'':'checked'}/></label></td><td class="action-cell item-actions"><button class="mini-action edit-action icon-action" title="Edit item" aria-label="Edit item" data-act="editItem" data-idx="${idx}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete item" aria-label="Delete item" data-act="delItem" data-idx="${idx}">🗑</button></td>`; ti.appendChild(tr); }); document.querySelectorAll('[data-act="editItem"]').forEach(b=>b.addEventListener('click',onEditItem)); document.querySelectorAll('[data-act="delItem"]').forEach(b=>b.addEventListener('click',onDelItem)); const ci=document.getElementById('adminCountItems'); if(ci) ci.textContent=q?`${adminItems.length}/${s.items.length}`:String(s.items.length); } const ta=document.getElementById('adminOrdersTableActive'); const tcpl=document.getElementById('adminOrdersTableCompleted'); const ts=document.getElementById('adminOrdersTableShipped'); if(ta&&tcpl&&ts){ ta.innerHTML=''; tcpl.innerHTML=''; ts.innerHTML=''; let cA=0,cC=0,cS=0; let listA=[], listC=[], listS=[]; s.orders.slice().sort(byPriority).forEach((o)=>{ const lines=Array.isArray(o.lines)?o.lines:[]; const text=lines.map(l=>{ const it=s.items.find(x=>x.sku===l.sku); const label=it?it.name:l.sku; return `${label} × ${l.qty}`; }).join(', '); const sub=orderSubtotal(s,o), adj=orderAdjustment(o, sub), sur=orderSurcharge(o, sub), tot=orderFinalTotal(s,o); const tr=document.createElement('tr'); tr.className=`st-${o.status}`; tr.innerHTML=`<td><span class=\"priority-chip\">${o.priority||''}</span></td><td class=\"order-id\">${o.orderId||''}</td><td class=\"customer-cell\">${o.customer||''}</td><td><span class=\"status-badge status-${o.status||'new'}\">${statusLabel(o.status)}</span></td><td class=\"due-cell\">${fmtDate(o.dueDate)}</td><td class=\"items-cell\" title=\"${String(text).replace(/\"/g,'&quot;')}\">${text}</td><td class=\"money-cell\">${tot.toFixed(2)}</td><td>${o.paid?`<span class=\"paid-dot paid\">Paid</span>`:`<span class=\"paid-dot unpaid\">Unpaid</span>`}</td><td class=\"action-cell\"><button class=\"mini-action edit-action\" data-act=\"editOrder\" data-id=\"${o.orderId}\">Edit</button><button class=\"mini-action delete-action danger\" data-act=\"delOrder\" data-id=\"${o.orderId}\">Delete</button></td>`; if(o.status==='shipped'){ ts.appendChild(tr); cS++; listS.push(o); } else if(o.status==='completed' || o.status==='ready'){ tcpl.appendChild(tr); cC++; listC.push(o); } else { ta.appendChild(tr); cA++; listA.push(o); } }); const bA=document.getElementById('adminCountActive'); if(bA) bA.textContent=String(cA); const bC=document.getElementById('adminCountCompleted'); if(bC) bC.textContent=String(cC); const bS=document.getElementById('adminCountShipped'); if(bS) bS.textContent=String(cS); const totalA=sum(listA,s), totalC=sum(listC,s), totalS=sum(listS,s); setTotalsBadges(totalA,totalC,totalS); updateDashboardCards(cA,cC,cS,totalA,totalC,totalS,s.items.length,s.colors.length); } }
function sum(list,s){ return list.reduce((acc,o)=> acc + orderFinalTotal(s,o), 0); }
function setupForms(){ const f=document.getElementById('itemForm'); const imgIn=document.getElementById('itemImage'); const imgPrev=document.getElementById('imgPreview'); if(imgIn){ imgIn.addEventListener('change', async ()=>{ if(imgIn.files&&imgIn.files[0]){ const data=await fileToDataURL(imgIn.files[0]); imgPrev.src=data; } else imgPrev.src=DEFAULT_ITEM_PREVIEW; }); } const price=document.getElementById('price'); const cost=document.getElementById('costMaterial'); const prof=document.getElementById('profitOut'); function upd(){ const p=parseFloat(price&&price.value||''); const c=parseFloat(cost&&cost.value||''); prof.textContent=(!isNaN(p)&&!isNaN(c))?('$'+(p-c).toFixed(2)):'$0.00'; } if(price) price.addEventListener('input',upd); if(cost) cost.addEventListener('input',upd); f?.addEventListener('submit', async e=>{ e.preventDefault(); const fd=new FormData(f); const s=loadStore(); const sku=(fd.get('sku')||'').toString().trim()||nextSku(); const idx=s.items.findIndex(i=>i.sku===sku); const file=fd.get('image'); let imageData; if(file&&file.size){ imageData=await fileToDataURL(file); } else if(idx>=0){ imageData=s.items[idx].image; } const colorsSel=document.getElementById('itemColorsSelect'); const colors=colorsSel? Array.from(colorsSel.selectedOptions).map(o=>o.value):[]; const item={ sku, name:fd.get('name').toString().trim(), size:(fd.get('size')||'').toString(), printHours:fd.get('printHours')?Number(fd.get('printHours')):0, printMinutes:fd.get('printMinutes')?Number(fd.get('printMinutes')):0, grams:fd.get('grams')?Number(fd.get('grams')):0, price:fd.get('price')?Number(fd.get('price')):'', costMaterial:fd.get('costMaterial')?Number(fd.get('costMaterial')):'', qty:fd.get('qty')?Number(fd.get('qty')):0, desc:fd.get('desc').toString().trim(), length:fd.get('length')?Number(fd.get('length')):'', width:fd.get('width')?Number(fd.get('width')):'', height:fd.get('height')?Number(fd.get('height')):'', image:imageData, colors, visible:(document.getElementById('itemActive') ? document.getElementById('itemActive').checked : fd.get('visible')==='true') }; if(idx>=0) s.items[idx]=item; else s.items.push(item); saveStore(s); f.reset(); if(imgPrev) imgPrev.src=DEFAULT_ITEM_PREVIEW; renderAdminTables(); refreshOrderItemSelects(); suggestNextSku(); prof.textContent='$0.00'; }); const of=document.getElementById('orderForm'); const addBtn=document.getElementById('addLineBtn'); const wrap=of?.querySelector('.order-lines'); function refreshLineColorsSelect(sel,itemSku){ const s=loadStore(); const keep=new Set(Array.from(sel.selectedOptions||[]).map(o=>o.value)); sel.innerHTML=''; s.colors.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.label; sel.appendChild(o); }); if(itemSku){ const it=s.items.find(i=>i.sku===itemSku); const defs=it?.colors||[]; defs.forEach(id=>{ const o=[...sel.options].find(x=>x.value===id); if(o) o.selected=true; }); } else { [...sel.options].forEach(o=>{ if(keep.has(o.value)) o.selected=true; }); } } function refreshOrderItemSelect(sel){ const store=loadStore(); if(!sel) return; const current=sel.value; const items=(store.items||[]).slice().sort((a,b)=>{ const an=(a.name||'').toLowerCase(), bn=(b.name||'').toLowerCase(); if(an<bn) return -1; if(an>bn) return 1; const as=(a.sku||''), bs=(b.sku||''); return as<bs?-1:as>bs?1:0; }); sel.innerHTML=''; items.forEach(i=>{ const o=document.createElement('option'); o.value=i.sku; o.textContent=`${i.name||i.sku} (${i.sku})`; sel.appendChild(o); }); if(current && items.some(it=>String(it.sku)===String(current))) sel.value=current; else if(current){ const o=document.createElement('option'); o.value=current; o.textContent=`${current} (missing item)`; sel.appendChild(o); sel.value=current; } } function updateLinePrice(lineContainer, sku){ try { const s=loadStore(); const it=(s.items||[]).find(i=>i.sku===sku); const el=lineContainer.querySelector('.line-price'); if(!el) return; if(it && it.price!=='' && it.price!==undefined && !isNaN(Number(it.price))) el.textContent = `Price: $${Number(it.price).toFixed(2)}`; else el.textContent = 'Price: —'; } catch {} } function addLine(line){ const d=document.createElement('div'); d.className='order-line'; const qtyVal = (Number(line?.qty) || 1); d.innerHTML=`<label>Item <select class=\"orderItemSelect\"></select><small class=\"line-price muted\"></small></label><label>Qty <input type=\"number\" class=\"orderQtyInput\" min=\"1\" value=\"${qtyVal}\" /></label><label>Color(s) <select class=\"orderLineColorsSelect\" multiple size=\"4\"></select></label><button type=\"button\" class=\"removeLine\" title=\"Remove line\">✕</button>`; wrap.appendChild(d); const itemSel=d.querySelector('.orderItemSelect'); const colorSel=d.querySelector('.orderLineColorsSelect'); refreshOrderItemSelect(itemSel); if(line?.sku) itemSel.value=line.sku; refreshLineColorsSelect(colorSel,itemSel.value); if (line?.colors && Array.isArray(line.colors)){ [...colorSel.options].forEach(o=>{ o.selected = line.colors.includes(o.value); }); } updateLinePrice(d, itemSel.value); itemSel.addEventListener('change', ev=>{ refreshLineColorsSelect(colorSel, ev.target.value); updateLinePrice(d, ev.target.value); }); d.querySelector('.removeLine').addEventListener('click', ()=> d.remove()); } window._cvAddOrderLine = addLine; window._cvRefreshOrderItemSelect = refreshOrderItemSelect; window._cvUpdateLinePrice = updateLinePrice; addBtn?.addEventListener('click', ()=> addLine()); of?.addEventListener('submit', (e)=>{ e.preventDefault(); const fd=new FormData(of); const orderId=(fd.get('orderId')||'').toString().trim()||nextOrderId(); const customer=fd.get('customer').toString().trim(); const orderDate=fd.get('orderDate'); const dueDate=fd.get('dueDate'); const status=fd.get('status'); const priority=Number(fd.get('priority')||3); const discountType=(fd.get('discountType')||'none').toString(); const discountValue=Number(fd.get('discountValue')||0); const surchargeType=(fd.get('surchargeType')||'none').toString(); const surchargeValue=Number(fd.get('surchargeValue')||0); const paid=document.getElementById('paidChk')?.checked||false; const notes=fd.get('notes').toString().trim(); const lines=Array.from(wrap.querySelectorAll('.order-line')).map(d=>{ const sku=d.querySelector('.orderItemSelect').value; const qty=Number(d.querySelector('.orderQtyInput').value||1)||1; const colors=Array.from(d.querySelector('.orderLineColorsSelect').selectedOptions).map(o=>o.value); return { sku, qty, colors }; }).filter(l=>l.sku); const s=loadStore(); const j=s.orders.findIndex(o=>String(o.orderId)===String(orderId)); const o={orderId,customer,lines,orderDate,dueDate,status,priority,discountType,discountValue,surchargeType,surchargeValue,notes,paid}; if (j>=0) s.orders[j]=o; else s.orders.push(o); saveStore(s); of.reset(); wrap.innerHTML=''; addLine(); renderAdminTables(); suggestNextOrderId(); }); wrap?.querySelectorAll('.order-line').forEach(d=>{ const rem=d.querySelector('.removeLine'); if(rem) rem.addEventListener('click',()=>d.remove()); const itemSel=d.querySelector('.orderItemSelect'); const colorSel=d.querySelector('.orderLineColorsSelect'); refreshOrderItemSelect(itemSel); refreshLineColorsSelect(colorSel, itemSel.value); updateLinePrice(d, itemSel.value); itemSel.addEventListener('change', ev=>{ refreshLineColorsSelect(colorSel, ev.target.value); updateLinePrice(d, ev.target.value); }); });
 // ---- Colors form wiring ----
 const colorForm = document.getElementById('colorForm'); const colorIdxIn = document.getElementById('colorIdx'); function clean(s){ return String(s||'').trim(); } function makeColorId(brand, type, color){ return `${clean(brand).toLowerCase()}|${clean(type).toLowerCase()}|${clean(color).toLowerCase()}`; } function makeColorLabel(brand, type, color){ return `${clean(brand)} ${clean(type)} — ${clean(color)}`; } document.getElementById('colorFormReset')?.addEventListener('click', () => { colorForm?.reset(); if (colorIdxIn) colorIdxIn.value = ''; const ca=document.getElementById('colorActive'); if(ca) ca.checked=true; const sw=document.getElementById('colorSwatch'); if(sw) sw.value='#64748b'; const hx=document.getElementById('colorHex'); if(hx) hx.value='#64748b'; }); colorForm?.addEventListener('submit', (e) => { e.preventDefault(); const fd = new FormData(colorForm); const brand = fd.get('brand'); const type = fd.get('type'); const color = fd.get('color'); if (!brand || !type || !color) return; const s = loadStore(); const id = makeColorId(brand, type, color); const label = makeColorLabel(brand, type, color); const idxStr = colorIdxIn?.value || ''; const idx = idxStr === '' ? -1 : Number(idxStr); const active = document.getElementById('colorActive')?.checked !== false; const swatchInput = document.getElementById('colorSwatch'); const hexInput = document.getElementById('colorHex'); const hexValue = (hexInput?.value || '').trim(); const validHex = /^#[0-9a-fA-F]{6}$/.test(hexValue); const swatch = validHex ? hexValue : (swatchInput?.value || colorToCssSwatch(color)); const record = { id, brand, type, color, label, active, swatch }; if (idx >= 0 && s.colors[idx]) { s.colors[idx] = record; } else { const existing = s.colors.findIndex((c) => c.id === id); if (existing >= 0) s.colors[existing] = record; else s.colors.push(record); } saveStore(s); colorForm.reset(); if (colorIdxIn) colorIdxIn.value = ''; renderAdminTables(); refreshColorSelects(); }); }
function onEditColor(e){ const idx=Number(e.target.dataset.idx); const s=loadStore(); const c=s.colors[idx]; const f=document.getElementById('colorForm'); f.brand.value=c.brand; f.type.value=c.type; f.color.value=c.color; const ca=document.getElementById('colorActive'); if(ca) ca.checked = (c.active !== false); const sw=document.getElementById('colorSwatch'); const hx=document.getElementById('colorHex'); const swVal=c.swatch || colorToCssSwatch(c.color); if(sw && String(swVal).startsWith('#')) sw.value = swVal; if(hx) hx.value = String(swVal).startsWith('#') ? swVal : ''; const idxIn = document.getElementById('colorIdx'); if (idxIn) idxIn.value = String(idx); // auto-open Colors panel for UX
 const details = f.closest('details'); if (details && !details.open) details.open = true; f.scrollIntoView({behavior:'smooth'}); }
function onDelColor(e){ const idx=Number(e.target.dataset.idx); const s=loadStore(); if(confirm('Delete this color?')){ const id=s.colors[idx].id; s.colors.splice(idx,1); s.items.forEach(it=>{ if(Array.isArray(it.colors)) it.colors = it.colors.filter(cid=>cid!==id); }); saveStore(s); renderAdminTables(); refreshColorSelects(); } }
function onEditItem(e){ const idx=Number(e.target.dataset.idx); const s=loadStore(); const it=s.items[idx]; const f=document.getElementById('itemForm'); f.sku.value=it.sku||''; f.name.value=it.name||''; document.getElementById('size').value=it.size||'Mini'; if(f.printHours) f.printHours.value=it.printHours||0; if(f.printMinutes) f.printMinutes.value=it.printMinutes||0; if(f.grams) f.grams.value=it.grams||0; f.price.value=it.price||''; const cm=document.getElementById('costMaterial'); if(cm) cm.value=it.costMaterial||''; const pf=document.getElementById('profitOut'); if(pf){ const pN=Number(it.price||0)-Number(it.costMaterial||0); if(!isNaN(pN)) pf.textContent='$'+pN.toFixed(2); } f.qty.value=it.qty||0; f.desc.value=it.desc||''; f.length.value=it.length||''; f.width.value=it.width||''; f.height.value=it.height||''; if(document.getElementById('itemActive')) document.getElementById('itemActive').checked=(it.visible!==false); else if(f.visible) if(document.getElementById('itemActive')) document.getElementById('itemActive').checked=(it.visible!==false); else if(f.visible) f.visible.value=(it.visible===false?'false':'true'); const prev=document.getElementById('imgPreview'); if(prev) prev.src=it.image||DEFAULT_ITEM_PREVIEW; const sel=document.getElementById('itemColorsSelect'); if(sel){ Array.from(sel.options).forEach(o=>{ o.selected=(it.colors||[]).includes(o.value); }); } f.scrollIntoView({behavior:'smooth'}); }
function onDelItem(e){ const idx=Number(e.target.dataset.idx); const s=loadStore(); if(confirm('Delete this item?')){ const sku=s.items[idx].sku; s.items.splice(idx,1); s.orders.forEach(o=>{ if(Array.isArray(o.lines)) o.lines=o.lines.filter(l=>l.sku!==sku); }); saveStore(s); renderAdminTables(); } }
function onEditOrder(e){ const oid=String(e.target.dataset.id||''); const s=loadStore(); const pos=s.orders.findIndex(o=>String(o.orderId)===oid); if(pos<0) return; const o=s.orders[pos]; const f=document.getElementById('orderForm'); const w=f.querySelector('.order-lines'); f.orderId.value=o.orderId||''; f.customer.value=o.customer||''; f.orderDate.value=o.orderDate||''; f.dueDate.value=o.dueDate||''; f.status.value=o.status||'new'; f.priority.value=o.priority||3; (document.getElementById('discountType')||{}).value=o.discountType||'none'; (document.getElementById('discountValue')||{}).value=(o.discountValue??''); (document.getElementById('surchargeType')||{}).value=o.surchargeType||'none'; (document.getElementById('surchargeValue')||{}).value=(o.surchargeValue??''); const pChk=document.getElementById('paidChk'); if(pChk) pChk.checked=!!o.paid; f.notes.value=o.notes||''; w.innerHTML=''; (o.lines||[]).forEach(line=> window._cvAddOrderLine?.(line)); if((o.lines||[]).length===0) window._cvAddOrderLine?.({qty:1,colors:[]}); w.querySelectorAll('.order-line').forEach(d=>{ const sku=d.querySelector('.orderItemSelect')?.value||''; window._cvUpdateLinePrice?.(d, sku); }); setTimeout(()=>{ const panel=f.closest('.mock-order-form') || f.closest('details') || f; const y=panel.getBoundingClientRect().top + window.scrollY - 115; window.scrollTo({top:Math.max(0,y),behavior:'smooth'}); },50); }
function setupBackup(){ const dl=document.getElementById('downloadBackup'); if(dl){ dl.addEventListener('click',()=>{ try{ const raw=localStorage.getItem(STORAGE_KEY)||JSON.stringify({items:[],orders:[],colors:[]}); const blob=new Blob([raw],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='inventory_orders_backup.json'; a.click(); }catch(e){ alert('Could not create backup: '+e.message); } }); } const restore=document.getElementById('restoreFile'); if(restore){ restore.addEventListener('change',(e)=>{ const file=e.target.files&&e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ let text=reader.result; if(typeof text==='string' && text.charCodeAt(0)===0xFEFF){ text=text.slice(1); } let data=JSON.parse(text); if(Array.isArray(data)){ data={items:[],orders:data,colors:[]}; } if(!data || (!Array.isArray(data.items) && !Array.isArray(data.orders))){ if(data && data.store){ data=data.store; } } if(!data || !Array.isArray(data.items) || !Array.isArray(data.orders)){ throw new Error('Invalid backup. Expected keys: items[], orders[], optional colors[].'); } if(!Array.isArray(data.colors)) data.colors=[]; data.orders=data.orders.map(o=>({ orderId:String(o.orderId||''), customer:String(o.customer||''), lines:Array.isArray(o.lines)? o.lines.map(l=>({ sku:String(l.sku||''), qty:Number(l.qty||1)||1, colors:Array.isArray(l.colors)? l.colors:[] })) : [], orderDate:o.orderDate||'', dueDate:o.dueDate||'', status:o.status||'new', priority:Number(o.priority||3)||3, discountType:o.discountType||'none', discountValue:Number(o.discountValue||0)||0, surchargeType:o.surchargeType||'none', surchargeValue:Number(o.surchargeValue||0)||0, notes:o.notes||'', paid:!!o.paid })); data.items=data.items.map(i=>({ sku:String(i.sku||''), name:String(i.name||''), size:i.size||'', printHours:Number(i.printHours||i.hours||0)||0, printMinutes:Number(i.printMinutes||i.minutes||0)||0, grams:Number(i.grams||0)||0, price:(i.price===''||i.price===undefined)?'':Number(i.price), costMaterial:(i.costMaterial===''||i.costMaterial===undefined)?'':Number(i.costMaterial), qty:Number(i.qty||0)||0, desc:i.desc||'', length:(i.length===''||i.length===undefined)?'':Number(i.length), width:(i.width===''||i.width===undefined)?'':Number(i.width), height:(i.height===''||i.height===undefined)?'':Number(i.height), image:i.image||'', colors:Array.isArray(i.colors)? i.colors:[], visible:(i.visible===false)?false:true })); saveStore(data); alert('Backup restored successfully.'); renderAdminTables(); refreshColorSelects(); refreshOrderItemSelects(); suggestNextOrderId(); suggestNextSku(); }catch(err){ alert('Restore failed: '+err.message); console.error(err); } finally { restore.value=''; } }; reader.onerror=()=>{ alert('Could not read the selected file.'); restore.value=''; }; reader.readAsText(file); }); } const clearBtn=document.getElementById('clearAll'); if(clearBtn){ clearBtn.addEventListener('click',()=>{ if(confirm('This will erase all items, colors, and orders on this device. Continue?')){ saveStore({items:[],orders:[],colors:[]}); renderAdminTables(); refreshColorSelects(); refreshOrderItemSelects(); suggestNextOrderId(); suggestNextSku(); } }); } }
function refreshColorSelects(){ const s=loadStore(); const sel=document.getElementById('itemColorsSelect'); if(!sel) return; const selected=new Set(Array.from(sel.selectedOptions||[]).map(o=>o.value)); sel.innerHTML=''; s.colors.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.label; if(selected.has(o.value)) o.selected=true; sel.appendChild(o); }); }
function refreshOrderItemSelects(){ document.querySelectorAll('.orderItemSelect').forEach(s=> { const ev = new Event('change'); s.dispatchEvent(ev); }); }
function nextOrderId(){ const s=loadStore(); const nums=s.orders.map(o=>Number(o.orderId)).filter(n=>!isNaN(n)); const max=nums.length?Math.max(...nums):100000; return String(max+1); }
function suggestNextOrderId(){ const f=document.getElementById('orderForm'); if(!f) return; if(!f.orderId.value) f.orderId.value=nextOrderId(); }
function nextSku(){ const s=loadStore(); const nums=s.items.map(i=>Number(i.sku)).filter(n=>!isNaN(n)); const max=nums.length?Math.max(...nums):1000000; return String(max+1); }
function suggestNextSku(){ const s=document.getElementById('sku'); if(!s) return; if(!s.value) s.value=nextSku(); }
function fileToDataURL(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }
(function(){ if (typeof document === 'undefined') return; if (document.__hasGlobalActHandler) return; document.__hasGlobalActHandler = true; document.addEventListener('click', function(e){ var el = e.target.closest('[data-act]'); if (!el) return; var act = el.getAttribute('data-act'); if (!act) return; if (act === 'editColor') { e.preventDefault(); try{ onEditColor({target: el}); }catch(_){} return; } if (act === 'delColor') { e.preventDefault(); try{ onDelColor({target: el}); }catch(_){} return; } if (act === 'editItem') { e.preventDefault(); try{ onEditItem({target: el}); }catch(_){} return; } if (act === 'delItem') { e.preventDefault(); try{ onDelItem({target: el}); }catch(_){} return; } if (act === 'editOrder') { e.preventDefault(); try{ onEditOrder({target: el}); }catch(_){} return; } if (act === 'delOrder') { e.preventDefault(); try{ onDelOrder({target: el}); }catch(_){} return; } }, true); })();
function onDelOrder(e){ try{ var oid = String(e.target.dataset.id||''); var s = loadStore(); var pos=s.orders.findIndex(o=>String(o.orderId)===oid); if(pos<0) return; if (confirm('Delete this order?')){ s.orders.splice(pos,1); saveStore(s); renderAdminTables?.(); } }catch(_){} }


/* =========================================================
   Admin Order Controls v6
   - priority color by number
   - paid checkbox in Admin table
   - icon actions
   - 10/order pagination with arrows
   ========================================================= */
window.__adminOrderPages = window.__adminOrderPages || { active:0, completed:0, shipped:0 };
const ADMIN_PAGE_SIZE = 10;

function adminPriorityClass(priority){
  const p = Number(priority || 9);
  if (p <= 1) return 'priority-p1';
  if (p === 2) return 'priority-p2';
  if (p === 3) return 'priority-p3';
  if (p === 4) return 'priority-p4';
  return 'priority-p5';
}
function adminOrderActionButtons(orderId){
  return `<button class="mini-action edit-action icon-action" title="Edit order" aria-label="Edit order" data-act="editOrder" data-id="${orderId}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete order" aria-label="Delete order" data-act="delOrder" data-id="${orderId}">🗑</button>`;
}
function adminPaidCheckbox(order){
  return `<label class="admin-paid-check" title="Toggle paid"><input type="checkbox" data-act="togglePaid" data-id="${order.orderId}" ${order.paid?'checked':''}/><span>${order.paid?'Paid':'Unpaid'}</span></label>`;
}
function ensureAdminPager(tbody, section){
  if(!tbody) return null;
  const table = tbody.closest('table');
  const wrap = table?.parentElement;
  if(!wrap) return null;
  let pager = wrap.querySelector(`.admin-pager[data-section="${section}"]`);
  if(!pager){
    pager = document.createElement('div');
    pager.className = 'admin-pager';
    pager.setAttribute('data-section', section);
    wrap.appendChild(pager);
  }
  return pager;
}
function renderAdminPager(section, totalRows, pager){
  if(!pager) return;
  const totalPages = Math.max(1, Math.ceil(totalRows / ADMIN_PAGE_SIZE));
  let page = window.__adminOrderPages[section] || 0;
  if(page > totalPages - 1) page = totalPages - 1;
  if(page < 0) page = 0;
  window.__adminOrderPages[section] = page;
  const start = totalRows ? (page * ADMIN_PAGE_SIZE + 1) : 0;
  const end = Math.min(totalRows, (page + 1) * ADMIN_PAGE_SIZE);
  const nums = Array.from({length: totalPages}, (_,i)=>`<button type="button" class="page-num ${i===page?'active':''}" data-admin-page-section="${section}" data-admin-page-set="${i}">${i+1}</button>`).join('');
  pager.innerHTML = `<span class="pager-info">Showing ${start} to ${end} of ${totalRows} orders</span><div class="pager-buttons"><button type="button" data-admin-page-section="${section}" data-admin-page-move="prev" ${page===0?'disabled':''}>‹</button>${nums}<button type="button" data-admin-page-section="${section}" data-admin-page-move="next" ${page===totalPages-1?'disabled':''}>›</button></div>`;
}
function adminOrderRowHtml(o, s){
  const lines=Array.isArray(o.lines)?o.lines:[];
  const text=lines.map(l=>{ const it=s.items.find(x=>x.sku===l.sku); const label=it?it.name:l.sku; return `${label} × ${l.qty}`; }).join(', ');
  const tot=orderFinalTotal(s,o);
  const status = o.status || 'new';
  const safeTitle = String(text).replace(/"/g,'&quot;');
  return `<td><span class="priority-chip ${adminPriorityClass(o.priority)}">${o.priority||''}</span></td><td class="order-id">${o.orderId||''}</td><td class="customer-cell">${o.customer||''}</td><td><span class="status-badge status-${status}">${statusLabel(status)}</span></td><td class="due-cell">${fmtDate(o.dueDate)}</td><td class="items-cell" title="${safeTitle}">${text}</td><td class="money-cell">${tot.toFixed(2)}</td><td>${adminPaidCheckbox(o)}</td><td class="action-cell">${adminOrderActionButtons(o.orderId)}</td>`;
}
function renderAdminOrderSection(section, tbody, orders, s){
  if(!tbody) return;
  tbody.innerHTML='';
  const page = window.__adminOrderPages[section] || 0;
  const start = page * ADMIN_PAGE_SIZE;
  orders.slice(start, start + ADMIN_PAGE_SIZE).forEach(o=>{
    const tr=document.createElement('tr');
    tr.className=`st-${o.status}`;
    tr.innerHTML=adminOrderRowHtml(o, s);
    tbody.appendChild(tr);
  });
  renderAdminPager(section, orders.length, ensureAdminPager(tbody,section));
}

function renderAdminTables(){
  const s=loadStore();

  const tc=document.getElementById('colorsTable');
  if(tc){
    tc.innerHTML='';
    s.colors.forEach((c,idx)=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${c.brand}</td><td>${c.type}</td><td class="color-cell">${colorSwatchHtml(c.color)}</td><td class="action-cell color-actions"><button class="mini-action edit-action icon-action" title="Edit color" aria-label="Edit color" data-act="editColor" data-idx="${idx}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete color" aria-label="Delete color" data-act="delColor" data-idx="${idx}">🗑</button></td>`;
      tc.appendChild(tr);
    });
    const cc=document.getElementById('adminCountColors'); if(cc) cc.textContent=String(s.colors.length);
  }

  const ti=document.getElementById('adminItemsTable');
  if(ti){
    ti.innerHTML='';
    const q=(document.getElementById('adminItemSearch')?.value||'').toLowerCase().trim();
    const adminItems=s.items.map((item,idx)=>({item,idx})).filter(({item})=>{
      if(!q) return true;
      const colorText=(item.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(' ');
      return `${item.sku||''} ${item.name||''} ${item.size||''} ${item.desc||''} ${item.price||''} ${item.qty||''} ${colorText}`.toLowerCase().includes(q);
    });
    adminItems.forEach(({item:i,idx})=>{
      const tr=document.createElement('tr');
      const dims=[i.length,i.width,i.height].filter(v=>v!==''&&v!==undefined&&v!==null).join(' x ');
      const colors=(i.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(', ');
      tr.innerHTML=`<td class="img-cell">${i.image?`<img class="img-thumb" src="${i.image}" alt="${i.name||'item'}"/>`:``}</td><td>${i.sku||''}</td><td>${i.name||''}</td><td>${i.size||''}</td><td><span class="dim-badge">${Number(i.printHours||0)}h ${Number(i.printMinutes||0)}m</span></td><td>${i.grams?`${i.grams}g`:''}</td><td class="colors-list">${colors}</td><td><span class="desc">${i.desc||''}</span></td><td><span class="dim-badge">${dims}</span></td><td>${currency(i.price)}</td><td>${i.qty||0}</td><td><label class="item-active-check" title="Toggle active"><input type="checkbox" data-act="toggleItemActive" data-idx="${idx}" ${i.visible===false?'':'checked'}/></label></td><td class="action-cell item-actions"><button class="mini-action edit-action icon-action" title="Edit item" aria-label="Edit item" data-act="editItem" data-idx="${idx}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete item" aria-label="Delete item" data-act="delItem" data-idx="${idx}">🗑</button></td>`;
      ti.appendChild(tr);
    });
    const ci=document.getElementById('adminCountItems'); if(ci) ci.textContent=q?`${adminItems.length}/${s.items.length}`:String(s.items.length);
  }

  const ta=document.getElementById('adminOrdersTableActive');
  const tcpl=document.getElementById('adminOrdersTableCompleted');
  const ts=document.getElementById('adminOrdersTableShipped');
  if(ta&&tcpl&&ts){
    const all=s.orders.slice().sort(byPriority);
    const listA=[], listC=[], listS=[];
    all.forEach(o=>{
      if(o.status==='shipped') listS.push(o);
      else if(o.status==='completed' || o.status==='ready') listC.push(o);
      else listA.push(o);
    });
    renderAdminOrderSection('active', ta, listA, s);
    renderAdminOrderSection('completed', tcpl, listC, s);
    renderAdminOrderSection('shipped', ts, listS, s);
    const bA=document.getElementById('adminCountActive'); if(bA) bA.textContent=String(listA.length);
    const bC=document.getElementById('adminCountCompleted'); if(bC) bC.textContent=String(listC.length);
    const bS=document.getElementById('adminCountShipped'); if(bS) bS.textContent=String(listS.length);
    const totalA=sum(listA,s), totalC=sum(listC,s), totalS=sum(listS,s);
    setTotalsBadges(totalA,totalC,totalS);
    updateDashboardCards?.(listA.length,listC.length,listS.length,totalA,totalC,totalS,s.items.length,s.colors.length);
  }
}

if(typeof document!=='undefined' && !document.__adminPagerHandler){
  document.__adminPagerHandler=true;
  document.addEventListener('click', function(e){
    const btn=e.target.closest('[data-admin-page-section]');
    if(!btn) return;
    const section=btn.getAttribute('data-admin-page-section');
    if(!section) return;
    if(btn.hasAttribute('data-admin-page-set')){
      window.__adminOrderPages[section]=Number(btn.getAttribute('data-admin-page-set'))||0;
      renderAdminTables();
      return;
    }
    const move=btn.getAttribute('data-admin-page-move');
    if(move==='prev') window.__adminOrderPages[section]=Math.max(0,(window.__adminOrderPages[section]||0)-1);
    if(move==='next') window.__adminOrderPages[section]=(window.__adminOrderPages[section]||0)+1;
    renderAdminTables();
  });
}


/* =========================================================
   Color Active + Pagination v8
   ========================================================= */
window.__adminColorPage = window.__adminColorPage || 0;
const ADMIN_COLOR_PAGE_SIZE = 10;
function activeColorCount(store){ return (store.colors||[]).filter(c=>c.active!==false).length; }
function colorActiveToggleHtml(c, idx){
  return `<label class="color-active-check" title="Toggle active"><input type="checkbox" data-act="toggleColorActive" data-idx="${idx}" ${c.active===false?'':'checked'}/></label>`;
}
function ensureColorPager(tbody){
  if(!tbody) return null;
  const table = tbody.closest('table');
  const wrap = table?.parentElement;
  if(!wrap) return null;
  let pager = wrap.querySelector('.color-pager');
  if(!pager){ pager=document.createElement('div'); pager.className='admin-pager color-pager'; wrap.appendChild(pager); }
  return pager;
}
function renderColorPager(totalRows, pager){
  if(!pager) return;
  const totalPages=Math.max(1,Math.ceil(totalRows/ADMIN_COLOR_PAGE_SIZE));
  let page=window.__adminColorPage||0;
  if(page>totalPages-1) page=totalPages-1;
  if(page<0) page=0;
  window.__adminColorPage=page;
  const start=totalRows?(page*ADMIN_COLOR_PAGE_SIZE+1):0;
  const end=Math.min(totalRows,(page+1)*ADMIN_COLOR_PAGE_SIZE);
  const nums=Array.from({length:totalPages},(_,i)=>`<button type="button" class="page-num ${i===page?'active':''}" data-color-page-set="${i}">${i+1}</button>`).join('');
  pager.innerHTML=`<span class="pager-info">Showing ${start} to ${end} of ${totalRows} colors</span><div class="pager-buttons"><button type="button" data-color-page-move="prev" ${page===0?'disabled':''}>‹</button>${nums}<button type="button" data-color-page-move="next" ${page===totalPages-1?'disabled':''}>›</button></div>`;
}
function renderAdminColorRows(store){
  const tc=document.getElementById('colorsTable');
  if(!tc) return;
  tc.innerHTML='';
  const colors=(store.colors||[]);
  const page=window.__adminColorPage||0;
  colors.slice(page*ADMIN_COLOR_PAGE_SIZE,page*ADMIN_COLOR_PAGE_SIZE+ADMIN_COLOR_PAGE_SIZE).forEach((c,offset)=>{
    const idx=page*ADMIN_COLOR_PAGE_SIZE+offset;
    const tr=document.createElement('tr');
    tr.className = c.active===false ? 'color-inactive-row' : '';
    tr.innerHTML=`<td>${c.brand||''}</td><td>${c.type||''}</td><td class="color-cell"><span class="color-swatch" style="background:${c.swatch || colorToCssSwatch(c.color)}"></span><span class="color-name-text">${c.color||''}</span></td><td>${colorActiveToggleHtml(c,idx)}</td><td class="color-actions"><button class="mini-action edit-action icon-action" title="Edit color" aria-label="Edit color" data-act="editColor" data-idx="${idx}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete color" aria-label="Delete color" data-act="delColor" data-idx="${idx}">🗑</button></td>`;
    tc.appendChild(tr);
  });
  renderColorPager(colors.length, ensureColorPager(tc));
  const cc=document.getElementById('adminCountColors'); if(cc) cc.textContent=String(colors.length);
  const dc=document.getElementById('dashColorsCount'); if(dc) dc.textContent=`Colors: ${activeColorCount(store)}/${colors.length}`;
}

// Wrap the current Admin renderer so the Colors section uses the improved v8 table.
const __renderAdminTablesBeforeColorV8 = renderAdminTables;
renderAdminTables = function(){
  __renderAdminTablesBeforeColorV8();
  renderAdminColorRows(loadStore());
};

if(typeof document!=='undefined' && !document.__colorV8Handlers){
  document.__colorV8Handlers=true;
  document.addEventListener('change', function(e){
    const t=e.target;
    if(!t || !t.getAttribute) return;
    if(t.getAttribute('data-act')==='toggleColorActive'){
      const idx=Number(t.getAttribute('data-idx'));
      const s=loadStore();
      if(s.colors && s.colors[idx]){
        s.colors[idx].active=!!t.checked;
        saveStore(s);
        renderAdminTables();
        refreshColorSelects?.();
      }
    }
  });
  document.addEventListener('click', function(e){
    const set=e.target.closest('[data-color-page-set]');
    const move=e.target.closest('[data-color-page-move]');
    if(set){ window.__adminColorPage=Number(set.getAttribute('data-color-page-set'))||0; renderAdminTables(); return; }
    if(move){ const m=move.getAttribute('data-color-page-move'); if(m==='prev') window.__adminColorPage=Math.max(0,(window.__adminColorPage||0)-1); if(m==='next') window.__adminColorPage=(window.__adminColorPage||0)+1; renderAdminTables(); }
  });
}


/* =========================================================
   Color Swatch Edit v9
   ========================================================= */
function getColorSwatchValue(c){ return c?.swatch || colorToCssSwatch(c?.color || ''); }
if(typeof document!=='undefined' && !document.__colorSwatchV9Handlers){
  document.__colorSwatchV9Handlers=true;
  document.addEventListener('input', function(e){
    const colorName = e.target && e.target.id === 'color' ? e.target.value : null;
    if(colorName !== null){
      const sw=document.getElementById('colorSwatch');
      if(sw && (!sw.dataset.userPicked || sw.dataset.userPicked==='false')){
        const guess=colorToCssSwatch(colorName);
        if(String(guess).startsWith('#')) sw.value=guess;
      }
    }
    if(e.target && e.target.id === 'colorSwatch') e.target.dataset.userPicked='true';
  });
}

// Override edit color to make sure swatch picker is loaded and visible.
onEditColor = function(e){
  const idx=Number(e.target.dataset.idx);
  const s=loadStore();
  const c=s.colors[idx];
  if(!c) return;
  const f=document.getElementById('colorForm');
  f.brand.value=c.brand||'';
  f.type.value=c.type||'';
  f.color.value=c.color||'';
  const sw=document.getElementById('colorSwatch');
  if(sw){ const swVal=getColorSwatchValue(c); if(String(swVal).startsWith('#')) sw.value=swVal; sw.dataset.userPicked='true'; }
  const hx=document.getElementById('colorHex');
  if(hx){ const swVal=getColorSwatchValue(c); hx.value=String(swVal).startsWith('#')?swVal:''; }
  const ca=document.getElementById('colorActive');
  if(ca) ca.checked=(c.active!==false);
  const idxIn=document.getElementById('colorIdx');
  if(idxIn) idxIn.value=String(idx);
  const details=f.closest('details');
  if(details && !details.open) details.open=true;
  // Scroll so the editable fields are visible below the sticky header.
  setTimeout(()=>{
    const panel=document.getElementById('colors') || details || f;
    const y=panel.getBoundingClientRect().top + window.scrollY - 115;
    window.scrollTo({top:Math.max(0,y),behavior:'smooth'});
    f.classList.add('editing-color-form');
    setTimeout(()=>f.classList.remove('editing-color-form'),1600);
  },50);
};

// Override color rows so swatches use the saved custom swatch color.
function renderAdminColorRows(store){
  const tc=document.getElementById('colorsTable');
  if(!tc) return;
  tc.innerHTML='';
  const colors=(store.colors||[]);
  const page=window.__adminColorPage||0;
  colors.slice(page*ADMIN_COLOR_PAGE_SIZE,page*ADMIN_COLOR_PAGE_SIZE+ADMIN_COLOR_PAGE_SIZE).forEach((c,offset)=>{
    const idx=page*ADMIN_COLOR_PAGE_SIZE+offset;
    const tr=document.createElement('tr');
    tr.className = c.active===false ? 'color-inactive-row' : '';
    tr.innerHTML=`<td>${c.brand||''}</td><td>${c.type||''}</td><td class="color-cell"><span class="color-swatch" style="background:${getColorSwatchValue(c)}"></span><span class="color-name-text">${c.color||''}</span></td><td>${colorActiveToggleHtml(c,idx)}</td><td class="color-actions"><button class="mini-action edit-action icon-action" title="Edit color" aria-label="Edit color" data-act="editColor" data-idx="${idx}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete color" aria-label="Delete color" data-act="delColor" data-idx="${idx}">🗑</button></td>`;
    tc.appendChild(tr);
  });
  renderColorPager(colors.length, ensureColorPager(tc));
  const cc=document.getElementById('adminCountColors'); if(cc) cc.textContent=String(colors.length);
  const dc=document.getElementById('dashColorsCount'); if(dc) dc.textContent=`Colors: ${activeColorCount(store)}/${colors.length}`;
}


/* =========================================================
   Color HEX Code Sync v10
   - color picker stays available
   - #HEX field can be typed manually
   ========================================================= */
function setColorHexFromPicker(){
  const sw=document.getElementById('colorSwatch');
  const hx=document.getElementById('colorHex');
  if(sw && hx) hx.value=sw.value;
}
function setPickerFromColorHex(){
  const sw=document.getElementById('colorSwatch');
  const hx=document.getElementById('colorHex');
  if(!sw || !hx) return;
  let v=(hx.value||'').trim();
  if(v && !v.startsWith('#')) v='#'+v;
  if(/^#[0-9a-fA-F]{6}$/.test(v)){
    hx.value=v.toUpperCase();
    sw.value=v;
    sw.dataset.userPicked='true';
  }
}
if(typeof document!=='undefined' && !document.__colorHexV10Handlers){
  document.__colorHexV10Handlers=true;
  document.addEventListener('input', function(e){
    if(e.target && e.target.id==='colorSwatch') setColorHexFromPicker();
    if(e.target && e.target.id==='colorHex') setPickerFromColorHex();
  });
  document.addEventListener('change', function(e){
    if(e.target && e.target.id==='colorSwatch') setColorHexFromPicker();
    if(e.target && e.target.id==='colorHex') setPickerFromColorHex();
  });
}


/* =========================================================
   Add/Edit Order Cleanup v12
   - custom multi color dropdown with swatches
   - keeps the original <select multiple> as the real saved value
   ========================================================= */
function cvColorCssForId(colorId){
  const store = loadStore();
  const c = (store.colors||[]).find(x=>x.id===colorId);
  if(!c) return '#64748b';
  if(c.swatch) return c.swatch;
  if(typeof colorToCssSwatch === 'function') return colorToCssSwatch(c.color || c.label || '');
  return '#64748b';
}
function cvColorLabelForId(colorId){
  const store = loadStore();
  const c = (store.colors||[]).find(x=>x.id===colorId);
  return c ? (c.label || `${c.brand||''} / ${c.type||''} / ${c.color||''}`) : colorId;
}
function cvBuildColorSummary(select, button){
  const selected = Array.from(select.selectedOptions||[]);
  const swatches = selected.slice(0,4).map(o=>`<span class="mcd-mini-swatch" style="background:${cvColorCssForId(o.value)}"></span>`).join('');
  const text = selected.length ? `${selected.length} color${selected.length===1?'':'s'} selected` : 'Choose colors';
  button.innerHTML = `<span class="mcd-summary-swatches">${swatches}</span><span class="mcd-summary-text">${text}</span><span class="mcd-caret">▾</span>`;
}
function cvEnhanceColorSelect(select){
  if(!select || select.dataset.enhancedColorDropdown === 'true') return;
  select.dataset.enhancedColorDropdown = 'true';
  select.classList.add('native-color-select-hidden');

  const wrap = document.createElement('div');
  wrap.className = 'multi-color-dropdown';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mcd-button';
  const menu = document.createElement('div');
  menu.className = 'mcd-menu hidden';
  wrap.appendChild(btn);
  wrap.appendChild(menu);
  select.insertAdjacentElement('afterend', wrap);

  function rebuildMenu(){
    menu.innerHTML = '';
    Array.from(select.options).forEach(opt=>{
      const row = document.createElement('label');
      row.className = 'mcd-option';
      row.innerHTML = `<input type="checkbox" value="${opt.value}" ${opt.selected?'checked':''}/><span class="mcd-swatch" style="background:${cvColorCssForId(opt.value)}"></span><span class="mcd-label">${cvColorLabelForId(opt.value)}</span>`;
      const cb = row.querySelector('input');
      cb.addEventListener('change',()=>{
        opt.selected = cb.checked;
        select.dispatchEvent(new Event('change',{bubbles:true}));
        cvBuildColorSummary(select, btn);
      });
      menu.appendChild(row);
    });
    cvBuildColorSummary(select, btn);
  }

  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    document.querySelectorAll('.mcd-menu').forEach(m=>{ if(m!==menu) m.classList.add('hidden'); });
    menu.classList.toggle('hidden');
  });
  menu.addEventListener('click',e=>e.stopPropagation());
  select.addEventListener('change',rebuildMenu);
  const observer = new MutationObserver(()=>rebuildMenu());
  observer.observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['selected']});
  select.__colorDropdownObserver = observer;
  rebuildMenu();
}
function cvEnhanceAllOrderColorSelects(){
  document.querySelectorAll('.orderLineColorsSelect').forEach(cvEnhanceColorSelect);
}
if(typeof document !== 'undefined' && !document.__orderColorDropdownV12){
  document.__orderColorDropdownV12 = true;
  document.addEventListener('click',()=>document.querySelectorAll('.mcd-menu').forEach(m=>m.classList.add('hidden')));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(cvEnhanceAllOrderColorSelects,100));
  document.addEventListener('change',(e)=>{
    if(e.target && e.target.classList && e.target.classList.contains('orderItemSelect')){
      setTimeout(cvEnhanceAllOrderColorSelects,60);
    }
  });
  const obs = new MutationObserver(()=>setTimeout(cvEnhanceAllOrderColorSelects,50));
  document.addEventListener('DOMContentLoaded',()=>{
    const target = document.querySelector('.order-lines') || document.body;
    obs.observe(target,{childList:true,subtree:true});
    cvEnhanceAllOrderColorSelects();
  });
}



if(typeof document!=='undefined' && !document.__itemPreviewDefaultV15){ document.__itemPreviewDefaultV15=true; document.addEventListener('DOMContentLoaded',()=>setTimeout(setDefaultItemPreview,50)); }


/* =========================================================
   Items Cleanup v16
   - Item Color multi dropdown with swatches
   - Active checkbox support
   - Price/cost step .50 helpers
   ========================================================= */
function cvEnhanceItemColorSelect(){
  const sel=document.getElementById('itemColorsSelect');
  if(!sel || sel.dataset.enhancedItemColors==='true') return;
  sel.dataset.enhancedItemColors='true';
  sel.classList.add('native-color-select-hidden');
  const wrap=document.createElement('div');
  wrap.className='multi-color-dropdown item-color-dropdown';
  const btn=document.createElement('button');
  btn.type='button';
  btn.className='mcd-button';
  const menu=document.createElement('div');
  menu.className='mcd-menu hidden';
  wrap.appendChild(btn); wrap.appendChild(menu);
  sel.insertAdjacentElement('afterend',wrap);
  function rebuild(){
    menu.innerHTML='';
    Array.from(sel.options).forEach(opt=>{
      const row=document.createElement('label');
      row.className='mcd-option';
      const sw=typeof cvColorCssForId==='function'?cvColorCssForId(opt.value):(typeof colorToCssSwatch==='function'?colorToCssSwatch(opt.textContent):'#64748b');
      const label=typeof cvColorLabelForId==='function'?cvColorLabelForId(opt.value):opt.textContent;
      row.innerHTML=`<input type="checkbox" value="${opt.value}" ${opt.selected?'checked':''}/><span class="mcd-swatch" style="background:${sw}"></span><span class="mcd-label">${label}</span>`;
      const cb=row.querySelector('input');
      cb.addEventListener('change',()=>{ opt.selected=cb.checked; sel.dispatchEvent(new Event('change',{bubbles:true})); updateSummary(); });
      menu.appendChild(row);
    });
    updateSummary();
  }
  function updateSummary(){
    const selected=Array.from(sel.selectedOptions||[]);
    const swatches=selected.slice(0,4).map(o=>`<span class="mcd-mini-swatch" style="background:${typeof cvColorCssForId==='function'?cvColorCssForId(o.value):'#64748b'}"></span>`).join('');
    const text=selected.length?`${selected.length} color${selected.length===1?'':'s'} selected`:'Choose item colors';
    btn.innerHTML=`<span class="mcd-summary-swatches">${swatches}</span><span class="mcd-summary-text">${text}</span><span class="mcd-caret">▾</span>`;
  }
  btn.addEventListener('click',e=>{e.stopPropagation();document.querySelectorAll('.mcd-menu').forEach(m=>{if(m!==menu)m.classList.add('hidden')});menu.classList.toggle('hidden')});
  menu.addEventListener('click',e=>e.stopPropagation());
  sel.addEventListener('change',rebuild);
  const obs=new MutationObserver(rebuild);
  obs.observe(sel,{childList:true,subtree:true});
  sel.__itemColorObserver=obs;
  rebuild();
}
function cvRefreshItemColorDropdown(){
  const sel=document.getElementById('itemColorsSelect');
  if(!sel) return;
  const wrap=sel.nextElementSibling;
  if(wrap && wrap.classList && wrap.classList.contains('item-color-dropdown')){
    sel.dataset.enhancedItemColors='';
    wrap.remove();
  }
  cvEnhanceItemColorSelect();
}
if(typeof document!=='undefined' && !document.__itemsV16Handlers){
  document.__itemsV16Handlers=true;
  document.addEventListener('click',()=>document.querySelectorAll('.item-color-dropdown .mcd-menu').forEach(m=>m.classList.add('hidden')));
  document.addEventListener('DOMContentLoaded',()=>setTimeout(cvEnhanceItemColorSelect,100));
}
// Wrap common functions so the custom color dropdown stays in sync after colors render/edit.
if(typeof refreshColorSelects==='function' && !refreshColorSelects.__itemsV16Wrapped){
  const __oldRefreshColorSelects=refreshColorSelects;
  refreshColorSelects=function(){ const r=__oldRefreshColorSelects.apply(this,arguments); setTimeout(cvRefreshItemColorDropdown,60); return r; };
  refreshColorSelects.__itemsV16Wrapped=true;
}
if(typeof onEditItem==='function' && !onEditItem.__itemsV16Wrapped){
  const __oldOnEditItem=onEditItem;
  onEditItem=function(e){ const r=__oldOnEditItem.apply(this,arguments); setTimeout(cvRefreshItemColorDropdown,100); return r; };
  onEditItem.__itemsV16Wrapped=true;
}


/* =========================================================
   Items Bottom Layout v17
   - Active checkbox in Items table
   - Pencil/trash item actions
   ========================================================= */
if(typeof document!=='undefined' && !document.__itemsV17Handlers){
  document.__itemsV17Handlers=true;
  document.addEventListener('change', function(e){
    const t=e.target;
    if(!t || !t.getAttribute) return;
    if(t.getAttribute('data-act')==='toggleItemActive'){
      const idx=Number(t.getAttribute('data-idx'));
      const s=loadStore();
      if(s.items && s.items[idx]){
        s.items[idx].visible=!!t.checked;
        saveStore(s);
        renderAdminTables?.();
        renderItemsPublic?.();
      }
    }
  });
}


/* =========================================================
   Items Table Paging + Readability v18
   - Items table shows 15 per page
   - Qty column is compact
   - Dimensions tooltip shows inches
   ========================================================= */
window.__adminItemPage = window.__adminItemPage || 0;
const ADMIN_ITEM_PAGE_SIZE = 15;

function mmToInText(v){
  const n = Number(v);
  if(isNaN(n) || v === '' || v === null || v === undefined) return '';
  return (n / 25.4).toFixed(2);
}
function adminItemDimsText(item){
  const vals=[item.length,item.width,item.height].filter(v=>v!==''&&v!==undefined&&v!==null);
  return vals.join(' x ');
}
function adminItemDimsTitle(item){
  const labels=['Length','Width','Height'];
  const vals=[item.length,item.width,item.height];
  const parts=[];
  vals.forEach((v,i)=>{
    if(v!=='' && v!==undefined && v!==null && !isNaN(Number(v))){
      parts.push(`${labels[i]}: ${Number(v)} mm = ${mmToInText(v)} in`);
    }
  });
  return parts.length ? parts.join(' | ') : '';
}
function ensureAdminItemPager(tbody){
  if(!tbody) return null;
  const table = tbody.closest('table');
  const wrap = table?.parentElement;
  if(!wrap) return null;
  let pager = wrap.querySelector('.items-pager');
  if(!pager){
    pager = document.createElement('div');
    pager.className = 'admin-pager items-pager';
    wrap.appendChild(pager);
  }
  return pager;
}
function renderAdminItemPager(totalRows, pager){
  if(!pager) return;
  const totalPages = Math.max(1, Math.ceil(totalRows / ADMIN_ITEM_PAGE_SIZE));
  let page = window.__adminItemPage || 0;
  if(page > totalPages - 1) page = totalPages - 1;
  if(page < 0) page = 0;
  window.__adminItemPage = page;
  const start = totalRows ? (page * ADMIN_ITEM_PAGE_SIZE + 1) : 0;
  const end = Math.min(totalRows, (page + 1) * ADMIN_ITEM_PAGE_SIZE);
  const nums = Array.from({length: totalPages}, (_,i)=>`<button type="button" class="page-num ${i===page?'active':''}" data-item-page-set="${i}">${i+1}</button>`).join('');
  pager.innerHTML = `<span class="pager-info">Showing ${start} to ${end} of ${totalRows} items</span><div class="pager-buttons"><button type="button" data-item-page-move="prev" ${page===0?'disabled':''}>‹</button>${nums}<button type="button" data-item-page-move="next" ${page===totalPages-1?'disabled':''}>›</button></div>`;
}
function adminItemActiveCheckbox(i, idx){
  return `<label class="item-active-check" title="Toggle active"><input type="checkbox" data-act="toggleItemActive" data-idx="${idx}" ${i.visible===false?'':'checked'}/></label>`;
}
function adminItemActionButtons(idx){
  return `<button class="mini-action edit-action icon-action" title="Edit item" aria-label="Edit item" data-act="editItem" data-idx="${idx}">✎</button><button class="mini-action delete-action danger icon-action" title="Delete item" aria-label="Delete item" data-act="delItem" data-idx="${idx}">🗑</button>`;
}
function renderAdminItemsPaged(){
  const s=loadStore();
  const ti=document.getElementById('adminItemsTable');
  if(!ti) return;
  ti.innerHTML='';
  const q=(document.getElementById('adminItemSearch')?.value||'').toLowerCase().trim();
  const allItems=(s.items||[]).map((item,idx)=>({item,idx}));
  const filtered=allItems.filter(({item})=>{
    if(!q) return true;
    const colorText=(item.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(' ');
    return `${item.sku||''} ${item.name||''} ${item.size||''} ${item.desc||''} ${item.price||''} ${item.qty||''} ${colorText} ${item.grams||''}`.toLowerCase().includes(q);
  });
  const totalPages=Math.max(1,Math.ceil(filtered.length/ADMIN_ITEM_PAGE_SIZE));
  if((window.__adminItemPage||0)>totalPages-1) window.__adminItemPage=totalPages-1;
  const page=window.__adminItemPage||0;
  filtered.slice(page*ADMIN_ITEM_PAGE_SIZE,page*ADMIN_ITEM_PAGE_SIZE+ADMIN_ITEM_PAGE_SIZE).forEach(({item:i,idx})=>{
    const tr=document.createElement('tr');
    const dims=adminItemDimsText(i);
    const dimsTitle=adminItemDimsTitle(i).replace(/"/g,'&quot;');
    const colors=(i.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(', ');
    const img=i.image?`<img class="img-thumb" src="${i.image}" alt="${i.name||'item'}"/>`:'';
    tr.innerHTML=`<td class="img-cell">${img}</td><td class="sku-cell">${i.sku||''}</td><td class="item-name-cell" title="${String(i.name||'').replace(/"/g,'&quot;')}">${i.name||''}</td><td class="size-cell">${i.size||''}</td><td class="print-time-cell"><span class="dim-badge">${Number(i.printHours||0)}h ${Number(i.printMinutes||0)}m</span></td><td class="grams-cell">${i.grams?`${i.grams}g`:''}</td><td class="item-colors-cell" title="${String(colors).replace(/"/g,'&quot;')}">${colors}</td><td class="desc-cell"><span class="desc" title="${String(i.desc||'').replace(/"/g,'&quot;')}">${i.desc||''}</span></td><td class="dims-cell"><span class="dim-badge" title="${dimsTitle}">${dims}</span></td><td class="price-cell">${currency(i.price)}</td><td class="qty-cell">${i.qty||0}</td><td class="active-cell">${adminItemActiveCheckbox(i,idx)}</td><td class="action-cell item-actions">${adminItemActionButtons(idx)}</td>`;
    ti.appendChild(tr);
  });
  renderAdminItemPager(filtered.length, ensureAdminItemPager(ti));
  const ci=document.getElementById('adminCountItems'); if(ci) ci.textContent=q?`${filtered.length}/${s.items.length}`:String(s.items.length);
}

// Wrap current renderer: keep Orders/Colors behavior, then replace Item rows with paged rows.
if(typeof renderAdminTables==='function' && !renderAdminTables.__itemsV18Wrapped){
  const __renderAdminTablesBeforeItemsV18 = renderAdminTables;
  renderAdminTables = function(){
    __renderAdminTablesBeforeItemsV18.apply(this,arguments);
    renderAdminItemsPaged();
  };
  renderAdminTables.__itemsV18Wrapped=true;
}
if(typeof document!=='undefined' && !document.__itemsV18Handlers){
  document.__itemsV18Handlers=true;
  document.addEventListener('click', function(e){
    const set=e.target.closest('[data-item-page-set]');
    const move=e.target.closest('[data-item-page-move]');
    if(set){ window.__adminItemPage=Number(set.getAttribute('data-item-page-set'))||0; renderAdminTables(); return; }
    if(move){ const m=move.getAttribute('data-item-page-move'); if(m==='prev') window.__adminItemPage=Math.max(0,(window.__adminItemPage||0)-1); if(m==='next') window.__adminItemPage=(window.__adminItemPage||0)+1; renderAdminTables(); }
  });
  document.addEventListener('input', function(e){
    if(e.target && e.target.id==='adminItemSearch'){ window.__adminItemPage=0; setTimeout(renderAdminItemsPaged,0); }
  });
}


/* =========================================================
   Items Nav / Image / Color Chips v19
   - left nav opens Items/Colors collapsed sections
   - dimensions hover shows inches only
   - item image opens admin popup
   - item colors show horizontal swatches
   ========================================================= */
function adminItemDimsTitleInchesOnly(item){
  const labels=['Length','Width','Height'];
  const vals=[item.length,item.width,item.height];
  const parts=[];
  vals.forEach((v,i)=>{
    if(v!=='' && v!==undefined && v!==null && !isNaN(Number(v))){
      parts.push(`${labels[i]}: ${(Number(v)/25.4).toFixed(2)} in`);
    }
  });
  return parts.join(' | ');
}
function adminColorChipHtml(colorId){
  const s=loadStore();
  const c=(s.colors||[]).find(x=>x.id===colorId);
  if(!c) return `<span class="item-color-chip"><span class="item-color-dot" style="background:#64748b"></span><span>${colorId}</span></span>`;
  const sw=c.swatch || (typeof colorToCssSwatch==='function'?colorToCssSwatch(c.color||c.label||''):'#64748b');
  const name=c.color || c.label || colorId;
  return `<span class="item-color-chip" title="${String(c.label||name).replace(/"/g,'&quot;')}"><span class="item-color-dot" style="background:${sw}"></span><span>${name}</span></span>`;
}
function ensureAdminImageModal(){
  let modal=document.getElementById('adminImgModal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='adminImgModal';
  modal.className='admin-img-modal hidden';
  modal.innerHTML=`<div class="admin-img-modal-backdrop" data-close-admin-img="1"></div><figure class="admin-img-modal-box"><button type="button" class="admin-img-close" data-close-admin-img="1">×</button><img id="adminImgModalImg" alt="Item preview"/><figcaption id="adminImgModalCaption"></figcaption></figure>`;
  document.body.appendChild(modal);
  return modal;
}
function openAdminImageModal(src, caption){
  if(!src) return;
  const modal=ensureAdminImageModal();
  const img=document.getElementById('adminImgModalImg');
  const cap=document.getElementById('adminImgModalCaption');
  img.src=src;
  cap.textContent=caption||'';
  modal.classList.remove('hidden');
}
function closeAdminImageModal(){
  const modal=document.getElementById('adminImgModal');
  if(!modal) return;
  modal.classList.add('hidden');
  const img=document.getElementById('adminImgModalImg');
  if(img) img.src='';
}

// Replace the v18 item renderer with a cleaner item renderer.
renderAdminItemsPaged = function(){
  const s=loadStore();
  const ti=document.getElementById('adminItemsTable');
  if(!ti) return;
  ti.innerHTML='';
  const q=(document.getElementById('adminItemSearch')?.value||'').toLowerCase().trim();
  const allItems=(s.items||[]).map((item,idx)=>({item,idx}));
  const filtered=allItems.filter(({item})=>{
    if(!q) return true;
    const colorText=(item.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(' ');
    return `${item.sku||''} ${item.name||''} ${item.size||''} ${item.desc||''} ${item.price||''} ${item.qty||''} ${colorText} ${item.grams||''}`.toLowerCase().includes(q);
  });
  const totalPages=Math.max(1,Math.ceil(filtered.length/ADMIN_ITEM_PAGE_SIZE));
  if((window.__adminItemPage||0)>totalPages-1) window.__adminItemPage=totalPages-1;
  const page=window.__adminItemPage||0;
  filtered.slice(page*ADMIN_ITEM_PAGE_SIZE,page*ADMIN_ITEM_PAGE_SIZE+ADMIN_ITEM_PAGE_SIZE).forEach(({item:i,idx})=>{
    const tr=document.createElement('tr');
    const dims=adminItemDimsText(i);
    const dimsTitle=adminItemDimsTitleInchesOnly(i).replace(/"/g,'&quot;');
    const colorChips=(i.colors||[]).map(adminColorChipHtml).join('');
    const img=i.image?`<img class="img-thumb admin-item-thumb" src="${i.image}" alt="${String(i.name||'item').replace(/"/g,'&quot;')}" data-full-src="${i.image}" data-caption="${String(i.name||'item').replace(/"/g,'&quot;')}"/>`:'';
    tr.innerHTML=`<td class="img-cell">${img}</td><td class="sku-cell">${i.sku||''}</td><td class="item-name-cell" title="${String(i.name||'').replace(/"/g,'&quot;')}">${i.name||''}</td><td class="size-cell">${i.size||''}</td><td class="print-time-cell"><span class="dim-badge">${Number(i.printHours||0)}h ${Number(i.printMinutes||0)}m</span></td><td class="grams-cell">${i.grams?`${i.grams}g`:''}</td><td class="item-colors-cell item-color-chip-wrap">${colorChips}</td><td class="desc-cell"><span class="desc" title="${String(i.desc||'').replace(/"/g,'&quot;')}">${i.desc||''}</span></td><td class="dims-cell"><span class="dim-badge" title="${dimsTitle}">${dims}</span></td><td class="price-cell">${currency(i.price)}</td><td class="qty-cell">${i.qty||0}</td><td class="active-cell">${adminItemActiveCheckbox(i,idx)}</td><td class="action-cell item-actions">${adminItemActionButtons(idx)}</td>`;
    ti.appendChild(tr);
  });
  renderAdminItemPager(filtered.length, ensureAdminItemPager(ti));
  const ci=document.getElementById('adminCountItems'); if(ci) ci.textContent=q?`${filtered.length}/${s.items.length}`:String(s.items.length);
};

if(typeof document!=='undefined' && !document.__itemsV19Handlers){
  document.__itemsV19Handlers=true;
  document.addEventListener('click',function(e){
    const nav=e.target.closest('.mock-nav,.cv-nav,.side-link');
    if(nav){
      const href=nav.getAttribute('href')||'';
      if(href==='#items' || href==='#colors'){
        const section=document.querySelector(href);
        if(section && section.tagName && section.tagName.toLowerCase()==='details'){
          section.open=true;
          setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),20);
        }
      }
    }
    const img=e.target.closest('.admin-item-thumb');
    if(img){
      openAdminImageModal(img.getAttribute('data-full-src')||img.src,img.getAttribute('data-caption')||img.alt);
    }
    if(e.target.closest('[data-close-admin-img]')) closeAdminImageModal();
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeAdminImageModal(); });
}


/* =========================================================
   Public View Cleanup v24
   - Completed/Shipped pagination: 10 per page
   - Cleaner Items column for Public Orders
   ========================================================= */
window.__publicCompletedPage = window.__publicCompletedPage || 0;
const PUBLIC_COMPLETED_PAGE_SIZE = 10;
function publicOrderItemsHtml(store, order){
  const lines=Array.isArray(order.lines)?order.lines:[];
  if(!lines.length) return '<span class="public-order-empty">No items</span>';
  return `<div class="public-order-items">${lines.map(l=>{
    const it=(store.items||[]).find(ii=>ii.sku===l.sku);
    const name=it?it.name:(l.sku||'Item');
    return `<div class="public-order-item" title="${String(name).replace(/"/g,'&quot;')}"><span class="poi-name">${name}</span><span class="poi-qty">× ${l.qty||1}</span></div>`;
  }).join('')}</div>`;
}
function ensurePublicCompletedPager(){
  const tbody=document.getElementById('ordersTableCompleted');
  if(!tbody) return null;
  const wrap=tbody.closest('.public-table-wrap') || tbody.closest('.table-wrap') || tbody.closest('div');
  if(!wrap) return null;
  let pager=wrap.querySelector('.public-completed-pager');
  if(!pager){ pager=document.createElement('div'); pager.className='admin-pager public-completed-pager'; wrap.appendChild(pager); }
  return pager;
}
function renderPublicCompletedPager(totalRows){
  const pager=ensurePublicCompletedPager();
  if(!pager) return;
  const totalPages=Math.max(1,Math.ceil(totalRows/PUBLIC_COMPLETED_PAGE_SIZE));
  let page=window.__publicCompletedPage||0;
  if(page>totalPages-1) page=totalPages-1;
  if(page<0) page=0;
  window.__publicCompletedPage=page;
  const start=totalRows?(page*PUBLIC_COMPLETED_PAGE_SIZE+1):0;
  const end=Math.min(totalRows,(page+1)*PUBLIC_COMPLETED_PAGE_SIZE);
  const nums=Array.from({length:totalPages},(_,i)=>`<button type="button" class="page-num ${i===page?'active':''}" data-public-completed-page-set="${i}">${i+1}</button>`).join('');
  pager.innerHTML=`<span class="pager-info">Showing ${start} to ${end} of ${totalRows} completed/shipped orders</span><div class="pager-buttons"><button type="button" data-public-completed-page-move="prev" ${page===0?'disabled':''}>‹</button>${nums}<button type="button" data-public-completed-page-move="next" ${page===totalPages-1?'disabled':''}>›</button></div>`;
}

renderOrdersPublic = function(){
  const s=loadStore();
  const filter=document.getElementById('orderStatusFilter')?.value||'all';
  const tbodyA=document.getElementById('ordersTableActive');
  const tbodyC=document.getElementById('ordersTableCompleted');
  if(!tbodyA||!tbodyC)return;
  tbodyA.innerHTML='';
  tbodyC.innerHTML='';
  let countA=0;
  const completedRows=[];
  s.orders.slice().sort(byPriority).forEach(o=>{
    const total=orderFinalTotal(s,o).toFixed(2);
    const tr=document.createElement('tr');
    tr.className=`st-${o.status}`;
    tr.innerHTML=`<td><strong>${o.priority||''}</strong></td><td>${o.orderId||''}</td><td>${o.customer||''}</td><td>${ordersStatusSelectHtml(o)}</td><td>${fmtDate(o.orderDate)}</td><td>${fmtDate(o.dueDate)}</td><td class="public-items-col">${publicOrderItemsHtml(s,o)}</td><td class="public-total-col">${total}</td><td>${ordersPaidToggleHtml(o)}</td>`;
    if(o.status==='shipped'){
      completedRows.push(tr);
    } else if(filter==='all' || o.status===filter || (filter==='completed'&&(o.status==='completed'||o.status==='ready'))){
      tbodyA.appendChild(tr); countA++;
    }
  });
  const page=window.__publicCompletedPage||0;
  completedRows.slice(page*PUBLIC_COMPLETED_PAGE_SIZE,page*PUBLIC_COMPLETED_PAGE_SIZE+PUBLIC_COMPLETED_PAGE_SIZE).forEach(tr=>tbodyC.appendChild(tr));
  renderPublicCompletedPager(completedRows.length);
  const ca=document.getElementById('countActive'); if(ca) ca.textContent=String(countA);
  const cc=document.getElementById('countCompleted'); if(cc) cc.textContent=String(completedRows.length);
};

if(typeof document!=='undefined' && !document.__publicV24Handlers){
  document.__publicV24Handlers=true;
  document.addEventListener('click', function(e){
    const set=e.target.closest('[data-public-completed-page-set]');
    const move=e.target.closest('[data-public-completed-page-move]');
    if(set){ window.__publicCompletedPage=Number(set.getAttribute('data-public-completed-page-set'))||0; renderOrdersPublic(); return; }
    if(move){ const m=move.getAttribute('data-public-completed-page-move'); if(m==='prev') window.__publicCompletedPage=Math.max(0,(window.__publicCompletedPage||0)-1); if(m==='next') window.__publicCompletedPage=(window.__publicCompletedPage||0)+1; renderOrdersPublic(); }
  });
}


/* =========================================================
   Public Items Cleanup v25
   - Public Items list uses same paged style as Admin Items
   - Dimensions hover shows inches only
   - Colors show vertical swatches
   ========================================================= */
window.__publicItemPage = window.__publicItemPage || 0;
const PUBLIC_ITEM_PAGE_SIZE = 15;

function publicMmToIn(v){
  const n=Number(v);
  if(isNaN(n) || v==='' || v===null || v===undefined) return '';
  return (n/25.4).toFixed(2);
}
function publicItemDimsText(item){
  return [item.length,item.width,item.height].filter(v=>v!==''&&v!==undefined&&v!==null).join(' x ');
}
function publicItemDimsTitle(item){
  const labels=['Length','Width','Height'];
  const vals=[item.length,item.width,item.height];
  const parts=[];
  vals.forEach((v,i)=>{
    if(v!=='' && v!==undefined && v!==null && !isNaN(Number(v))){
      parts.push(`${labels[i]}: ${publicMmToIn(v)} in`);
    }
  });
  return parts.join(' | ');
}
function publicColorCssForId(colorId){
  const store=loadStore();
  const c=(store.colors||[]).find(x=>x.id===colorId);
  if(!c) return '#64748b';
  if(c.swatch) return c.swatch;
  if(typeof colorToCssSwatch==='function') return colorToCssSwatch(c.color || c.label || '');
  return '#64748b';
}
function publicColorChipHtml(colorId){
  const store=loadStore();
  const c=(store.colors||[]).find(x=>x.id===colorId);
  if(!c) return `<span class="public-color-bullet"><span class="public-color-dot" style="background:#64748b"></span><span>${colorId}</span></span>`;
  const sw=publicColorCssForId(colorId);
  const name=c.color || c.label || colorId;
  return `<span class="public-color-bullet" title="${String(c.label||name).replace(/"/g,'&quot;')}"><span class="public-color-dot" style="background:${sw}"></span><span>${name}</span></span>`;
}
function ensurePublicItemsPager(tbody){
  if(!tbody) return null;
  const wrap=tbody.closest('.public-table-wrap') || tbody.closest('.table-wrap') || tbody.closest('div');
  if(!wrap) return null;
  let pager=wrap.querySelector('.public-items-pager');
  if(!pager){
    pager=document.createElement('div');
    pager.className='admin-pager public-items-pager';
    wrap.appendChild(pager);
  }
  return pager;
}
function renderPublicItemsPager(totalRows){
  const tbody=document.getElementById('itemsTable');
  const pager=ensurePublicItemsPager(tbody);
  if(!pager) return;
  const totalPages=Math.max(1,Math.ceil(totalRows/PUBLIC_ITEM_PAGE_SIZE));
  let page=window.__publicItemPage||0;
  if(page>totalPages-1) page=totalPages-1;
  if(page<0) page=0;
  window.__publicItemPage=page;
  const start=totalRows?(page*PUBLIC_ITEM_PAGE_SIZE+1):0;
  const end=Math.min(totalRows,(page+1)*PUBLIC_ITEM_PAGE_SIZE);
  const nums=Array.from({length:totalPages},(_,i)=>`<button type="button" class="page-num ${i===page?'active':''}" data-public-item-page-set="${i}">${i+1}</button>`).join('');
  pager.innerHTML=`<span class="pager-info">Showing ${start} to ${end} of ${totalRows} items</span><div class="pager-buttons"><button type="button" data-public-item-page-move="prev" ${page===0?'disabled':''}>‹</button>${nums}<button type="button" data-public-item-page-move="next" ${page===totalPages-1?'disabled':''}>›</button></div>`;
}

renderItemsPublic = function(){
  const s=loadStore();
  const q=(document.getElementById('searchItems')?.value||'').toLowerCase();
  const f=document.getElementById('filterAvailability')?.value||'all';
  const tbody=document.getElementById('itemsTable');
  if(!tbody)return;
  tbody.innerHTML='';
  const filtered=(s.items||[])
    .filter(i=>i.visible!==false)
    .filter(i=>{ if(f==='in')return Number(i.qty||0)>0; if(f==='out')return Number(i.qty||0)<=0; return true; })
    .filter(i=>{
      const colorText=(i.colors||[]).map(cid=>(s.colors.find(c=>c.id===cid)?.label)||cid).join(' ');
      return `${i.sku||''} ${i.name||''} ${i.desc||''} ${i.size||''} ${colorText}`.toLowerCase().includes(q);
    });
  const totalPages=Math.max(1,Math.ceil(filtered.length/PUBLIC_ITEM_PAGE_SIZE));
  if((window.__publicItemPage||0)>totalPages-1) window.__publicItemPage=totalPages-1;
  const page=window.__publicItemPage||0;
  filtered.slice(page*PUBLIC_ITEM_PAGE_SIZE,page*PUBLIC_ITEM_PAGE_SIZE+PUBLIC_ITEM_PAGE_SIZE).forEach(i=>{
    const tr=document.createElement('tr');
    const dims=publicItemDimsText(i);
    const dimsTitle=publicItemDimsTitle(i).replace(/"/g,'&quot;');
    const colors=(i.colors||[]).map(publicColorChipHtml).join('');
    const img=i.image?`<img class="img-thumb public-item-thumb" src="${i.image}" alt="${String(i.name||'item').replace(/"/g,'&quot;')}"/>`:``;
    tr.innerHTML=`<td class="img-cell">${img}</td><td class="public-sku-cell">${i.sku||''}</td><td class="public-item-name-cell" title="${String(i.name||'').replace(/"/g,'&quot;')}">${i.name||''}</td><td class="public-desc-cell"><span class="desc" title="${String(i.desc||'').replace(/"/g,'&quot;')}">${i.desc||''}</span></td><td class="public-size-cell">${i.size||''}</td><td class="public-dims-cell"><span class="dim-badge" title="${dimsTitle}">${dims}</span></td><td class="public-colors-cell public-color-list">${colors}</td><td class="public-price-cell">${currency(i.price)}</td><td class="public-stock-cell">${Number(i.qty||0)>0?`<span class="badge ok">In stock (${i.qty})</span>`:`<span class="badge muted">Out of stock</span>`}</td>`;
    tbody.appendChild(tr);
  });
  const ci=document.getElementById('countItems'); if(ci) ci.textContent=String(filtered.length);
  renderPublicItemsPager(filtered.length);
  tbody.querySelectorAll('.img-thumb').forEach(img=>{
    img.style.cursor='pointer';
    img.addEventListener('click',()=>openImageModal(img.src,img.alt));
  });
};

if(typeof document!=='undefined' && !document.__publicItemsV25Handlers){
  document.__publicItemsV25Handlers=true;
  document.addEventListener('click',function(e){
    const set=e.target.closest('[data-public-item-page-set]');
    const move=e.target.closest('[data-public-item-page-move]');
    if(set){ window.__publicItemPage=Number(set.getAttribute('data-public-item-page-set'))||0; renderItemsPublic(); return; }
    if(move){ const m=move.getAttribute('data-public-item-page-move'); if(m==='prev') window.__publicItemPage=Math.max(0,(window.__publicItemPage||0)-1); if(m==='next') window.__publicItemPage=(window.__publicItemPage||0)+1; renderItemsPublic(); }
  });
  document.addEventListener('input',function(e){ if(e.target && e.target.id==='searchItems'){ window.__publicItemPage=0; setTimeout(renderItemsPublic,0); } });
  document.addEventListener('change',function(e){ if(e.target && e.target.id==='filterAvailability'){ window.__publicItemPage=0; setTimeout(renderItemsPublic,0); } });
}


/* =========================================================
   Public Collapse Counts v26
   Adds counts to Public collapsed section titles.
   ========================================================= */
function setPublicCollapseCount(id, value){
  const el=document.getElementById(id);
  if(el) el.textContent=String(value);
}
if(typeof renderOrdersPublic==='function' && !renderOrdersPublic.__publicCountsV26Wrapped){
  const __renderOrdersPublicCountsV26=renderOrdersPublic;
  renderOrdersPublic=function(){
    const result=__renderOrdersPublicCountsV26.apply(this,arguments);
    const c=document.getElementById('countCompleted')?.textContent || '0';
    setPublicCollapseCount('publicSummaryCompletedCount', c);
    return result;
  };
  renderOrdersPublic.__publicCountsV26Wrapped=true;
}
if(typeof renderItemsPublic==='function' && !renderItemsPublic.__publicCountsV26Wrapped){
  const __renderItemsPublicCountsV26=renderItemsPublic;
  renderItemsPublic=function(){
    const result=__renderItemsPublicCountsV26.apply(this,arguments);
    const c=document.getElementById('countItems')?.textContent || '0';
    setPublicCollapseCount('publicSummaryItemsCount', c);
    return result;
  };
  renderItemsPublic.__publicCountsV26Wrapped=true;
}
if(typeof document!=='undefined' && !document.__publicCountsV26Init){
  document.__publicCountsV26Init=true;
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{
    setPublicCollapseCount('publicSummaryCompletedCount', document.getElementById('countCompleted')?.textContent || '0');
    setPublicCollapseCount('publicSummaryItemsCount', document.getElementById('countItems')?.textContent || '0');
  },150));
}


/* =========================================================
   Admin Close Button v27
   Attempts to stop the local Node server, then close this tab.
   Requires server.js to support /api/shutdown or /shutdown to close the BAT/CMD window.
   ========================================================= */
async function cvTryShutdownServer(){
  const urls=['/api/shutdown','/shutdown'];
  for(const url of urls){
    try{
      await fetch(url,{method:'POST',keepalive:true,cache:'no-store'});
      return true;
    }catch(e){}
  }
  return false;
}
async function cvCloseAdminSite(){
  const ok=confirm('Close the Admin tab and stop the local site server if shutdown is enabled?');
  if(!ok) return;
  cvTryShutdownServer();
  // Give the shutdown request a moment to reach the local server.
  setTimeout(()=>{
    try{ window.open('','_self'); }catch(e){}
    try{ window.close(); }catch(e){}
    // Browsers may block closing a tab that was not opened by script.
    setTimeout(()=>{
      if(!window.closed){
        document.body.classList.add('site-close-message-mode');
        const msg=document.createElement('div');
        msg.className='site-close-message';
        msg.innerHTML='<h2>Site close requested</h2><p>If this tab did not close automatically, close this browser tab manually.</p><p>If the command window is still open, the local server needs a shutdown route added to <code>server.js</code>.</p>';
        document.body.appendChild(msg);
      }
    },400);
  },350);
}
if(typeof document!=='undefined' && !document.__adminCloseV27){
  document.__adminCloseV27=true;
  document.addEventListener('click',function(e){
    const btn=e.target.closest('#adminCloseSiteBtn');
    if(btn){ e.preventDefault(); cvCloseAdminSite(); }
  });
}
