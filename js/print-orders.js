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
function itemPrice(sku){return Number(state.items.find(item=>String(item.sku)===String(sku))?.price||0);}
function linesFor(orderId){return state.allLines.filter(line=>String(line.order_id)===String(orderId));}
function lineTotal(line){return itemPrice(line.item_sku)*Number(line.qty||0);}
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
  $('lineTable').innerHTML=state.lines.map((line,index)=>{
    const item=state.items.find(candidate=>String(candidate.sku)===String(line.item_sku))||{};
    return `<tr>
      <td><select data-line-sku="${index}">${state.items.map(option=>`<option value="${esc(option.sku)}" ${String(option.sku)===String(line.item_sku)?'selected':''}>${esc(option.name)}</option>`).join('')}</select><small>SKU: ${esc(line.item_sku||'')}</small></td>
      <td>${money(item.price)}</td>
      <td><input class="po-qty" type="number" min="1" value="${Number(line.qty||1)}" data-line-qty="${index}"></td>
      <td>${selectedChips(line.colors||[],index)}<button type="button" class="small-btn" data-line-colors="${index}">Assign Colors</button></td>
      <td>${money(lineTotal(line))}</td>
      <td><button type="button" class="small-btn red po-line-remove" data-remove-line="${index}" aria-label="Remove item">X</button></td>
    </tr>`;
  }).join('')||'<tr><td colspan="6">No items added.</td></tr>';
  renderTotal();
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
  state.orders=data.orders||[];state.items=data.items||[];state.colors=data.colors||[];state.allLines=data.orderLines||[];
  $('customerList').innerHTML=[...new Set(state.orders.map(order=>order.customer).filter(Boolean))].map(name=>`<option value="${esc(name)}"></option>`).join('');
  renderKpis();clearForm();
}
function openOrder(orderId){
  const order=state.orders.find(candidate=>String(candidate.order_id)===String(orderId));if(!order)return;
  state.editing=order.order_id;$('orderTitle').textContent='Order #'+order.order_id;$('customer').value=order.customer||'';$('orderDate').value=order.order_date||'';$('dueDate').value=order.due_date||'';$('status').value=norm(order.status);$('priority').value=String(order.priority||2);$('paid').checked=!!order.paid;$('notes').value=order.notes||'';
  const hasDiscount=order.discount_type&&order.discount_type!=='none';const hasSurcharge=order.surcharge_type&&order.surcharge_type!=='none';$('hasAdjustment').checked=!!(hasDiscount||hasSurcharge);$('adjustmentBox').classList.toggle('hidden',!$('hasAdjustment').checked);$('adjustmentMode').value=hasSurcharge?'surcharge':'discount';$('adjustmentType').value=hasSurcharge?order.surcharge_type:(order.discount_type||'percent');$('adjustmentValue').value=hasSurcharge?Number(order.surcharge_value||0):Number(order.discount_value||0);
  state.lines=linesFor(orderId).map(line=>({...line,colors:Array.isArray(line.colors)?line.colors:[]}));$('deleteOrderBtn').classList.remove('hidden');renderLines();renderGroups();
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
  $('colorSave').onclick=()=>{line.colors=[...selected];modal.classList.remove('show');renderLines();};
}

$('ordersGrouped').onclick=event=>{
  const toggle=event.target.closest('[data-toggle-group]');if(toggle){const group=toggle.dataset.toggleGroup;state.groupsOpen[group]=!state.groupsOpen[group];renderGroups();return;}
  const row=event.target.closest('[data-order]');if(row)openOrder(row.dataset.order);
};
$('orderSearch').oninput=event=>{state.search=event.target.value.toLowerCase();renderGroups();};
$('statusFilter').onchange=event=>{state.filter=event.target.value;renderGroups();};
$('refreshOrders').onclick=()=>load().catch(error=>toast(error.message,'err'));
$('newOrderBtn').onclick=clearForm;$('clearOrder').onclick=clearForm;
$('addLine').onclick=()=>{const item=state.items[0]||{};state.lines.push({item_sku:item.sku,qty:1,colors:Array.isArray(item.colors)?[...item.colors]:[]});renderLines();};
$('hasAdjustment').onchange=()=>{$('adjustmentBox').classList.toggle('hidden',!$('hasAdjustment').checked);renderTotal();};
['adjustmentValue','adjustmentMode','adjustmentType'].forEach(id=>$(id).oninput=renderTotal);
document.addEventListener('input',event=>{if(event.target.dataset.lineQty!==undefined){state.lines[Number(event.target.dataset.lineQty)].qty=Number(event.target.value||1);renderLines();}if(event.target.dataset.lineSku!==undefined){const index=Number(event.target.dataset.lineSku);const item=state.items.find(candidate=>String(candidate.sku)===String(event.target.value))||{};state.lines[index].item_sku=event.target.value;state.lines[index].colors=Array.isArray(item.colors)?[...item.colors]:[];renderLines();}});
document.addEventListener('click',event=>{if(event.target.dataset.removeLine!==undefined){state.lines.splice(Number(event.target.dataset.removeLine),1);renderLines();}if(event.target.dataset.lineColors!==undefined)assignColors(Number(event.target.dataset.lineColors));if(event.target.dataset.removeColor!==undefined){const line=state.lines[Number(event.target.dataset.removeColor)];line.colors=line.colors.filter(key=>key!==event.target.dataset.colorKey);renderLines();}});
$('deleteOrderBtn').onclick=async()=>{if(!state.editing)return;const ok=await confirmAction({title:'Delete Order',message:`Delete order #${state.editing}?`,details:'This cannot be undone.',confirmText:'Delete Order'});if(!ok)return;await CVDB.remove('cv_order_lines',`order_id=eq.${encodeURIComponent(state.editing)}`);await CVDB.remove('cv_orders',`order_id=eq.${encodeURIComponent(state.editing)}`);toast('Order deleted');await load();};
$('orderForm').onsubmit=async event=>{event.preventDefault();try{const calc=renderTotal();const orderId=state.editing||nextOrderId();const row={order_id:orderId,customer:$('customer').value.trim(),status:$('status').value,order_date:$('orderDate').value||null,due_date:$('dueDate').value||null,priority:Number($('priority').value||2),paid:$('paid').checked,notes:$('notes').value,total:calc.total,subtotal:calc.subtotal,discount_type:$('hasAdjustment').checked&&$('adjustmentMode').value==='discount'?$('adjustmentType').value:'none',discount_value:$('hasAdjustment').checked&&$('adjustmentMode').value==='discount'?Number($('adjustmentValue').value||0):0,surcharge_type:$('hasAdjustment').checked&&$('adjustmentMode').value==='surcharge'?$('adjustmentType').value:'none',surcharge_value:$('hasAdjustment').checked&&$('adjustmentMode').value==='surcharge'?Number($('adjustmentValue').value||0):0,updated_at:new Date().toISOString()};if(!row.customer){toast('Customer is required.','err');$('customer').focus();return;}if(state.editing)await CVDB.patch('cv_orders',`order_id=eq.${encodeURIComponent(orderId)}`,row);else await CVDB.insert('cv_orders',row);await CVDB.remove('cv_order_lines',`order_id=eq.${encodeURIComponent(orderId)}`);if(state.lines.length)await CVDB.insert('cv_order_lines',state.lines.map(line=>({order_id:orderId,item_sku:line.item_sku,qty:Number(line.qty||1),colors:line.colors||[]})));toast('Order saved');await load();}catch(error){console.error(error);toast(`Order was not saved: ${error.message}`,'err');}};

load().catch(error=>toast(error.message,'err'));
