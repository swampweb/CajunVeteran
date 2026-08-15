// CV PRINT ITEMS MODEL SAVE AND COMPACT FORM FIX v2
// CV PRINT ITEMS CARD EDIT COMPONENT MODEL FIX v1
initNavigation('print-items.html');

let printRows = [];
let colors = [];
let editingPrintItem = null;
let componentRows = [];
let linkedRows = [];

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const PRICING_STORE = 'cv_print_item_pricing_v1';
const PRICING_DEFAULTS_STORE = 'cv_print_pricing_defaults_v1';
const SIZE_STORE = 'cv_3d_item_sizes';
const fallbackDefaults = { filamentRate: 0.02, machineRate: 0.75, markupPercent: 100, roundTo: 0.50 };
const fallbackSizes = ['General','Small','Medium','Large','12oz','8.4oz','Coin Holder','Koozie','Plaque'];

function readJson(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }
function pricingDefaults() { return { ...fallbackDefaults, ...readJson(PRICING_DEFAULTS_STORE, {}) }; }
function itemSizes() { return readJson(SIZE_STORE, fallbackSizes); }
function firstValue(item, keys, fallback = '') { for (const key of keys) if (item && item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') return item[key]; return fallback; }
function isImageAsset(value) {
  const v = String(value || '').trim().toLowerCase();
  return v.startsWith('data:image/') || /\.(png|jpg|jpeg|webp|gif|svg)(\?|#|$)/.test(v);
}
function itemImage(item) {
  const value = itemSavedImage(item);
  return isImageAsset(value) ? value : 'images/CajunVeteran 3D Print Logo.png';
}
function fileAssetType(file) {
  const name = String(file?.name || '').toLowerCase();
  if (file?.type && file.type.startsWith('image/')) return 'image';
  if (name.endsWith('.3mf')) return '3mf';
  if (name.endsWith('.stl')) return 'stl';
  if (name.endsWith('.obj')) return 'obj';
  if (name.endsWith('.step') || name.endsWith('.stp')) return 'step';
  return 'file';
}
function ensureHidden(id) {
  if ($(id)) return $(id);
  const input = document.createElement('input');
  input.type = 'hidden';
  input.id = id;
  $('printItemForm').appendChild(input);
  return input;
}
function bytesToDataUrl(bytes, mime='image/png') {
  let bin = '';
  const chunk = 0x8000;
  for (let i=0;i<bytes.length;i+=chunk) bin += String.fromCharCode(...bytes.subarray(i,i+chunk));
  return `data:${mime};base64,${btoa(bin)}`;
}
async function inflateRaw(bytes) {
  if (!('DecompressionStream' in window)) return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function u16(dv, pos) { return dv.getUint16(pos, true); }
function u32(dv, pos) { return dv.getUint32(pos, true); }
async function extract3mfThumbnail(file) {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const dv = new DataView(buffer);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
      if (u32(dv, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return '';
    const entries = u16(dv, eocd + 10);
    let pos = u32(dv, eocd + 16);
    for (let i=0; i<entries && pos < bytes.length; i++) {
      if (u32(dv, pos) !== 0x02014b50) break;
      const method = u16(dv, pos + 10);
      const compSize = u32(dv, pos + 20);
      const nameLen = u16(dv, pos + 28);
      const extraLen = u16(dv, pos + 30);
      const commentLen = u16(dv, pos + 32);
      const localOffset = u32(dv, pos + 42);
      const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen)).toLowerCase();
      if ((name.includes('thumbnail') || name.includes('metadata/')) && name.endsWith('.png')) {
        if (u32(dv, localOffset) !== 0x04034b50) return '';
        const lfNameLen = u16(dv, localOffset + 26);
        const lfExtraLen = u16(dv, localOffset + 28);
        const dataStart = localOffset + 30 + lfNameLen + lfExtraLen;
        const compressed = bytes.subarray(dataStart, dataStart + compSize);
        let out = null;
        if (method === 0) out = compressed;
        if (method === 8) out = await inflateRaw(compressed);
        if (out && out.length) return bytesToDataUrl(out, 'image/png');
      }
      pos += 46 + nameLen + extraLen + commentLen;
    }
  } catch (err) { console.warn('3MF thumbnail extract failed', err); }
  return '';
}

function itemStock(item) { const stock = Number(firstValue(item, ['stock','qty','quantity','on_hand'], 0)); return stock <= 0 ? { key:'out', label:'Out of Stock', value:stock } : { key:'good', label:'In Stock', value:stock }; }
function isVisible(item) { const status = String(item.status || '').toLowerCase(); return !(status === 'hidden' || item.hidden === true || item.active === false); }
function parseJson(value, fallback) { if (Array.isArray(value)) return value; if (!value) return fallback; try { return JSON.parse(value); } catch { return fallback; } }
function localPricing() { return readJson(PRICING_STORE, {}); }
function saveLocalPricing(sku, data) {
  try {
    const store = localPricing();
    const clean = { ...(data || {}) };
    // Do NOT put the full 3MF/STL/OBJ data URL in localStorage. It can exceed browser quota and stop the whole save.
    delete clean.model_file_data;
    store[sku] = { ...(store[sku] || {}), ...clean };
    localStorage.setItem(PRICING_STORE, JSON.stringify(store));
  } catch (err) {
    console.warn('Local item cache save skipped', err);
  }
}
function itemPricingData(item) {
  const store = localPricing();
  const sku = item.sku || item.item_id || '';
  const defaults = pricingDefaults();
  const local = store[sku] || {};
  const localHasComponents = Array.isArray(local.components);
  const localHasLinked = Array.isArray(local.linked);
  return {
    components: localHasComponents ? local.components : parseJson(item.price_components, []),
    linked: localHasLinked ? local.linked : parseJson(item.linked_items, []),
    rate: Number(local.rate || item.filament_rate || defaults.filamentRate),
    machine: Number(local.machine || item.machine_rate || defaults.machineRate),
    markup: Number(local.markup || item.markup_percent || defaults.markupPercent),
    round: Number(local.round || item.round_to || defaults.roundTo),
    suggested: Number(local.suggested || item.suggested_price || 0)
  };
}
function localItemData(item) {
  const sku = item?.sku || item?.item_id || '';
  return localPricing()[sku] || {};
}
function itemDescription(item) {
  const local = localItemData(item);
  if (local.description !== undefined) return local.description;
  return item.description || item.notes || '';
}
function itemSavedImage(item) {
  const local = localItemData(item);
  return local.image_url || item.image_url || item.image || item.photo_url || item.thumbnail_url || '';
}
function componentDisplayName(row) {
  if (row.name) return row.name;
  if (!row.color) return '';
  const label = colorOptionLabel(row.color);
  return String(label || row.color).replace(/^.*-\s*/, '').replace(/\s*\/.*$/, '').trim();
}
function componentColorHex(row) {
  const found = colors.find(color => colorOptionValue(color) === row.color);
  return found?.hex_color || found?.palette_color || found?.hex || '#b88728';
}

function injectPrintBundleStyles() {
  if (document.getElementById('printBundleStyles')) return;
  const style = document.createElement('style');
  style.id = 'printBundleStyles';
  style.textContent = `.print-bundle-summary{margin:10px 0;padding:9px 10px;border:1px solid rgba(184,135,40,.45);border-radius:8px;background:rgba(0,0,0,.18)}.print-bundle-title{color:#f0b64f;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px}.print-bundle-line,.print-bundle-total{display:flex;justify-content:space-between;gap:10px;font-size:12px;line-height:1.35}.print-bundle-line span{color:#f4ead8}.print-bundle-line b,.print-bundle-total b{color:#ffc24f}.print-bundle-total{border-top:1px solid rgba(184,135,40,.35);margin-top:6px;padding-top:6px;font-weight:900}.print-bundle-title.time-title{margin-top:10px;padding-top:8px;border-top:1px dashed rgba(184,135,40,.35)}`;
  document.head.appendChild(style);
}

function componentKey(row) {
  const name = componentDisplayName(row).toLowerCase();
  const color = String(row.color || '').toLowerCase();
  return `${name}|${color}`;
}
function bundleComponentsForItem(item) {
  const pricing = itemPricingData(item);
  const rows = [...((pricing.components || []).filter(row => componentDisplayName(row)))];
  const bundle = itemBundleSummary(item);
  bundle.linkedLines.forEach(line => {
    const linked = linkedItemBySku(line.sku);
    const linkedPricing = linked ? itemPricingData(linked) : {components: []};
    (linkedPricing.components || []).forEach(row => {
      if (componentDisplayName(row)) rows.push(row);
    });
  });
  const seen = new Set();
  return rows.filter(row => {
    const key = componentKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function renderComponentChips(item) {
  const comps = bundleComponentsForItem(item);
  if (!comps.length) return '';
  return `<div class="print-card-colors" title="Assigned colors including default linked items">${comps.map(row => `<span class="print-color-chip"><i style="background:${esc(componentColorHex(row))}"></i>${esc(componentDisplayName(row))}</span>`).join('')}</div>`;
}
function itemBaseMinutes(item) {
  const pricing = itemPricingData(item);
  if (Array.isArray(pricing.components) && pricing.components.length) return calcPricing(pricing.components).minutes;
  if (item?.total_print_minutes !== undefined && item?.total_print_minutes !== null) return Number(item.total_print_minutes || 0);
  if (item?.print_hours !== undefined || item?.print_minutes !== undefined) return minutesFrom(item.print_hours, item.print_minutes);
  return 0;
}
function itemBaseGrams(item) {
  const pricing = itemPricingData(item);
  if (Array.isArray(pricing.components) && pricing.components.length) return calcPricing(pricing.components).grams;
  if (item?.total_grams !== undefined && item?.total_grams !== null) return Number(item.total_grams || 0);
  if (item?.grams !== undefined && item?.grams !== null) return Number(item.grams || 0);
  return 0;
}
function defaultLinkedRowsForItem(item) {
  const pricing = itemPricingData(item);
  return (pricing.linked || []).filter(row => row && row.sku && row.defaultSelected === true);
}
function linkedItemBySku(sku) {
  return uniquePrintRows(printRows).find(item => String(item.sku || item.item_id || '') === String(sku || '')) || null;
}
function itemBundleSummary(item) {
  const basePrice = Number(item?.price || 0);
  const baseMinutes = itemBaseMinutes(item);
  const baseGrams = itemBaseGrams(item);
  const baseLine = {
    sku: item?.sku || item?.item_id || '',
    name: item?.name || 'Main Item',
    price: basePrice,
    minutes: baseMinutes,
    grams: baseGrams,
    type: 'main'
  };
  const linkedRows = defaultLinkedRowsForItem(item);
  const linkedLines = linkedRows.map(row => {
    const linked = linkedItemBySku(row.sku);
    if (!linked) return null;
    return {
      sku: linked.sku || linked.item_id || row.sku,
      name: row.label || linked.name || row.sku,
      sourceName: linked.name || row.label || row.sku,
      price: Number(linked.price || 0),
      minutes: itemBaseMinutes(linked),
      grams: itemBaseGrams(linked),
      type: 'linked'
    };
  }).filter(Boolean);
  const allLines = [baseLine, ...linkedLines];
  return {
    hasDefaultLinked: linkedLines.length > 0,
    baseLine,
    linkedLines,
    allLines,
    totalPrice: allLines.reduce((sum, line) => sum + Number(line.price || 0), 0),
    totalMinutes: allLines.reduce((sum, line) => sum + Number(line.minutes || 0), 0),
    totalGrams: allLines.reduce((sum, line) => sum + Number(line.grams || 0), 0)
  };
}
function renderBundleLines(item) {
  const bundle = itemBundleSummary(item);
  if (!bundle.hasDefaultLinked) return '';
  const moneyRows = bundle.allLines.map(line => `<div class="print-bundle-line"><span>${esc(line.name)}</span><b>${money(line.price)}</b></div>`).join('');
  const timeRows = bundle.allLines.map(line => `<div class="print-bundle-line"><span>${esc(line.name)} Time</span><b>${line.minutes ? formatMinutes(line.minutes) : '-'}</b></div>`).join('');
  return `<div class="print-bundle-summary"><div class="print-bundle-title">Default Bundle Includes</div>${moneyRows}<div class="print-bundle-total"><span>Total</span><b>${money(bundle.totalPrice)}</b></div><div class="print-bundle-title time-title">Linked Hours</div>${timeRows}<div class="print-bundle-total"><span>Total Time</span><b>${formatMinutes(bundle.totalMinutes)}</b></div></div>`;
}
function minutesFrom(h, m) { return Number(h || 0) * 60 + Number(m || 0); }
function roundTo(value, step) { step = Number(step || 0.5); return step > 0 ? Math.ceil(Number(value || 0) / step) * step : Number(value || 0); }
function calcPricing(components = componentRows) { const d = pricingDefaults(); const grams = components.reduce((sum,row)=>sum+Number(row.grams||0),0); const minutes = components.reduce((sum,row)=>sum+minutesFrom(row.hours,row.minutes),0); const filamentCost = grams * Number(d.filamentRate); const machineCost = (minutes/60) * Number(d.machineRate); const baseCost = filamentCost + machineCost; const suggestedRaw = baseCost * (1 + Number(d.markupPercent)/100); const suggested = roundTo(suggestedRaw, Number(d.roundTo)); return { grams, minutes, filamentCost, machineCost, baseCost, suggestedRaw, suggested, filamentRate:Number(d.filamentRate), machineRate:Number(d.machineRate), markup:Number(d.markupPercent), round:Number(d.roundTo) }; }
function formatMinutes(minutes) { const h = Math.floor(Number(minutes||0)/60); const m = Math.round(Number(minutes||0)%60); return `${h}h ${String(m).padStart(2,'0')}m`; }
function colorOptionValue(color) { return `${color.brand || ''}||${color.type || ''}||${color.color || color.label || ''}`; }
function colorOptionLabel(value) { const found = colors.find(color => colorOptionValue(color) === value); return found ? `${found.brand || ''} ${found.color || found.label || ''}`.trim() : value; }
function colorOptions(selected = '') { return '<option value="">Select filament...</option>' + colors.map(color => { const value = colorOptionValue(color); const label = `${color.brand || 'No Brand'} - ${color.color || color.label || 'Unnamed'}${color.type ? ' / ' + color.type : ''}`; return `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`; }).join(''); }
function sizeOptions(selected = '') { return itemSizes().map(size => `<option value="${esc(size)}" ${String(size) === String(selected) ? 'selected' : ''}>${esc(size)}</option>`).join(''); }
function setPrintPreview(value) {
  const wrap=$('printImagePreviewWrap'), img=$('printImagePreview');
  if(!wrap||!img)return;
  if(value){
    img.src = isImageAsset(value) ? value : 'images/CajunVeteran 3D Print Logo.png';
    wrap.classList.remove('hidden');
  } else {
    img.removeAttribute('src');
    wrap.classList.add('hidden');
  }
}
function fileToDataUrl(file) { return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); }); }
function linkedItemOptions(selected = '') { return `<option value="">Select linked item...</option>` + printRows.filter(item => !editingPrintItem || String(item.sku) !== String(editingPrintItem.sku)).map(item => `<option value="${esc(item.sku || '')}" ${String(selected) === String(item.sku) ? 'selected' : ''}>${esc(item.name || item.sku)} (${esc(item.sku || '')})</option>`).join(''); }
function componentTemplate(row, index) { return `<div class="pi-component-row" data-component-index="${index}"><label>Part / Color<input data-component-field="name" value="${esc(row.name || '')}" placeholder="Orange holder"></label><label>Filament Color<select data-component-field="color">${colorOptions(row.color || '')}</select></label><label>Grams<input data-component-field="grams" type="number" step="0.1" value="${Number(row.grams || 0)}"></label><label>Hours<input data-component-field="hours" type="number" step="1" value="${Number(row.hours || 0)}"></label><label>Minutes<input data-component-field="minutes" type="number" step="1" value="${Number(row.minutes || 0)}"></label><label class="inline-check component-check">Required <input data-component-field="required" type="checkbox" ${row.required !== false ? 'checked' : ''}></label><button class="small-btn red" type="button" data-remove-component="${index}">Remove</button></div>`; }
function linkedTemplate(row, index) { const linked=printRows.find(item=>String(item.sku)===String(row.sku))||{}; const data=itemPricingData(linked); const linkedMinutes=itemBaseMinutes(linked); const linkedPrice=Number(linked.price||0); return `<div class="pi-linked-row" data-linked-index="${index}"><label>Linked Item<select data-linked-field="sku">${linkedItemOptions(row.sku)}</select></label><label>Option Label<input data-linked-field="label" value="${esc(row.label || linked.name || '')}" placeholder="12oz Insert"></label><label class="inline-check component-check">Default Selected <input data-linked-field="defaultSelected" type="checkbox" ${row.defaultSelected ? 'checked' : ''}></label><div class="linked-preview">${row.sku ? `Price: <b>${money(linkedPrice)}</b><br>Time: <b>${linkedMinutes ? formatMinutes(linkedMinutes) : '-'}</b><br>Suggested: <b>${money(data.suggested || 0)}</b>` : 'Select an item option.'}</div><button class="small-btn red" type="button" data-remove-linked="${index}">Remove</button></div>`; }
function renderComponents() { $('componentRows').innerHTML = componentRows.map(componentTemplate).join('') || '<div class="pi-empty-soft">No components added yet.</div>'; $('linkedRows').innerHTML = linkedRows.map(linkedTemplate).join('') || '<div class="pi-empty-soft">No linked item options added yet.</div>'; renderPricingSummary(); }
function renderPricingSummary() { const calc=calcPricing(); const d=pricingDefaults(); if($('suggestedPriceBox')) $('suggestedPriceBox').textContent=money(calc.suggested); if($('viewFilamentRate')) $('viewFilamentRate').textContent=d.filamentRate; if($('viewMachineRate')) $('viewMachineRate').textContent=d.machineRate; if($('viewMarkupPercent')) $('viewMarkupPercent').textContent=d.markupPercent; if($('viewRoundTo')) $('viewRoundTo').textContent=d.roundTo; if($('grams')) $('grams').value = `${calc.grams.toFixed(1)}g`; if($('print_time')) $('print_time').value = formatMinutes(calc.minutes); if($('pricingSummary')) { const bundle = editingPrintItem ? itemBundleSummary({...editingPrintItem, price:Number($('price')?.value||editingPrintItem.price||0)}) : null; const bundleExtra = bundle && bundle.hasDefaultLinked ? `<div><span>Default Bundle Price</span><strong>${money(Number($('price')?.value||0)+bundle.linkedLines.reduce((sum,line)=>sum+Number(line.price||0),0))}</strong></div><div><span>Default Bundle Time</span><strong>${formatMinutes(calc.minutes + bundle.linkedLines.reduce((sum,line)=>sum+Number(line.minutes||0),0))}</strong></div>` : ''; $('pricingSummary').innerHTML = `<div><span>Total Grams</span><strong>${calc.grams.toFixed(1)}g</strong></div><div><span>Total Print Time</span><strong>${formatMinutes(calc.minutes)}</strong></div><div><span>Material Cost</span><strong>${money(calc.filamentCost)}</strong></div><div><span>Machine Cost</span><strong>${money(calc.machineCost)}</strong></div><div><span>Base Cost</span><strong>${money(calc.baseCost)}</strong></div><div><span>Suggested</span><strong>${money(calc.suggested)}</strong></div>${bundleExtra}`; } }

function itemKey(item) {
  return String(item?.id || item?.sku || item?.item_id || '');
}
function uniquePrintRows(rows) {
  const bySku = new Map();
  const noSku = [];
  (rows || []).forEach(item => {
    const sku = String(item?.sku || item?.item_id || '').trim();
    if (!sku) { noSku.push(item); return; }
    const existing = bySku.get(sku);
    if (!existing) { bySku.set(sku, item); return; }
    const existingTime = Date.parse(existing.updated_at || existing.created_at || '') || 0;
    const itemTime = Date.parse(item.updated_at || item.created_at || '') || 0;
    const existingId = Number(existing.id || 0);
    const itemId = Number(item.id || 0);
    // Keep the newest row. If timestamps are equal or missing, keep the highest id.
    if (itemTime > existingTime || (itemTime === existingTime && itemId > existingId)) bySku.set(sku, item);
  });
  return [...bySku.values(), ...noSku];
}

function nextPrintSku() {
  const used = new Set((printRows || []).map(item => String(item.sku || item.item_id || '').trim().toLowerCase()).filter(Boolean));
  let max = 0;
  used.forEach(sku => {
    const match = sku.match(/^i(\d{6})$/i);
    if (match) max = Math.max(max, Number(match[1] || 0));
  });
  let candidateNumber = max + 1;
  let candidate = `i${String(candidateNumber).padStart(6, '0')}`;
  while (used.has(candidate.toLowerCase())) {
    candidateNumber += 1;
    candidate = `i${String(candidateNumber).padStart(6, '0')}`;
  }
  return candidate;
}
function lockSkuField() {
  const skuField = $('sku');
  if (!skuField) return;
  skuField.readOnly = true;
  skuField.setAttribute('aria-readonly', 'true');
  skuField.title = 'SKU is auto-generated and locked to prevent duplicate item records.';
}
function prepareNewSku() {
  const skuField = $('sku');
  if (!skuField || editingPrintItem) return;
  skuField.value = nextPrintSku();
  lockSkuField();
}
function ensureSubmittedSku() {
  const skuField = $('sku');
  if (!skuField) return '';
  let sku = String(skuField.value || '').trim();
  if (!editingPrintItem) {
    const duplicate = (printRows || []).some(item => String(item.sku || item.item_id || '').trim().toLowerCase() === sku.toLowerCase());
    if (!/^i\d{6}$/i.test(sku) || duplicate) {
      sku = nextPrintSku();
      skuField.value = sku;
    }
  }
  lockSkuField();
  return sku;
}
function renderStats(){ const rows=uniquePrintRows(printRows); const total=rows.length; const avg=total?rows.reduce((sum,item)=>sum+Number(item.price||0),0)/total:0; $('piTotal').textContent=total; $('piAverage').textContent=money(avg); $('piVisible').textContent=rows.filter(isVisible).length; $('piOut').textContent=rows.filter(item=>itemStock(item).key==='out').length; }
function render(){ const q=($('printItemSearch')?.value||'').toLowerCase(); const filter=$('printItemFilter')?.value||'all'; renderStats(); const list=uniquePrintRows(printRows).filter(item=>{ const haystack=`${item.sku||''} ${item.name||''} ${item.size||''} ${item.category||''}`.toLowerCase(); if(q&&!haystack.includes(q)) return false; if(filter==='visible') return isVisible(item); if(filter==='hidden') return !isVisible(item); if(filter==='out') return itemStock(item).key==='out'; return true; }); $('printItemsGrid').innerHTML=list.map(item=>{ const stock=itemStock(item); const sku=item.sku||item.item_id||''; const pricing=itemPricingData(item); const calc=pricing.components?.length?calcPricing(pricing.components):null; const bundle=itemBundleSummary(item); const displayPrice=bundle.hasDefaultLinked?bundle.totalPrice:Number(item.price||0); const displayMinutes=bundle.hasDefaultLinked?bundle.totalMinutes:(calc?calc.minutes:itemBaseMinutes(item)); const printTime=displayMinutes?formatMinutes(displayMinutes):firstValue(item,['print_time','printTime','duration','time'],''); const size=firstValue(item,['size','dimensions','category'],item.size||item.category||'Other'); return `<article class="print-item-card" data-sku="${esc(sku)}"><div class="print-item-thumb-wrap"><img class="print-item-thumb" src="${esc(itemImage(item))}" alt="${esc(item.name||'Print item')}" loading="lazy" onerror="this.src='images/CajunVeteran 3D Print Logo.png'"></div><div class="print-item-content"><div class="print-item-head"><div class="print-title-block"><h3>${esc(item.name||'Unnamed Item')}</h3><small>SKU: ${esc(sku)}</small></div><span class="print-stock-pill ${stock.key}">${stock.label}</span></div><div class="print-price">${money(displayPrice)}</div>${bundle.hasDefaultLinked?`<div class="print-suggested">Base: <b>${money(item.price)}</b> | Linked: <b>${money(displayPrice-Number(item.price||0))}</b></div>`:`<div class="print-suggested">Suggested: <b>${money(pricing.suggested||0)}</b></div>`}<div class="print-kpis"><div><span>Stock</span><strong>${stock.value}</strong></div><div><span>Type</span><strong>${esc(size)}</strong></div><div><span>Time</span><strong>${esc(printTime||'-')}</strong></div></div>${renderBundleLines(item)}<div class="print-card-bottom">${renderComponentChips(item)}<button type="button" class="small-btn print-edit-btn" data-edit="${esc(itemKey(item))}">Edit</button></div></div></article>`; }).join('')||'<div class="color-empty">No print items found.</div>'; }
function populateSizeDropdown(selected=''){ $('category').innerHTML=sizeOptions(selected); }
function clearForm(){ editingPrintItem=null; componentRows=[]; linkedRows=[]; $('printItemForm').reset(); populateSizeDropdown('General'); prepareNewSku(); $('printItemForm').classList.remove('show'); $('deletePrintItem').classList.add('hidden'); setPrintPreview(''); ['model_file_name','model_file_type','model_file_data'].forEach(id=>{ if($(id)) $(id).value=''; }); renderComponents(); }
function openEditor(item){ editingPrintItem=item; const pricing=itemPricingData(item); componentRows=pricing.components||[]; linkedRows=pricing.linked||[]; $('printItemForm').classList.add('show'); $('sku').value=item.sku||''; lockSkuField(); $('name').value=item.name||''; $('price').value=Number(item.price||0); $('stock').value=Number(firstValue(item,['stock','qty','quantity','on_hand'],0)); populateSizeDropdown(item.size||item.category||'General'); $('status').value=isVisible(item)?'visible':'hidden'; const local=localItemData(item); $('description').value=itemDescription(item); $('image_url').value=itemSavedImage(item); ensureHidden('model_file_name').value=local.model_file_name||item.model_file_name||''; ensureHidden('model_file_type').value=local.model_file_type||item.model_file_type||''; ensureHidden('model_file_data').value=local.model_file_data||item.model_file_data||''; setPrintPreview($('image_url').value); $('deletePrintItem').classList.remove('hidden'); renderComponents(); $('printItemForm').scrollIntoView({behavior:'smooth',block:'start'}); }
async function load(){ printRows=uniquePrintRows(await CVDB.select('cv_items','select=*&order=name.asc')); try{ const data=await CVDB.loadDashboard(); colors=data.colors||[]; }catch{ try{ colors=await CVDB.select('cv_colors','select=*&order=brand.asc,color.asc'); }catch{ colors=[]; } } populateSizeDropdown('General'); renderComponents(); render(); prepareNewSku(); }
async function saveItem(row){
  const calc=calcPricing();
  const modelFields = {
    model_file_name: ($('model_file_name') && $('model_file_name').value) || '',
    model_file_type: ($('model_file_type') && $('model_file_type').value) || '',
    model_file_data: ''
  };
  const baseRow = {
    ...row,
    description: $('description').value,
    image_url: $('image_url').value || null,
    updated_at: new Date().toISOString()
  };
  const modelMeta = modelFields.model_file_name ? {model_file_name:modelFields.model_file_name, model_file_type:modelFields.model_file_type} : {};
  const withModel = modelFields.model_file_name ? {...baseRow, ...modelMeta} : baseRow;
  saveLocalPricing(row.sku,{components:componentRows,linked:linkedRows,suggested:calc.suggested,description:baseRow.description,image_url:baseRow.image_url,model_file_name:modelFields.model_file_name,model_file_type:modelFields.model_file_type});
  const extended={...withModel, price_components:componentRows, linked_items:linkedRows, suggested_price:calc.suggested, total_grams:calc.grams, total_print_minutes:calc.minutes, grams:calc.grams, print_hours:Math.floor(calc.minutes/60), print_minutes:calc.minutes%60};
  const target = editingPrintItem ? (editingPrintItem.id ? `id=eq.${encodeURIComponent(editingPrintItem.id)}` : `sku=eq.${encodeURIComponent(editingPrintItem.sku)}`) : '';
  async function write(payload){
    if(editingPrintItem) return CVDB.patch('cv_items',target,payload);
    return CVDB.insert('cv_items',payload);
  }
  try{
    await write(extended);
    saveLocalPricing(row.sku,{components:componentRows,linked:linkedRows,suggested:calc.suggested,description:baseRow.description,image_url:baseRow.image_url,model_file_name:modelFields.model_file_name,model_file_type:modelFields.model_file_type}); toast('Print item saved');
  }catch(error){
    console.warn('Extended print item save failed, trying basic save', error);
    try{
      await write(withModel);
      saveLocalPricing(row.sku,{components:componentRows,linked:linkedRows,suggested:calc.suggested});
      toast('Item saved. Pricing saved locally because pricing columns are not in Supabase yet.');
    }catch(modelError){
      console.warn('Model save failed, trying thumbnail/basic item only', modelError);
      const withoutModel = {...baseRow};
      saveLocalPricing(row.sku,{components:componentRows,linked:linkedRows,suggested:calc.suggested,description:baseRow.description,image_url:baseRow.image_url,model_file_name:modelFields.model_file_name,model_file_type:modelFields.model_file_type});
      try {
        await write(withoutModel);
        toast(modelFields.model_file_name ? 'Item saved. Model file saved locally because Supabase model columns are missing.' : 'Item saved.');
      } catch(finalError) {
        console.warn('Supabase save failed after local cache save', finalError);
        toast('Item updated on this device. Supabase rejected one or more fields.', 'warn');
      }
    }
  }
}

function mergeSavedItemIntoGrid(row) {
  const sku = String(row.sku || '');
  if (!sku) return;
  const calc = calcPricing();
  const saved = {
    ...(editingPrintItem || {}),
    ...row,
    sku: row.sku,
    name: row.name,
    price: row.price,
    stock: row.stock ?? row.qty,
    qty: row.qty ?? row.stock,
    category: row.category || row.size,
    size: row.size || row.category,
    status: row.status || (row.visible===false?'hidden':'visible'),
    visible: row.visible,
    description: $('description') ? $('description').value : row.description,
    image_url: $('image_url') ? $('image_url').value : row.image_url,
    price_components: JSON.stringify(componentRows || []),
    linked_items: JSON.stringify(linkedRows || []),
    suggested_price: calc.suggested,
    total_grams: calc.grams,
    total_print_minutes: calc.minutes,
    print_time: formatMinutes(calc.minutes),
    weight: `${calc.grams.toFixed(1)}g`,
    updated_at: new Date().toISOString()
  };
  const id = String(editingPrintItem?.id || row.id || '');
  const index = id ? printRows.findIndex(item => String(item.id || '') === id) : printRows.findIndex(item => String(item.sku || item.item_id || '') === sku);
  if (index >= 0) printRows[index] = { ...printRows[index], ...saved, id: printRows[index].id || editingPrintItem?.id || row.id };
  else printRows.unshift({ ...saved, id: editingPrintItem?.id || row.id });
  printRows = uniquePrintRows(printRows);
}
async function refreshAfterSave(row) {
  // Immediate UI update first so Save feels successful without a full page refresh.
  mergeSavedItemIntoGrid(row);
  clearForm();
  render();
  try {
    printRows = uniquePrintRows(await CVDB.select('cv_items','select=*&order=name.asc'));
    render();
  } catch (err) {
    console.warn('Background item reload skipped after save', err);
  }
}
function wire(){ $('printItemSearch').oninput=render; $('printItemFilter').onchange=render; $('newPrintItem').onclick=()=>{ clearForm(); $('printItemForm').classList.add('show'); $('sku').focus(); }; $('clearPrintItem').onclick=clearForm; $('addComponent').onclick=()=>{ componentRows.push({name:'',color:'',grams:0,hours:0,minutes:0,required:true}); renderComponents(); }; $('addLinkedItem').onclick=()=>{ linkedRows.push({sku:'',label:'',defaultSelected:false}); renderComponents(); }; document.addEventListener('input',event=>{ const rowEl=event.target.closest('[data-component-index]'); if(rowEl&&event.target.dataset.componentField){ const index=Number(rowEl.dataset.componentIndex); const field=event.target.dataset.componentField; componentRows[index][field]=['grams','hours','minutes'].includes(field)?Number(event.target.value||0):event.target.value; renderPricingSummary(); } const linkedEl=event.target.closest('[data-linked-index]'); if(linkedEl&&event.target.dataset.linkedField){ linkedRows[Number(linkedEl.dataset.linkedIndex)][event.target.dataset.linkedField]=event.target.value; } }); document.addEventListener('change',event=>{ const rowEl=event.target.closest('[data-component-index]'); if(rowEl&&event.target.dataset.componentField==='required') componentRows[Number(rowEl.dataset.componentIndex)].required=event.target.checked; const linkedEl=event.target.closest('[data-linked-index]'); if(linkedEl&&event.target.dataset.linkedField){ const index=Number(linkedEl.dataset.linkedIndex); const field=event.target.dataset.linkedField; linkedRows[index][field]=field==='defaultSelected'?event.target.checked:event.target.value; if(field==='sku'){ const item=printRows.find(x=>String(x.sku)===String(event.target.value)); if(item&&!linkedRows[index].label) linkedRows[index].label=item.name; } renderComponents(); } }); document.addEventListener('click',event=>{ if(event.target.dataset.removeComponent!==undefined){ componentRows.splice(Number(event.target.dataset.removeComponent),1); renderComponents(); } if(event.target.dataset.removeLinked!==undefined){ linkedRows.splice(Number(event.target.dataset.removeLinked),1); renderComponents(); } }); $('printItemsGrid').onclick=event=>{ const button=event.target.closest('[data-edit]'); if(!button)return; const row=printRows.find(item=>String(item.id||'')===String(button.dataset.edit)) || printRows.find(item=>String(item.sku||item.item_id||'')===String(button.dataset.edit)); if(row)openEditor(row); }; $('image_file').onchange=async event=>{
  const file=event.target.files&&event.target.files[0];
  if(!file)return;
  const type=fileAssetType(file);
  const dataUrl = await fileToDataUrl(file);
  ensureHidden('model_file_name').value = '';
  ensureHidden('model_file_type').value = '';
  ensureHidden('model_file_data').value = '';
  if(type === 'image') {
    $('image_url').value=dataUrl;
    setPrintPreview(dataUrl);
    toast('Image thumbnail attached.');
    return;
  }
  ensureHidden('model_file_name').value = file.name || '';
  ensureHidden('model_file_type').value = type;
  ensureHidden('model_file_data').value = dataUrl;
  let thumb = '';
  if(type === '3mf') thumb = await extract3mfThumbnail(file);
  $('image_url').value = thumb || '';
  setPrintPreview(thumb || 'images/CajunVeteran 3D Print Logo.png');
  toast(thumb ? '3MF thumbnail extracted and model file attached.' : `${type.toUpperCase()} file attached. No embedded thumbnail found, using default logo.`);
}; $('removePrintImage').onclick=()=>{ $('image_url').value=''; $('image_file').value=''; ['model_file_name','model_file_type','model_file_data'].forEach(id=>{ if($(id)) $(id).value=''; }); setPrintPreview(''); }; $('printItemForm').onsubmit=async event=>{ event.preventDefault(); const calc=calcPricing(); const row={sku:ensureSubmittedSku(),name:$('name').value.trim(),price:Number($('price').value||0),qty:Number($('stock').value||0),size:$('category').value,visible:$('status').value==='visible',description:$('description').value,grams:calc.grams,print_hours:Math.floor(calc.minutes/60),print_minutes:calc.minutes%60,total_grams:calc.grams,total_print_minutes:calc.minutes,updated_at:new Date().toISOString()}; if(!row.sku||!row.name){toast('SKU and Name are required','err');return;} try{ await saveItem(row); await refreshAfterSave(row); }catch(error){ console.error(error); toast(error.message||'Print item save failed','err'); } }; $('deletePrintItem').onclick=async()=>{ if(!editingPrintItem)return; const ok=await confirmAction({title:'Delete Print Item',message:`Delete ${editingPrintItem.name}?`,details:'Existing orders keep their line item text, but this item will be removed from the pick list.',confirmText:'Delete Item'}); if(!ok)return; await CVDB.remove('cv_items', editingPrintItem.id ? `id=eq.${encodeURIComponent(editingPrintItem.id)}` : `sku=eq.${encodeURIComponent(editingPrintItem.sku)}`); toast('Print item deleted'); clearForm(); await load(); }; }
injectPrintBundleStyles();
wire();
load().catch(error=>toast(error.message,'err'));
