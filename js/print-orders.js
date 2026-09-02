initNavigation('print-orders.html');

const state={
  orders:[],items:[],colors:[],allLines:[],lines:[],editing:null,
  filter:'all',search:'',groupsOpen:{new:true,in_process:false,completed:false,delivered:false,shipped:false}
};
const $=id=>document.getElementById(id);
const money=value=>'$'+Number(value||0).toFixed(2);
const norm=value=>String(value||'new').toLowerCase().replace(/\s+/g,'_');
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function colorFor(value){
  const key=String(value||'').toLowerCase();
  const map={black:'#111',white:'#eee',red:'#b71c1c',orange:'#f47b20',yellow:'#f6c21a',green:'#159947',blue:'#1464d2',purple:'#6936c9',pink:'#e15aa2',gray:'#888',grey:'#888',brown:'#8b5a2b',gold:'#caa45f',silver:'#c0c0c0',teal:'#17a2a6',olive:'#808000'};
  const match=Object.keys(map).find(name=>key.includes(name));
  return match?map[match]:'#d8d8d8';
}
function colorKey(color){return `${color.brand||''}||${color.type||''}||${color.color||''}`;}
function colorRecord(key){return state.colors.find(color=>colorKey(color)===key);}
function colorName(key){const record=colorRecord(key);return record?.color||String(key).split('||').pop()||key;}
function colorType(key){const record=colorRecord(key);return record?.type||String(key).split('||')[1]||'';}
function colorBg(key){const record=colorRecord(key);return record?.swatch||colorFor(`${record?.color||''} ${record?.label||key}`);}
function groupColors(list){
  const groups=new Map();
  list.forEach(color=>{const brand=(color.brand||'No Brand').trim()||'No Brand';if(!groups.has(brand))groups.set(brand,[]);groups.get(brand).push(color);});
  return [...groups].sort((a,b)=>a[0].localeCompare(b[0])).map(([brand,colors])=>[brand,colors.sort((a,b)=>String(a.color||a.label).localeCompare(String(b.color||b.label)))]);
}

