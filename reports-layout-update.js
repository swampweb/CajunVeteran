/* CajunVeteran Reports Layout Update v1
   Use after existing reports.html scripts:
   <script src="reports-layout-update.js?v=reports-layout1"></script>
*/
(function(){
  if (window.__cvReportsLayoutUpdateLoaded) return;
  window.__cvReportsLayoutUpdateLoaded = true;

  function addStyle(){
    if(document.getElementById('cvReportsLayoutStyle')) return;
    const style=document.createElement('style');
    style.id='cvReportsLayoutStyle';
    style.textContent=`
      body.reports-page{background:radial-gradient(circle at 25% 0%,rgba(47,128,237,.10),transparent 28%),radial-gradient(circle at 80% 20%,rgba(201,130,50,.12),transparent 32%),#06111e!important;}
      .reports-topbar{min-height:104px!important;height:auto!important;background:linear-gradient(90deg,#06111e,#0b2136 55%,#06111e)!important;border-bottom:2px solid #f0b429!important;box-shadow:0 10px 28px rgba(0,0,0,.35)!important;}
      .reports-name{color:#f0b429!important}.reports-sub{color:#f8ead0!important;letter-spacing:.12em!important}.reports-title strong{color:#f0b429!important}.reports-title span{color:#dce8f6!important}
      .reports-topnav{display:none!important;}
      .cv-app-nav{max-width:1500px;margin:0 auto;padding:10px 14px 0;display:flex;gap:10px;flex-wrap:wrap}
      .cv-app-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 14px;border:1px solid rgba(86,142,198,.55);background:#10283f;color:#e8eef7;text-decoration:none;border-radius:9px;font-weight:900;letter-spacing:.01em}
      .cv-app-nav a:hover{border-color:#f0b429;color:#ffd36a}.cv-app-nav a.active{background:linear-gradient(135deg,rgba(240,180,41,.24),rgba(201,130,50,.18));border-color:rgba(240,180,41,.7);color:#ffd36a}
      .reports-shell{display:block!important;max-width:1500px!important;margin:0 auto!important;padding:18px 14px 20px!important}.mock-sidebar{display:none!important}.reports-main{width:100%!important}
      .reports-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:14px!important}.report-kpi{min-height:102px!important;border-radius:10px!important;border:1px solid rgba(86,142,198,.72)!important;background:linear-gradient(135deg,rgba(12,36,58,.98),rgba(8,27,46,.98))!important}.report-kpi-icon{font-size:30px!important;width:54px!important;height:54px!important;min-width:54px!important;border-radius:12px!important;background:rgba(240,180,41,.10)!important;border:1px solid rgba(240,180,41,.42)!important}.report-kpi strong{color:#ffd36a!important;font-size:30px!important}.report-kpi b{font-size:13px!important}.report-kpi span,.report-kpi em{font-size:12px!important;color:#b0bfd2!important}
      .report-card{border-radius:10px!important;border:1px solid rgba(86,142,198,.75)!important;background:linear-gradient(180deg,rgba(9,32,55,.96),rgba(7,25,44,.96))!important}.report-card h2,.report-card summary h2{color:#f0b429!important}.report-card>h2,.report-card summary{border-bottom:1px solid rgba(86,142,198,.35)!important}
      .report-actions button,.filter-actions button{border-radius:8px!important}.report-actions .primary,.filter-actions .primary{background:linear-gradient(135deg,#f0b429,#e5a91f)!important;color:#071321!important;border:0!important;font-weight:900!important}.report-actions button.print-btn{background:linear-gradient(135deg,#10b981,#6ee7b7)!important;color:#071321!important;border:0!important;font-weight:900!important}
      .filter-chip{border-color:rgba(240,180,41,.42)!important;background:rgba(240,180,41,.10)!important;color:#ffd36a!important}.filter-chip.muted{border-color:rgba(148,163,184,.35)!important;background:rgba(148,163,184,.10)!important;color:#cbd5e1!important}
      .ok-text{color:#6ee7b7!important}.warn-text{color:#ffd36a!important}.bad-text{color:#ff9b9b!important}.report-table th{background:#071321!important;color:#dce8f6!important}.report-table tr:hover td{background:rgba(240,180,41,.055)!important}.site-footer{border-top-color:#f0b429!important;color:#9fb0c4!important}
      @media(max-width:1200px){.reports-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}.report-grid{grid-template-columns:1fr!important}}
      @media(max-width:760px){.cv-app-nav a{flex:1 1 auto}.reports-kpis{grid-template-columns:1fr!important}.reports-topbar{align-items:flex-start!important;flex-direction:column!important}.reports-logo{height:64px!important}.reports-name{font-size:26px!important}}
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
      <a class="active" href="reports.html">Reports</a>
      <a href="mobile.html">Mobile</a>
    `;
    const header=document.querySelector('.reports-topbar');
    if(header) header.insertAdjacentElement('afterend',nav);
  }

  function cleanLabels(){
    document.title='CajunVeteran Workshop Management — Reports';
    const strong=document.querySelector('.reports-title strong'); if(strong) strong.textContent='REPORTS';
    const span=document.querySelector('.reports-title span'); if(span) span.textContent='3D Printing, Woodworking, Materials, and Revenue.';
    const footer=document.querySelector('.site-footer'); if(footer) footer.textContent='★ CajunVeteran Workshop Management • Reports ★';
  }

  function renameAdminLinks(){
    document.querySelectorAll('a[href="admin.html"],a[href="admin.html#orders"]').forEach(a=>{
      if((a.textContent||'').toLowerCase().includes('admin')) a.textContent='3D Printing';
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
