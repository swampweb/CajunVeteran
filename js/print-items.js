initNavigation('print-items.html');

let printRows = [];
let editingPrintItem = null;
let componentRows = [];
let linkedRows = [];

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const PRICING_STORE = 'cv_print_item_pricing_v1';
const PRICING_DEFAULTS_STORE = 'cv_print_pricing_defaults_v1';

function pricingDefaults() {
  const fallback = { filamentRate: 0.02, machineRate: 0.75, markupPercent: 100, roundTo: 0.50 };
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(PRICING_DEFAULTS_STORE) || '{}') }; }
  catch { return fallback; }
}

function firstValue(item, keys, fallback = '') {
  for (const key of keys) {
    if (item && item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') return item[key];
  }
  return fallback;
}
function itemImage(item) {
  return firstValue(item, ['image_url','image','photo_url','thumbnail_url'], 'images/CajunVeteran 3D Print Logo.png');
}
function itemStock(item) {
  const stock = Number(firstValue(item, ['stock','qty','quantity','on_hand'], 0));
  if (stock <= 0) return { key: 'out', label: 'Out of Stock', value: stock };
  return { key: 'good', label: 'In Stock', value: stock };
}
function isVisible(item) {
  const status = String(item.status || '').toLowerCase();
  if (status === 'hidden' || item.hidden === true || item.active === false) return false;
  return true;
}
function parseJson(value, fallback) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}
function localPricing() {
  try { return JSON.parse(localStorage.getItem(PRICING_STORE) || '{}'); } catch { return {}; }
}
function saveLocalPricing(sku, data) {
  const store = localPricing();
  store[sku] = data;
  localStorage.setItem(PRICING_STORE, JSON.stringify(store));
}
function itemPricingData(item) {
  const store = localPricing();
  const sku = item.sku || item.item_id || '';
  return {
    components: parseJson(item.price_components, store[sku]?.components || []),
    linked: parseJson(item.linked_items, store[sku]?.linked || []),
    rate: Number(item.filament_rate || store[sku]?.rate || pricingDefaults().filamentRate),
    machine: Number(item.machine_rate || store[sku]?.machine || pricingDefaults().machineRate),
    markup: Number(item.markup_percent || store[sku]?.markup || pricingDefaults().markupPercent),
    round: Number(item.round_to || store[sku]?.round || pricingDefaults().roundTo),
    suggested: Number(item.suggested_price || store[sku]?.suggested || 0)
  };
}
function minutesFrom(h, m) { return Number(h || 0) * 60 + Number(m || 0); }
function roundTo(value, step) {
  step = Number(step || 0.5);
  return step > 0 ? Math.ceil(Number(value || 0) / step) * step : Number(value || 0);
}
function calcPricing(components = componentRows) {
  const defaults = pricingDefaults();
  const filamentRate = Number($('filament_rate')?.value || defaults.filamentRate);
  const machineRate = Number($('machine_rate')?.value || defaults.machineRate);
  const markup = Number($('markup_percent')?.value || defaults.markupPercent);
  const round = Number($('round_to')?.value || defaults.roundTo);
  const grams = components.reduce((sum, row) => sum + Number(row.grams || 0), 0);
  const minutes = components.reduce((sum, row) => sum + minutesFrom(row.hours, row.minutes), 0);
  const filamentCost = grams * filamentRate;
  const machineCost = (minutes / 60) * machineRate;
  const baseCost = filamentCost + machineCost;
  const suggestedRaw = baseCost * (1 + markup / 100);
  const suggested = roundTo(suggestedRaw, round);
  return { grams, minutes, filamentCost, machineCost, baseCost, suggestedRaw, suggested, filamentRate, machineRate, markup, round };
}
function formatMinutes(minutes) {
  const h = Math.floor(Number(minutes || 0) / 60);
  const m = Math.round(Number(minutes || 0) % 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
function setPrintPreview(value) {
  const wrap = $('printImagePreviewWrap');
  const img = $('printImagePreview');
  if (!wrap || !img) return;
  if (value) { img.src = value; wrap.classList.remove('hidden'); }
  else { img.removeAttribute('src'); wrap.classList.add('hidden'); }
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function linkedItemOptions(selected = '') {
  return `<option value="">Select linked item...</option>` + printRows
    .filter(item => !editingPrintItem || String(item.sku) !== String(editingPrintItem.sku))
    .map(item => `<option value="${esc(item.sku || '')}" ${String(selected) === String(item.sku) ? 'selected' : ''}>${esc(item.name || item.sku)} (${esc(item.sku || '')})</option>`).join('');
}
function componentTemplate(row, index) {
  return `<div class="pi-component-row" data-component-index="${index}">
    <label>Part / Color<input data-component-field="name" value="${esc(row.name || '')}" placeholder="Orange holder"></label>
    <label>Filament Color<input data-component-field="color" value="${esc(row.color || '')}" placeholder="Orange"></label>
    <label>Grams<input data-component-field="grams" type="number" step="0.1" value="${Number(row.grams || 0)}"></label>
    <label>Hours<input data-component-field="hours" type="number" step="1" value="${Number(row.hours || 0)}"></label>
    <label>Minutes<input data-component-field="minutes" type="number" step="1" value="${Number(row.minutes || 0)}"></label>
    <label class="inline-check component-check">Required <input data-component-field="required" type="checkbox" ${row.required !== false ? 'checked' : ''}></label>
    <button class="small-btn red" type="button" data-remove-component="${index}">Remove</button>
  </div>`;
}
function linkedTemplate(row, index) {
  const linked = printRows.find(item => String(item.sku) === String(row.sku)) || {};
  const data = itemPricingData(linked);
  return `<div class="pi-linked-row" data-linked-index="${index}">
    <label>Linked Item<select data-linked-field="sku">${linkedItemOptions(row.sku)}</select></label>
    <label>Option Label<input data-linked-field="label" value="${esc(row.label || linked.name || '')}" placeholder="12oz Insert"></label>
    <label class="inline-check component-check">Default Selected <input data-linked-field="defaultSelected" type="checkbox" ${row.defaultSelected ? 'checked' : ''}></label>
    <div class="linked-preview">${row.sku ? `Suggested: <b>${money(data.suggested || 0)}</b>` : 'Select an item option.'}</div>
    <button class="small-btn red" type="button" data-remove-linked="${index}">Remove</button>
  </div>`;
}
function renderComponents() {
  $('componentRows').innerHTML = componentRows.map(componentTemplate).join('') || '<div class="pi-empty-soft">No components added yet.</div>';
  $('linkedRows').innerHTML = linkedRows.map(linkedTemplate).join('') || '<div class="pi-empty-soft">No linked item options added yet.</div>';
  renderPricingSummary();
}
function renderPricingSummary() {
  const calc = calcPricing();
  if ($('suggestedPriceBox')) $('suggestedPriceBox').textContent = money(calc.suggested);
  if ($('pricingSummary')) {
    $('pricingSummary').innerHTML = `
      <div><span>Total Grams</span><strong>${calc.grams.toFixed(1)}g</strong></div>
      <div><span>Total Print Time</span><strong>${formatMinutes(calc.minutes)}</strong></div>
      <div><span>Material Cost</span><strong>${money(calc.filamentCost)}</strong></div>
      <div><span>Machine Cost</span><strong>${money(calc.machineCost)}</strong></div>
      <div><span>Base Cost</span><strong>${money(calc.baseCost)}</strong></div>
      <div><span>Suggested</span><strong>${money(calc.suggested)}</strong></div>`;
  }
}
function renderStats() {
  const total = printRows.length;
  const avg = total ? printRows.reduce((sum, item) => sum + Number(item.price || 0), 0) / total : 0;
  $('piTotal').textContent = total;
  $('piAverage').textContent = money(avg);
  $('piVisible').textContent = printRows.filter(isVisible).length;
  $('piOut').textContent = printRows.filter(item => itemStock(item).key === 'out').length;
}
function render() {
  const q = ($('printItemSearch')?.value || '').toLowerCase();
  const filter = $('printItemFilter')?.value || 'all';
  renderStats();
  const list = printRows.filter(item => {
    const haystack = `${item.sku || ''} ${item.name || ''} ${item.category || ''}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (filter === 'visible') return isVisible(item);
    if (filter === 'hidden') return !isVisible(item);
    if (filter === 'out') return itemStock(item).key === 'out';
    return true;
  });
  $('printItemsGrid').innerHTML = list.map(item => {
    const stock = itemStock(item);
    const sku = item.sku || item.item_id || '';
    const pricing = itemPricingData(item);
    const printTime = firstValue(item, ['print_time','printTime','duration','time'], pricing.components?.length ? formatMinutes(calcPricing(pricing.components).minutes) : '');
    const size = firstValue(item, ['size','dimensions'], item.category || 'Other');
    return `<article class="print-item-card" data-sku="${esc(sku)}">
      <div class="print-item-thumb-wrap"><img class="print-item-thumb" src="${esc(itemImage(item))}" alt="${esc(item.name || 'Print item')}" loading="lazy" onerror="this.src='images/CajunVeteran 3D Print Logo.png'"></div>
      <div class="print-item-content">
        <div class="print-item-head"><div class="print-title-block"><h3>${esc(item.name || 'Unnamed Item')}</h3><small>SKU: ${esc(sku)}</small></div><span class="print-stock-pill ${stock.key}">${stock.label}</span></div>
        <div class="print-price">${money(item.price)}</div>
        <div class="print-suggested">Suggested: <b>${money(pricing.suggested || 0)}</b></div>
        <div class="print-kpis"><div><span>Stock</span><strong>${stock.value}</strong></div><div><span>Type</span><strong>${esc(size)}</strong></div><div><span>Time</span><strong>${esc(printTime || '-')}</strong></div></div>
        <div class="print-actions"><button type="button" class="small-btn print-edit-btn" data-edit="${esc(sku)}">Edit</button></div>
      </div>
    </article>`;
  }).join('') || '<div class="color-empty">No print items found.</div>';
}
function clearForm() {
  editingPrintItem = null;
  componentRows = [];
  linkedRows = [];
  $('printItemForm').reset();
  const defaults = pricingDefaults();
  $('filament_rate').value = defaults.filamentRate;
  $('machine_rate').value = defaults.machineRate;
  $('markup_percent').value = defaults.markupPercent;
  $('round_to').value = defaults.roundTo;
  $('printItemForm').classList.remove('show');
  $('deletePrintItem').classList.add('hidden');
  setPrintPreview('');
  renderComponents();
}
function openEditor(item) {
  editingPrintItem = item;
  const pricing = itemPricingData(item);
  componentRows = pricing.components || [];
  linkedRows = pricing.linked || [];
  $('printItemForm').classList.add('show');
  $('sku').value = item.sku || '';
  $('name').value = item.name || '';
  $('price').value = Number(item.price || 0);
  $('stock').value = Number(firstValue(item, ['stock','qty','quantity','on_hand'], 0));
  $('category').value = item.category || '';
  $('status').value = isVisible(item) ? 'visible' : 'hidden';
  $('print_time').value = firstValue(item, ['print_time','printTime','duration','time'], '');
  $('weight').value = firstValue(item, ['weight','grams','material_weight'], '');
  $('description').value = item.description || item.notes || '';
  $('image_url').value = item.image_url || item.image || item.photo_url || item.thumbnail_url || '';
  $('filament_rate').value = pricing.rate;
  $('machine_rate').value = pricing.machine;
  $('markup_percent').value = pricing.markup;
  $('round_to').value = pricing.round;
  setPrintPreview($('image_url').value);
  $('deletePrintItem').classList.remove('hidden');
  renderComponents();
  $('printItemForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function load() { printRows = await CVDB.select('cv_items', 'select=*&order=name.asc'); render(); }
async function saveItem(row) {
  const calc = calcPricing();
  const extended = { ...row, price_components: componentRows, linked_items: linkedRows, filament_rate: calc.filamentRate, machine_rate: calc.machineRate, markup_percent: calc.markup, round_to: calc.round, suggested_price: calc.suggested, total_grams: calc.grams, total_print_minutes: calc.minutes, filament_cost: calc.filamentCost, machine_cost: calc.machineCost };
  try {
    if (editingPrintItem) await CVDB.patch('cv_items', `sku=eq.${encodeURIComponent(editingPrintItem.sku)}`, extended);
    else await CVDB.insert('cv_items', extended);
  } catch (error) {
    saveLocalPricing(row.sku, { components: componentRows, linked: linkedRows, rate: calc.filamentRate, machine: calc.machineRate, markup: calc.markup, round: calc.round, suggested: calc.suggested });
    if (editingPrintItem) await CVDB.patch('cv_items', `sku=eq.${encodeURIComponent(editingPrintItem.sku)}`, row);
    else await CVDB.insert('cv_items', row);
    toast('Item saved. Pricing saved locally because pricing columns are not in Supabase yet.', 'err');
    return;
  }
  toast('Print item saved');
}
function wire() {
  $('printItemSearch').oninput = render;
  $('printItemFilter').onchange = render;
  $('newPrintItem').onclick = () => { clearForm(); $('printItemForm').classList.add('show'); };
  $('clearPrintItem').onclick = clearForm;
  ['filament_rate','machine_rate','markup_percent','round_to'].forEach(id => $(id).oninput = renderPricingSummary);
  $('addComponent').onclick = () => { componentRows.push({ name:'', color:'', grams:0, hours:0, minutes:0, required:true }); renderComponents(); };
  $('addLinkedItem').onclick = () => { linkedRows.push({ sku:'', label:'', defaultSelected:false }); renderComponents(); };
  document.addEventListener('input', event => {
    const rowEl = event.target.closest('[data-component-index]');
    if (rowEl && event.target.dataset.componentField) {
      const index = Number(rowEl.dataset.componentIndex);
      const field = event.target.dataset.componentField;
      componentRows[index][field] = ['grams','hours','minutes'].includes(field) ? Number(event.target.value || 0) : event.target.value;
      renderPricingSummary();
    }
    const linkedEl = event.target.closest('[data-linked-index]');
    if (linkedEl && event.target.dataset.linkedField) {
      const index = Number(linkedEl.dataset.linkedIndex);
      linkedRows[index][event.target.dataset.linkedField] = event.target.value;
    }
  });
  document.addEventListener('change', event => {
    const rowEl = event.target.closest('[data-component-index]');
    if (rowEl && event.target.dataset.componentField === 'required') componentRows[Number(rowEl.dataset.componentIndex)].required = event.target.checked;
    const linkedEl = event.target.closest('[data-linked-index]');
    if (linkedEl && event.target.dataset.linkedField) {
      const index = Number(linkedEl.dataset.linkedIndex);
      const field = event.target.dataset.linkedField;
      linkedRows[index][field] = field === 'defaultSelected' ? event.target.checked : event.target.value;
      if (field === 'sku') {
        const item = printRows.find(x => String(x.sku) === String(event.target.value));
        if (item && !linkedRows[index].label) linkedRows[index].label = item.name;
      }
      renderComponents();
    }
  });
  document.addEventListener('click', event => {
    if (event.target.dataset.removeComponent !== undefined) { componentRows.splice(Number(event.target.dataset.removeComponent), 1); renderComponents(); }
    if (event.target.dataset.removeLinked !== undefined) { linkedRows.splice(Number(event.target.dataset.removeLinked), 1); renderComponents(); }
  });
  $('printItemsGrid').onclick = event => { const button = event.target.closest('[data-edit]'); if (!button) return; const row = printRows.find(item => String(item.sku) === String(button.dataset.edit)); if (row) openEditor(row); };
  $('image_file').onchange = async event => { const file = event.target.files && event.target.files[0]; if (!file) return; $('image_url').value = await fileToDataUrl(file); setPrintPreview($('image_url').value); };
  $('removePrintImage').onclick = () => { $('image_url').value = ''; $('image_file').value = ''; setPrintPreview(''); };
  $('printItemForm').onsubmit = async event => {
    event.preventDefault();
    const row = { sku:$('sku').value.trim(), name:$('name').value.trim(), price:Number($('price').value || 0), stock:Number($('stock').value || 0), category:$('category').value.trim(), status:$('status').value, print_time:$('print_time').value, weight:$('weight').value, description:$('description').value, image_url:$('image_url').value || null, updated_at:new Date().toISOString() };
    if (!row.sku || !row.name) { toast('SKU and Name are required', 'err'); return; }
    await saveItem(row);
    clearForm();
    await load();
  };
  $('deletePrintItem').onclick = async () => { if (!editingPrintItem) return; const ok = await confirmAction({ title:'Delete Print Item', message:`Delete ${editingPrintItem.name}?`, details:'Existing orders keep their line item text, but this item will be removed from the pick list.', confirmText:'Delete Item' }); if (!ok) return; await CVDB.remove('cv_items', `sku=eq.${encodeURIComponent(editingPrintItem.sku)}`); toast('Print item deleted'); clearForm(); await load(); };
}
wire();
renderComponents();
load().catch(error => toast(error.message, 'err'));
