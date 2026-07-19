/* CajunVeteran 3D Printing Layout Update v1
   Use after existing admin.html scripts:
   <script src="admin-layout-update.js?v=print-layout1"></script>
*/
(function(){
  if (window.__cvAdminLayoutUpdateLoaded) return;
  window.__cvAdminLayoutUpdateLoaded = true;

  function addStyle(){
    if(document.getElementById('cvAdminLayoutStyle')) return;
    const style=document.createElement('style');
    style.id='cvAdminLayoutStyle';
    style.textContent=`
      body.admin-mockup-v4{background:radial-gradient(circle at 25% 0%,rgba(47,128,237,.10),transparent 28%),radial-gradient(circle at 80% 20%,rgba(201,130,50,.12),transparent 32%),#06111e!important;}
      body.admin-mockup-v4 .mock-topbar{min-height:104px!important;height:auto!important;background:linear-gradient(90deg,#06111e,#0b2136 55%,#06111e)!important;border-bottom:2px solid #f0b429!important;box-shadow:0 10px 28px rgba(0,0,0,.35)!important;}
      body.admin-mockup-v4 .mock-name{color:#f0b429!important}body.admin-mockup-v4 .mock-sub{color:#f8ead0!important;letter-spacing:.12em!important}body.admin-mockup-v4 .mock-title strong{color:#f0b429!important}body.admin-mockup-v4 .mock-title span{color:#dce8f6!important}
      body.admin-mockup-v4 .mock-top-actions,body.admin-mockup-v4 .admin-close-site{display:none!important;}
      .cv-app-nav{max-width:1500px;margin:0 auto;padding:10px 14px 0;display:flex;gap:10px;flex-wrap:wrap}
      .cv-app-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 14px;border:1px solid rgba(86,142,198,.55);background:#10283f;color:#e8eef7;text-decoration:none;border-radius:9px;font-weight:900;letter-spacing:.01em}
      .cv-app-nav a:hover{border-color:#f0b429;color:#ffd36a}.cv-app-nav a.active{background:linear-gradient(135deg,rgba(240,180,41,.24),rgba(201,130,50,.18));border-color:rgba(240,180,41,.7);color:#ffd36a}
      body.admin-mockup-v4 .mock-shell{display:block!important;max-width:1500px!important;margin:0 auto!important;padding:18px 14px 20px!important}body.admin-mockup-v4 .mock-sidebar{display:none!important}body.admin-mockup-v4 .mock-main{width:100%!important}.mock-motto{display:none!important}
      .admin-title-card{margin-top:0!important}.admin-title-text h1{color:#f0b429!important;text-transform:uppercase!important;letter-spacing:.04em!important}
      body.admin-mockup-v4 .mock-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:14px!important}.mock-kpi{min-height:102px!important;height:auto!important;border-radius:10px!important;border:1px solid rgba(86,142,198,.72)!important;background:linear-gradient(135deg,rgba(12,36,58,.98),rgba(8,27,46,.98))!important}.kpi-icon{font-size:30px!important;width:54px!important;height:54px!important;min-width:54px!important;border-radius:12px!important;background:rgba(240,180,41,.10)!important;border:1px solid rgba(240,180,41,.42)!important}.mock-kpi strong{color:#ffd36a!important;font-size:30px!important}.mock-kpi b{font-size:13px!important}.mock-kpi span,.mock-kpi em{font-size:12px!important;color:#b0bfd2!important}
      .mock-card{border-radius:10px!important;border:1px solid rgba(86,142,198,.75)!important;background:linear-gradient(180deg,rgba(9,32,55,.96),rgba(7,25,44,.96))!important}.mock-card>h2,.mock-card summary{border-bottom:1px solid rgba(86,142,198,.35)!important}.mock-card h2,.mock-card summary h2{color:#f0b429!important}.admin-section-label{border-color:rgba(240,180,41,.48)!important;background:rgba(240,180,41,.12)!important;color:#ffd36a!important}
      .btn-secondary,.save-order,.item-save-btn,.mock-card button{border-radius:8px!important}.save-order,.item-save-btn{background:linear-gradient(135deg,#f0b429,#e5a91f)!important;color:#071321!important;border:0!important;font-weight:900!important}
      .badge{font-weight:900!important;border:1px solid rgba(255,255,255,.12)!important;min-width:74px;text-align:center;text-transform:uppercase}.warn{background:#c98232!important;color:#071321!important;border-color:#f0b429!important}.ok{background:#10b981!important;color:#fff!important;border-color:#6ee7b7!important}.muted{background:#7c3aed!important;color:#fff!important;border-color:#a78bfa!important}.red{color:#a78bfa!important}.kpi-icon.red{background:rgba(124,58,237,.12)!important;border-color:#a78bfa!important;color:#c4b5fd!important}
      .tab-labels label{border-color:rgba(86,142,198,.55)!important;background:#10283f!important;color:#e8eef7!important}.tab-labels label:hover{border-color:#f0b429!important;color:#ffd36a!important}
      .adminOrdersTable{table-layout:auto!important;min-width:1050px!important}.adminOrdersTable th,.adminOrdersTable td{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.adminOrdersTable th:nth-child(6),.adminOrdersTable td:nth-child(6){max-width:180px!important}.adminOrdersTable th:nth-child(9),.adminOrdersTable td:nth-child(9){text-align:center!important}.adminOrdersTable th:last-child,.adminOrdersTable td:last-child{text-align:center!important}
      .order-files-box{border-radius:14px!important;border-color:rgba(240,180,41,.6)!important}.order-files-box h3{color:#f0b429!important}.order-files-close{background:#ef4444!important}
      .site-footer{border-top-color:#f0b429!important;color:#9fb0c4!important}
      @media(max-width:1200px){body.admin-mockup-v4 .mock-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}body.admin-mockup-v4 .mock-lower{grid-template-columns:1fr!important}}
      @media(max-width:760px){.cv-app-nav a{flex:1 1 auto}body.admin-mockup-v4 .mock-kpis{grid-template-columns:1fr!important}body.admin-mockup-v4 .mock-topbar{align-items:flex-start!important;flex-direction:column!important}.mock-logo{height:64px!important}.mock-name{font-size:26px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureNav(){
    if(document.querySelector('.cv-app-nav')) return;
    const nav=document.createElement('nav');
    nav.className='cv-app-nav';
    nav.innerHTML=`
      <a href="dashboard.html">Dashboard</a>
      <a class="active" href="admin.html#orders">3D Printing</a>
      <a href="woodworking.html#jobs">Woodworking</a>
      <a href="reports.html">Reports</a>
      <a href="mobile.html">Mobile</a>
    `;
    const header=document.querySelector('.mock-topbar');
    if(header) header.insertAdjacentElement('afterend',nav);
  }

  function cleanLabels(){
    document.title='CajunVeteran Workshop Management — 3D Printing';
    const sub=document.querySelector('.mock-sub'); if(sub) sub.textContent='3D Printing';
    const strong=document.querySelector('.mock-title strong'); if(strong) strong.textContent='3D PRINTING';
    const span=document.querySelector('.mock-title span'); if(span) span.textContent='Orders, inventory items, colors, files, and backups.';
    const orders=document.querySelector('.mock-orders-card h2'); if(orders) orders.childNodes[0].nodeValue='3D Printing Orders ';
    document.querySelectorAll('a.mock-nav[href="admin.html#orders"]').forEach(a=>a.innerHTML='🖨️ 3D Printing');
    const footer=document.querySelector('.site-footer'); if(footer) footer.textContent='★ CajunVeteran Workshop • 3D Printing • Built With Pride ★';
  }

  function recolorStatusCells(){
    document.querySelectorAll('.adminOrdersTable tbody tr').forEach(tr=>{
      const statusCell=tr.children && tr.children[3];
      if(!statusCell) return;
      const text=(statusCell.textContent||'').trim().toLowerCase();
      if(text.includes('new')) statusCell.style.color='#9ed0ff';
      if(text.includes('process')) statusCell.style.color='#ffd36a';
      if(text.includes('completed') || text.includes('ready')) statusCell.style.color='#6ee7b7';
      if(text.includes('shipped') || text.includes('delivered')) statusCell.style.color='#c4b5fd';
      statusCell.style.fontWeight='900';
    });
  }

  function patchRenderAdminTables(){
    if(typeof window.renderAdminTables==='function' && !window.renderAdminTables.__cvAdminLayoutWrapped){
      const old=window.renderAdminTables;
      window.renderAdminTables=function(){const r=old.apply(this,arguments);setTimeout(recolorStatusCells,0);return r;};
      window.renderAdminTables.__cvAdminLayoutWrapped=true;
    }
  }

  function init(){
    addStyle();
    ensureNav();
    cleanLabels();
    patchRenderAdminTables();
    recolorStatusCells();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,250);
  setTimeout(init,1000);
})();
