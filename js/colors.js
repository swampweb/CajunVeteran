initNavigation('colors.html');

let colorRows = [];
let editingColor = null;
let filterMode = 'active';
let spoolRows = [1000];

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const FILAMENT_STORE = 'cv_filament_local_v2';
const LOW_DEFAULT = 200;

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function store() { return readJson(FILAMENT_STORE, {}); }
function saveLocal(id, data) { const all = store(); all[String(id)] = { ...(all[String(id)] || {}), ...data }; writeJson(FILAMENT_STORE, all); }
function rowKey(row) { return String(row.id ?? row.color_id ?? `${row.brand || ''}|${row.color || row.name || row.label || ''}|${row.type || ''}`); }
function first(row, keys, fallback = '') { for (const key of keys) if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key]; return fallback; }
function localFor(row) { return store()[rowKey(row)] || {}; }
function colorName(row) { return first(row, ['color','name','label','color_name'], 'Unnamed Color'); }
function brandName(row) { return first(row, ['brand','manufacturer'], 'No Brand'); }
function statusOf(row) { const local = localFor(row); const raw = String(local.status || row.status || row.active_status || (row.active === false ? 'inactive' : 'active')).toLowerCase(); return raw === 'inactive' || raw === 'false' ? 'inactive' : 'active'; }
function spoolArray(row) {
  const local = localFor(row);
  const raw = local.spool_grams ?? row.spool_grams ?? row.spools_grams ?? row.spoolGrams;
  if (Array.isArray(raw)) return raw.map(Number);
  if (typeof raw === 'string') { try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed.map(Number); } catch {} }
  const total = Number(local.estimated_grams ?? row.estimated_grams ?? row.est_grams ?? row.remaining_grams ?? NaN);
  const count = Number(local.spools ?? row.spools ?? row.spool_count ?? 1);
  if (Number.isFinite(total) && total > 0 && count > 0) {
    const each = total / count;
    return Array.from({ length: count }, () => Number(each.toFixed(1)));
  }
  if (statusOf(row) === 'inactive') return [];
  return [1000];
}
function spoolCount(row) { return statusOf(row) === 'inactive' ? 0 : spoolArray(row).length; }
function estGrams(row) { return statusOf(row) === 'inactive' ? 0 : spoolArray(row).reduce((sum, value) => sum + Number(value || 0), 0); }
function lowAt(row) { const local = localFor(row); return Number(local.low_grams ?? row.low_grams ?? row.low_at_grams ?? LOW_DEFAULT); }
function colorHex(row) {
  const raw = `${colorName(row)} ${row.hex || row.swatch || ''}`.toLowerCase();
  if (String(row.hex || '').startsWith('#')) return row.hex;
  if (String(row.swatch || '').startsWith('#')) return row.swatch;
  const map = {black:'#111',white:'#eee',red:'#b71c1c',orange:'#f47b20',yellow:'#f3c316',green:'#159947',blue:'#1464d2',purple:'#6936c9',pink:'#e15aa2',gray:'#888',grey:'#888',brown:'#8b5a2b',gold:'#caa45f',silver:'#c0c0c0',teal:'#17a2a6'};
  const key = Object.keys(map).find(name => raw.includes(name));
  return map[key] || '#d8d8d8';
}
function filamentState(row) {
  const grams = estGrams(row);
  const low = lowAt(row);
  if (statusOf(row) === 'inactive') return { key:'inactive', label:'Inactive' };
  if (grams <= 0) return { key:'out', label:'Out' };
  if (grams <= low) return { key:'low', label:'Low' };
  return { key:'good', label:'In Stock' };
}
function lowRows() { return colorRows.filter(row => filamentState(row).key === 'low'); }
function outRows() { return colorRows.filter(row => filamentState(row).key === 'out'); }
function updateCounts() { $('filamentCounts').textContent = `Low ${lowRows().length} • Out ${outRows().length}`; }
function syncInactive() {
  if ($('status').value === 'inactive') {
    $('spools').value = 0;
    spoolRows = [];
  } else if (Number($('spools').value || 0) <= 0) {
    $('spools').value = 1;
    spoolRows = [1000];
  }
  renderSpools();
}
function syncSpoolCount() {
  const count = Math.max(0, Number($('spools').value || 0));
  if ($('status').value === 'inactive') {
    spoolRows = [];
    $('spools').value = 0;
  } else {
    while (spoolRows.length < count) spoolRows.push(1000);
    while (spoolRows.length > count) spoolRows.pop();
  }
  renderSpools();
}
function renderSpools() {
  $('spoolRows').innerHTML = spoolRows.map((grams, index) => `<label class="spool-row">Spool ${index + 1}<input data-spool-index="${index}" type="number" min="0" step="0.1" value="${Number(grams || 0)}"></label>`).join('') || '<div class="spool-empty">No active spools.</div>';
  const total = spoolRows.reduce((sum, value) => sum + Number(value || 0), 0);
  $('estimated_grams').value = total.toFixed(1);
}
function rowMatchesFilter(row) {
  const state = filamentState(row).key;
  const status = statusOf(row);
  if (filterMode === 'all') return true;
  if (filterMode === 'active') return status === 'active';
  if (filterMode === 'inactive') return status === 'inactive';
  if (filterMode === 'low') return state === 'low';
  if (filterMode === 'out') return state === 'out';
  return true;
}
function render() {
  const q = ($('colorSearch')?.value || '').toLowerCase();
  updateCounts();
  const list = colorRows.filter(row => {
    if (!rowMatchesFilter(row)) return false;
    const haystack = `${brandName(row)} ${colorName(row)} ${row.type || ''} ${row.notes || ''}`.toLowerCase();
    return !q || haystack.includes(q);
  });
  const grouped = list.reduce((acc, row) => {
    const brand = brandName(row);
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(row);
    return acc;
  }, {});
  const brandNames = Object.keys(grouped).sort((a,b) => a.localeCompare(b));
  $('colorsGrouped').innerHTML = brandNames.map(brand => `<section class="brand-group"><div class="brand-row"><h3>${esc(brand)}</h3><span>${grouped[brand].length} colors</span></div><div class="colors-grid">${grouped[brand].map(cardHtml).join('')}</div></section>`).join('') || '<div class="color-empty">No colors match this filter.</div>';
}
function cardHtml(row) {
  const state = filamentState(row);
  const grams = estGrams(row);
  const spools = spoolCount(row);
  const low = lowAt(row);
  return `<article class="filament-card ${state.key}">
    <div class="filament-card-top">
      <div class="filament-title"><span class="filament-swatch" style="background:${esc(colorHex(row))}"></span><div><h3>${esc(colorName(row))}</h3><small>${esc(brandName(row))}${row.type ? ' • ' + esc(row.type) : ''}</small></div></div>
      <span class="filament-state ${state.key}">${state.label}</span>
    </div>
    <div class="filament-grams-row"><strong>${grams.toFixed(1)}g</strong><span>${spools} spool${spools === 1 ? '' : 's'}</span></div>
    <div class="spool-mini-list">${spoolArray(row).map((g,i)=>`<span>Spool ${i+1}: <b>${Number(g||0).toFixed(1)}g</b></span>`).join('') || '<span>No spools</span>'}</div>
    <div class="filament-kpis"><div><span>Low At</span><b>${low}g</b></div><div><span>Status</span><b>${statusOf(row)}</b></div></div>
    <div class="filament-actions"><button type="button" class="small-btn" data-edit="${esc(rowKey(row))}">Edit</button></div>
  </article>`;
}
function clearForm() {
  editingColor = null;
  $('colorForm').reset();
  $('status').value = 'active';
  $('low_grams').value = LOW_DEFAULT;
  $('spools').value = 1;
  spoolRows = [1000];
  $('deleteColor').classList.add('hidden');
  renderSpools();
}
function openEditor(row) {
  editingColor = row;
  $('brand').value = brandName(row) === 'No Brand' ? '' : brandName(row);
  $('color').value = colorName(row);
  $('type').value = row.type || '';
  $('status').value = statusOf(row);
  $('low_grams').value = lowAt(row);
  spoolRows = spoolArray(row);
  $('spools').value = statusOf(row) === 'inactive' ? 0 : spoolRows.length;
  $('notes').value = row.notes || '';
  $('deleteColor').classList.remove('hidden');
  renderSpools();
  $('colorForm').scrollIntoView({ behavior:'smooth', block:'start' });
}
async function load() {
  try { colorRows = await CVDB.select('cv_colors', 'select=*&order=brand.asc,color.asc'); }
  catch { try { const dash = await CVDB.loadDashboard(); colorRows = dash.colors || []; } catch { colorRows = []; } }
  render();
}
async function patchColor(row, payload) {
  const filters = [];
  if (row?.id) filters.push(`id=eq.${row.id}`);
  if (row?.color_id) filters.push(`color_id=eq.${encodeURIComponent(row.color_id)}`);
  if (row?.color) filters.push(`color=eq.${encodeURIComponent(row.color)}`);
  let last;
  for (const filter of filters) {
    try { await CVDB.patch('cv_colors', filter, payload); return true; }
    catch(e) { last = e; }
  }
  if (last) throw last;
  return false;
}
async function saveColor() {
  syncInactive();
  const total = spoolRows.reduce((sum, value) => sum + Number(value || 0), 0);
  const row = {
    brand: $('brand').value.trim(),
    color: $('color').value.trim(),
    type: $('type').value.trim(),
    status: $('status').value,
    spools: Number($('spools').value || 0),
    spool_grams: spoolRows,
    estimated_grams: total,
    low_grams: Number($('low_grams').value || LOW_DEFAULT),
    notes: $('notes').value,
    updated_at: new Date().toISOString()
  };
  if (!row.color) { toast('Color name is required.', 'err'); return; }
  const key = editingColor ? rowKey(editingColor) : `${row.brand}|${row.color}|${row.type}`;
  saveLocal(key, row);
  try {
    if (editingColor) await patchColor(editingColor, row);
    else await CVDB.insert('cv_colors', row);
    toast('Color saved');
  } catch(error) {
    console.warn('Saved locally only:', error);
    toast('Color saved locally. Run the color SQL to save grams/spools/status in Supabase.', 'err');
  }
  clearForm();
  await load();
}
window.CVFilamentTracker = {
  async subtractFilamentUsage(colorNameOrKey, gramsUsed){
    const grams = Number(gramsUsed || 0);
    if (!grams) return;
    const row = colorRows.find(c => rowKey(c) === colorNameOrKey || colorName(c).toLowerCase() === String(colorNameOrKey).toLowerCase());
    if (!row) return;
    const spools = spoolArray(row);
    let remainingUse = grams;
    for (let i = 0; i < spools.length && remainingUse > 0; i++) {
      const used = Math.min(spools[i], remainingUse);
      spools[i] -= used;
      remainingUse -= used;
    }
    const payload = { spool_grams: spools, estimated_grams: spools.reduce((s,g)=>s+Number(g||0),0), updated_at: new Date().toISOString() };
    saveLocal(rowKey(row), payload);
    try { await patchColor(row, payload); } catch(error) { console.warn(error); }
    await load();
  }
};
function wire() {
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.onclick = () => { filterMode = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button)); render(); };
  });
  $('colorSearch').oninput = render;
  $('newColorBtn').onclick = clearForm;
  $('clearColor').onclick = clearForm;
  $('status').onchange = syncInactive;
  $('spools').oninput = syncSpoolCount;
  $('spoolRows').oninput = event => {
    const index = event.target.dataset.spoolIndex;
    if (index === undefined) return;
    spoolRows[Number(index)] = Number(event.target.value || 0);
    renderSpools();
  };
  $('colorForm').onsubmit = async event => { event.preventDefault(); await saveColor(); };
  $('colorsGrouped').onclick = event => { const btn = event.target.closest('[data-edit]'); if (!btn) return; const row = colorRows.find(c => rowKey(c) === btn.dataset.edit); if (row) openEditor(row); };
  $('deleteColor').onclick = async () => {
    if (!editingColor) return;
    if (!confirm('Delete this color?')) return;
    try { await CVDB.remove('cv_colors', editingColor.id ? `id=eq.${editingColor.id}` : `color=eq.${encodeURIComponent(colorName(editingColor))}`); } catch(error) { console.warn(error); }
    clearForm();
    await load();
  };
}
wire();
clearForm();
load().catch(error => { console.error(error); toast(error.message, 'err'); });
