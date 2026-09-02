initNavigation('woodworking-jobs.html');

const state = {
  jobs: [], items: [], materials: [], orders: [], plaques: [], editing: null,
  statusFilter: 'all', groupsOpen: { new: true, in_process: true, completed: false, delivered: false }
};

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);
const norm = value => String(value || 'new').toLowerCase().replace(/\s+/g, '_');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function isPlaqueItem(item) { return /plaque/i.test(item?.name || ''); }
function nextJobId() {
  const ids = state.jobs.map(job => Number(String(job.job_id || '').replace(/\D/g, ''))).filter(Boolean);
  return 'W' + String((ids.length ? Math.max(...ids) : 1000) + 1);
}
function selectedItem() { return state.items.find(item => String(item.item_id) === String($('woodItem').value)); }
function selectedMaterial() { return state.materials.find(item => String(item.id) === String($('material').value)); }

function calculatePrice() {
  const item = selectedItem() || {};
  const qty = Math.max(1, Number($('qty').value || 1));
  const each = Number(item.sale_cost || 0);
  const subtotal = each * qty;
  let adjustment = 0;
  if ($('hasAdjustment').checked) {
    const amount = Math.max(0, Number($('adjustmentValue').value || 0));
    adjustment = $('adjustmentType').value === 'percent' ? subtotal * amount / 100 : amount;
    if ($('adjustmentMode').value === 'discount') adjustment *= -1;
  }
  return { each, subtotal, adjustment, total: Math.max(0, subtotal + adjustment) };
}

function renderPrices() {
  const calc = calculatePrice();
  $('itemPrice').textContent = money(calc.each);
  $('jobSubtotal').textContent = money(calc.subtotal);
  $('jobAdjustment').textContent = money(calc.adjustment);
  $('jobTotal').textContent = money(calc.total);
}

function renderSelects() {
  $('woodItem').innerHTML = '<option value="">Select item...</option>' + state.items
    .slice().sort((a,b) => String(a.name || '').localeCompare(String(b.name || '')))
    .map(item => `<option value="${esc(item.item_id)}">${esc(item.name || 'Unnamed Item')}</option>`).join('');
  $('material').innerHTML = '<option value="">Select material...</option>' + state.materials
    .slice().sort((a,b) => String(a.material || '').localeCompare(String(b.material || '')))
    .map(item => `<option value="${esc(item.id)}">${esc(item.material || 'Material')} - On Hand: ${esc(item.qty || 0)}, Yield: ${esc(item.yield_qty || '-')}</option>`).join('');
}

function renderGroups() {
  const query = String($('jobSearch').value || '').toLowerCase();
  const groups = ['new', 'in_process', 'completed', 'delivered'];
  $('jobsGrouped').innerHTML = groups.map(group => {
    const rows = state.jobs.filter(job =>
      (state.statusFilter === 'all' || norm(job.status) === state.statusFilter) &&
      norm(job.status) === group &&
      `${job.job_id || ''} ${job.customer || ''} ${job.project || ''}`.toLowerCase().includes(query)
    );
    if (!rows.length && !query) return '';
    const open = !!state.groupsOpen[group];
    return `<section class="status-group ${open ? 'open' : ''}" data-group="${group}">
      <button class="status-head" type="button"><span>${esc(group.replace('_', ' '))}</span><b>${rows.length}</b></button>
      <div class="status-body">${rows.map(job => `<button type="button" class="wood-job-row ${String(state.editing) === String(job.job_id) ? 'active' : ''}" data-job="${esc(job.job_id)}">
        <strong>${esc(job.job_id)}</strong><strong>${money(job.total)}</strong>
        <small>${esc(job.customer || 'No customer')}</small><small>${esc(job.due_date || 'No due date')}</small>
        <span class="row-project">${esc(job.project || '')}</span>
      </button>`).join('') || '<div class="po-empty">No jobs.</div>'}</div>
    </section>`;
  }).join('') || '<div class="po-empty">No matching jobs.</div>';
  renderSide();
}

function renderPlaques() {
  const item = selectedItem();
  $('plaqueBox').classList.toggle('hidden', !isPlaqueItem(item));
  $('plaques').innerHTML = state.plaques.map((plaque, index) => `<div class="plaque-row">
    <strong>#${index + 1}</strong>
    <label>Name<input data-plaque-name="${index}" value="${esc(plaque.name || '')}"></label>
    <label>Rank<select data-plaque-rank="${index}"><option value="NCO" ${plaque.rank === 'NCO' ? 'selected' : ''}>NCO</option><option value="SNCO" ${plaque.rank === 'SNCO' ? 'selected' : ''}>SNCO</option><option value="Chief" ${plaque.rank === 'Chief' ? 'selected' : ''}>Chief</option></select></label>
    <label>Month Promoted<input data-plaque-month="${index}" value="${esc(plaque.month_promoted || '')}"></label>
    <button type="button" class="small-btn red" data-plaque-remove="${index}">Remove</button>
  </div>`).join('') || '<div class="po-empty">No plaques added.</div>';
}

