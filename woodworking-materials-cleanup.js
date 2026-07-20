/* CajunVeteran Woodworking Materials Cleanup v3
   Replace the old woodworking-materials-cleanup.js with this file.
   No HTML change needed if woodworking.html already links to:
   <script src="woodworking-materials-cleanup.js"></script>
*/
(function(){
  if (window.__cvWoodMaterialsCleanupLoadedV3) return;
  window.__cvWoodMaterialsCleanupLoadedV3 = true;

  function addStyle(){
    let style=document.getElementById('cvWoodMaterialsCleanupStyle');
    if(!style){
      style=document.createElement('style');
      style.id='cvWoodMaterialsCleanupStyle';
      document.head.appendChild(style);
    }
    style.textContent=`
      /* Materials & Components card cleanup */
      .job-use-card{border-radius:12px!important;border:1px solid rgba(240,180,41,.35)!important;background:rgba(7,24,42,.82)!important;padding:14px!important;overflow:visible!important;max-width:100%!important;}
      .job-use-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;margin-bottom:12px!important;flex-wrap:wrap!important;}
      .job-use-head strong{color:#f0b429!important;text-transform:uppercase!important;letter-spacing:.04em!important;font-size:15px!important;}
      .job-use-head span{display:block!important;color:#b0bfd2!important;font-size:12px!important;margin-top:2px!important;max-width:820px!important;}
      #addJobUseRow{border-radius:9px!important;border:1px solid rgba(240,180,41,.55)!important;background:rgba(240,180,41,.12)!important;color:#ffd36a!important;font-weight:900!important;min-height:38px!important;padding:8px 12px!important;white-space:nowrap!important;}
      #addJobUseRow:hover{background:rgba(240,180,41,.20)!important;}
      .cv-material-header{display:none!important;}
      .job-use-list{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))!important;gap:10px!important;width:100%!important;max-width:100%!important;}
      .job-use-list .job-use-row,.job-use-list>div.cv-material-row{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;align-items:stretch!important;width:100%!important;max-width:100%!important;min-width:0!important;background:rgba(255,255,255,.035)!important;border:1px solid rgba(86,142,198,.28)!important;border-radius:10px!important;padding:10px!important;overflow:visible!important;}
      .job-use-list select,.job-use-list input{width:100%!important;max-width:100%!important;min-width:0!important;min-height:38px!important;border-radius:8px!important;border:1px solid #3b5f83!important;background:#10283f!important;color:#f4f7fb!important;padding:8px 10px!important;}
      .job-use-list input{text-align:center!important;font-weight:900!important;color:#ffd36a!important;}
      .cv-material-bottom,.job-use-second{display:grid!important;grid-template-columns:84px 1fr 38px!important;gap:8px!important;align-items:center!important;width:100%!important;}
      .cv-material-cost,.job-use-cost{font-weight:900!important;color:#ffd36a!important;text-align:right!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important;}
      .job-use-list button,.job-use-list .remove-material,.job-use-list .remove-job-use{width:34px!important;height:34px!important;min-width:34px!important;border-radius:8px!important;border:1px solid #b91c1c!important;background:#ef4444!important;color:#fff!important;font-weight:900!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;justify-self:end!important;}
      .job-use-total{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:10px!important;border-top:1px solid rgba(86,142,198,.28)!important;margin-top:12px!important;padding-top:12px!important;flex-wrap:wrap!important;}
      .job-use-total span{color:#b0bfd2!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.04em!important;}
      .job-use-total strong{color:#ffd36a!important;font-size:20px!important;}
      .cv-material-mini-note{margin-top:8px;color:#9fb0c4;font-size:12px;}

      /* Material Inventory table: exact 6-column layout with NO Notes column */
      .material-inv-table{width:100%!important;min-width:0!important;table-layout:auto!important;}
      .material-inv-table th,.material-inv-table td{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;vertical-align:middle!important;}
      .material-inv-table th:nth-child(1),.material-inv-table td:nth-child(1){min-width:220px!important;}
      .material-inv-table th:nth-child(2),.material-inv-table td:nth-child(2){width:120px!important;white-space:nowrap!important;}
      .material-inv-table th:nth-child(3),.material-inv-table td:nth-child(3){width:70px!important;text-align:center!important;white-space:nowrap!important;}
      .material-inv-table th:nth-child(4),.material-inv-table td:nth-child(4){width:90px!important;text-align:center!important;white-space:nowrap!important;}
      .material-inv-table th:nth-child(5),.material-inv-table td:nth-child(5){width:110px!important;text-align:right!important;white-space:nowrap!important;}
      .material-inv-table th:nth-child(6),.material-inv-table td:nth-child(6){width:90px!important;text-align:center!important;white-space:nowrap!important;}
      .material-inv-table .inv-onhand-input{width:70px!important;min-height:34px!important;text-align:center!important;border-radius:8px!important;border:1px solid #3b5f83!important;background:#10283f!important;color:#ffd36a!important;font-weight:900!important;}
      #materialInventory .table-wrap{overflow:visible!important;max-width:100%!important;}
      @media(max-width:800px){
        .job-use-list{grid-template-columns:1fr!important;}
        .cv-material-bottom,.job-use-second{grid-template-columns:78px 1fr 38px!important;}
        .job-use-head{align-items:flex-start!important;flex-direction:column!important;}
        #addJobUseRow{width:100%!important;}
        #materialInventory .table-wrap{overflow-x:auto!important;}
        .material-inv-table{min-width:650px!important;}
      }
    `;
  }

  function simplifyJobUseHeader(){
    const card=document.querySelector('.job-use-card');
    if(!card) return;
    const strong=card.querySelector('.job-use-head strong');
    const span=card.querySelector('.job-use-head span');
    if(strong) strong.textContent='Materials & Components';
    if(span) span.textContent='Select wood, 3D printed components, hardware, and supplies used for this job.';
    const btn=document.getElementById('addJobUseRow');
    if(btn) btn.textContent='+ Add Material';
    if(!card.querySelector('.cv-material-mini-note')){
      const note=document.createElement('div');
      note.className='cv-material-mini-note';
      note.textContent='Tip: Add 3D printed plaque parts here so low-stock tracking works with woodworking jobs.';
      const total=card.querySelector('.job-use-total');
      if(total) total.insertAdjacentElement('afterend',note);
    }
  }

  function normalizeJobUseRows(){
    const list=document.getElementById('jobUseList');
    if(!list) return;
    list.classList.add('job-use-list');
    document.querySelectorAll('.cv-material-header').forEach(h=>h.remove());
    Array.from(list.children).forEach(row=>{
      if(!row || row.classList.contains('cv-material-header')) return;
      row.classList.add('cv-material-row');
      const select=row.querySelector('select');
      const input=row.querySelector('input');
      const button=row.querySelector('button');
      let cost=row.querySelector('.job-use-cost,.cv-material-cost');
      if(!cost){
        Array.from(row.childNodes).forEach(node=>{
          if(!cost && node.nodeType===3 && /\$\s*\d/.test(node.textContent||'')){
            cost=document.createElement('div');
            cost.className='cv-material-cost';
            cost.textContent=node.textContent.trim();
            node.replaceWith(cost);
          }
        });
      }
      if(!row.querySelector('.cv-material-bottom') && select && input && button){
        const bottom=document.createElement('div');
        bottom.className='cv-material-bottom';
        bottom.appendChild(input);
        if(cost) bottom.appendChild(cost); else { const empty=document.createElement('div'); empty.className='cv-material-cost'; empty.textContent='$0.00'; bottom.appendChild(empty); }
        bottom.appendChild(button);
        if(row.firstElementChild!==select) row.insertBefore(select,row.firstChild);
        row.appendChild(bottom);
      }
    });
  }

  function fixInventoryHeader(){
    const head=document.querySelector('.material-inv-table thead');
    if(!head) return;
    head.innerHTML='<tr><th>Material</th><th style="width:115px">Purchase Cost</th><th style="width:80px">Yield</th><th style="width:90px">On Hand</th><th style="width:110px">Cost Each</th><th style="width:70px">Low?</th></tr>';
  }

  function safeMoney(v){
    if(typeof window.money==='function') return window.money(v);
    const n=Number(v||0)||0;
    return '$'+n.toFixed(2);
  }
  function safeLoadMaterialInventory(){
    if(typeof window.loadMaterialInventory==='function') return window.loadMaterialInventory();
    try{return JSON.parse(localStorage.getItem('cv_woodworking_material_inventory_v1')||'[]')}catch{return []}
  }
  function safeSaveMaterialInventory(list){
    if(typeof window.saveMaterialInventory==='function') return window.saveMaterialInventory(list);
    localStorage.setItem('cv_woodworking_material_inventory_v1',JSON.stringify(list));
  }
  function safeYield(m){
    if(typeof window.getMatYield==='function') return window.getMatYield(m||{});
    const y=Number((m&&(m.yieldQty||m.yield))||1)||1;
    return y;
  }
  function safeCostEach(m){
    if(typeof window.materialInvCostEach==='function') return window.materialInvCostEach(m||{});
    const cost=Number((m&&(m.purchaseCost||m.cost))||0)||0;
    const y=safeYield(m||{});
    return y>0?cost/y:0;
  }

  function renderMaterialInventoryNoNotes(){
    const list=safeLoadMaterialInventory();
    const tbody=document.getElementById('materialInventoryTable');
    if(!tbody) return;
    fixInventoryHeader();
    tbody.innerHTML='';
    list.forEach(m=>{
      const y=safeYield(m);
      const onHand=Number(m.onHand||0)||0;
      const low=onHand<=0;
      const tr=document.createElement('tr');
      tr.innerHTML=`<td><strong>${m.name||''}</strong></td><td>${safeMoney(m.purchaseCost||m.cost||0)}</td><td>${y}</td><td><input class="inv-onhand-input" type="number" min="0" step="1" data-inv-onhand="${m.id}" value="${onHand}" /></td><td>${safeMoney(safeCostEach(m))}</td><td>${low?'<span class="badge danger-badge">Out</span>':'<span class="badge ok">OK</span>'}</td>`;
      tbody.appendChild(tr);
    });
    const c=document.getElementById('materialInventoryCount');
    if(c) c.textContent=String(list.length);
    const alert=document.getElementById('kpiMaterialAlerts');
    if(alert) alert.textContent=String(list.filter(m=>(Number(m.onHand||0)||0)<=0).length);
    if(typeof window.refreshJobUseSelects==='function') window.refreshJobUseSelects();
  }

  function overrideInventoryRenderer(){
    window.renderMaterialInventory = renderMaterialInventoryNoNotes;
  }

  function wireOnHandEditing(){
    if(document.body.dataset.cvInvOnhandWired==='true') return;
    document.body.dataset.cvInvOnhandWired='true';
    document.addEventListener('change',function(e){
      const input=e.target.closest('[data-inv-onhand]');
      if(!input) return;
      const inv=safeLoadMaterialInventory();
      const m=inv.find(x=>String(x.id)===String(input.dataset.invOnhand));
      if(m){
        m.onHand=Number(input.value||0)||0;
        safeSaveMaterialInventory(inv);
        renderMaterialInventoryNoNotes();
      }
    });
  }

  function observeJobUseRows(){
    const list=document.getElementById('jobUseList');
    if(!list || list.dataset.cvMaterialsObservedV3==='true') return;
    list.dataset.cvMaterialsObservedV3='true';
    const obs=new MutationObserver(()=>normalizeJobUseRows());
    obs.observe(list,{childList:true,subtree:true,characterData:true});
  }

  function init(){
    addStyle();
    simplifyJobUseHeader();
    normalizeJobUseRows();
    observeJobUseRows();
    overrideInventoryRenderer();
    wireOnHandEditing();
    renderMaterialInventoryNoNotes();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
  setTimeout(init,250);
  setTimeout(init,1000);
  setTimeout(init,2000);
})();
