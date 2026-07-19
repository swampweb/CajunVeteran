/* CajunVeteran Unified Navigation Update v1
   Add this after page-specific layout scripts, before </body>:
   <script src="shared-navigation-update.js?v=nav1"></script>
*/
(function(){
  if (window.__cvUnifiedNavigationLoaded) return;
  window.__cvUnifiedNavigationLoaded = true;

  function currentPage(){
    const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (file === '' || file === 'index.html') return 'public';
    if (file === 'dashboard.html') return 'dashboard';
    if (file === 'admin.html') return 'print';
    if (file === 'woodworking.html') return 'wood';
    if (file === 'reports.html') return 'reports';
    if (file === 'mobile.html' || file === 'tablet.html') return 'mobile';
    return '';
  }

  function addStyle(){
    if (document.getElementById('cvUnifiedNavStyle')) return;
    const style = document.createElement('style');
    style.id = 'cvUnifiedNavStyle';
    style.textContent = `
      .dash-nav,.cv-app-nav,.reports-topnav,.public-sidebar-clean{display:none!important;}
      .cv-unified-nav{max-width:1500px;margin:0 auto;padding:10px 14px 0;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-start;}
      .cv-unified-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 14px;border:1px solid rgba(86,142,198,.55);background:#10283f;color:#e8eef7;text-decoration:none;border-radius:9px;font-weight:900;letter-spacing:.01em;box-shadow:0 4px 12px rgba(0,0,0,.12);}
      .cv-unified-nav a:hover{border-color:#f0b429;color:#ffd36a;background:rgba(240,180,41,.08);}
      .cv-unified-nav a.active{background:linear-gradient(135deg,rgba(240,180,41,.24),rgba(201,130,50,.18));border-color:rgba(240,180,41,.7);color:#ffd36a;}
      @media(max-width:760px){.cv-unified-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));}.cv-unified-nav a{width:100%;}}
    `;
    document.head.appendChild(style);
  }

  function findHeader(){
    return document.querySelector('.dash-topbar') ||
           document.querySelector('.mock-topbar') ||
           document.querySelector('.topbar') ||
           document.querySelector('.reports-topbar') ||
           document.querySelector('.public-topbar-clean') ||
           document.querySelector('.top');
  }

  function buildNav(){
    const active = currentPage();
    const pages = [
      ['dashboard','Dashboard','dashboard.html'],
      ['print','3D Printing','admin.html'],
      ['wood','Woodworking','woodworking.html'],
      ['reports','Reports','reports.html'],
      ['mobile','Mobile','mobile.html'],
      ['public','Public View','index.html']
    ];
    return '<nav class="cv-unified-nav">' + pages.map(([key,label,href]) => {
      return `<a class="${key===active?'active':''}" href="${href}">${label}</a>`;
    }).join('') + '</nav>';
  }

  function ensureNav(){
    document.querySelectorAll('.cv-unified-nav').forEach(n => n.remove());
    const header = findHeader();
    if (!header) return;
    header.insertAdjacentHTML('afterend', buildNav());
  }

  function renameAdminText(){
    document.querySelectorAll('a,button,span,strong,h1,h2,h3,div').forEach(el => {
      if (!el.childElementCount && /\bAdmin\b/.test(el.textContent || '') && (el.textContent || '').length < 80) {
        el.textContent = el.textContent.replace(/\bAdmin\b/g, '3D Printing');
      }
    });
  }

  function init(){
    addStyle();
    ensureNav();
    renameAdminText();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 250);
  setTimeout(init, 1000);
})();