function renderSide() {
  const material = selectedMaterial();
  $('materialInfo').innerHTML = material ? `<div class="material-detail-grid">
    <div><span>Material</span><b>${esc(material.material || '')}</b></div>
    <div><span>On Hand</span><b>${esc(material.qty || 0)}</b></div>
    <div><span>Yield</span><b>${esc(material.yield_qty || '-')}</b></div>
    <div><span>Purchase Cost</span><b>${money(material.cost)}</b></div>
  </div>` : 'Select a material.';
  $('jobSummary').textContent = `${state.jobs.filter(job => ['new','in_process'].includes(norm(job.status))).length} Active`;
}

function suggestedMaterial(item) {
  const name = String(item?.name || '').toLowerCase();
  if (name.includes('plaque')) return state.materials.find(m => /plaque|poplar/i.test(m.material || ''));
  if (name.includes('flag')) return state.materials.find(m => /pine|basswood|flag/i.test(m.material || ''));
  return null;
}

function syncPlaqueQuantity() {
  if (!isPlaqueItem(selectedItem())) return;
  const target = Math.max(1, Number($('qty').value || 1));
  while (state.plaques.length < target) state.plaques.push({ rank: 'NCO' });
  while (state.plaques.length > target) state.plaques.pop();
  renderPlaques();
}

function clearForm() {
  state.editing = null;
  state.plaques = [];
  $('jobForm').reset();
  $('orderDate').value = new Date().toISOString().slice(0,10);
  $('status').value = 'new';
  $('qty').value = 1;
  $('material').value = '';
  $('hasAdjustment').checked = false;
  $('adjustmentMode').value = 'discount';
  $('adjustmentType').value = 'percent';
  $('adjustmentValue').value = 0;
  $('adjustmentBox').classList.add('hidden');
  $('jobTitle').textContent = 'New Job';
  $('deleteJob').classList.add('hidden');
  renderPlaques();
  renderPrices();
  renderSide();
  renderGroups();
}

async function load() {
  const data = await CVDB.loadDashboard();
  state.jobs = data.woodJobs || [];
  state.items = data.woodItems || [];
  state.materials = data.woodMaterials || [];
  state.orders = data.orders || [];
  const names = [...new Set([...state.jobs.map(j => j.customer), ...state.orders.map(o => o.customer)].filter(Boolean))];
  $('customerList').innerHTML = names.sort().map(name => `<option value="${esc(name)}"></option>`).join('');
  renderSelects();
  clearForm();
}

function openJob(id) {
  const job = state.jobs.find(row => String(row.job_id) === String(id));
  if (!job) return;
  state.editing = job.job_id;
  $('jobTitle').textContent = 'Job #' + job.job_id;
  $('customer').value = job.customer || '';
  $('woodItem').value = job.source_item_id || '';
  $('status').value = norm(job.status);
  $('dueDate').value = job.due_date || '';
  $('orderDate').value = job.created_at ? String(job.created_at).slice(0,10) : '';
  $('notes').value = job.notes || '';
  $('paid').checked = !!job.paid;
  const uses = Array.isArray(job.material_uses) ? job.material_uses : [];
  const firstUse = uses[0] || {};
  $('qty').value = Number(firstUse.qty_used || job.qty || 1);
  $('material').value = firstUse.material_id != null ? String(firstUse.material_id) : '';
  if (!$('material').value) {
    const suggestion = suggestedMaterial(selectedItem());
    $('material').value = suggestion ? String(suggestion.id) : '';
  }
  const mode = job.adjustment_mode || (Number(job.adjustment || 0) < 0 ? 'discount' : 'surcharge');
  const adjustmentValue = Number(job.adjustment_value || 0);
  const hasAdjustment = adjustmentValue > 0 || Number(job.adjustment || 0) !== 0;
  $('hasAdjustment').checked = hasAdjustment;
  $('adjustmentMode').value = mode === 'surcharge' ? 'surcharge' : 'discount';
  $('adjustmentType').value = job.adjustment_type || 'amount';
  $('adjustmentValue').value = adjustmentValue || Math.abs(Number(job.adjustment || 0));
  $('adjustmentBox').classList.toggle('hidden', !hasAdjustment);
  state.plaques = [];
  if (job.plaque_name) state.plaques.push({ name: job.plaque_name, rank: job.plaque_rank || 'NCO', month_promoted: job.plaque_month_promoted || '' });
  $('deleteJob').classList.remove('hidden');
  renderPlaques();
  renderPrices();
  renderSide();
  renderGroups();
}

