(function(){
  if(window.__cvPrintOrdersClean15)return;
  window.__cvPrintOrdersClean15=true;
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='print-orders.html')return;

  const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
  const lower=v=>clean(v).toLowerCase();
  let orders=[];

  function findTitle(){return [...document.querySelectorAll('h1,h2')].find(el=>/3d print orders/i.test(el.textContent||''))}
  function findStatusCard(){return [...document.querySelectorAll('aside,section,article,div')].find(el=>{
    const heading=[...el.children].find(c=>c.matches?.('h1,h2,h3,.card-title,.panel-title'));
    if(!heading||lower(heading.textContent)!=='status')return false;
    const labels=[...el.querySelectorAll('button,a')].map(x=>lower(x.textContent));
    return labels.some(x=>x.includes('all orders'))&&labels.includes('new')&&labels.some(x=>x.includes('in process'))&&labels.includes('completed');
  })}
  function statusButtons(card){return card?[...card.querySelectorAll('button,a')]:[]}

  function cleanHeader(){
    const title=findTitle();if(!title)return;
    const header=title.closest('header,.page-head,.page-header,.v7-page-head')||title.parentElement;
    if(!header)return;
    header.classList.add('cv15-header');

    // Remove every old injected page logo and filter.
    header.querySelectorAll('.cv-page-logo,.cv-page-title-logo,.cv11-page-logo,.cv12-page-logo,.cv15-page-logo,.cv-status-filter,.cv11-status,.cv12-status,.cv13-status').forEach(el=>el.remove());
    document.querySelectorAll('main img[src*="CajunVeteran 3D Print Logo"],.content img[src*="CajunVeteran 3D Print Logo"]').forEach(el=>{if(!header.contains(el))el.remove()});

    const actions=[...header.querySelectorAll('button')];
    actions.forEach(btn=>{
      const t=lower(btn.textContent);
      if(t.includes('refresh'))btn.classList.add('cv15-action-refresh');
      if(t.includes('new order'))btn.classList.add('cv15-action-new');
    });

    let controls=header.querySelector('.cv15-header-controls');
    if(!controls){controls=document.createElement('div');controls.className='cv15-header-controls';header.appendChild(controls)}
    actions.forEach(btn=>controls.appendChild(btn));

    const card=findStatusCard();
    const buttons=statusButtons(card);
    const label=document.createElement('label');
    label.className='cv15-status';
    label.innerHTML='<span>Status</span><select id="cv15Status"><option value="all orders">All Orders</option><option value="new">New</option><option value="in process">In Process</option><option value="completed">Completed</option><option value="delivered">Delivered</option><option value="shipped">Shipped</option></select>';
    controls.appendChild(label);
    label.querySelector('select').onchange=e=>{
      const wanted=e.target.value;
      const button=buttons.find(btn=>lower(btn.textContent).replace(/\(.*?\)/g,'').trim().includes(wanted));
      if(button)button.click();
    };

    const logo=document.createElement('img');
    logo.className='cv15-page-logo';logo.src='images/CajunVeteran 3D Print Logo.png';logo.alt='CajunVeteran 3D Printing';
    controls.appendChild(logo);
    if(card)card.classList.add('cv15-remove-status');
  }

  function fixText(){
    const refresh=document.querySelector('#refreshBtn,#refreshOrders,.cv15-action-refresh');
    if(refresh)refresh.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0 1.3 4.4M20 4v7h-7"/></svg><span>Refresh</span>';
    const newOrder=document.querySelector('#newOrderBtn,.cv15-action-new');if(newOrder)newOrder.textContent='New Order';
    const add=document.getElementById('addLine');if(add)add.textContent='+ Add Item';
    document.querySelectorAll('[data-remove-line],[data-remove-color]').forEach(el=>el.textContent='X');
    document.querySelectorAll('footer,.site-footer').forEach(el=>el.textContent='CajunVeteran Workshop Management | Built by a Veteran');
  }

  function removePalettes(){
    [...document.querySelectorAll('h1,h2,h3,h4,.card-title,.panel-title,strong')].filter(el=>lower(el.textContent)==='color palette').forEach(el=>{
      const panel=el.closest('section,article,.card,.panel,.v7-card')||el.parentElement;
      if(panel)panel.remove();
    });
  }

  function markWorkspace(){
    const search=document.getElementById('orderSearch');
    const form=document.getElementById('orderForm');
    if(!search||!form)return;
    const list=search.closest('section,article,.card,.panel,.v7-card')||search.parentElement;
    const editor=form.closest('section,article,.card,.panel,.v7-card')||form.parentElement;
    list?.classList.add('cv15-orders-list');editor?.classList.add('cv15-order-editor');
    let p=list?.parentElement;
    while(p&&p!==document.body&&!p.contains(editor))p=p.parentElement;
    if(p&&p!==document.body)p.classList.add('cv15-workspace');
  }

  function makeGroupsCollapsible(){
    const host=document.getElementById('ordersGrouped');if(!host)return;
    [...host.children].forEach(group=>{
      const heading=group.querySelector(':scope > header,:scope > .status-head,:scope > .group-head');
      if(!heading||heading.dataset.cv15)return;
      heading.dataset.cv15='1';heading.classList.add('cv15-group-head');
      const name=lower(heading.textContent);
      const body=[...group.children].find(c=>c!==heading);
      if(!body)return;
      body.classList.add('cv15-group-body');
      const defaultOpen=name.includes('new');
      group.classList.toggle('cv15-open',defaultOpen);
      heading.onclick=()=>group.classList.toggle('cv15-open');
    });
  }

  function updateKpis(){
    const cards=[...document.querySelectorAll('.kpi,.v7-kpi,.metric-card,.stat-card')].slice(0,3);
    const vals=[
      ['New Orders',orders.filter(o=>lower(o.status)==='new').length],
      ['In Process',orders.filter(o=>['in process','in_process'].includes(lower(o.status))).length],
      ['Ready',orders.filter(o=>lower(o.status)==='completed').length]
    ];
    cards.forEach((card,i)=>{if(!vals[i])return;card.classList.add('cv15-kpi');card.innerHTML=`<span>${vals[i][0]}</span><strong>${vals[i][1]}</strong>`});
  }

  async function loadCounts(){
    try{if(window.CVDB){const d=typeof CVDB.loadDashboard==='function'?await CVDB.loadDashboard():await CVDB.load({force:true});orders=d.orders||[];updateKpis()}}catch(e){console.warn('KPI load skipped',e)}
  }

  function run(){document.body.classList.add('cv-update15');cleanHeader();fixText();removePalettes();markWorkspace();makeGroupsCollapsible();loadCounts()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  const observer=new MutationObserver(()=>{fixText();removePalettes();markWorkspace();makeGroupsCollapsible()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
