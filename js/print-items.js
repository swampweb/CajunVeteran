initNavigation('print-items.html');

let printRows = [];
let editingPrintItem = null;

const $ = id => document.getElementById(id);
const money = value => '$' + Number(value || 0).toFixed(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function itemImage(item){
  return item.image_url || item.image || item.photo_url || item.thumbnail_url || 'images/CajunVeteran 3D Print Logo.png';
}

function setPrintPreview(value){
  const wrap = $('printImagePreviewWrap');
  const img = $('printImagePreview');
  if(!wrap || !img) return;
  if(value){ img.src = value; wrap.classList.remove('hidden'); }
  else { img.removeAttribute('src'); wrap.classList.add('hidden'); }
}
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function itemStock(item){
  const stock = Number(item.stock ?? item.qty ?? item.quantity ?? 0);
  if(stock <= 0) return {key:'out', label:'Out of Stock'};
  return {key:'good', label:'In Stock'};
}
function isVisible(item){
  const status = String(item.status || '').toLowerCase();
  if(status === 'hidden' || item.hidden === true || item.active === false) return false;
  return true;
}
function renderStats(){
  const total = printRows.length;
  const avg = total ? printRows.reduce((sum,item)=>sum+Number(item.price||0),0)/total : 0;
  const visible = printRows.filter(isVisible).length;
  const out = printRows.filter(item=>itemStock(item).key==='out').length;
  $('piTotal').textContent = total;
  $('piAverage').textContent = money(avg);
  $('piVisible').textContent = visible;
  $('piOut').textContent = out;
}
function render(){
  const q = ($('printItemSearch')?.value || '').toLowerCase();
  const filter = $('printItemFilter')?.value || 'all';
  renderStats();
  const list = printRows.filter(item => {
    const hit = `${item.sku || ''} ${item.name || ''} ${item.category || ''}`.toLowerCase().includes(q);
    if(!hit) return false;
    if(filter === 'visible') return isVisible(item);
    if(filter === 'hidden') return !isVisible(item);
    if(filter === 'out') return itemStock(item).key === 'out';
    return true;
  });
  $('printItemsGrid').innerHTML = list.map(item=>{
    const stock = itemStock(item);
    return `<article class="pi-card" data-sku="${esc(item.sku)}">
      <div class="pi-img-wrap"><img class="pi-img" src="${esc(itemImage(item))}" alt="${esc(item.name || 'Print item')}" loading="lazy" onerror="this.src='images/CajunVeteran 3D Print Logo.png'"></div>
      <div class="pi-card-body">
        <div class="pi-card-top"><div><h3>${esc(item.name || 'Unnamed Item')}</h3><small>SKU: ${esc(item.sku || '')}</small></div><span class="pi-stock ${stock.key}">${stock.label}</span></div>
        <div class="pi-price">${money(item.price)}</div>
        <div class="pi-meta"><span>Stock <b>${Number(item.stock ?? item.qty ?? item.quantity ?? 0)}</b></span><span>${esc(item.category || 'General')}</span></div>
        <p>${esc(item.description || item.notes || '')}</p>
        <div class="pi-actions"><button type="button" class="small-btn pi-edit" data-edit="${esc(item.sku)}">Edit</button></div>
      </div>
    </article>`;
  }).join('') || '<div class="color-empty">No print items found.</div>';
}
function clearForm(){
  editingPrintItem = null;
  $('printItemForm').reset();
  $('printItemForm').classList.remove('show');
  $('deletePrintItem').classList.add('hidden');
  setPrintPreview('');
}

function openEditor(item){
  editingPrintItem = item;
  $('printItemForm').classList.add('show');
  ['sku','name','category','description'].forEach(key=>$(key).value = item[key] || '');
  $('price').value = Number(item.price || 0);
  $('stock').value = Number(item.stock ?? item.qty ?? item.quantity ?? 0);
  $('status').value = isVisible(item) ? 'visible' : 'hidden';
  $('image_url').value = item.image_url || item.image || item.photo_url || item.thumbnail_url || '';
  setPrintPreview($('image_url').value);
  $('deletePrintItem').classList.remove('hidden');
  $('printItemForm').scrollIntoView({behavior:'smooth', block:'start'});
}
async function load(){
  printRows = await CVDB.select('cv_items','select=*&order=name.asc');
  render();
}
function wire(){
  $('printItemSearch').oninput = render;
  $('printItemFilter').onchange = render;
  $('newPrintItem').onclick = () => { clearForm(); $('printItemForm').classList.add('show'); };
  $('clearPrintItem').onclick = clearForm;
  $('printItemsGrid').onclick = event => {
    const button = event.target.closest('[data-edit]');
    if(!button) return;
    const row = printRows.find(item => String(item.sku) === String(button.dataset.edit));
    if(row) openEditor(row);
  };
  $('image_file').onchange = async event => {
    const file = event.target.files && event.target.files[0];
    if(!file) return;
    $('image_url').value = await fileToDataUrl(file);
    setPrintPreview($('image_url').value);
  };
  $('removePrintImage').onclick = () => { $('image_url').value = ''; $('image_file').value = ''; setPrintPreview(''); };
  $('printItemForm').onsubmit = async event => {
    event.preventDefault();
    const row = {
      sku: sku.value.trim(),
      name: name.value.trim(),
      price: Number(price.value || 0),
      stock: Number(stock.value || 0),
      category: category.value.trim(),
      description: description.value,
      status: status.value,
      image_url: image_url.value || null,
      updated_at: new Date().toISOString()
    };
    if(!row.sku || !row.name){ toast('SKU and Name are required','err'); return; }
    if(editingPrintItem) await CVDB.patch('cv_items',`sku=eq.${encodeURIComponent(editingPrintItem.sku)}`,row);
    else await CVDB.insert('cv_items',row);
    toast('Print item saved');
    clearForm();
    await load();
  };
  $('deletePrintItem').onclick = async () => {
    if(!editingPrintItem) return;
    const ok = await confirmAction({title:'Delete Print Item',message:`Delete ${editingPrintItem.name}?`,details:'Existing orders keep their line item text, but this item will be removed from the pick list.',confirmText:'Delete Item'});
    if(!ok) return;
    await CVDB.remove('cv_items',`sku=eq.${encodeURIComponent(editingPrintItem.sku)}`);
    toast('Print item deleted');
    clearForm();
    await load();
  };
}
wire();
load().catch(error => toast(error.message,'err'));
