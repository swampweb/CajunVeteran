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
  const value = firstValue(item, ['image_url','image','photo_url','thumbnail_url'], '');
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
function saveLocalPricing(sku, data) { const store = localPricing(); store[sku] = data; localStorage.setItem(PRICING_STORE, JSON.stringify(store)); }
function itemPricingData(item) {
  const store = localPricing(); const sku = item.sku || item.item_id || ''; const defaults = pricingDefaults();
  return { components: parseJson(item.price_components, store[sku]?.components || []), linked: parseJson(item.linked_items, store[sku]?.linked || []), rate: Number(item.filament_rate || store[sku]?.rate || defaults.filamentRate), machine: Number(item.machine_rate || store[sku]?.machine || defaults.machineRate), markup: Number(item.markup_percent || store[sku]?.markup || defaults.markupPercent), round: Number(item.round_to || store[sku]?.round || defaults.roundTo), suggested: Number(item.suggested_price || store[sku]?.suggested || 0) };
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
function linkedTemplate(row, index) { const linked=printRows.find(item=>String(item.sku)===String(row.sku))||{}; const data=itemPricingData(linked); return `<div class="pi-linked-row" data-linked-index="${index}"><label>Linked Item<select data-linked-field="sku">${linkedItemOptions(row.sku)}</select></label><label>Option Label<input data-linked-field="label" value="${esc(row.label || linked.name || '')}" placeholder="12oz Insert"></label><label class="inline-check component-check">Default Selected <input data-linked-field="defaultSelected" type="checkbox" ${row.defaultSelected ? 'checked' : ''}></label><div class="linked-preview">${row.sku ? `Suggested: <b>${money(data.suggested || 0)}</b>` : 'Select an item option.'}</div><button class="small-btn red" type="button" data-remove-linked="${index}">Remove</button></div>`; }
function renderComponents() { $('componentRows').innerHTML = componentRows.map(componentTemplate).join('') || '<div class="pi-empty-soft">No components added yet.</div>'; $('linkedRows').innerHTML = linkedRows.map(linkedTemplate).join('') || '<div class="pi-empty-soft">No linked item options added yet.</div>'; renderPricingSummary(); }
function renderPricingSummary() { const calc=calcPricing(); const d=pricingDefaults(); if($('suggestedPriceBox')) $('suggestedPriceBox').textContent=money(calc.suggested); if($('viewFilamentRate')) $('viewFilamentRate').textContent=d.filamentRate; if($('viewMachineRate')) $('viewMachineRate').textContent=d.machineRate; if($('viewMarkupPercent')) $('viewMarkupPercent').textContent=d.markupPercent; if($('viewRoundTo')) $('viewRoundTo').textContent=d.roundTo; if($('grams')) $('grams').value = `${calc.grams.toFixed(1)}g`; if($('print_time')) $('print_time').value = formatMinutes(calc.minutes); if($('pricingSummary')) $('pricingSummary').innerHTML = `<div><span>Total Grams</span><strong>${calc.grams.toFixed(1)}g</strong></div><div><span>Total Print Time</span><strong>${formatMinutes(calc.minutes)}</strong></div><div><span>Material Cost</span><strong>${money(calc.filamentCost)}</strong></div><div><span>Machine Cost</span><strong>${money(calc.machineCost)}</strong></div><div><span>Base Cost</span><strong>${money(calc.baseCost)}</strong></div><div><span>Suggested</span><strong>${money(calc.suggested)}</strong></div>`; }
function renderStats(){ const total=printRows.length; const avg=total?printRows.reduce((sum,item)=>sum+Number(item.price||0),0)/total:0; $('piTotal').textContent=total; $('piAverage').textContent=money(avg); $('piVisible').textContent=printRows.filter(isVisible).length; $('piOut').textContent=printRows.filter(item=>itemStock(item).key==='out').length; }
function render(){ const q=($('printItemSearch')?.value||'').toLowerCase(); const filter=$('printItemFilter')?.value||'all'; renderStats(); const list=printRows.filter(item=>{ const haystack=`${item.sku||''} ${item.name||''} ${item.category||''}`.toLowerCase(); if(q&&!haystack.includes(q)) return false; if(filter==='visible') return isVisible(item); if(filter==='hidden') return !isVisible(item); if(filter==='out') return itemStock(item).key==='out'; return true; }); $('printItemsGrid').innerHTML=list.map(item=>{ const stock=itemStock(item); const sku=item.sku||item.item_id||''; const pricing=itemPricingData(item); const calc=pricing.components?.length?calcPricing(pricing.components):null; const printTime=calc?formatMinutes(calc.minutes):firstValue(item,['print_time','printTime','duration','time'],''); const size=firstValue(item,['size','dimensions','category'],item.category||'Other'); return `<article class="print-item-card" data-sku="${esc(sku)}"><div class="print-item-thumb-wrap"><img class="print-item-thumb" src="${esc(itemImage(item))}" alt="${esc(item.name||'Print item')}" loading="lazy" onerror="this.src='images/CajunVeteran 3D Print Logo.png'"></div><div class="print-item-content"><div class="print-item-head"><div class="print-title-block"><h3>${esc(item.name||'Unnamed Item')}</h3><small>SKU: ${esc(sku)}</small></div><span class="print-stock-pill ${stock.key}">${stock.label}</span></div><div class="print-price">${money(item.price)}</div><div class="print-suggested">Suggested: <b>${money(pricing.suggested||0)}</b></div><div class="print-kpis"><div><span>Stock</span><strong>${stock.value}</strong></div><div><span>Type</span><strong>${esc(size)}</strong></div><div><span>Time</span><strong>${esc(printTime||'-')}</strong></div></div><div class="print-actions"><button type="button" class="small-btn print-edit-btn" data-edit="${esc(sku)}">Edit</button></div></div></article>`; }).join('')||'<div class="color-empty">No print items found.</div>'; }
function populateSizeDropdown(selected=''){ $('category').innerHTML=sizeOptions(selected); }
function clearForm(){ editingPrintItem=null; componentRows=[]; linkedRows=[]; $('printItemForm').reset(); populateSizeDropdown('General'); $('printItemForm').classList.remove('show'); $('deletePrintItem').classList.add('hidden'); setPrintPreview(''); ['model_file_name','model_file_type','model_file_data'].forEach(id=>{ if($(id)) $(id).value=''; }); renderComponents(); }
function openEditor(item){ editingPrintItem=item; const pricing=itemPricingData(item); componentRows=pricing.components||[]; linkedRows=pricing.linked||[]; $('printItemForm').classList.add('show'); $('sku').value=item.sku||''; $('name').value=item.name||''; $('price').value=Number(item.price||0); $('stock').value=Number(firstValue(item,['stock','qty','quantity','on_hand'],0)); populateSizeDropdown(item.category||'General'); $('status').value=isVisible(item)?'visible':'hidden'; $('description').value=item.description||item.notes||''; $('image_url').value=item.image_url||item.image||item.photo_url||item.thumbnail_url||''; ensureHidden('model_file_name').value=item.model_file_name||''; ensureHidden('model_file_type').value=item.model_file_type||''; ensureHidden('model_file_data').value=item.model_file_data||''; setPrintPreview($('image_url').value); $('deletePrintItem').classList.remove('hidden'); renderComponents(); $('printItemForm').scrollIntoView({behavior:'smooth',block:'start'}); }
async function load(){ printRows=await CVDB.select('cv_items','select=*&order=name.asc'); try{ const data=await CVDB.loadDashboard(); colors=data.colors||[]; }catch{ try{ colors=await CVDB.select('cv_colors','select=*&order=brand.asc,color.asc'); }catch{ colors=[]; } } populateSizeDropdown('General'); renderComponents(); render(); }
async function saveItem(row){
  const calc=calcPricing();
  const modelFields = {
    model_file_name: ($('model_file_name') && $('model_file_name').value) || '',
    model_file_type: ($('model_file_type') && $('model_file_type').value) || '',
    model_file_data: ($('model_file_data') && $('model_file_data').value) || ''
  };
  const baseRow = {
    ...row,
    description: $('description').value,
    image_url: $('image_url').value || null,
    updated_at: new Date().toISOString()
  };
  const withModel = modelFields.model_file_name ? {...baseRow, ...modelFields} : baseRow;
  const extended={...withModel, price_components:componentRows, linked_items:linkedRows, filament_rate:calc.filamentRate, machine_rate:calc.machineRate, markup_percent:calc.markup, round_to:calc.round, suggested_price:calc.suggested, total_grams:calc.grams, total_print_minutes:calc.minutes, filament_cost:calc.filamentCost, machine_cost:calc.machineCost, print_time:formatMinutes(calc.minutes), weight:`${calc.grams.toFixed(1)}g`};
  const target = editingPrintItem ? `sku=eq.${encodeURIComponent(editingPrintItem.sku)}` : '';
  async function write(payload){
    if(editingPrintItem) return CVDB.patch('cv_items',target,payload);
    return CVDB.insert('cv_items',payload);
  }
  try{
    await write(extended);
    toast('Print item saved');
  }catch(error){
    console.warn('Extended print item save failed, trying basic save', error);
    try{
      await write(withModel);
      saveLocalPricing(row.sku,{components:componentRows,linked:linkedRows,suggested:calc.suggested});
      toast('Item saved. Pricing saved locally because pricing columns are not in Supabase yet.');
    }catch(modelError){
      console.warn('Model save failed, trying thumbnail/basic item only', modelError);
      const withoutModel = {...baseRow};
      saveLocalPricing(row.sku,{components:componentRows,linked:linkedRows,suggested:calc.suggested,model:modelFields});
      await write(withoutModel);
      toast(modelFields.model_file_name ? 'Item saved. Model file saved locally because Supabase model columns are missing.' : 'Item saved.');
    }
  }
}
function wire(){ $('printItemSearch').oninput=render; $('printItemFilter').onchange=render; $('newPrintItem').onclick=()=>{ clearForm(); $('printItemForm').classList.add('show'); $('sku').focus(); }; $('clearPrintItem').onclick=clearForm; $('addComponent').onclick=()=>{ componentRows.push({name:'',color:'',grams:0,hours:0,minutes:0,required:true}); renderComponents(); }; $('addLinkedItem').onclick=()=>{ linkedRows.push({sku:'',label:'',defaultSelected:false}); renderComponents(); }; document.addEventListener('input',event=>{ const rowEl=event.target.closest('[data-component-index]'); if(rowEl&&event.target.dataset.componentField){ const index=Number(rowEl.dataset.componentIndex); const field=event.target.dataset.componentField; componentRows[index][field]=['grams','hours','minutes'].includes(field)?Number(event.target.value||0):event.target.value; renderPricingSummary(); } const linkedEl=event.target.closest('[data-linked-index]'); if(linkedEl&&event.target.dataset.linkedField){ linkedRows[Number(linkedEl.dataset.linkedIndex)][event.target.dataset.linkedField]=event.target.value; } }); document.addEventListener('change',event=>{ const rowEl=event.target.closest('[data-component-index]'); if(rowEl&&event.target.dataset.componentField==='required') componentRows[Number(rowEl.dataset.componentIndex)].required=event.target.checked; const linkedEl=event.target.closest('[data-linked-index]'); if(linkedEl&&event.target.dataset.linkedField){ const index=Number(linkedEl.dataset.linkedIndex); const field=event.target.dataset.linkedField; linkedRows[index][field]=field==='defaultSelected'?event.target.checked:event.target.value; if(field==='sku'){ const item=printRows.find(x=>String(x.sku)===String(event.target.value)); if(item&&!linkedRows[index].label) linkedRows[index].label=item.name; } renderComponents(); } }); document.addEventListener('click',event=>{ if(event.target.dataset.removeComponent!==undefined){ componentRows.splice(Number(event.target.dataset.removeComponent),1); renderComponents(); } if(event.target.dataset.removeLinked!==undefined){ linkedRows.splice(Number(event.target.dataset.removeLinked),1); renderComponents(); } }); $('printItemsGrid').onclick=event=>{ const button=event.target.closest('[data-edit]'); if(!button)return; const row=printRows.find(item=>String(item.sku)===String(button.dataset.edit)); if(row)openEditor(row); }; $('image_file').onchange=async event=>{
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
}; $('removePrintImage').onclick=()=>{ $('image_url').value=''; $('image_file').value=''; ['model_file_name','model_file_type','model_file_data'].forEach(id=>{ if($(id)) $(id).value=''; }); setPrintPreview(''); }; $('printItemForm').onsubmit=async event=>{ event.preventDefault(); const calc=calcPricing(); const row={sku:$('sku').value.trim(),name:$('name').value.trim(),price:Number($('price').value||0),stock:Number($('stock').value||0),category:$('category').value,status:$('status').value,print_time:formatMinutes(calc.minutes),weight:`${calc.grams.toFixed(1)}g`,description:$('description').value,updated_at:new Date().toISOString()}; if(!row.sku||!row.name){toast('SKU and Name are required','err');return;} await saveItem(row); clearForm(); await load(); }; $('deletePrintItem').onclick=async()=>{ if(!editingPrintItem)return; const ok=await confirmAction({title:'Delete Print Item',message:`Delete ${editingPrintItem.name}?`,details:'Existing orders keep their line item text, but this item will be removed from the pick list.',confirmText:'Delete Item'}); if(!ok)return; await CVDB.remove('cv_items',`sku=eq.${encodeURIComponent(editingPrintItem.sku)}`); toast('Print item deleted'); clearForm(); await load(); }; }
wire();
load().catch(error=>toast(error.message,'err'));
