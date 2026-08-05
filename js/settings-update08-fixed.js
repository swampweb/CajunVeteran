initNavigation('settings.html');
const key='cv_item_sizes';
const defaults=['Small','Medium','Large','Other'];
let values=[];
let dragIndex=null;
function load(){try{values=JSON.parse(localStorage.getItem(key))||[...defaults]}catch{values=[...defaults]}render()}
function save(){localStorage.setItem(key,JSON.stringify(values));render()}
function render(){sizeList.innerHTML=values.map((size,index)=>`<div class="size-sort-row" draggable="true" data-index="${index}"><span class="size-drag-handle" title="Drag to reorder"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="size-order-number">${index+1}</span><span class="size-name">${size}</span><button type="button" class="size-remove" data-remove-index="${index}" title="Remove size">x</button></div>`).join('')}
addSize.onclick=()=>{const value=newSize.value.trim();if(value&&!values.some(x=>x.toLowerCase()===value.toLowerCase())){values.push(value);newSize.value='';save()}};
newSize.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addSize.click()}};
sizeList.addEventListener('click',e=>{const b=e.target.closest('[data-remove-index]');if(!b)return;values.splice(Number(b.dataset.removeIndex),1);save()});
sizeList.addEventListener('dragstart',e=>{const row=e.target.closest('.size-sort-row');if(!row)return;dragIndex=Number(row.dataset.index);row.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragIndex))});
sizeList.addEventListener('dragend',e=>{e.target.closest('.size-sort-row')?.classList.remove('dragging');document.querySelectorAll('.size-sort-row.drag-over').forEach(x=>x.classList.remove('drag-over'));dragIndex=null});
sizeList.addEventListener('dragover',e=>{e.preventDefault();const row=e.target.closest('.size-sort-row');if(!row)return;document.querySelectorAll('.size-sort-row.drag-over').forEach(x=>x.classList.remove('drag-over'));row.classList.add('drag-over');e.dataTransfer.dropEffect='move'});
sizeList.addEventListener('dragleave',e=>{const row=e.target.closest('.size-sort-row');if(row&&!row.contains(e.relatedTarget))row.classList.remove('drag-over')});
sizeList.addEventListener('drop',e=>{e.preventDefault();const row=e.target.closest('.size-sort-row');if(!row||dragIndex===null)return;const dropIndex=Number(row.dataset.index);if(dropIndex===dragIndex)return;const moved=values.splice(dragIndex,1)[0];values.splice(dropIndex,0,moved);save()});
load();
