/* CajunVeteran Woodworking Materials Cleanup v2
   Replace the old woodworking-materials-cleanup.js with this file.
   Use after woodworking-layout-update.js and before shared-navigation-update.js:
   <script src="woodworking-materials-cleanup.js?v=materials-clean2"></script>
*/
(function(){
  if (window.__cvWoodMaterialsCleanupLoadedV2) return;
  window.__cvWoodMaterialsCleanupLoadedV2 = true;

  function addStyle(){
    let style=document.getElementById('cvWoodMaterialsCleanupStyle');
    if(!style){
      style=document.createElement('style');
      style.id='cvWoodMaterialsCleanupStyle';
      document.head.appendChild(style);
    }

    style.textContent=`
      /* Materials & Components card */
      .job-use-card{
        border-radius:12px!important;
        border:1px solid rgba(240,180,41,.35)!important;
        background:rgba(7,24,42,.82)!important;
        padding:14px!important;
        overflow:visible!important;
        max-width:100%!important;
      }

      .job-use-head{
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:14px!important;
        margin-bottom:12px!important;
        flex-wrap:wrap!important;
      }
      .job-use-head strong{
        color:#f0b429!important;
        text-transform:uppercase!important;
        letter-spacing:.04em!important;
        font-size:15px!important;
      }
      .job-use-head span{
        display:block!important;
        color:#b0bfd2!important;
        font-size:12px!important;
        margin-top:2px!important;
        max-width:820px!important;
      }
      #addJobUseRow{
        border-radius:9px!important;
        border:1px solid rgba(240,180,41,.55)!important;
        background:rgba(240,180,41,.12)!important;
        color:#ffd36a!important;
        font-weight:900!important;
        min-height:38px!important;
        padding:8px 12px!important;
        white-space:nowrap!important;
      }
      #addJobUseRow:hover{background:rgba(240,180,41,.20)!important;}

      /* Remove table-style width pressure. Use compact cards instead. */
      .cv-material-header{display:none!important;}
      .job-use-list{
        display:grid!important;
        grid-template-columns:repeat(auto-fit,minmax(260px,1fr))!important;
        gap:10px!important;
        width:100%!important;
        max-width:100%!important;
      }

      .job-use-list .job-use-row,
      .job-use-list>div.cv-material-row{
        display:grid!important;
        grid-template-columns:1fr!important;
        gap:8px!important;
        align-items:stretch!important;
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        background:rgba(255,255,255,.035)!important;
        border:1px solid rgba(86,142,198,.28)!important;
        border-radius:10px!important;
        padding:10px!important;
        overflow:visible!important;
      }

      .job-use-list select,
      .job-use-list input{
        width:100%!important;
        max-width:100%!important;
        min-width:0!important;
        min-height:38px!important;
        border-radius:8px!important;
        border:1px solid #3b5f83!important;
        background:#10283f!important;
        color:#f4f7fb!important;
        padding:8px 10px!important;
      }
      .job-use-list input{
        text-align:center!important;
        font-weight:900!important;
        color:#ffd36a!important;
      }

      .cv-material-bottom{
        display:grid!important;
        grid-template-columns:92px 1fr 38px!important;
        gap:8px!important;
        align-items:center!important;
        width:100%!important;
      }
      .cv-material-bottom input{width:100%!important;}
      .cv-material-cost{
        font-weight:900!important;
        color:#ffd36a!important;
        text-align:right!important;
        font-variant-numeric:tabular-nums!important;
        white-space:nowrap!important;
      }
      .job-use-list button,
      .job-use-list .remove-material,
      .job-use-list .remove-job-use{
        width:34px!important;
        height:34px!important;
        min-width:34px!important;
        border-radius:8px!important;
        border:1px solid #b91c1c!important;
        background:#ef4444!important;
        color:#fff!important;
        font-weight:900!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        padding:0!important;
        justify-self:end!important;
      }

      .job-use-total{
        display:flex!important;
        align-items:center!important;
        justify-content:flex-end!important;
        gap:10px!important;
        border-top:1px solid rgba(86,142,198,.28)!important;
        margin-top:12px!important;
        padding-top:12px!important;
        flex-wrap:wrap!important;
      }
      .job-use-total span{
        color:#b0bfd2!important;
        font-weight:900!important;
        text-transform:uppercase!important;
        letter-spacing:.04em!important;
      }
      .job-use-total strong{
        color:#ffd36a!important;
        font-size:20px!important;
      }
      .cv-material-mini-note{margin-top:8px;color:#9fb0c4;font-size:12px;}

      /* Fix Material Inventory table being clipped on the right */
      .material-inv-table,
      #materialInventory table{
        width:100%!important;
        min-width:0!important;
        table-layout:auto!important;
      }
      .material-inv-table th,
      .material-inv-table td,
      #materialInventory th,
      #materialInventory td{
        white-space:normal!important;
        overflow:visible!important;
        text-overflow:clip!important;
        vertical-align:middle!important;
      }
      .material-inv-table th:nth-child(6),
      .material-inv-table td:nth-child(6),
      #materialInventory th:nth-child(6),
      #materialInventory td:nth-child(6){
        min-width:120px!important;
        max-width:none!important;
        word-break:break-word!important;
      }
      .material-inv-table th:nth-child(7),
      .material-inv-table td:nth-child(7),
      #materialInventory th:nth-child(7),
      #materialInventory td:nth-child(7){
        width:82px!important;
        min-width:82px!important;
        text-align:center!important;
        padding-right:14px!important;
      }
      #materialInventory .table-wrap{
        overflow:visible!important;
        max-width:100%!important;
      }

      @media(max-width:800px){
        .job-use-list{grid-template-columns:1fr!important;}
        .cv-material-bottom{grid-template-columns:80px 1fr 38px!important;}
        .job-use-head{align-items:flex-start!important;flex-direction:column!important;}
        #addJobUseRow{width:100%!important;}
      }
    `;
  }

  function simplifyHeader(){
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

  function extractCostNode(row){
    let costNode=null;
    Array.from(row.childNodes).forEach(node=>{
      if(node.nodeType===3 && /\$\s*\d/.test(node.textContent||'')) costNode=node;
    });
    if(costNode){
      const span=document.createElement('span');
      span.className='cv-material-cost';
      span.textContent=costNode.textContent.trim();
      costNode.replaceWith(span);
      return span;
    }
    const existing=Array.from(row.children).find(el=>/\$\s*\d/.test(el.textContent||'') && !el.matches('select,input,button'));
    if(existing){existing.classList.add('cv-material-cost');return existing;}
    const span=document.createElement('span');
    span.className='cv-material-cost';
    span.textContent='$0.00';
    return span;
  }

  function normalizeRow(row){
    if(!row || row.classList.contains('cv-material-header')) return;
    row.classList.add('cv-material-row');

    const select=row.querySelector('select');
    const input=row.querySelector('input');
    const button=row.querySelector('button');
    const cost=extractCostNode(row);

    if(button){
      button.title='Remove material';
      if(!button.textContent.trim()) button.textContent='×';
    }

    // If already structured, only refresh cost class.
    if(row.querySelector('.cv-material-bottom')) return;

    const bottom=document.createElement('div');
    bottom.className='cv-material-bottom';

    if(input) bottom.appendChild(input);
    bottom.appendChild(cost);
    if(button) bottom.appendChild(button);

    if(select && select.parentElement!==row) row.appendChild(select);
    if(select && row.firstElementChild!==select) row.insertBefore(select,row.firstChild);
    row.appendChild(bottom);
  }

  function normalizeRows(){
    const list=document.getElementById('jobUseList');
    if(!list) return;
    list.classList.add('job-use-list');
    Array.from(list.children).forEach(normalizeRow);
  }

  function removeOldHeader(){
    document.querySelectorAll('.cv-material-header').forEach(h=>h.remove());
  }

  function observeRows(){
    const list=document.getElementById('jobUseList');
    if(!list || list.dataset.cvObservedV2==='true') return;
    list.dataset.cvObservedV2='true';
    const obs=new MutationObserver(()=>{removeOldHeader();normalizeRows();});
    obs.observe(list,{childList:true,subtree:true,characterData:true});
  }

  function init(){
    addStyle();
    simplifyHeader();
    removeOldHeader();
    normalizeRows();
    observeRows();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,250);
  setTimeout(init,1000);
  setTimeout(init,2000);
})();