const PRICING_STORE='cv_print_item_pricing_v1';
function readJson(key, fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch{return fallback;}}
function parseJson(value, fallback){if(Array.isArray(value))return value;if(!value)return fallback;try{return JSON.parse(value);}catch{return fallback;}}
function localPricing(){return readJson(PRICING_STORE,{});}
function itemSku(item){return String(item?.sku||item?.item_id||'');}
function sortedItems(){return [...(state.items||[])].sort((a,b)=>String(a.name||a.sku||'').localeCompare(String(b.name||b.sku||'')));}
function itemBySku(sku){return state.items.find(item=>String(itemSku(item))===String(sku||''));}
function itemLabel(item){return `${item?.name||'Unnamed Item'} (${itemSku(item)})`;}
function findItemFromEntry(value){const v=String(value||'').trim().toLowerCase();return sortedItems().find(item=>itemLabel(item).toLowerCase()===v)||sortedItems().find(item=>String(itemSku(item)).toLowerCase()===v)||sortedItems().find(item=>String(item.name||'').toLowerCase()===v)||null;}
function itemPricingData(item){const sku=itemSku(item);const local=localPricing()[sku]||{};return{components:Array.isArray(local.components)?local.components:parseJson(item?.price_components,[]),linked:Array.isArray(local.linked)?local.linked:parseJson(item?.linked_items,[]),suggested:Number(local.suggested||item?.suggested_price||0)};}
function minutesFromParts(h,m){return Number(h||0)*60+Number(m||0);}
function itemMinutes(item){const comps=itemPricingData(item).components||[];if(comps.length)return comps.reduce((sum,row)=>sum+minutesFromParts(row.hours,row.minutes),0);if(item?.total_print_minutes)return Number(item.total_print_minutes||0);return minutesFromParts(item?.print_hours,item?.print_minutes);}
function itemGrams(item){const comps=itemPricingData(item).components||[];if(comps.length)return comps.reduce((sum,row)=>sum+Number(row.grams||0),0);return Number(item?.total_grams||item?.grams||0);}
function formatMinutes(minutes){const h=Math.floor(Number(minutes||0)/60);const m=Math.round(Number(minutes||0)%60);return `${h}h ${String(m).padStart(2,'0')}m`;}
function componentColorKey(row){return row?.color||'';}
function componentName(row){if(row?.name)return row.name;if(!row?.color)return '';return colorName(row.color);}
function itemComponents(item){return (itemPricingData(item).components||[]).filter(row=>componentName(row)).map(row=>({name:componentName(row),color:componentColorKey(row),grams:Number(row.grams||0),hours:Number(row.hours||0),minutes:Number(row.minutes||0)}));}
function defaultLinkedRows(item){return (itemPricingData(item).linked||[]).filter(row=>row&&row.sku&&row.defaultSelected===true);}
function bundleForItem(item){const base={sku:itemSku(item),name:item?.name||'Item',price:Number(item?.price||0),minutes:itemMinutes(item),grams:itemGrams(item),components:itemComponents(item),type:'main'};const linked=defaultLinkedRows(item).map(row=>{const linkedItem=itemBySku(row.sku);if(!linkedItem)return null;return{sku:itemSku(linkedItem),name:row.label||linkedItem.name||row.sku,price:Number(linkedItem.price||0),minutes:itemMinutes(linkedItem),grams:itemGrams(linkedItem),components:itemComponents(linkedItem),type:'linked'};}).filter(Boolean);const lines=[base,...linked];return{base,linked,lines,totalPrice:lines.reduce((s,x)=>s+x.price,0),totalMinutes:lines.reduce((s,x)=>s+x.minutes,0),totalGrams:lines.reduce((s,x)=>s+x.grams,0)};}
function orderComponentsForLine(line){if(Array.isArray(line.components)&&line.components.length)return line.components;const item=itemBySku(line.item_sku);return itemComponents(item);}
function createLineForItem(item, qty=1, includeLinked=false){const bundle=bundleForItem(item);const lines=includeLinked?bundle.lines:[bundle.base];const colors=[...new Set(lines.flatMap(x=>(x.components||[]).map(c=>c.color).filter(Boolean)))];return{item_sku:itemSku(item),qty:Number(qty||1),colors,components:lines.flatMap(x=>x.components||[]),bundle:includeLinked&&bundle.linked.length?bundle:null};}
function ensureItemDatalist(){if($('printItemPickerList'))return;const list=document.createElement('datalist');list.id='printItemPickerList';document.body.appendChild(list);}
function renderItemDatalist(){ensureItemDatalist();$('printItemPickerList').innerHTML=sortedItems().map(item=>`<option value="${esc(itemLabel(item))}"></option>`).join('');}
function ensureOrderInfoPanel(){if($('selectedItemInfo'))return;const host=document.querySelector('.po-selection-host');if(!host)return;host.innerHTML='';const panel=document.createElement('div');panel.id='selectedItemInfo';panel.className='po-selected-info';host.appendChild(panel);}
function currentSelectionPreview(){const lines=state.lines||[];if(!lines.length)return '<div class="po-info-empty">Choose an item to see time, cost, colors, and grams.</div>';return lines.map((line,index)=>lineInfoHtml(line,index)).join('');}
function lineInfoHtml(line,index){const item=itemBySku(line.item_sku)||{};const comps=orderComponentsForLine(line);const totalPrice=lineTotal(line);const totalMinutes=lineMinutes(line);const totalGrams=lineGrams(line);const colorRows=comps.length?comps.map(c=>`<div><span>${esc(componentName(c)||colorName(c.color))}</span><b>${Number(c.grams||0)}g</b></div>`).join(''):'<div><span>No colors assigned</span><b>-</b></div>';const bundleRows=line.bundle?line.bundle.lines.map(x=>`<div><span>${esc(x.name)}</span><b>${money(x.price)} | ${formatMinutes(x.minutes)}</b></div>`).join(''):'';return `<section class="po-info-card"><h4>${esc(item.name||line.item_sku||'Selected Item')}</h4>${bundleRows?`<div class="po-info-subtitle">Grouped Bundle</div>${bundleRows}`:''}<div class="po-info-grid"><div><span>Total Cost</span><strong>${money(totalPrice)}</strong></div><div><span>Total Time</span><strong>${formatMinutes(totalMinutes)}</strong></div><div><span>Total Grams</span><strong>${totalGrams.toFixed(1)}g</strong></div></div><div class="po-info-subtitle">Color - Gram</div>${colorRows}</section>`;}
function renderSelectedInfo(){ensureOrderInfoPanel();if($('selectedItemInfo'))$('selectedItemInfo').innerHTML=currentSelectionPreview();}
function lineUnitPrice(line){if(line.bundle)return Number(line.bundle.totalPrice||0);return itemPrice(line.item_sku);}
function lineMinutes(line){if(line.bundle)return Number(line.bundle.totalMinutes||0)*Number(line.qty||1);return orderComponentsForLine(line).reduce((sum,c)=>sum+minutesFromParts(c.hours,c.minutes),0)*Number(line.qty||1)||itemMinutes(itemBySku(line.item_sku))*Number(line.qty||1);}
function lineGrams(line){if(line.bundle)return Number(line.bundle.totalGrams||0)*Number(line.qty||1);return orderComponentsForLine(line).reduce((sum,c)=>sum+Number(c.grams||0),0)*Number(line.qty||1)||itemGrams(itemBySku(line.item_sku))*Number(line.qty||1);}
function renderOrderStyles(){if(document.getElementById('poEnhanceStyles'))return;const style=document.createElement('style');style.id='poEnhanceStyles';style.textContent=`.po-item-search{width:100%;min-width:260px}.po-linked-prompt{font-size:12px;color:#f0b64f;margin-top:4px}.po-selected-info{margin:0 0 14px;display:grid;gap:10px}.po-info-card{border:1px solid rgba(184,135,40,.45);border-radius:10px;padding:12px;background:rgba(0,0,0,.16)}.po-info-card h4{margin:0 0 8px;color:#f0b64f}.po-info-grid{display:grid;grid-template-columns:repeat(3,minmax(110px,1fr));gap:8px;margin:8px 0}.po-info-grid div,.po-info-card>div:not(.po-info-grid):not(.po-info-subtitle){display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(184,135,40,.18);padding:4px 0}.po-info-grid div{display:grid;border:1px solid rgba(184,135,40,.28);border-radius:8px;padding:8px}.po-info-grid span,.po-info-subtitle{color:#cdbf9f;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.po-info-grid strong,.po-info-card b{color:#ffc24f}.po-info-empty{color:#cdbf9f;border:1px dashed rgba(184,135,40,.35);border-radius:10px;padding:12px}.po-bundle-detail{margin-top:6px;color:#cdbf9f;font-size:12px;line-height:1.4}`;document.head.appendChild(style);}
function itemPrice(sku){return Number(state.items.find(item=>String(itemSku(item))===String(sku))?.price||0);}
function linesFor(orderId){return state.allLines.filter(line=>String(line.order_id)===String(orderId));}
function lineTotal(line){return lineUnitPrice(line)*Number(line.qty||0);}
function orderTotal(order){return Number(order.total||0)||linesFor(order.order_id).reduce((sum,line)=>sum+lineTotal(line),0);}
function nextOrderId(){const ids=state.orders.map(order=>Number(String(order.order_id||'').replace(/\D/g,''))).filter(Boolean);return String((ids.length?Math.max(...ids):100000)+1);}