$('jobsGrouped').onclick = event => {
  const head = event.target.closest('.status-head');
  if (head) {
    const group = head.closest('.status-group').dataset.group;
    state.groupsOpen[group] = !state.groupsOpen[group];
    renderGroups();
    return;
  }
  const row = event.target.closest('[data-job]');
  if (row) openJob(row.dataset.job);
};
$('jobSearch').oninput = renderGroups;
$('jobStatusFilter').onchange = event => { state.statusFilter = event.target.value; if (state.statusFilter !== 'all') state.groupsOpen[state.statusFilter] = true; renderGroups(); };
$('newJobBtn').onclick = clearForm;
$('clearJob').onclick = clearForm;
$('woodItem').onchange = () => {
  state.plaques = [];
  const item = selectedItem();
  if (isPlaqueItem(item)) syncPlaqueQuantity();
  const suggestion = suggestedMaterial(item);
  if (suggestion && !$('material').value) $('material').value = String(suggestion.id);
  renderPlaques(); renderPrices(); renderSide();
};
$('qty').oninput = () => { syncPlaqueQuantity(); renderPrices(); };
$('material').onchange = renderSide;
$('hasAdjustment').onchange = () => { $('adjustmentBox').classList.toggle('hidden', !$('hasAdjustment').checked); renderPrices(); };
['adjustmentMode','adjustmentType','adjustmentValue'].forEach(id => $(id).oninput = renderPrices);
$('addPlaque').onclick = () => { state.plaques.push({ rank: 'NCO' }); $('qty').value = state.plaques.length; renderPlaques(); renderPrices(); };

document.addEventListener('input', event => {
  if (event.target.dataset.plaqueName !== undefined) state.plaques[Number(event.target.dataset.plaqueName)].name = event.target.value;
  if (event.target.dataset.plaqueMonth !== undefined) state.plaques[Number(event.target.dataset.plaqueMonth)].month_promoted = event.target.value;
});
document.addEventListener('change', event => {
  if (event.target.dataset.plaqueRank !== undefined) state.plaques[Number(event.target.dataset.plaqueRank)].rank = event.target.value;
});
document.addEventListener('click', event => {
  if (event.target.dataset.plaqueRemove !== undefined) {
    state.plaques.splice(Number(event.target.dataset.plaqueRemove), 1);
    $('qty').value = Math.max(1, state.plaques.length);
    renderPlaques(); renderPrices();
  }
});

$('deleteJob').onclick = async () => {
  if (!state.editing) return;
  const ok = await confirmAction({ title:'Delete Woodworking Job', message:`Delete job ${state.editing}?`, details:'This cannot be undone.', confirmText:'Delete Job' });
  if (!ok) return;
  await CVDB.remove('cv_woodworking_jobs', `job_id=eq.${encodeURIComponent(state.editing)}`);
  toast('Job deleted');
  await load();
};

$('jobForm').onsubmit = async event => {
  event.preventDefault();
  const item = selectedItem() || {};
  const jobId = state.editing || nextJobId();
  const firstPlaque = state.plaques[0] || {};
  const qty = Math.max(1, Number($('qty').value || 1));
  const calc = calculatePrice();
  const row = {
    job_id: jobId,
    customer: $('customer').value.trim(),
    source_item_id: $('woodItem').value,
    project: item.name || '',
    status: $('status').value,
    due_date: $('dueDate').value || null,
    paid: $('paid').checked,
    notes: $('notes').value,
    total: calc.total,
    plaque_name: firstPlaque.name || '',
    plaque_rank: firstPlaque.rank || '',
    plaque_month_promoted: firstPlaque.month_promoted || '',
    material_uses: $('material').value ? [{ material_id: $('material').value, qty_used: qty }] : [],
    updated_at: new Date().toISOString()
  };
  if (!row.customer || !row.source_item_id) { toast('Customer and Woodworking Item are required.', 'err'); return; }
  try {
    const extended = { ...row, adjustment: calc.adjustment, adjustment_mode: $('adjustmentMode').value, adjustment_type: $('adjustmentType').value, adjustment_value: Number($('adjustmentValue').value || 0), subtotal: calc.subtotal };
    if (state.editing) await CVDB.patch('cv_woodworking_jobs', `job_id=eq.${encodeURIComponent(jobId)}`, extended);
    else await CVDB.insert('cv_woodworking_jobs', extended);
  } catch (error) {
    console.warn('Adjustment columns unavailable; saving calculated total only.', error);
    if (state.editing) await CVDB.patch('cv_woodworking_jobs', `job_id=eq.${encodeURIComponent(jobId)}`, row);
    else await CVDB.insert('cv_woodworking_jobs', row);
  }
  toast('Job saved');
  await load();
};

load().catch(error => toast(error.message, 'err'));
