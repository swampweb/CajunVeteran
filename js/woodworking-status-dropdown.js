(function(){
  if(window.__cvWoodStatusDropdown)return;
  window.__cvWoodStatusDropdown=true;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='woodworking-jobs.html')return;

  const clean=value=>String(value||'').replace(/\s+/g,' ').trim().toLowerCase();

  function findStatusCard(){
    return [...document.querySelectorAll('aside,section,article,div')].find(element=>{
      const heading=[...element.children].find(child=>child.matches?.('h1,h2,h3,.v7-card-head,.card-title,.panel-title'));
      if(!heading||!clean(heading.textContent).startsWith('status'))return false;
      const labels=[...element.querySelectorAll('button,a')].map(button=>clean(button.textContent).replace(/\(.*?\)/g,'').trim());
      return labels.some(label=>label.includes('all jobs'))&&labels.includes('new')&&labels.some(label=>label.includes('in process'));
    });
  }

  function findJobsCard(){
    const search=document.querySelector('#jobSearch,input[placeholder*="Search job" i],input[placeholder*="Search customer" i]');
    return search?.closest('section,article,.v7-card,.card,.panel')||null;
  }

  function statusValue(text){
    const value=clean(text).replace(/\(.*?\)/g,'').trim();
    if(value.includes('all jobs'))return'all';
    if(value.includes('in process'))return'in_process';
    if(value.includes('completed'))return'completed';
    if(value.includes('delivered'))return'delivered';
    if(value==='new'||value.startsWith('new '))return'new';
    return'';
  }

  function install(){
    document.body.classList.add('cv-wood-status-dropdown');
    const statusCard=findStatusCard();
    const jobsCard=findJobsCard();
    if(!statusCard||!jobsCard)return;

    const buttons=[...statusCard.querySelectorAll('button,a')].filter(button=>statusValue(button.textContent));
    statusCard.classList.add('cv-wood-old-status');

    const search=jobsCard.querySelector('#jobSearch,input[placeholder*="Search job" i],input[placeholder*="Search customer" i]');
    if(!search||jobsCard.querySelector('#woodStatusFilter'))return;

    let toolbar=search.parentElement;
    if(!toolbar||toolbar===jobsCard) {
      toolbar=document.createElement('div');
      search.parentElement.insertBefore(toolbar,search);
      toolbar.appendChild(search);
    }
    toolbar.classList.add('cv-wood-filter-row');

    const label=document.createElement('label');
    label.className='cv-wood-status-filter';
    label.innerHTML='<span>Status</span><select id="woodStatusFilter"><option value="all">All Jobs</option><option value="new">New</option><option value="in_process">In Process</option><option value="completed">Completed</option><option value="delivered">Delivered</option></select>';
    toolbar.appendChild(label);

    const select=label.querySelector('select');
    select.addEventListener('change',()=>{
      const target=buttons.find(button=>statusValue(button.textContent)===select.value);
      if(target)target.click();
    });

    const workspace=statusCard.parentElement;
    if(workspace&&workspace.contains(jobsCard))workspace.classList.add('cv-wood-workspace-two-column');
    jobsCard.classList.add('cv-wood-jobs-card');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
