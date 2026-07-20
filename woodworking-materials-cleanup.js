/* CajunVeteran Woodworking Materials Cleanup v1
   Use after woodworking-layout-update.js and before shared-navigation-update.js:
   <script src="woodworking-materials-cleanup.js?v=materials-clean1"></script>
*/
(function(){
  if (window.__cvWoodMaterialsCleanupLoaded) return;
  window.__cvWoodMaterialsCleanupLoaded = true;

  function addStyle(){
    if(document.getElementById('cvWoodMaterialsCleanupStyle')) return;
    const style=document.createElement('style');
    style.id='cvWoodMaterialsCleanupStyle';
    style.textContent=`
      .job-use-card{border-radius:12px!important;border:1px solid rgba(240,180,41,.35)!important;background:rgba(7,24,42,.82)!important;padding:14px!important;}
      .job-use-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;margin-bottom:12px!important;}
      .job-use-head strong{color:#f0b429!important;text-transform:uppercase!important;letter-spacing:.04em!important;font-size:15px!important;}
      .job-use-head span{display:block!important;color:#b0bfd2!important;font-size:12px!important;margin-top:2px!important;max-width:680px!important;}
      #addJobUseRow{border-radius:9px!important;border:1px solid rgba(240,180,41,.55)!important;background:rgba(240,180,41,.12)!important;color:#ffd36a!important;font-weight:900!important;min-height:38px!important;padding:8px 12px!important;white-space:nowrap!important;}
      #addJobUseRow:hover{background:rgba(240,180,41,.20)!important;}
      .cv-material-header,.job-use-list .job-use-row,.job-use-list>div.cv-material-row{display:grid!important;grid-template-columns:minmax(270px,1fr) 88px 110px 42px!important;gap:8px!important;align-items:center!important;width:100%!important;}
      .cv-material-header{color:#9fb0c4!important;font-size:11px!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.05em!important;border-bottom:1px solid rgba(86,142,198,.28)!important;padding:0 2px 7px!important;margin-bottom:7px!important;}
      .job-use-list{display:flex!important;flex-direction:column!important;gap:8px!important;}
      .job-use-list .job-use-row,.job-use-list>div.cv-material-row{background:rgba(255,255,255,.035)!important;border:1px solid rgba(86,142,198,.28)!important;border-radius:10px!important;padding:8px!important;}
      .job-use-list select,.job-use-list input{width:100%!important;min-height:38px!important;border-radius:8px!important;border:1px solid #3b5f83!important;background:#10283f!important;color:#f4f7fb!important;padding:8px 10px!important;}
      .job-use-list input{text-align:center!important;font-weight:900!important;color:#ffd36a!important;}
      .job-use-list .cv-material-cost{font-weight:900!important;color:#ffd36a!important;text-align:right!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important;}
      .job-use-list button,.job-use-list .remove-material,.job-use-list .remove-job-use{width:34px!important;height:34px!important;min-width:34px!important;border-radius:8px!important;border:1px solid #b91c1c!important;background:#ef4444!important;color:#fff!important;font-weight:900!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;}
      .job-use-total{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:10px!important;border-top:1px solid rgba(86,142,198,.28)!important;margin-top:12px!important;padding-top:12px!important;}
      .job-use-total span{color:#b0bfd2!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.04em!important;}
      .job-use-total strong{color:#ffd36a!important;font-size:20px!important;}
      .cv-material-mini-note{margin-top:8px;color:#9fb0c4;font-size:12px;}
      @media(max-width:800px){.cv-material-header{display:none!important}.job-use-list .job-use-row,.job-use-list>div.cv-material-row{grid-template-columns:1fr!important}.job-use-list .cv-material-cost{text-align:left!important}.job-use-list button{width:100%!important}.job-use-head{align-items:flex-start!important;flex-direction:column!important}#addJobUseRow{width:100%!important}}
    `;
    document.head.appendChild(style);
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

  function wrapCostText(row){
    if(!row || row.dataset.cvCostWrapped==='true') return;
    Array.from(row.childNodes).forEach(node=>{
      if(node.nodeType===3 && /\$\s*\d/.test(node.textContent||'')){
        const span=document.createElement('span');
        span.className='cv-material-cost';
        span.textContent=node.textContent.trim();
        node.replaceWith(span);
      }
    });
    const children=Array.from(row.children);
    children.forEach(el=>{
      if(/\$\s*\d/.test(el.textContent||'') && !el.matches('select,input,button')) el.classList.add('cv-material-cost');
    });
    row.dataset.cvCostWrapped='true';
  }

  function normalizeRows(){
    const list=document.getElementById('jobUseList');
    if(!list) return;
    list.classList.add('job-use-list');
    Array.from(list.children).forEach(row=>{
      if(row.classList.contains('cv-material-header')) return;
      row.classList.add('cv-material-row');
      wrapCostText(row);
      const btn=row.querySelector('button');
      if(btn && !btn.title) btn.title='Remove material';
    });
  }

  function ensureHeader(){
    const list=document.getElementById('jobUseList');
    if(!list) return;
    const card=list.closest('.job-use-card') || list.parentElement;
    if(!card || card.querySelector('.cv-material-header')) return;
    const header=document.createElement('div');
    header.className='cv-material-header';
    header.innerHTML='<div>Material / Component</div><div>Qty</div><div style="text-align:right">Cost</div><div></div>';
    list.insertAdjacentElement('beforebegin',header);
  }

  function observeRows(){
    const list=document.getElementById('jobUseList');
    if(!list || list.dataset.cvObserved==='true') return;
    list.dataset.cvObserved='true';
    const obs=new MutationObserver(()=>{normalizeRows();ensureHeader();});
    obs.observe(list,{childList:true,subtree:true,characterData:true});
  }

  function init(){
    addStyle();
    simplifyHeader();
    ensureHeader();
    normalizeRows();
    observeRows();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,250);
  setTimeout(init,1000);
  setTimeout(init,2000);
})();
