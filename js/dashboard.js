initNavigation('dashboard.html');
const money=n=>'$'+Number(n||0).toFixed(2);const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,'_');
function statusPill(s){const n=norm(s);return `<span class="v7-status ${n==='completed'||n==='delivered'||n==='shipped'?'completed':''}">${String(s||'new').replace('_',' ')}</span>`}
function dueParts(date){if(!date)return ['',''];const d=new Date(date+'T00:00:00');return [d.toLocaleString('en-US',{month:'short'}).toUpperCase(),String(d.getDate()).padStart(2,'0')]}
function colorName(row){return row.color||row.name||row.label||'Unnamed Color'}
function estGrams(row){return Number(row.estimated_grams??row.est_grams??row.remaining_grams??0)}
function lowAt(row){return Number(row.low_grams??row.low_at_grams??200)}
function status(row){return String(row.status||row.active_status||(row.active===false?'inactive':'active')).toLowerCase()}
function ensureFilamentPanel(){
  if(document.getElementById('filamentLowList')) return;
  const target=document.getElementById('lowStockList')?.parentElement;
  if(!target) return;
  target.insertAdjacentHTML('afterend', `<section class="v7-card filament-dashboard-card"><div class="v7-card-head"><h2 class="v7-panel-title">Filament Low</h2><span class="filament-low-count" id="filamentLowCount">0</span></div><div class="v7-card-body"><div id="filamentLowList" class="v7-list"></div></div></section>`);
}
async function load(){
  const data=await CVDB.loadDashboard();
  const orders=data.orders||[], orderLines=data.orderLines||[], items=data.items||[], woodJobs=data.woodJobs||[], woodMaterials=data.woodMaterials||[], colors=data.colors||[];
  document.getElementById('today').textContent=new Date().toLocaleString([], {weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
  const newOrders=orders.filter(o=>norm(o.status)==='new');
  const printing=orders.filter(o=>norm(o.status)==='in_process');
  const complete=orders.filter(o=>['completed','delivered','shipped'].includes(norm(o.status)));
  const woodActive=woodJobs.filter(j=>['new','in_process'].includes(norm(j.status)));
  const low=woodMaterials.filter(m=>Number(m.low_level||0)>0&&Number(m.qty||0)<=Number(m.low_level||0));
  const inv=woodMaterials.reduce((s,m)=>s+Number(m.qty||0)*Number(m.cost||0),0);
  if(window.kpiPrintNew) kpiPrintNew.textContent=newOrders.length;
  if(window.kpiPrintProgress) kpiPrintProgress.textContent=printing.length;
  if(window.kpiPrintComplete) kpiPrintComplete.textContent=complete.length;
  if(window.kpiWoodActive) kpiWoodActive.textContent=woodActive.length;
  if(window.kpiLowStock) kpiLowStock.textContent=low.length;
  if(window.kpiInventoryValue) kpiInventoryValue.textContent=money(inv);
  const lineTotal=id=>orderLines.filter(l=>String(l.order_id)===String(id)).reduce((s,l)=>{const it=items.find(i=>String(i.sku)===String(l.item_sku));return s+Number(it?.price||0)*Number(l.qty||0)},0);
  const active=[...orders.filter(o=>['new','in_process'].includes(norm(o.status))).map(o=>({type:'▣',id:o.order_id,name:o.customer,due:o.due_date,status:o.status,priority:o.priority,total:lineTotal(o.order_id)})),...woodActive.map(j=>({type:'⚒',id:j.job_id,name:j.project||j.customer,due:j.due_date,status:j.status,priority:'Normal',total:j.total||0}))];
  if(window.activeWorkTable) activeWorkTable.innerHTML=active.map(x=>`<tr><td>${x.type}</td><td>${x.id}</td><td>${x.name||''}</td><td>${x.due||''}</td><td>${statusPill(x.status)}</td><td>${x.priority||''}</td><td>${money(x.total)}</td></tr>`).join('')||'<tr><td colspan="7">No active work.</td></tr>';
  const due=active.filter(x=>x.due).slice(0,5);
  if(window.upcomingDue) upcomingDue.innerHTML=due.map(x=>{const [m,d]=dueParts(x.due);return `<div class="v7-list-row"><div class="v7-datebox"><b>${m}</b><span>${d}</span></div><div><b>${x.name||x.id}</b><div class="v7-kpi-help">${x.type==='⚒'?'Woodworking Job':'3D Print Order'}</div></div><span class="v7-due">${x.due}</span></div>`}).join('')||'No upcoming due dates.';
  const statuses=['new','in_process','completed','delivered'];
  if(window.statusList) statusList.innerHTML=statuses.map((s,i)=>`<div class="v7-legend-row"><span><i class="v7-dot" style="background:${['#cf3428','#dc8b00','#4fa23a','#5861a8'][i]}"></i>${s.replace('_',' ')}</span><b>${orders.filter(o=>norm(o.status)===s).length}</b></div>`).join('');
  const revenue=orders.reduce((s,o)=>s+Number(o.total||lineTotal(o.order_id)),0);
  if(window.revenueTotal) revenueTotal.textContent=money(revenue);
  if(window.revenueChart) revenueChart.innerHTML=[28,35,31,45,42,55,62,70,68,82,90,86].map(h=>`<i class="v7-bar" style="height:${h}%"></i>`).join('');
  if(window.lowStockList) lowStockList.innerHTML=low.map(m=>`<div class="v7-list-row"><span class="v7-dot" style="background:#d13a2d"></span><div><b>${m.material}</b></div><span>${m.qty} left</span></div>`).join('')||'No low stock alerts.';
  if(window.recentActivity) recentActivity.innerHTML=active.slice(0,4).map(x=>`<div class="v7-list-row"><span>${x.type}</span><div><b>${x.id} • ${x.name||''}</b><div class="v7-kpi-help">${String(x.status||'').replace('_',' ')}</div></div></div>`).join('')||'No recent activity.';
  ensureFilamentPanel();
  const lowFilament=colors.filter(c=>status(c)!=='inactive'&&estGrams(c)>0&&estGrams(c)<=lowAt(c));
  const countEl=document.getElementById('filamentLowCount'); if(countEl) countEl.textContent=lowFilament.length;
  const listEl=document.getElementById('filamentLowList'); if(listEl) listEl.innerHTML=lowFilament.map(c=>`<div class="v7-list-row"><span class="v7-dot" style="background:#f0b429"></span><div><b>${colorName(c)}</b><div class="v7-kpi-help">${c.brand||''} ${c.type||''}</div></div><span>${estGrams(c).toFixed(1)}g</span></div>`).join('')||'No low filament alerts.';
}
load().catch(e=>console.error(e));
