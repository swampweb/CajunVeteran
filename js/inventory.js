initNavigation('inventory.html');

let materials = [];
let editingMaterial = null;
let currentFilter = location.hash === '#low' ? 'low' : 'all';
let activeMaterialTable = 'cv_wood_materials';

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const MATERIAL_TABLES = ['cv_wood_materials','cv_woodworking_materials','cv_materials','cv_inventory_materials','cv_inventory'];

function materialName(row) { return row.material || row.name || row.item || row.description || 'Unnamed Material'; }
function qtyValue(row) { return Number(row.qty ?? row.quantity ?? row.on_hand ?? row.stock ?? 0); }
function lowLevel(row) { return Number(row.low_level ?? row.low_stock ?? row.reorder_level ?? row.minimum_qty ?? 0); }
function costValue(row) { return Number(row.cost ?? row.unit_cost ?? row.price ?? 0); }

function materialSection(row) {
  const name = String(materialName(row) || '').toLowerCase();
  const explicit = String(row.section || row.material_section || row.use_for || row.used_for || row.type || row.category || '').toLowerCase();
  const notes = String(row.notes || '').toLowerCase();
  const combined = `${name} ${explicit}`;

  // Explicit fields win first if the data has a section/category/type.
  if (explicit.includes('wood')) return { key: 'wood', label: 'Woodworking', tag: 'WOOD' };
  if (explicit.includes('3d') || explicit.includes('print') || explicit.includes('filament')) return { key: 'print', label: '3D Print', tag: '3D' };

  // Wood indicators. Put these before print so plaque/poplar does not get mistaken for PLA.
  if (combined.includes('poplar') || combined.includes('plaque') || combined.includes('board') || combined.includes('pine') || combined.includes('walnut') || combined.includes('oak') || combined.includes('wood')) {
    return { key: 'wood', label: 'Woodworking', tag: 'WOOD' };
  }

  // Print indicators. Do not use plain "pla" because it matches "plaque".
  if (combined.includes('3d print') || combined.includes('3d') || combined.includes('filament') || combined.includes('c-130') || combined.includes('c-17') || combined.includes('stripe') || combined.includes('stripes')) {
    return { key: 'print', label: '3D Print', tag: '3D' };
  }

  // Notes are only a fallback because some auto-created records have incorrect notes.
  if (notes.includes('filament') || notes.includes('3d print')) return { key: 'print', label: '3D Print', tag: '3D' };
  if (notes.includes('wood')) return { key: 'wood', label: 'Woodworking', tag: 'WOOD' };

  return { key: 'general', label: 'General', tag: 'GEN' };
}
function stockState(row) {
  const qty = qtyValue(row);
  const low = lowLevel(row);
  if (qty <= 0) return { key: 'out', label: 'Out of Stock' };
  if (low > 0 && qty <= low) return { key: 'low', label: 'Low Stock' };
  return { key: 'good', label: 'In Stock' };
}
async function selectFromTable(table) {
  return await CVDB.select(table, 'select=*&order=material.asc');
}
async function loadMaterials() {
  // First use the same data source the dashboard uses. If dashboard shows Inventory Value,
  // this should return the same materials list.
  try {
    const dashboard = await CVDB.loadDashboard();
    if (Array.isArray(dashboard.woodMaterials) && dashboard.woodMaterials.length) {
      materials = dashboard.woodMaterials;
      // Identify which table is writable by testing common material table names.
      for (const table of MATERIAL_TABLES) {
        try {
          const rows = await selectFromTable(table);
          if (Array.isArray(rows)) { activeMaterialTable = table; break; }
        } catch (_) {}
      }
      return;
    }
  } catch (_) {}

  // Fallback: scan common table names until one returns data.
  let firstEmptyTable = '';
  for (const table of MATERIAL_TABLES) {
    try {
      const rows = await selectFromTable(table);
      if (!firstEmptyTable) firstEmptyTable = table;
      if (Array.isArray(rows) && rows.length) {
        activeMaterialTable = table;
        materials = rows;
        return;
      }
    } catch (_) {}
  }

  activeMaterialTable = firstEmptyTable || 'cv_wood_materials';
  materials = [];
}
function filteredMaterials() {
  const q = ($('materialSearch')?.value || '').toLowerCase();
  const filter = $('materialFilter')?.value || currentFilter;
  return materials.filter(row => {
    const haystack = `${materialName(row)} ${row.supplier || ''} ${row.notes || ''}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    const state = stockState(row).key;
    if (filter === 'low') return state === 'low' || state === 'out';
    if (filter === 'out') return state === 'out';
    return true;
  });
}
function renderStats() {
  const low = materials.filter(row => ['low','out'].includes(stockState(row).key)).length;
  const out = materials.filter(row => stockState(row).key === 'out').length;
  const value = materials.reduce((sum, row) => sum + qtyValue(row) * costValue(row), 0);
  $('matTotal').textContent = materials.length;
  $('matLow').textContent = low;
  $('matOut').textContent = out;
  $('matValue').textContent = money(value);
}
function render() {
  renderStats();
  const list = filteredMaterials();
  $('inventoryTitle').textContent = ($('materialFilter').value === 'low') ? 'Low Stock Materials' : 'Material Inventory';
  document.querySelectorAll('.inv-tab').forEach(button => button.classList.toggle('active', button.dataset.filter === $('materialFilter').value));
  $('materialCards').innerHTML = list.map(row => {
    const state = stockState(row);
    return `<article class="inv-card ${state.key}" data-id="${esc(row.id)}">
      <div class="inv-card-top"><div class="inv-title-block"><div class="inv-title-line"><h3>${esc(materialName(row))}</h3><span class="inv-use-chip ${materialSection(row).key}">${materialSection(row).tag}</span></div><small>${esc(row.supplier || 'No supplier')}</small></div><span class="inv-pill ${state.key}">${state.label}</span></div>
      <div class="inv-card-stats"><div><span>On Hand</span><strong>${qtyValue(row)}</strong></div><div><span>Low At</span><strong>${lowLevel(row)}</strong></div><div><span>Yield</span><strong>${Number(row.yield_qty || 0)}</strong></div><div><span>Cost</span><strong>${money(costValue(row))}</strong></div></div>
      <p>${esc(row.notes || '')}</p><div class="inv-actions"><button class="small-btn inv-edit" type="button" data-edit="${esc(row.id)}">Edit</button></div>
    </article>`;
  }).join('') || `<div class="color-empty">No materials found. Data source checked: ${esc(activeMaterialTable)}.</div>`;
}
function setFilter(filter) {
  currentFilter = filter || 'all';
  $('materialFilter').value = currentFilter;
  if (currentFilter === 'low') history.replaceState(null, '', 'inventory.html#low');
  else history.replaceState(null, '', 'inventory.html');
  render();
}
function clearForm() {
  editingMaterial = null;
  $('materialForm').reset();
  $('materialForm').classList.remove('show');
  $('deleteMaterial').classList.add('hidden');
}
function openEditor(row) {
  editingMaterial = row;
  $('materialForm').classList.add('show');
  $('material').value = materialName(row);
  $('supplier').value = row.supplier || '';
  $('qty').value = qtyValue(row);
  $('low_level').value = lowLevel(row);
  $('yield_qty').value = Number(row.yield_qty || 0);
  $('cost').value = costValue(row);
  $('notes').value = row.notes || '';
  $('deleteMaterial').classList.remove('hidden');
  $('materialForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function load() { await loadMaterials(); render(); }
function wire() {
  $('materialSearch').oninput = render;
  $('materialFilter').onchange = event => setFilter(event.target.value);
  $('refreshMaterials').onclick = () => load().catch(error => toast(error.message, 'err'));
  $('newMaterialBtn').onclick = () => { clearForm(); $('materialForm').classList.add('show'); };
  $('clearMaterial').onclick = clearForm;
  document.querySelectorAll('.inv-tab').forEach(button => button.onclick = () => setFilter(button.dataset.filter));
  $('materialCards').onclick = event => {
    const button = event.target.closest('[data-edit]');
    if (!button) return;
    const row = materials.find(item => String(item.id) === String(button.dataset.edit));
    if (row) openEditor(row);
  };
  $('materialForm').onsubmit = async event => {
    event.preventDefault();
    const row = { material: material.value.trim(), supplier: supplier.value.trim(), qty: Number(qty.value || 0), low_level: Number(low_level.value || 0), yield_qty: Number(yield_qty.value || 0), cost: Number(cost.value || 0), notes: notes.value, updated_at: new Date().toISOString() };
    if (!row.material) { toast('Material name is required.', 'err'); return; }
    if (editingMaterial) await CVDB.patch(activeMaterialTable, `id=eq.${editingMaterial.id}`, row);
    else await CVDB.insert(activeMaterialTable, row);
    toast('Material saved');
    clearForm();
    await load();
  };
  $('deleteMaterial').onclick = async () => {
    if (!editingMaterial) return;
    const ok = await confirmAction({ title: 'Delete Material', message: `Delete ${materialName(editingMaterial)}?`, details: 'This removes the material from inventory.', confirmText: 'Delete Material' });
    if (!ok) return;
    await CVDB.remove(activeMaterialTable, `id=eq.${editingMaterial.id}`);
    toast('Material deleted');
    clearForm();
    await load();
  };
}
wire();
setFilter(currentFilter);
load().catch(error => toast(error.message, 'err'));
