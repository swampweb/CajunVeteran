initNavigation('print-items.html');

let printRows = [];
let editingPrintItem = null;

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

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
    const printTime = firstValue(item, ['print_time','printTime','duration','time'], '');
    const weight = firstValue(item, ['weight','grams','material_weight'], '');
    const size = firstValue(item, ['size','dimensions'], item.category || 'General');
    return `<article class="print-item-card" data-sku="${esc(sku)}">
      <div class="print-item-thumb-wrap"><img class="print-item-thumb" src="${esc(itemImage(item))}" alt="${esc(item.name || 'Print item')}" loading="lazy" onerror="this.src='images/CajunVeteran 3D Print Logo.png'"></div>
      <div class="print-item-content">
        <div class="print-item-head">
          <div class="print-title-block"><h3>${esc(item.name || 'Unnamed Item')}</h3><small>SKU: ${esc(sku)}</small></div>
          <span class="print-stock-pill ${stock.key}">${stock.label}</span>
        </div>
        <div class="print-price">${money(item.price)}</div>
        <div class="print-kpis">
          <div><span>Stock</span><strong>${stock.value}</strong></div>
          <div><span>Type</span><strong>${esc(size)}</strong></div>
          <div><span>Time</span><strong>${esc(printTime || weight || '-')}</strong></div>
        </div>
        <p class="print-desc">${esc(item.description || item.notes || '')}</p>
        <div class="print-actions"><button type="button" class="small-btn print-edit-btn" data-edit="${esc(sku)}">Edit</button></div>
      </div>
    </article>`;
  }).join('') || '<div class="color-empty">No print items found.</div>';
}
function clearForm() {
  editingPrintItem = null;
  $('printItemForm').reset();
  $('printItemForm').classList.remove('show');
  $('deletePrintItem').classList.add('hidden');
  setPrintPreview('');
}
function openEditor(item) {
  editingPrintItem = item;
  $('printItemForm').classList.add('show');
  $('sku').value = item.sku || '';
  $('name').value = item.name || '';
  $('price').value = Number(item.price || 0);
  $('stock').value = Number(firstValue(item, ['stock','qty','quantity','on_hand'], 0));
  $('category').value = item.category || '';
  $('status').value = isVisible(item) ? 'visible' : 'hidden';
  if ($('print_time')) $('print_time').value = firstValue(item, ['print_time','printTime','duration','time'], '');
  if ($('weight')) $('weight').value = firstValue(item, ['weight','grams','material_weight'], '');
  $('description').value = item.description || item.notes || '';
  $('image_url').value = item.image_url || item.image || item.photo_url || item.thumbnail_url || '';
  setPrintPreview($('image_url').value);
  $('deletePrintItem').classList.remove('hidden');
  $('printItemForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
async function load() {
  printRows = await CVDB.select('cv_items', 'select=*&order=name.asc');
  render();
}
function wire() {
  $('printItemSearch').oninput = render;
  $('printItemFilter').onchange = render;
  $('newPrintItem').onclick = () => { clearForm(); $('printItemForm').classList.add('show'); };
  $('clearPrintItem').onclick = clearForm;
  $('printItemsGrid').onclick = event => {
    const button = event.target.closest('[data-edit]');
    if (!button) return;
    const row = printRows.find(item => String(item.sku) === String(button.dataset.edit));
    if (row) openEditor(row);
  };
  $('image_file').onchange = async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    $('image_url').value = await fileToDataUrl(file);
    setPrintPreview($('image_url').value);
  };
  $('removePrintImage').onclick = () => { $('image_url').value = ''; $('image_file').value = ''; setPrintPreview(''); };
  $('printItemForm').onsubmit = async event => {
    event.preventDefault();
    const row = {
      sku: $('sku').value.trim(),
      name: $('name').value.trim(),
      price: Number($('price').value || 0),
      stock: Number($('stock').value || 0),
      category: $('category').value.trim(),
      status: $('status').value,
      print_time: $('print_time')?.value || '',
      weight: $('weight')?.value || '',
      description: $('description').value,
      image_url: $('image_url').value || null,
      updated_at: new Date().toISOString()
    };
    if (!row.sku || !row.name) { toast('SKU and Name are required', 'err'); return; }
    if (editingPrintItem) await CVDB.patch('cv_items', `sku=eq.${encodeURIComponent(editingPrintItem.sku)}`, row);
    else await CVDB.insert('cv_items', row);
    toast('Print item saved');
    clearForm();
    await load();
  };
  $('deletePrintItem').onclick = async () => {
    if (!editingPrintItem) return;
    const ok = await confirmAction({ title: 'Delete Print Item', message: `Delete ${editingPrintItem.name}?`, details: 'Existing orders keep their line item text, but this item will be removed from the pick list.', confirmText: 'Delete Item' });
    if (!ok) return;
    await CVDB.remove('cv_items', `sku=eq.${encodeURIComponent(editingPrintItem.sku)}`);
    toast('Print item deleted');
    clearForm();
    await load();
  };
}
wire();
load().catch(error => toast(error.message, 'err'));
