(function(){
  'use strict';

  const state={jobs:[],view:'dashboard',type:'all',status:'active',search:'',searchStatus:'all',selected:null,items:[],colors:[],woodItems:[],orderType:'print',selectedItem:null,selectedItemType:'print',imageListType:'print'};
  const $=id=>document.getElementById(id);
  const money=value=>'$'+Number(value||0).toFixed(2);
  const norm=value=>String(value||'new').toLowerCase().replace(/\s+/g,'_');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const activeStatuses=['new','in_process'];

  function statusLabel(s){return String(s||'new').replace(/_/g,' ');}
  function isActive(job){return activeStatuses.includes(norm(job.status));}
  function imageFor(job){
    if(job.image) return job.image;
    if(job.type==='print') return 'images/CajunVeteran 3D Print Logo.png';
    return 'images/apple-touch-icon.png';
  }
  function dueText(job){
    if(norm(job.status)==='completed') return `Completed: ${job.due||'No date'}`;
    if(['delivered','shipped'].includes(norm(job.status))) return `Delivered: ${job.due||'No date'}`;
    return `Due: ${job.due||'No due date'}`;
  }
  function dateSort(value){return value||'9999-12-31';}

  function orderLineSummary(order,lines,items){
    const related=lines.filter(line=>String(line.order_id)===String(order.order_id));
    if(!related.length) return order.project||'3D Print Order';
    return related.map(line=>{
      const item=items.find(candidate=>String(candidate.sku)===String(line.item_sku));
      return item?.name||line.item_sku||'Item';
    }).join(', ');
  }
  function orderTotal(order,lines,items){
    const stored=Number(order.total||0);
    if(stored) return stored;
    return lines.filter(line=>String(line.order_id)===String(order.order_id)).reduce((sum,line)=>{
      const item=items.find(candidate=>String(candidate.sku)===String(line.item_sku));
      return sum+Number(item?.price||0)*Number(line.qty||0);
    },0);
  }

  async function load(){
    const data=await CVDB.loadDashboard();
    const orders=data.orders||[];
    const lines=data.orderLines||[];
    const items=data.items||[];
    const woodJobs=data.woodJobs||[];
    state.items=data.items||[]; state.colors=data.colors||[]; state.woodItems=data.woodItems||[]; state.allLines=data.orderLines||[];

    const printJobs=orders.map(order=>({
      type:'print',
      id:order.order_id,
      customer:order.customer||'No customer',
      project:orderLineSummary(order,lines,items),
      status:norm(order.status),
      due:order.due_date||order.order_date||'',
      orderDate:order.order_date||'',
      paid:!!order.paid,
      notes:order.notes||'',
      price:orderTotal(order,lines,items),
      raw:order
    }));

    const wood=woodJobs.map(job=>({
      type:'wood',
      id:job.job_id,
      customer:job.customer||'No customer',
      project:job.project||job.source_item_id||'Woodworking Job',
      status:norm(job.status),
      due:job.due_date||String(job.created_at||'').slice(0,10)||'',
      orderDate:String(job.created_at||'').slice(0,10)||'',
      paid:!!job.paid,
      notes:job.notes||'',
      price:Number(job.total||0),
      raw:job
    }));

    state.jobs=[...printJobs,...wood].sort((a,b)=>dateSort(b.orderDate||b.due).localeCompare(dateSort(a.orderDate||a.due))||String(b.id).localeCompare(String(a.id)));
    renderAll();
  }

  function filterByBucket(job,bucket){
    const s=norm(job.status);
    if(bucket==='all') return true;
    if(bucket==='active') return activeStatuses.includes(s);
    if(bucket==='completed') return s==='completed';
    if(bucket==='delivered') return s==='delivered'||s==='shipped';
    return true;
  }
  function filteredJobs(){
    const q=state.search.trim().toLowerCase();
    return state.jobs.filter(job=>(state.type==='all'||job.type===state.type)&&filterByBucket(job,state.status)&&(!q||`${job.id} ${job.customer} ${job.project}`.toLowerCase().includes(q)));
  }
  function searchJobs(){
    const q=($('mobileGlobalSearch').value||'').trim().toLowerCase();
    return state.jobs.filter(job=>filterByBucket(job,state.searchStatus)&&(!q||`${job.id} ${job.customer} ${job.project}`.toLowerCase().includes(q)));
  }

  function jobCard(job){
    const status=norm(job.status);
    return `<article class="job-card" data-job-id="${esc(job.id)}" data-job-type="${job.type}">
      <img class="job-thumb" src="${esc(imageFor(job))}" alt="${esc(job.project)}" onerror="this.src='images/apple-touch-icon.png'">
      <div class="job-main">
        <div class="job-top"><span class="status-badge status-${status}">${esc(statusLabel(status))}</span><span class="type-badge">${job.type==='print'?'3D Print':'Woodworking'}</span></div>
        <div class="job-id">${esc(job.id)}</div>
        <div class="job-text">${esc(job.customer)}</div>
        <div class="job-text">${esc(job.project)}</div>
        <div class="job-due">${esc(dueText(job))}</div>
      </div>
      <div><div class="job-price">${money(job.price)}</div><div class="job-chevron">›</div></div>
    </article>`;
  }

  function renderDashboard(){
    $('kpiPrintActive').textContent=state.jobs.filter(j=>j.type==='print'&&isActive(j)).length;
    $('kpiWoodActive').textContent=state.jobs.filter(j=>j.type==='wood'&&isActive(j)).length;
    $('kpiCompleted').textContent=state.jobs.filter(j=>norm(j.status)==='completed').length;
    $('kpiDelivered').textContent=state.jobs.filter(j=>['delivered','shipped'].includes(norm(j.status))).length;
    const upcoming=state.jobs.filter(isActive).slice(0,6);
    $('upcomingList').innerHTML=upcoming.map(jobCard).join('')||'<div class="empty-card">No active jobs found.</div>';
  }
  function renderJobs(){
    $('typePrintCount').textContent=state.jobs.filter(j=>j.type==='print'&&isActive(j)).length;
    $('typeWoodCount').textContent=state.jobs.filter(j=>j.type==='wood'&&isActive(j)).length;
    const list=filteredJobs();
    $('mobileJobList').innerHTML=list.map(jobCard).join('')||'<div class="empty-card">No jobs match this filter.</div>';
  }
  function renderSearch(){ if(!$('mobileSearchResults')) return; const list=searchJobs(); $('mobileSearchResults').innerHTML=list.map(jobCard).join('')||'<div class="empty-card">No matching jobs.</div>'; }
  function renderDetail(){
    const job=state.selected;
    if(!job){go('jobs');return;}
    const status=norm(job.status);
    $('mobileJobDetail').innerHTML=`<article class="detail-card">
      <div class="detail-head">
        <img class="detail-img" src="${esc(imageFor(job))}" alt="${esc(job.project)}" onerror="this.src='images/apple-touch-icon.png'">
        <div>
          <span class="type-badge">${job.type==='print'?'3D Print':'Woodworking'}</span>
          <div class="detail-id">${esc(job.id)}</div>
          <span class="status-badge status-${status}">${esc(statusLabel(status))}</span>
          <div class="detail-price">${money(job.price)}</div>
        </div>
      </div>
      <div class="detail-lines">
        <div class="detail-line"><span>Customer</span><strong>${esc(job.customer)}</strong></div>
        <div class="detail-line"><span>Item / Project</span><strong>${esc(job.project)}</strong></div>
        <div class="detail-line"><span>Status</span><strong>${esc(statusLabel(status))}</strong></div>
        <div class="detail-line"><span>Due Date</span><strong>${esc(job.due||'No due date')}</strong></div>
        <div class="detail-line"><span>Order Date</span><strong>${esc(job.orderDate||'')}</strong></div>
        <div class="detail-line"><span>Paid</span><strong>${job.paid?'Yes':'No'}</strong></div>
        <div class="detail-line"><span>Notes</span><strong>${esc(job.notes||'')}</strong></div>
      </div>
      <div class="detail-actions">
        ${status==='new'?'<button class="action-btn primary" type="button" data-update-status="in_process">Mark In Progress</button>':''}
        ${status!=='completed'&&!['delivered','shipped'].includes(status)?'<button class="action-btn done" type="button" data-update-status="completed">Mark Completed</button>':''}
        ${status!=='delivered'?'<button class="action-btn delivered" type="button" data-update-status="delivered">Mark Delivered</button>':''}
      </div>
    </article>`;
  }
  function renderAll(){renderDashboard();renderJobs();renderSearch();renderOrderItemOptions();renderItemImageList();if(state.view==='detail')renderDetail();}

  function setTitle(){
    const titles={dashboard:'Home',jobs:`${state.status==='active'?'Active':state.status==='all'?'All':statusLabel(state.status)} Jobs`,search:'Search Jobs',detail:'Job Details',newOrder:'Add Order',itemImages:'Item Images',editItemImage:'Edit Item Image',more:'More'};
    $('screenTitle').textContent=titles[state.view]||'Mobile Jobs';
  }
  function go(view){
    state.view=view;
    document.querySelectorAll('.mobile-view').forEach(v=>v.classList.remove('active'));
    const target=$(`view${view.charAt(0).toUpperCase()+view.slice(1)}`);
    if(target)target.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn=>{ const isHome=btn.dataset.view==='dashboard'&&view==='dashboard'; const isJob=btn.dataset.view==='jobs'&&view==='jobs'&&btn.dataset.navStatus===state.status; const isNew=btn.dataset.view==='newOrder'&&view==='newOrder'; btn.classList.toggle('active',isHome||isJob||isNew); });
    setTitle();
    if(view==='search') renderSearch();
    if(view==='detail') renderDetail(); if(view==='itemImages') renderItemImageList(); if(view==='editItemImage') renderItemImageEditor();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function findJob(id,type){return state.jobs.find(job=>String(job.id)===String(id)&&job.type===type);}

  async function updateStatus(status){
    const job=state.selected;
    if(!job) return;
    const row={status,updated_at:new Date().toISOString()};
    if(job.type==='print') await CVDB.patch('cv_orders',`order_id=eq.${encodeURIComponent(job.id)}`,row);
    else await CVDB.patch('cv_woodworking_jobs',`job_id=eq.${encodeURIComponent(job.id)}`,row);
    if(typeof toast==='function') toast('Job status updated');
    await load();
    state.selected=findJob(job.id,job.type);
    renderDetail();
  }




  function currentImageItems(){return state.imageListType==='print'?state.items:state.woodItems;}
  function itemKey(item,type){return type==='print'?item.sku:item.item_id;}
  function renderItemImageList(){
    const listEl=$('itemImageList'); if(!listEl)return;
    const q=($('itemImageSearch')?.value||'').toLowerCase();
    const type=state.imageListType||'print';
    const list=currentImageItems().filter(item=>`${item.sku||''} ${item.item_id||''} ${item.name||''} ${item.category||''}`.toLowerCase().includes(q));
    listEl.innerHTML=list.map(item=>{
      const img=itemImageValue(item)||'images/apple-touch-icon.png';
      const key=itemKey(item,type)||'';
      return `<article class="item-image-row" data-image-item-key="${esc(key)}" data-image-item-type="${type}"><img src="${esc(img)}" onerror="this.src='images/apple-touch-icon.png'" alt="${esc(item.name||'Item')}"><div><strong>${esc(item.name||'Unnamed Item')}</strong><span>${type==='print'?'SKU':'Item #'}: ${esc(key)}</span></div><button type="button">Edit Image</button></article>`;
    }).join('')||'<div class="empty-card">No items found.</div>';
  }
  function selectImageItem(key,type){
    const source=type==='print'?state.items:state.woodItems;
    return source.find(item=>String(itemKey(item,type))===String(key))||{};
  }

  function findItemForJob(job){
    if(!job)return{};
    if(job.type==='print'){
      const raw=job.raw||{};
      const line=(state.allLines||[]).find(l=>String(l.order_id)===String(raw.order_id||job.id));
      return state.items.find(item=>String(item.sku)===String(line?.item_sku))||{};
    }
    const raw=job.raw||{};
    return state.woodItems.find(item=>String(item.item_id)===String(raw.source_item_id))||{};
  }
  function itemImageValue(item){return item?.image_url||item?.image||item?.photo_url||item?.thumbnail_url||'';}
  function openItemImageEditor(item,type){
    state.selectedItem=item||{}; state.selectedItemType=type||'print';
    go('editItemImage');
  }
  function renderItemImageEditor(){
    const body=$('itemImageEditorBody'); if(!body)return;
    const item=state.selectedItem||{}; const type=state.selectedItemType||'print';
    const name=item.name||item.item||item.sku||item.item_id||'Selected Item';
    const current=itemImageValue(item)||'images/apple-touch-icon.png';
    body.innerHTML=`<div class="image-edit-card"><img class="image-edit-preview" id="itemImagePreview" src="${esc(current)}" onerror="this.src='images/apple-touch-icon.png'" alt="${esc(name)}"><div class="image-edit-title">${esc(name)}</div><div class="image-edit-sub">${type==='print'?'3D Print Item':'Woodworking Item'}</div><label>Image URL<input id="itemImageUrl" placeholder="Paste image link" value="${esc(itemImageValue(item))}"></label><label>Preview from phone<input id="itemImageFile" type="file" accept="image/*"></label><button class="action-btn done" type="button" id="saveItemImage">Save Image</button><p class="image-help">Use Image URL for saved website images. Preview from phone lets you test a picture before saving as a data image.</p></div>`;
  }
  async function saveItemImage(){
    const item=state.selectedItem||{}; const type=state.selectedItemType||'print';
    let value=$('itemImageUrl')?.value||'';
    const file=$('itemImageFile')?.files?.[0];
    if(file){value=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
    if(!value){alert('Add an image URL or choose a picture first.');return;}
    if(type==='print'){
      await CVDB.patch('cv_items',`sku=eq.${encodeURIComponent(item.sku)}`,{image_url:value,updated_at:new Date().toISOString()});
    }else{
      await CVDB.patch('cv_woodworking_items',`item_id=eq.${encodeURIComponent(item.item_id)}`,{image_url:value,updated_at:new Date().toISOString()});
    }
    if(typeof toast==='function')toast('Item image saved');
    await load(); go('itemImages'); renderItemImageList();
  }

  function stepTo(step){document.querySelectorAll('.wizard-step').forEach(el=>el.classList.toggle('active',el.dataset.step===String(step)));document.querySelectorAll('[data-step-dot]').forEach(el=>el.classList.toggle('active',el.dataset.stepDot===String(step)));if(String(step)==='3')renderOrderReview();}
  function renderOrderItemOptions(){const select=$('mItemSelect');if(!select)return;const list=state.orderType==='print'?state.items:state.woodItems;select.innerHTML=list.map(item=>{const value=state.orderType==='print'?item.sku:item.item_id;const name=item.name||item.item||item.project||value;return `<option value="${esc(value)}">${esc(name)}</option>`;}).join('')||'<option value="">No items found</option>';renderOrderItemPreview();}
  function selectedOrderItem(){const value=$('mItemSelect')?.value;const list=state.orderType==='print'?state.items:state.woodItems;return list.find(item=>String(state.orderType==='print'?item.sku:item.item_id)===String(value))||{};}
  function renderOrderItemPreview(){if(!$('mItemPreview'))return;const item=selectedOrderItem();const price=Number(state.orderType==='print'?item.price:item.sale_cost||0);$('mItemPreview').innerHTML=`<strong>${esc(item.name||'Selected Item')}</strong><span>${money(price)} each</span>`;if($('mColorWrap'))$('mColorWrap').style.display=state.orderType==='print'?'grid':'none';if($('mColorSelect'))$('mColorSelect').innerHTML=state.colors.map(c=>`<option value="${esc((c.brand||'')+'||'+(c.type||'')+'||'+(c.color||''))}">${esc((c.brand||'')+' - '+(c.color||c.label||''))}</option>`).join('');}
  function renderOrderReview(){if(!$('mReviewBox'))return;const item=selectedOrderItem();const qty=Number($('mQty').value||1);const price=Number(state.orderType==='print'?item.price:item.sale_cost||0);const colors=Array.from($('mColorSelect')?.selectedOptions||[]).map(o=>o.textContent).join(', ');$('mReviewBox').innerHTML=`<div><span>Type</span><strong>${state.orderType==='print'?'3D Print':'Woodworking'}</strong></div><div><span>Customer</span><strong>${esc($('mCustomer').value||'')}</strong></div><div><span>Due Date</span><strong>${esc($('mDueDate').value||'')}</strong></div><div><span>Item</span><strong>${esc(item.name||'')}</strong></div><div><span>Qty</span><strong>${qty}</strong></div>${state.orderType==='print'?`<div><span>Colors</span><strong>${esc(colors||'None')}</strong></div>`:''}<div><span>Total</span><strong>${money(price*qty)}</strong></div>`;}
  function clearMobileOrderForm(){if(!$('mobileOrderForm'))return;$('mobileOrderForm').reset();state.orderType='print';document.querySelectorAll('[data-order-type]').forEach(btn=>btn.classList.toggle('active',btn.dataset.orderType==='print'));$('mOrderDate').value=new Date().toISOString().slice(0,10);$('mStatus').value='new';$('mPriority').value='2';$('mQty').value=1;renderOrderItemOptions();stepTo(1);}
  function nextPrintOrderId(){const ids=state.jobs.filter(j=>j.type==='print').map(j=>Number(String(j.id||'').replace(/\D/g,''))).filter(Boolean);return String((ids.length?Math.max(...ids):100000)+1);}
  function nextWoodJobId(){const ids=state.jobs.filter(j=>j.type==='wood').map(j=>Number(String(j.id||'').replace(/\D/g,''))).filter(Boolean);return 'W'+String((ids.length?Math.max(...ids):1000)+1);}
  async function createMobileOrder(){const item=selectedOrderItem();const qty=Number($('mQty').value||1);if(!$('mCustomer').value.trim()){alert('Customer is required.');stepTo(1);return;}if(state.orderType==='print'){const orderId=nextPrintOrderId();const price=Number(item.price||0);const colors=Array.from($('mColorSelect')?.selectedOptions||[]).map(o=>o.value);await CVDB.insert('cv_orders',{order_id:orderId,customer:$('mCustomer').value.trim(),status:$('mStatus').value,order_date:$('mOrderDate').value||null,due_date:$('mDueDate').value||null,priority:Number($('mPriority').value||2),paid:false,notes:$('mNotes').value,total:price*qty,subtotal:price*qty,discount_type:'none',discount_value:0,surcharge_type:'none',surcharge_value:0,updated_at:new Date().toISOString()});await CVDB.insert('cv_order_lines',[{order_id:orderId,item_sku:item.sku,qty,colors}]);}else{const jobId=nextWoodJobId();const price=Number(item.sale_cost||0);await CVDB.insert('cv_woodworking_jobs',{job_id:jobId,customer:$('mCustomer').value.trim(),source_item_id:item.item_id,project:item.name||'',status:$('mStatus').value,due_date:$('mDueDate').value||null,paid:false,notes:$('mNotes').value,total:price*qty,material_uses:[],updated_at:new Date().toISOString()});}if(typeof toast==='function')toast('Order created');await load();state.status='active';go('jobs');clearMobileOrderForm();}

  document.addEventListener('click',event=>{
    const imgListBtn=event.target.closest('[data-image-list]');if(imgListBtn){state.imageListType=imgListBtn.dataset.imageList;document.querySelectorAll('[data-image-list]').forEach(b=>b.classList.toggle('active',b===imgListBtn));renderItemImageList();return;}
    const imgItem=event.target.closest('[data-image-item-key]');if(imgItem){openItemImageEditor(selectImageItem(imgItem.dataset.imageItemKey,imgItem.dataset.imageItemType),imgItem.dataset.imageItemType);return;}
    const orderTypeBtn=event.target.closest('[data-order-type]');if(orderTypeBtn){state.orderType=orderTypeBtn.dataset.orderType;document.querySelectorAll('[data-order-type]').forEach(b=>b.classList.toggle('active',b===orderTypeBtn));renderOrderItemOptions();return;}const nextStep=event.target.closest('[data-next-step]');if(nextStep){stepTo(nextStep.dataset.nextStep);return;}const prevStep=event.target.closest('[data-prev-step]');if(prevStep){stepTo(prevStep.dataset.prevStep);return;}const nav=event.target.closest('[data-view]');
    if(nav){
      if(nav.dataset.navStatus){
        state.status=nav.dataset.navStatus;
        document.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('active',b.dataset.status===state.status));
        renderJobs();
      }
      go(nav.dataset.view);if(nav.dataset.view==='newOrder')clearMobileOrderForm();
      return;
    }
    const goBtn=event.target.closest('[data-go]');
    if(goBtn){go(goBtn.dataset.go);return;}
    const type=event.target.closest('[data-type]');
    if(type){state.type=type.dataset.type;document.querySelectorAll('[data-type]').forEach(b=>b.classList.toggle('active',b===type));renderJobs();return;}
    const status=event.target.closest('[data-status]');
    if(status){state.status=status.dataset.status;document.querySelectorAll('[data-status]').forEach(b=>b.classList.toggle('active',b===status));setTitle();renderJobs();return;}
    const searchStatus=event.target.closest('[data-search-status]');
    if(searchStatus){state.searchStatus=searchStatus.dataset.searchStatus;document.querySelectorAll('[data-search-status]').forEach(b=>b.classList.toggle('active',b===searchStatus));renderSearch();return;}
    const card=event.target.closest('[data-job-id]');
    if(card){state.selected=findJob(card.dataset.jobId,card.dataset.jobType);go('detail');return;}
    const update=event.target.closest('[data-update-status]');
    if(update){updateStatus(update.dataset.updateStatus).catch(error=>alert(error.message));return;}
  });

  $('mobileJobSearch').addEventListener('input',event=>{state.search=event.target.value;renderJobs();});
  if($('mobileGlobalSearch')) $('mobileGlobalSearch').addEventListener('input',renderSearch);
  $('clearSearch').addEventListener('click',()=>{state.search='';$('mobileJobSearch').value='';renderJobs();});
  $('detailBack').addEventListener('click',()=>go('jobs'));
  if($('refreshMobile')) $('refreshMobile').addEventListener('click',()=>load().catch(error=>alert(error.message)));if($('newOrderBack'))$('newOrderBack').addEventListener('click',()=>go('jobs'));if($('itemImagesBack'))$('itemImagesBack').addEventListener('click',()=>go('dashboard'));if($('editItemImageBack'))$('editItemImageBack').addEventListener('click',()=>go('itemImages'));if($('itemImageSearch'))$('itemImageSearch').addEventListener('input',renderItemImageList);if($('mItemSelect'))$('mItemSelect').addEventListener('change',renderOrderItemPreview);if($('mQty'))$('mQty').addEventListener('input',renderOrderItemPreview);if($('mobileOrderForm'))$('mobileOrderForm').addEventListener('submit',event=>{event.preventDefault();createMobileOrder().catch(error=>alert(error.message));});

  document.addEventListener('input',event=>{if(event.target&&event.target.id==='itemImageUrl'&&$('itemImagePreview'))$('itemImagePreview').src=event.target.value||'images/apple-touch-icon.png';});document.addEventListener('change',event=>{if(event.target&&event.target.id==='itemImageFile'&&event.target.files?.[0]){const r=new FileReader();r.onload=()=>{$('itemImagePreview').src=r.result};r.readAsDataURL(event.target.files[0]);}});document.addEventListener('click',event=>{if(event.target&&event.target.id==='saveItemImage')saveItemImage().catch(error=>alert(error.message));});
  load().catch(error=>alert(error.message));
})();
