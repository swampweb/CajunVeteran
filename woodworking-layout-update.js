/* CajunVeteran Woodworking Layout Update v1
   Use after existing woodworking scripts:
   <script src="woodworking-layout-update.js?v=wood-layout1"></script>
*/
(function(){
  if (window.__cvWoodLayoutUpdateLoaded) return;
  window.__cvWoodLayoutUpdateLoaded = true;

  function addStyle(){
    if(document.getElementById('cvWoodLayoutStyle')) return;
    const style=document.createElement('style');
    style.id='cvWoodLayoutStyle';
    style.textContent=`
      body{background:radial-gradient(circle at 25% 0%,rgba(47,128,237,.10),transparent 28%),radial-gradient(circle at 80% 20%,rgba(201,130,50,.12),transparent 32%),#06111e!important;}
      .topbar{min-height:104px!important;height:auto!important;background:linear-gradient(90deg,#06111e,#0b2136 55%,#06111e)!important;border-bottom:2px solid #f0b429!important;box-shadow:0 10px 28px rgba(0,0,0,.35)!important;}
      .name{color:#f0b429!important}.sub{color:#f8ead0!important}.title strong{color:#f0b429!important}.title span{color:#dce8f6!important}
      .top-actions,.wood-close-site{display:none!important;}
      .cv-app-nav{max-width:1500px;margin:0 auto;padding:10px 14px 0;display:flex;gap:10px;flex-wrap:wrap}
      .cv-app-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 14px;border:1px solid rgba(86,142,198,.55);background:#10283f;color:#e8eef7;text-decoration:none;border-radius:9px;font-weight:900;letter-spacing:.01em}
      .cv-app-nav a:hover{border-color:#f0b429;color:#ffd36a}.cv-app-nav a.active{background:linear-gradient(135deg,rgba(240,180,41,.24),rgba(201,130,50,.18));border-color:rgba(240,180,41,.7);color:#ffd36a}
      .shell{display:block!important;max-width:1500px!important;margin:0 auto!important;padding:18px 14px 20px!important}.sidebar{display:none!important}.main{width:100%!important}.motto{display:none!important}
      .wood-title-card{margin-top:0!important}.wood-title-text h1{color:#f0b429!important;text-transform:uppercase!important;letter-spacing:.04em!important}
      .kpis{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}.kpi{min-height:102px!important;height:auto!important;border-radius:10px!important;border:1px solid rgba(86,142,198,.72)!important}.kpi-icon{font-size:30px!important;width:54px!important;height:54px!important;min-width:54px!important;border-radius:12px!important;background:rgba(240,180,41,.10)!important;border:1px solid rgba(240,180,41,.42)!important}.kpi strong{color:#ffd36a!important;font-size:30px!important}.kpi b{font-size:13px!important}.kpi span,.kpi em{font-size:12px!important;color:#b0bfd2!important}
      .card{border-radius:10px!important;border:1px solid rgba(86,142,198,.75)!important;background:linear-gradient(180deg,rgba(9,32,55,.96),rgba(7,25,44,.96))!important}.card>h2,.card summary{border-bottom:1px solid rgba(86,142,198,.35)!important}.card h2,.card summary h2{color:#f0b429!important}
      .btn,.row-btn,.wood-status-chip{border-radius:8px!important}.save{background:linear-gradient(135deg,#f0b429,#e5a91f)!important;color:#071321!important;border:0!important;border-radius:8px!important}
      .badge{font-weight:900!important;border:1px solid rgba(255,255,255,.12)!important;min-width:86px;text-align:center;text-transform:uppercase}.danger-badge{background:#374151!important;color:#e5e7eb!important;border-color:#6b7280!important}.warn{background:#c98232!important;color:#071321!important;border-color:#f0b429!important}.ok{background:#10b981!important;color:#fff!important;border-color:#6ee7b7!important}.muted-badge{background:#065f46!important;color:#fff!important;border-color:#10b981!important}.status-approved{background:#1d4ed8!important;color:#fff!important;border-color:#60a5fa!important}
      .wood-status-chip[data-wood-status="quote"]{border-color:#6b7280!important;color:#e5e7eb!important}.wood-status-chip[data-wood-status="approved"]{border-color:#60a5fa!important;color:#8ec5ff!important}.wood-status-chip[data-wood-status="in_progress"]{border-color:#f0b429!important;color:#ffd36a!important}.wood-status-chip[data-wood-status="completed"]{border-color:#6ee7b7!important;color:#6ee7b7!important}.wood-status-chip[data-wood-status="delivered"]{border-color:#10b981!important;color:#34d399!important}
      #jobs table{table-layout:auto!important;min-width:1050px!important}#jobs th,#jobs td{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}#jobs th:nth-child(6),#jobs td:nth-child(6){max-width:130px!important}#jobs th:nth-child(8),#jobs td:nth-child(8){width:90px!important;text-align:center!important}#jobs th:nth-child(10),#jobs td:nth-child(10),#jobs th:nth-child(11),#jobs td:nth-child(11){text-align:center!important}
      .note-modal-dialog{border-radius:14px!important;border-color:rgba(240,180,41,.6)!important}.note-modal-dialog h3{color:#f0b429!important}.note-modal-close{background:#ef4444!important}
      .site-footer{border-top-color:#f0b429!important;color:#9fb0c4!important}
      @media(max-width:1200px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:760px){.cv-app-nav a{flex:1 1 auto}.kpis{grid-template-columns:1fr!important}.topbar{align-items:flex-start!important;flex-direction:column!important}.logo{height:64px!important}.name{font-size:26px!important}}
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
      <a class="active" href="woodworking.html#jobs">Woodworking</a>
      <a href="reports.html">Reports</a>
      <a href="mobile.html">Mobile</a>
    `;
    const header=document.querySelector('.topbar');
    if(header) header.insertAdjacentElement('afterend',nav);
  }

  function cleanLabels(){
    document.title='CajunVeteran Workshop Management — Woodworking';
    const sub=document.querySelector('.sub'); if(sub) sub.textContent='Woodworking';
    const strong=document.querySelector('.title strong'); if(strong) strong.textContent='WOODWORKING';
    const span=document.querySelector('.title span'); if(span) span.textContent='Custom projects, job details, materials, files, and plaque work.';
    document.querySelectorAll('a.nav[href="admin.html#orders"]').forEach(a=>a.innerHTML='🖨️ 3D Printing');
    const footer=document.querySelector('.site-footer'); if(footer) footer.textContent='★ CajunVeteran Workshop • Woodworking • Built With Pride ★';
  }

  function recolorApprovedRows(){
    document.querySelectorAll('#jobsTable .badge').forEach(b=>{
      if((b.textContent||'').trim().toLowerCase()==='approved') b.classList.add('status-approved');
    });
  }

  function patchRenderJobs(){
    if(typeof window.renderJobs==='function' && !window.renderJobs.__cvWoodLayoutWrapped){
      const old=window.renderJobs;
      window.renderJobs=function(){const r=old.apply(this,arguments);setTimeout(recolorApprovedRows,0);return r;};
      window.renderJobs.__cvWoodLayoutWrapped=true;
    }
  }

  function init(){
    addStyle();
    ensureNav();
    cleanLabels();
    patchRenderJobs();
    recolorApprovedRows();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  setTimeout(init,250);
  setTimeout(init,1000);
})();
