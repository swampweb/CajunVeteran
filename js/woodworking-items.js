initNavigation('woodworking-items.html');

let rows = [];
let editing = null;

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[c]));

const threshold = () => Math.max(1, Number(localStorage.getItem('cv_wood_low_stock_threshold') || 5));

function stockInfo(qty) {
  qty = Number(qty || 0);
  if (qty <= 0) return { key: 'out', label: 'Out of Stock' };
  if (qty <= threshold()) return { key: 'low', label: 'Low Stock' };
  return { key: 'good', label: 'In Stock' };
}

function imageFor(item) {
  return item.image_url || item.image || item.photo_url || item.thumbnail_url || '';
}

function imageFallback(item) {
  const itemId = String(item.item_id || '').trim().toLowerCase();
  if (itemId) return `images/woodworking/${itemId}.jpg`;
  return 'images/apple-touch-icon.png';
}


function setWoodPreview(value) {
  const wrap = $('woodImagePreviewWrap');
  const img = $('woodImagePreview');
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
function ensureForm() {
  const body = document.querySelector('.card-body,.v7-card-body');
  if (!body || $('woodItemForm')) return;

  body.insertAdjacentHTML('afterbegin', `
    <div class="wood-item-toolbar">
      <input id="woodItemSearch" type="search" placeholder="Search item # or name">
      <select id="woodStockFilter" aria-label="Stock filter">
        <option value="all">All Stock</option>
        <option value="good">In Stock</option>
        <option value="low">Low Stock</option>
        <option value="out">Out of Stock</option>
      </select>
      <button class="btn primary" id="newWoodItem" type="button">+ New Item</button>
    </div>

    <div class="wood-count-row">
      <span class="wood-count-pill total">Total <b id="woodTotalCount">0</b></span>
      <span class="wood-count-pill good">In Stock <b id="woodGoodCount">0</b></span>
      <span class="wood-count-pill low">Low Stock <b id="woodLowCount">0</b></span>
      <span class="wood-count-pill out">Out <b id="woodOutCount">0</b></span>
    </div>

    <form id="woodItemForm" class="form-panel wood-item-form">
      <label>Item #<input id="item_id" required></label>
      <label>Name<input id="name" required></label>
      <label>Qty<input id="qty" type="number" step="1" min="0"></label>
      <label>Status<input id="status" placeholder="Optional"></label>
      <label>Length<input id="length" type="number" step="0.01"></label>
      <label>Width<input id="width" type="number" step="0.01"></label>
      <label>Height<input id="height" type="number" step="0.01"></label>
      <label>Sale Cost<input id="sale_cost" type="number" step="0.01"></label>
      <div class="full upload-field">
      <label>Item Image Upload<input id="image_file" type="file" accept="image/*"></label>
      <input id="image_url" type="hidden">
      <div class="upload-preview-wrap hidden" id="woodImagePreviewWrap">
        <img id="woodImagePreview" alt="Woodworking item image preview">
        <button class="small-btn" id="removeWoodImage" type="button">Remove Image</button>
      </div>
      <small>Upload an image from your computer or phone. The image is saved with the item so it can be viewed online.</small>
    </div>
      <label class="full">Notes<textarea id="notes"></textarea></label>
      <div class="actions full">
        <button class="btn clear" id="clearWoodItem" type="button">Clear</button>
        <button class="btn primary" type="submit">Save Item</button>
        <button class="btn danger hidden" id="deleteWoodItem" type="button">Delete</button>
      </div>
    </form>

    <div id="woodItemCards" class="card-grid wood-items-grid"></div>
  `);
}

function render() {
  const query = ($('woodItemSearch')?.value || '').toLowerCase();
  const filter = $('woodStockFilter')?.value || 'all';

  const list = rows.filter(item =>
    `${item.item_id || ''} ${item.name || ''}`.toLowerCase().includes(query) &&
    (filter === 'all' || stockInfo(item.qty).key === filter)
  );

  const counts = { good: 0, low: 0, out: 0 };
  rows.forEach(item => counts[stockInfo(item.qty).key]++);

  $('woodTotalCount').textContent = rows.length;
  $('woodGoodCount').textContent = counts.good;
  $('woodLowCount').textContent = counts.low;
  $('woodOutCount').textContent = counts.out;

  $('woodItemCards').innerHTML = list.map(item => {
    const stock = stockInfo(item.qty);
    const image = imageFor(item) || imageFallback(item);
    return `
      <article class="data-card wood-item-card" data-id="${esc(item.id)}">
        <div class="wood-item-image-wrap">
          <img class="wood-item-image" src="${esc(image)}" alt="${esc(item.name || 'Woodworking item')}" loading="lazy" onerror="this.src='images/apple-touch-icon.png'">
        </div>

        <div class="wood-item-content">
          <div class="data-card-head wood-card-head">
            <div>
              <div class="data-card-title">${esc(item.name || 'Unnamed')}</div>
              <div class="data-card-meta">${esc(item.item_id || '')}</div>
            </div>
            <span class="stock-pill ${stock.key}">${stock.label}</span>
          </div>

          <div class="wood-item-price">${money(item.sale_cost)}</div>

          <div class="data-card-kpis wood-item-kpis">
            <div class="data-kpi"><span>Qty</span><strong>${Number(item.qty || 0)}</strong></div>
            <div class="data-kpi"><span>Size</span><strong>${Number(item.length || 0)} × ${Number(item.width || 0)}</strong></div>
            <div class="data-kpi"><span>Height</span><strong>${Number(item.height || 0)}</strong></div>
          </div>

          <div class="wood-item-notes">${esc(item.notes || '')}</div>

          <div class="wood-item-actions">
            <button class="small-btn wood-edit-btn" type="button" data-edit="${esc(item.id)}">Edit</button>
          </div>
        </div>
      </article>
    `;
  }).join('') || '<div class="color-empty">No woodworking items found.</div>';
}

function clear() {
  editing = null;
  $('woodItemForm').reset();
  $('woodItemForm').classList.remove('show');
  $('deleteWoodItem').classList.add('hidden');
  setWoodPreview('');
}


async function load() {
  ensureForm();
  rows = await CVDB.select('cv_woodworking_items', 'select=*&order=item_id.asc');
  render();
  wire();
}

function wire() {
  if ($('woodItemSearch').dataset.wired) return;
  $('woodItemSearch').dataset.wired = '1';

  $('woodItemSearch').oninput = render;
  $('woodStockFilter').onchange = render;

  $('newWoodItem').onclick = () => {
    $('woodItemForm').classList.add('show');
    editing = null;
    $('woodItemForm').reset();
    $('deleteWoodItem').classList.add('hidden');
  };

  $('clearWoodItem').onclick = clear;

  $('woodItemCards').onclick = e => {
    const button = e.target.closest('[data-edit]');
    if (!button) return;

    const row = rows.find(item => String(item.id) === button.dataset.edit);
    if (!row) return;

    editing = row;
    $('woodItemForm').classList.add('show');

    ['item_id', 'name', 'status', 'notes'].forEach(key => {
      $(key).value = row[key] || '';
    });

    ['qty', 'length', 'width', 'height', 'sale_cost'].forEach(key => {
      $(key).value = row[key] || 0;
    });

    if ($('image_url')) { $('image_url').value = row.image_url || row.image || row.photo_url || row.thumbnail_url || ''; setWoodPreview($('image_url').value); }

    $('deleteWoodItem').classList.remove('hidden');
    $('woodItemForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if ($('image_file')) $('image_file').onchange = async event => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    $('image_url').value = await fileToDataUrl(file);
    setWoodPreview($('image_url').value);
  };
  if ($('removeWoodImage')) $('removeWoodImage').onclick = () => { $('image_url').value = ''; $('image_file').value = ''; setWoodPreview(''); };

  $('woodItemForm').onsubmit = async e => {
    e.preventDefault();

    const row = {
      item_id: item_id.value,
      name: name.value,
      status: status.value,
      notes: notes.value,
      qty: Number(qty.value || 0),
      length: Number(length.value || 0),
      width: Number(width.value || 0),
      height: Number(height.value || 0),
      sale_cost: Number(sale_cost.value || 0),
      image_url: image_url.value || null,
      updated_at: new Date().toISOString()
    };

    if (editing) await CVDB.patch('cv_woodworking_items', `id=eq.${editing.id}`, row);
    else await CVDB.insert('cv_woodworking_items', row);

    toast('Woodworking item saved');
    clear();
    await load();
  };

  $('deleteWoodItem').onclick = async () => {
    if (!editing) return;

    const ok = await confirmAction({
      title: 'Delete Woodworking Item',
      message: `Delete ${editing.name}?`,
      details: 'Existing jobs keep project text but this item will be removed from the pick list.',
      confirmText: 'Delete Item'
    });

    if (!ok) return;
    await CVDB.remove('cv_woodworking_items', `id=eq.${editing.id}`);
    toast('Item deleted');
    clear();
    await load();
  };
}

load().catch(e => toast(e.message, 'err'));
