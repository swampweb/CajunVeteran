(function(){
  if(window.__cvWoodGroupOrder)return;
  window.__cvWoodGroupOrder=true;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='woodworking-jobs.html')return;

  const clean=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();

  function findJobsCard(){
    const search=document.querySelector('#jobSearch,input[placeholder*="Search job" i],input[placeholder*="Search customer" i]');
    return search?.closest('section,article,.v7-card,.card,.panel')||null;
  }

  function findGroup(root,status){
    return [...root.querySelectorAll('.status-group,section,article,div')].find(element=>{
      const head=element.querySelector(':scope > .status-head,:scope > header,:scope > button,:scope > h3');
      if(!head)return false;
      const value=clean(head.textContent).replace(/\(.*?\)/g,'').replace(/\d+$/,'').trim();
      return value===status;
    });
  }

  function arrange(){
    document.body.classList.add('cv-wood-group-order');
    const card=findJobsCard();
    if(!card)return;
    const search=document.querySelector('#jobSearch,input[placeholder*="Search job" i],input[placeholder*="Search customer" i]');
    const body=search?.closest('.v7-card-body,.card-body')||search?.parentElement?.parentElement||card;
    if(!body)return;

    let archive=body.querySelector('.cv-wood-archive-groups');
    if(!archive){archive=document.createElement('div');archive.className='cv-wood-archive-groups';body.appendChild(archive)}

    ['completed','delivered'].forEach(status=>{
      const group=findGroup(body,status);
      if(group&&group.parentElement!==archive){
        group.classList.add('cv-wood-bottom-group');
        archive.appendChild(group);
      }
    });

    const toolbar=body.querySelector('.cv-wood-filter-row');
    if(toolbar&&body.firstElementChild!==toolbar)body.insertBefore(toolbar,body.firstElementChild);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrange);else arrange();
  const observer=new MutationObserver(()=>arrange());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
