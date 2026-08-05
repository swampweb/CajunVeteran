initNavigation('colors.html');

let colorRows = [];
let editingColor = null;
let filterMode = 'active';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const FILAMENT_STORE = 'cv_filament_local_v1';
const LOW_DEFAULT = 200;

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function localStore() { return readJson(FILAMENT_STORE, {}); }
function saveLocal(id, data) { const store = localStore(); store[String(id)] = { ...(store[String(id)] || {}), ...data }; writeJson(FILAMENT_STORE, store); }
function rowKey(row) { return String(row.id ?? row.color_id ?? `${row.brand || ''}|${row.color || row.name || row.label || ''}|${row.type || ''}`); }
function first(row, keys, fallback = '') { for (const key of keys) if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key]; return fallback; }
function localFor(row) { return localStore()[rowKey(row)] || {}; }
function colorName(row) { return first(row, ['color','name','label','color_name'], 'Unnamed Color'); }
function colorStatus(row) { const local = localFor(row); const raw = String(local.status || row.status || row.active_status || (row.active === false ? 'inactive' : 'active')).toLowerCase(); return raw === 'inactive' || raw === 'false' ? 'inactive' : 'active'; }
function spoolCount(row) { const local = localFor(row); return Number(local.spools ?? row.spools ?? row.spool_count ?? 1); }
function estGrams(row) { const local = localFor(row); return Number(local.estimated_grams ?? row.estimated_grams ?? row.est_grams ?? row.remaining_grams ?? 0); }
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
  if (grams <= 0 || colorStatus(row) === 'inactive') return { key:'out', label:'Out / Inactive' };
  if (grams <= low) return { key:'low', label:'Low' };
  return { key:'good', label:'In Stock' };
}
function lowColors() { return colorRows.filter(row => colorStatus(row) === 'active' && estGrams(row) > 0 && estGrams(row) <= lowAt(row)); }
function syncStatusFields() {
  if ($('status').value === 'inactive') {
    $('spools').value = 0;
    $('estimated_grams').value = 0;
  } else if (Number($('spools').value || 0) <= 0) {
    $('spools').value = 1;
  }
}
function renderStats() { $('filamentLowSummary').textContent = `Low Filament: ${lowColors().length}`; }
function render() {
  const q = ($('colorSearch')?.value || '').toLowerCase();
  renderStats();
  const list = colorRows.filter(row => {
    const status = colorStatus(row);
    if (filterMode !== 'all' && status !== filterMode) return false;
    const haystack = `${row.brand || ''} ${colorName(row)} ${row.type || ''} ${row.notes || ''}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    return true;
  });
  $('colorsGrid').innerHTML = list.map(row => {
    const state = filamentState(row);
    const grams = estGrams(row);
    const spools = spoolCount(row);
    const low = lowAt(row);
    const status = colorStatus(row);
    const key = rowKey(row);
    return `<article class="filament-card ${state.key}">
      <div class="filament-card-top">
        <div class="filament-title"><span class="filament-swatch" style="background:${esc(colorHex(row))}"></span><div><h3>${esc(colorName(row))}</h3><small>${esc(row.brand || 'No Brand')} ${row.type ? '• ' + esc(row.type) : ''}</small></div></div>
        <span class="filament-status ${status}">${status}</span>
      </div>
      <div class="filament-grams-row"><strong>${grams.toFixed(1)}g</strong><span class="filament-state ${state.key}">${state.label}</span></div>
      <div class="filament-kpis"><div><span>Spools</span><b>${spools}</b></div><div><span>Low At</span><b>${low}g</b></div></div>
      <div class="filament-actions"><button type="button" class="small-btn" data-edit="${esc(key)}">Edit</button></div>
    </article>`;
  }).join('') || '<div class="color-empty">No colors match this filter.</div>';
}
function clearForm() {
  editingColor = null;
  $('colorForm').reset();
  $('estimated_grams').value = 1000;
  $('spools').value = 1;
  $('low_grams').value = LOW_DEFAULT;
  $('status').value = 'active';
  $('deleteColor').classList.add('hidden');
}
function openEditor(row) {
  editingColor = row;
  $('brand').value = row.brand || '';
  $('color').value = colorName(row);
  $('type').value = row.type || '';
  $('estimated_grams').value = estGrams(row);
  $('spools').value = spoolCount(row);
  $('low_grams').value = lowAt(row);
  $('status').value = colorStatus(row);
  $('notes').value = row.notes || '';
  $('deleteColor').classList.remove('hidden');
  $('colorForm').scrollIntoView({ behavior:'smooth', block:'start' });
}
async function load() {
  try { colorRows = await CVDB.select('cv_colors', 'select=*&order=color.asc'); }
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
  syncStatusFields();
  const row = {
    brand: $('brand').value.trim(),
    color: $('color').value.trim(),
    type: $('type').value.trim(),
    status: $('status').value,
    estimated_grams: Number($('estimated_grams').value || 0),
    spools: Number($('spools').value || 0),
    low_grams: Number($('low_grams').value || LOW_DEFAULT),
    notes: $('notes').value,
    updated_at: new Date().toISOString()
  };
  if (!row.color) { toast('Color name is required.', 'err'); return; }
  const localKey = editingColor ? rowKey(editingColor) : `${row.brand}|${row.color}|${row.type}`;
  saveLocal(localKey, row);
  try {
    if (editingColor) await patchColor(editingColor, row);
    else await CVDB.insert('cv_colors', row);
    toast('Color saved');
  } catch(error) {
    console.warn('Color save fallback local only:', error);
    toast('Color saved locally. Run the SQL file to save grams/spools/status in Supabase.', 'err');
  }
  clearForm();
  await load();
}
async function subtractFilamentUsage(colorNameOrKey, gramsUsed) {
  const grams = Number(gramsUsed || 0);
  if (!grams) return;
  const row = colorRows.find(color => rowKey(color) === colorNameOrKey || colorName(color).toLowerCase() === String(colorNameOrKey).toLowerCase());
  if (!row) return;
  const next = Math.max(0, estGrams(row) - grams);
  saveLocal(rowKey(row), { estimated_grams: next });
  try { await patchColor(row, { estimated_grams: next, updated_at: new Date().toISOString() }); }
  catch(error) { console.warn('Filament usage saved locally only:', error); }
}
window.CVFilamentTracker = { subtractFilamentUsage };
function wire() {
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.onclick = () => { filterMode = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b === button)); render(); };
  });
  $('colorSearch').oninput = render;
  $('newColorBtn').onclick = clearForm;
  $('clearColor').onclick = clearForm;
  $('status').onchange = () => { syncStatusFields(); };
  $('colorForm').onsubmit = async event => { event.preventDefault(); await saveColor(); };
  $('colorsGrid').onclick = event => { const btn = event.target.closest('[data-edit]'); if (!btn) return; const row = colorRows.find(color => rowKey(color) === btn.dataset.edit); if (row) openEditor(row); };
  $('deleteColor').onclick = async () => {
    if (!editingColor) return;
    if (!confirm('Delete this color?')) return;
    try { await CVDB.remove('cv_colors', editingColor.id ? `id=eq.${editingColor.id}` : `color=eq.${encodeURIComponent(colorName(editingColor))}`); }
    catch(error) { console.warn(error); }
    clearForm();
    await load();
  };
}
wire();
load().catch(error => { console.error(error); toast(error.message, 'err'); });