function renderKpis(){
  $('kpiNew').textContent=state.orders.filter(order=>norm(order.status)==='new').length;
  $('kpiInProcess').textContent=state.orders.filter(order=>norm(order.status)==='in_process').length;
  $('kpiReady').textContent=state.orders.filter(order=>norm(order.status)==='completed').length;
}
function renderGroups(){
  const statuses=['new','in_process','completed','delivered','shipped'];
  const visible=state.orders.filter(order=>(state.filter==='all'||norm(order.status)===state.filter)&&`${order.order_id} ${order.customer}`.toLowerCase().includes(state.search));
  $('ordersGrouped').innerHTML=statuses.map(status=>{
    const rows=visible.filter(order=>norm(order.status)===status);
    if(!rows.length)return'';
    const open=!!state.groupsOpen[status];
    return `<section class="po-order-group ${open?'open':''}" data-group="${status}">
      <button type="button" class="po-group-head" data-toggle-group="${status}" aria-expanded="${open}"><span>${status.replace('_',' ')}</span><b>${rows.length}</b><i></i></button>
      <div class="po-group-body">${rows.map(order=>`<button type="button" class="po-order-row ${String(state.editing)===String(order.order_id)?'active':''}" data-order="${esc(order.order_id)}"><span><strong>${esc(order.order_id)}</strong><small>${esc(order.customer||'No customer')}</small></span><span><strong>${money(orderTotal(order))}</strong><small>${esc(order.due_date||'No due date')}</small></span></button>`).join('')}</div>
    </section>`;
  }).join('')||'<div class="po-empty">No orders match this status or search.</div>';
}
function selectedChips(colors,index){
  if(!colors.length)return '<span class="po-color-note">No colors assigned</span>';
  return `<div class="po-color-list">${colors.map(key=>`<span class="po-color-chip"><i class="dot" style="background:${colorBg(key)}"></i><span title="${esc(colorName(key))} - ${esc(colorType(key))}">${esc(colorName(key))} / ${esc(colorType(key))}</span><button type="button" data-remove-color="${index}" data-color-key="${esc(key)}" aria-label="Remove color">X</button></span>`).join('')}</div>`;
}
function renderLines(){
  renderItemDatalist();
  $('lineTable').innerHTML=state.lines.map((line,index)=>{
    const item=itemBySku(line.item_sku)||{};
    const comps=orderComponentsForLine(line);
    const bundleDetail=line.bundle?`<div class="po-bundle-detail">${line.bundle.lines.map(x=>`<span><b>${esc(x.name)}</b><em>${money(x.price)} / ${formatMinutes(x.minutes)}</em></span>`).join('')}</div>`:'';
    const gramRows=comps.length?`<div class="po-line-grams">${comps.map(c=>`<span><i style="background:${colorBg(c.color)}"></i><b>${esc(componentName(c))}</b><em>${Number(c.grams||0).toFixed(1)}g</em></span>`).join('')}</div>`:'';
    return `<tr class="po-order-line-row">
      <td class="po-line-item-cell"><div class="po-line-item-name">${esc(item.name||line.item_sku||'Select an item')}</div><input class="po-item-search" list="printItemPickerList" data-line-item-search="${index}" value="${esc(item.name?itemLabel(item):(line.item_sku||''))}" placeholder="Search item or SKU"><small>SKU: ${esc(line.item_sku||'')}</small>${bundleDetail}</td>
      <td class="po-line-price">${money(lineUnitPrice(line))}</td>
      <td><input class="po-qty" type="number" min="1" value="${Number(line.qty||1)}" data-line-qty="${index}"></td>
      <td class="po-line-colors">${gramRows}<button type="button" class="small-btn" data-line-colors="${index}">Change Colors</button></td>
      <td class="po-line-total">${money(lineTotal(line))}</td>
      <td><button type="button" class="small-btn red po-line-remove" data-remove-line="${index}" aria-label="Remove item">X</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="6"><div class="po-empty">No items added.</div></td></tr>';
  renderTotal();
  renderSelectedInfo();
}
function renderTotal(){
  let subtotal=state.lines.reduce((sum,line)=>sum+lineTotal(line),0);
  let adjustment=0;
  if($('hasAdjustment').checked){const value=Number($('adjustmentValue').value||0);adjustment=$('adjustmentType').value==='percent'?subtotal*value/100:value;if($('adjustmentMode').value==='discount')adjustment*=-1;}
  const total=subtotal+adjustment;
  $('orderTotalBox').innerHTML=`<div class="summary-line"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-line"><span>Adjustment</span><strong>${money(adjustment)}</strong></div><div class="summary-line"><span>Total</span><strong>${money(total)}</strong></div>`;
  return{subtotal,total};
}
function clearForm(){
  state.editing=null;state.lines=[];$('orderForm').reset();$('orderDate').value=new Date().toISOString().slice(0,10);$('status').value='new';$('priority').value='2';$('orderTitle').textContent='New Order';$('deleteOrderBtn').classList.add('hidden');$('adjustmentBox').classList.add('hidden');renderLines();renderGroups();
}
async function load(){
  const data=await CVDB.loadDashboard();
  state.orders=data.orders||[];state.items=(data.items||[]).sort((a,b)=>String(a.name||a.sku||'').localeCompare(String(b.name||b.sku||''))); renderItemDatalist(); renderOrderStyles();state.colors=data.colors||[];state.allLines=data.orderLines||[];
  $('customerList').innerHTML=[...new Set(state.orders.map(order=>order.customer).filter(Boolean))].map(name=>`<option value="${esc(name)}"></option>`).join('');
  renderKpis();clearForm();
}
function openOrder(orderId){
  const order=state.orders.find(candidate=>String(candidate.order_id)===String(orderId));if(!order)return;
  state.editing=order.order_id;$('orderTitle').textContent='Order #'+order.order_id;$('customer').value=order.customer||'';$('orderDate').value=order.order_date||'';$('dueDate').value=order.due_date||'';$('status').value=norm(order.status);$('priority').value=String(order.priority||2);$('paid').checked=!!order.paid;$('notes').value=order.notes||'';
  const hasDiscount=order.discount_type&&order.discount_type!=='none';const hasSurcharge=order.surcharge_type&&order.surcharge_type!=='none';$('hasAdjustment').checked=!!(hasDiscount||hasSurcharge);$('adjustmentBox').classList.toggle('hidden',!$('hasAdjustment').checked);$('adjustmentMode').value=hasSurcharge?'surcharge':'discount';$('adjustmentType').value=hasSurcharge?order.surcharge_type:(order.discount_type||'percent');$('adjustmentValue').value=hasSurcharge?Number(order.surcharge_value||0):Number(order.discount_value||0);
  state.lines=linesFor(orderId).map(line=>{const item=itemBySku(line.item_sku)||{};return {...line,colors:Array.isArray(line.colors)?line.colors:[],components:itemComponents(item)};});$('deleteOrderBtn').classList.remove('hidden');renderLines();renderGroups();
}
function assignColors(index){
  const line=state.lines[index];if(!line)return;
  let selected=new Set(line.colors||[]);let query='';
  let modal=$('colorAssignModal');if(!modal){modal=document.createElement('div');modal.id='colorAssignModal';modal.className='modal-backdrop';document.body.appendChild(modal);}
  modal.innerHTML=`<div class="confirm-modal"><div class="po-modal-head"><div><h3>Assign Colors</h3><small>Select one or more colors. Select again to remove.</small></div><input id="assignColorSearch" placeholder="Search brand, color, or type"></div><div class="modal-body po-color-results" id="assignColorResults"></div><div class="modal-actions"><span class="po-selected-count" id="selectedColorCount"></span><button type="button" class="btn clear" id="colorCancel">Cancel</button><button type="button" class="btn primary" id="colorSave">Save Colors</button></div></div>`;
  modal.classList.add('show');
  const draw=()=>{
    const list=state.colors.filter(color=>`${color.brand} ${color.type} ${color.color} ${color.label}`.toLowerCase().includes(query));
    $('assignColorResults').innerHTML=groupColors(list).map(([brand,colors])=>`<section class="po-brand-group"><header class="po-brand-head"><b>${esc(brand)}</b><span>${colors.length}</span></header><div class="po-color-grid">${colors.map(color=>{const key=colorKey(color);return `<button type="button" class="po-color-card ${selected.has(key)?'selected':''}" data-color-key="${esc(key)}"><i style="background:${color.swatch||colorFor(color.color)}"></i><span><b>${esc(color.color||'Unnamed')}</b><small>${esc(color.type||'No type')}</small></span><em>${selected.has(key)?'✓':''}</em></button>`;}).join('')}</div></section>`).join('')||'<div class="po-empty">No matching colors.</div>';
    $('selectedColorCount').textContent=`${selected.size} selected`;
    $('assignColorResults').querySelectorAll('[data-color-key]').forEach(button=>button.onclick=()=>{const key=button.dataset.colorKey;selected.has(key)?selected.delete(key):selected.add(key);draw();});
  };
  draw();
  const search=$('assignColorSearch');search.focus();search.oninput=event=>{query=event.target.value.toLowerCase();draw();};
  $('colorCancel').onclick=()=>modal.classList.remove('show');
  $('colorSave').onclick=()=>{line.colors=[...selected];if(!Array.isArray(line.components)||!line.components.length){line.components=[...selected].map(key=>({name:colorName(key),color:key,grams:0,hours:0,minutes:0}));}modal.classList.remove('show');renderLines();};
}

$('ordersGrouped').onclick=event=>{
  const toggle=event.target.closest('[data-toggle-group]');if(toggle){const group=toggle.dataset.toggleGroup;state.groupsOpen[group]=!state.groupsOpen[group];renderGroups();return;}
  const row=event.target.closest('[data-order]');if(row)openOrder(row.dataset.order);
};
$('orderSearch').oninput=event=>{state.search=event.target.value.toLowerCase();renderGroups();};
$('statusFilter').onchange=event=>{state.filter=event.target.value;renderGroups();};
$('refreshOrders').onclick=()=>load().catch(error=>toast(error.message,'err'));
$('newOrderBtn').onclick=clearForm;$('clearOrder').onclick=clearForm;
$('addLine').onclick=async()=>{const item=state.items[0]||{};if(!itemSku(item))return;const bundle=bundleForItem(item);const includeLinked=bundle.linked.length?await confirmAction({title:'Add Linked Item(s)?',message:`${item.name||itemSku(item)} has ${bundle.linked.length} default linked item(s). Add them as a grouped bundle?`,details:bundle.linked.map(x=>`${x.name}: ${money(x.price)} / ${formatMinutes(x.minutes)}`).join('\n'),confirmText:'Add Linked Items',cancelText:'Main Item Only'}):false;state.lines.push(createLineForItem(item,1,includeLinked));renderLines();};
$('hasAdjustment').onchange=()=>{$('adjustmentBox').classList.toggle('hidden',!$('hasAdjustment').checked);renderTotal();};
['adjustmentValue','adjustmentMode','adjustmentType'].forEach(id=>$(id).oninput=renderTotal);
document.addEventListener('input',event=>{if(event.target.dataset.lineQty!==undefined){state.lines[Number(event.target.dataset.lineQty)].qty=Number(event.target.value||1);renderLines();}});
document.addEventListener('change',async event=>{if(event.target.dataset.lineItemSearch!==undefined){const index=Number(event.target.dataset.lineItemSearch);const item=findItemFromEntry(event.target.value);if(!item){toast('Item not found. Start typing and choose from the list.','err');renderLines();return;}const bundle=bundleForItem(item);const includeLinked=bundle.linked.length?await confirmAction({title:'Add Linked Item(s)?',message:`${item.name||itemSku(item)} has ${bundle.linked.length} default linked item(s). Add them as a grouped bundle?`,details:bundle.linked.map(x=>`${x.name}: ${money(x.price)} / ${formatMinutes(x.minutes)}`).join('\n'),confirmText:'Add Linked Items',cancelText:'Main Item Only'}):false;state.lines[index]=createLineForItem(item,state.lines[index]?.qty||1,includeLinked);renderLines();}});
document.addEventListener('click',event=>{if(event.target.dataset.removeLine!==undefined){state.lines.splice(Number(event.target.dataset.removeLine),1);renderLines();}if(event.target.dataset.lineColors!==undefined)assignColors(Number(event.target.dataset.lineColors));if(event.target.dataset.removeColor!==undefined){const line=state.lines[Number(event.target.dataset.removeColor)];line.colors=line.colors.filter(key=>key!==event.target.dataset.colorKey);renderLines();}});
$('deleteOrderBtn').onclick=async()=>{if(!state.editing)return;const ok=await confirmAction({title:'Delete Order',message:`Delete order #${state.editing}?`,details:'This cannot be undone.',confirmText:'Delete Order'});if(!ok)return;await CVDB.remove('cv_order_lines',`order_id=eq.${encodeURIComponent(state.editing)}`);await CVDB.remove('cv_orders',`order_id=eq.${encodeURIComponent(state.editing)}`);toast('Order deleted');await load();};
$('orderForm').onsubmit=async event=>{event.preventDefault();try{const calc=renderTotal();const orderId=state.editing||nextOrderId();const row={order_id:orderId,customer:$('customer').value.trim(),status:$('status').value,order_date:$('orderDate').value||null,due_date:$('dueDate').value||null,priority:Number($('priority').value||2),paid:$('paid').checked,notes:$('notes').value,total:calc.total,subtotal:calc.subtotal,discount_type:$('hasAdjustment').checked&&$('adjustmentMode').value==='discount'?$('adjustmentType').value:'none',discount_value:$('hasAdjustment').checked&&$('adjustmentMode').value==='discount'?Number($('adjustmentValue').value||0):0,surcharge_type:$('hasAdjustment').checked&&$('adjustmentMode').value==='surcharge'?$('adjustmentType').value:'none',surcharge_value:$('hasAdjustment').checked&&$('adjustmentMode').value==='surcharge'?Number($('adjustmentValue').value||0):0,updated_at:new Date().toISOString()};if(!row.customer){toast('Customer is required.','err');$('customer').focus();return;}if(state.editing)await CVDB.patch('cv_orders',`order_id=eq.${encodeURIComponent(orderId)}`,row);else await CVDB.insert('cv_orders',row);await CVDB.remove('cv_order_lines',`order_id=eq.${encodeURIComponent(orderId)}`);if(state.lines.length)await CVDB.insert('cv_order_lines',state.lines.flatMap(line=>{if(line.bundle){return line.bundle.lines.map(b=>({order_id:orderId,item_sku:b.sku,qty:Number(line.qty||1),colors:[...new Set(((b.components||[]).map(c=>c.color).filter(Boolean)).concat(line.colors||[]))]}));}return [{order_id:orderId,item_sku:line.item_sku,qty:Number(line.qty||1),colors:line.colors||[]}];}));toast('Order saved');await load();}catch(error){console.error(error);toast(`Order was not saved: ${error.message}`,'err');}};

load().catch(error=>toast(error.message,'err'));
