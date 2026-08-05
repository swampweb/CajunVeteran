initNavigation('dashboard.html');

const money = value => '$' + Number(value || 0).toFixed(2);
const norm = value => String(value || '').toLowerCase().replace(/\s+/g, '_');
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function statusPill(status) {
  const clean = norm(status || 'new');
  return `<span class="v7-status ${clean}">${esc(clean.replace('_', ' '))}</span>`;
}
function typeBadge(type) {
  if (type === 'wood') return '<span class="dash-type-badge wood">Wood</span>';
  return '<span class="dash-type-badge print">3D</span>';
}
function dueParts(date) {
  if (!date) return ['', ''];
  const d = new Date(date + 'T00:00:00');
  return [d.toLocaleString('en-US', { month: 'short' }).toUpperCase(), String(d.getDate()).padStart(2, '0')];
}

async function load() {
  const data = await CVDB.loadDashboard();
  const orders = data.orders || [];
  const orderLines = data.orderLines || [];
  const items = data.items || [];
  const woodJobs = data.woodJobs || [];
  const woodMaterials = data.woodMaterials || [];

  const today = document.getElementById('today');
  if (today) {
    today.textContent = new Date().toLocaleString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  const newOrders = orders.filter(order => norm(order.status) === 'new');
  const printing = orders.filter(order => norm(order.status) === 'in_process');
  const complete = orders.filter(order => ['completed', 'delivered', 'shipped'].includes(norm(order.status)));
  const woodActive = woodJobs.filter(job => ['new', 'in_process'].includes(norm(job.status)));
  const low = woodMaterials.filter(material => Number(material.low_level || 0) > 0 && Number(material.qty || 0) <= Number(material.low_level || 0));
  const inv = woodMaterials.reduce((sum, material) => sum + Number(material.qty || 0) * Number(material.cost || 0), 0);

  kpiPrintNew.textContent = newOrders.length;
  kpiPrintProgress.textContent = printing.length;
  kpiPrintComplete.textContent = complete.length;
  kpiWoodActive.textContent = woodActive.length;
  kpiLowStock.textContent = low.length;
  kpiInventoryValue.textContent = money(inv);

  const lineTotal = orderId => orderLines
    .filter(line => String(line.order_id) === String(orderId))
    .reduce((sum, line) => {
      const item = items.find(candidate => String(candidate.sku) === String(line.item_sku));
      return sum + Number(item?.price || 0) * Number(line.qty || 0);
    }, 0);

  const active = [
    ...orders.filter(order => ['new', 'in_process'].includes(norm(order.status))).map(order => ({
      type: 'print',
      id: order.order_id,
      name: order.customer || 'No customer',
      project: order.project || order.customer || '',
      due: order.due_date,
      status: order.status,
      priority: order.priority || 'Normal',
      total: order.total || lineTotal(order.order_id)
    })),
    ...woodActive.map(job => ({
      type: 'wood',
      id: job.job_id,
      name: job.project || job.customer || '',
      project: job.project || job.customer || '',
      due: job.due_date,
      status: job.status,
      priority: 'Normal',
      total: job.total
    }))
  ].sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999'))).slice(0, 8);

  activeWork.innerHTML = active.map(row => `
    <tr>
      <td>${typeBadge(row.type)}</td>
      <td><b>${esc(row.id)}</b></td>
      <td>${esc(row.project || row.name || '')}</td>
      <td>${esc(row.due || '')}</td>
      <td>${statusPill(row.status)}</td>
      <td><span class="v7-status ${String(row.priority).toLowerCase() === 'rush' ? 'rush' : ''}">${esc(row.priority || 'Normal')}</span></td>
      <td class="v7-money">${money(row.total)}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">No active work.</td></tr>';

  const due = active.filter(row => row.due).slice(0, 5);
  upcomingDue.innerHTML = due.map(row => {
    const [m, d] = dueParts(row.due);
    return `<div class="v7-list-row"><div class="v7-datebox"><b>${m}</b><span>${d}</span></div><div><b>${esc(row.project || row.name || row.id)}</b><div class="v7-kpi-help">${row.type === 'wood' ? 'Woodworking Job' : '3D Print Order'}</div></div><span class="v7-due">${esc(row.due)}</span></div>`;
  }).join('') || 'No upcoming due dates.';

  const statuses = ['new', 'in_process', 'completed', 'delivered'];
  statusList.innerHTML = statuses.map((status, index) => `<div class="v7-legend-row"><span><i class="v7-dot" style="background:${['#cf3428','#dc8b00','#4fa23a','#5861a8'][index]}"></i>${status.replace('_', ' ')}</span><b>${orders.filter(order => norm(order.status) === status).length}</b></div>`).join('');

  const revenue = orders.reduce((sum, order) => sum + Number(order.total || lineTotal(order.order_id)), 0);
  revenueTotal.textContent = money(revenue);
  revenueChart.innerHTML = [28,35,31,45,42,55,62,70,68,82,90,86].map(height => `<i class="v7-bar" style="height:${height}%"></i>`).join('');
  lowStockList.innerHTML = low.map(material => `<div class="v7-list-row"><span class="v7-dot" style="background:#d13a2d"></span><div><b>${esc(material.material)}</b></div><span>${esc(material.qty)} left</span></div>`).join('') || 'No low stock alerts.';
  recentActivity.innerHTML = active.slice(0, 4).map(row => `<div class="v7-list-row"><span>${typeBadge(row.type)}</span><div><b>${esc(row.id)} - ${esc(row.project || row.name || '')}</b><div class="v7-kpi-help">${esc(String(row.status || '').replace('_', ' '))}</div></div></div>`).join('') || 'No recent activity.';
}

document.addEventListener('DOMContentLoaded', () => {
  const refresh = document.getElementById('refreshDashboard');
  if (refresh) refresh.addEventListener('click', () => load().catch(error => console.error(error)));
});

load().catch(error => console.error(error));
