/* CajunVeteran Public View Layout Update v1
   Use after existing index.html scripts:
   <script src="index-layout-update.js?v=public-layout1"></script>
*/
(function(){
  if (window.__cvIndexLayoutUpdateLoaded) return;
  window.__cvIndexLayoutUpdateLoaded = true;

  function addStyle(){
    if(document.getElementById('cvIndexLayoutStyle')) return;
    const style=document.createElement('style');
    style.id='cvIndexLayoutStyle';
    style.textContent=`
      body.public-clean{background:radial-gradient(circle at 25% 0%,rgba(47,128,237,.10),transparent 28%),radial-gradient(circle at 80% 20%,rgba(201,130,50,.12),transparent 32%),#06111e!important;}
      .public-topbar-clean{min-height:104px!important;height:auto!important;background:linear-gradient(90deg,#06111e,#0b2136 55%,#06111e)!important;border-bottom:2px solid #f0b429!important;box-shadow:0 10px 28px rgba(0,0,0,.35)!important;}
      .public-name-clean{color:#f0b429!important}.public-sub-clean{color:#f8ead0!important;letter-spacing:.12em!important}.public-title-clean strong{color:#f0b429!important}.public-title-clean span{color:#dce8f6!important}
      .public-date{display:none!important;}
      .cv-app-nav{max-width:1500px;margin:0 auto;padding:10px 14px 0;display:flex;gap:10px;flex-wrap:wrap}
      .cv-app-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 14px;border:1px solid rgba(86,142,198,.55);background:#10283f;color:#e8eef7;text-decoration:none;border-radius:9px;font-weight:900;letter-spacing:.01em}
      .cv-app-nav a:hover{border-color:#f0b429;color:#ffd36a}.cv-app-nav a.active{background:linear-gradient(135deg,rgba(240,180,41,.24),rgba(201,130,50,.18));border-color:rgba(240,180,41,.7);color:#ffd36a}
      .public-shell-clean{display:block!important;max-width:1500px!important;margin:0 auto!important;padding:18px 14px 20px!important}.public-sidebar-clean{display:none!important}.public-main-clean{width:100%!important}
      .public-hero h1{color:#f0b429!important;text-transform:uppercase!important;letter-spacing:.04em!important;font-size:24px!important}.public-hero p{color:#b0bfd2!important}
      .public-kpis-clean{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:14px!important}.public-kpi-clean{min-height:102px!important;border-radius:10px!important;border:1px solid rgba(86,142,198,.72)!important;background:linear-gradient(135deg,rgba(12,36,58,.98),rgba(8,27,46,.98))!important}.public-kpi-icon{font-size:30px!important;width:54px!important;height:54px!important;min-width:54px!important;border-radius:12px!important;background:rgba(240,180,41,.10)!important;border:1px solid rgba(240,180,41,.42)!important}.public-kpi-clean strong{color:#ffd36a!important;font-size:30px!important}.public-kpi-clean b{font-size:13px!important}.public-kpi-clean span,.public-kpi-clean em{font-size:12px!important;color:#b0bfd2!important}
      .public-card-clean{border-radius:10px!important;border:1px solid rgba(86,142,198,.75)!important;background:linear-gradient(180deg,rgba(9,32,55,.96),rgba(7,25,44,.96))!important}.public-card-clean h2{color:#f0b429!important;border-bottom:1px solid rgba(86,142,198,.35)!important}.public-card-clean h2 span{color:#9fb0c4!important}
      .public-chip{border-radius:8px!important;border-color:rgba(86,142,198,.55)!important;background:#10283f!important;color:#e8eef7!important}.public-chip:hover{border-color:#f0b429!important;color:#ffd36a!important}.public-chip.active,.public-chip.active.all{background:linear-gradient(135deg,rgba(240,180,41,.24),rgba(201,130,50,.18))!important;border-color:rgba(240,180,41,.7)!important;color:#ffd36a!important}
      .product-card,.showcase-card{border-radius:12px!important;border:1px solid rgba(86,142,198,.45)!important;background:linear-gradient(180deg,#0c243a,#081c30)!important}.product-info h3,.showcase-info h3{color:#fff!important}.product-price{color:#ffd36a!important;font-weight:900!important}
      .stock-in,.status-completed,.status-delivered{background:#10b981!important;color:#fff!important}.stock-low,.status-in_progress,.status-approved,.status-quote{background:#c98232!important;color:#071321!important}.stock-out{background:#ef4444!important;color:#fff!important}.status-delivered{background:#065f46!important;color:#fff!important}
      .public-table-clean th{background:#071321!important;color:#dce8f6!important}.public-table-clean tr:hover td{background:rgba(240,180,41,.055)!important}.empty-public{border-color:rgba(86,142,198,.5)!important;background:rgba(8,22,36,.75)!important;color:#9fb0c4!important}.site-footer{border-top-color:#f0b429!important;color:#9fb0c4!important}
      @media(max-width:1200px){.public-kpis-clean{grid-template-columns:repeat(2,minmax(0,1fr))!important}.public-grid-two{grid-template-columns:1fr!important}}
      @media(max-width:760px){.cv-app-nav a{flex:1 1 auto}.public-kpis-clean{grid-template-columns:1fr!important}.public-topbar-clean{align-items:flex-start!important;flex-direction:column!important}.public-logo-clean{height:64px!important}.public-name-clean{font-size:26px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureNav(){
    if(document.querySelector('.cv-app-nav')) return;
    const nav=document.createElement('nav');
    nav.className='cv-app-nav';
    nav.innerHTML=`
      <a href="dashboard.html">Dashboard</a>
      <a href="admin.html#orders">3D Printing</a>
      <a href="woodworking.html#jobs">Woodworking</a>
      <a href="reports.html">Reports</a>
      <a href="mobile.html">Mobile</a>
      <a class="active" href="index.html">Public View</a>
    `;
    const header=document.querySelector('.public-topbar-clean');
    if(header) header.insertAdjacentElement('afterend',nav);
  }

  function cleanLabels(){
    document.title='CajunVeteran Workshop Management — Public View';
    const sub=document.querySelector('.public-sub-clean'); if(sub) sub.textContent='Public View';
    const strong=document.querySelector('.public-title-clean strong'); if(strong) strong.textContent='PUBLIC VIEW';
    const span=document.querySelector('.public-title-clean span'); if(span) span.textContent='Products, completed work, and customer-facing showcase.';
    const footer=document.querySelector('.site-footer'); if(footer) footer.textContent='★ CajunVeteran Workshop • Public View • Built With Pride ★';
  }

  function renameAdminLinks(){
    document.querySelectorAll('a[href="admin.html"],a[href="admin.html#orders"]').forEach(a=>{
      if((a.textContent||'').toLowerCase().includes('admin')) a.innerHTML='🖨️ 3D Printing';
    });
  }

  function init(){
    addStyle();
    ensureNav();
    cleanLabels();
    renameAdminLinks();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,250);
  setTimeout(init,1000);
})();
