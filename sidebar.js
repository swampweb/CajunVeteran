/* CajunVeteran Workshop shared sidebar navigation - clean version
   Renders a focused sidebar per page.
*/
(function(){
  if(window.__cvSharedSidebarLoadedV2) return;
  window.__cvSharedSidebarLoadedV2 = true;

  const NAVS = {
    dashboard: [
      ['🏠','Dashboard','dashboard.html'],
      ['🖨️','3D Print Orders','admin.html#orders'],
      ['🪵','Woodworking Jobs','woodworking.html#jobs'],
      ['📊','Reports','reports.html'],
      ['📱','Tablet','tablet.html'],
      ['🌐','Public','index.html']
    ],
    admin: [
      ['🖨️','Orders','#orders'],
      ['🎨','Colors','#colors'],
      ['📦','Items','#items'],
      ['💾','Backup','#backup'],
      ['🏠','Dashboard','dashboard.html'],
      ['📊','Reports','reports.html'],
      ['🪵','Woodworking','woodworking.html#jobs'],
      ['📱','Tablet','tablet.html'],
      ['🌐','Public','index.html']
    ],
    wood: [
      ['🪵','Jobs','#jobs'],
      ['🧰','Woodworking Items','#woodItems'],
      ['🪚','Materials','#materialInventory'],
      ['🧹','Files','#fileManagement'],
      ['🏠','Dashboard','dashboard.html'],
      ['📊','Reports','reports.html'],
      ['🖨️','Admin','admin.html#orders'],
      ['📱','Tablet','tablet.html'],
      ['🌐','Public','index.html']
    ],
    reports: [
      ['📊','Reports','reports.html'],
      ['🏠','Dashboard','dashboard.html'],
      ['🖨️','3D Print Orders','admin.html#orders'],
      ['🪵','Woodworking Jobs','woodworking.html#jobs'],
      ['📱','Tablet','tablet.html'],
      ['🌐','Public','index.html']
    ],
    default: [
      ['🏠','Dashboard','dashboard.html'],
      ['🖨️','3D Print Orders','admin.html#orders'],
      ['🪵','Woodworking Jobs','woodworking.html#jobs'],
      ['📊','Reports','reports.html'],
      ['📱','Tablet','tablet.html'],
      ['🌐','Public','index.html']
    ]
  };

  function pageKey(){
    const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    if(page==='dashboard.html') return 'dashboard';
    if(page==='admin.html') return 'admin';
    if(page==='woodworking.html') return 'wood';
    if(page==='reports.html') return 'reports';
    return 'default';
  }
  function active(href){
    const page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    const hash=location.hash||'';
    if(href.startsWith('#')) return hash===href || (!hash && href==='#dashboard');
    const parts=href.split('#');
    const hrefPage=(parts[0]||'').toLowerCase();
    const hrefHash=parts[1]?'#'+parts[1]:'';
    if(page!==hrefPage) return false;
    if(!hrefHash) return true;
    return hash===hrefHash || (!hash && page==='dashboard.html' && hrefPage==='dashboard.html');
  }
  function ensureCss(){
    if(document.getElementById('cvSharedSidebarCleanCss')) return;
    const css=document.createElement('style');
    css.id='cvSharedSidebarCleanCss';
    css.textContent=`
      #sharedSidebar{padding:14px 12px!important;}
      #sharedSidebar .mock-nav,#sharedSidebar .nav{margin-bottom:9px!important;min-height:48px!important;border-bottom-color:rgba(86,142,198,.16)!important;}
      #sharedSidebar .mock-nav{font-size:16px!important;padding:13px 14px!important;}
      #sharedSidebar .nav{font-size:16px!important;padding:13px 14px!important;}
      #sharedSidebar .mock-nav span{font-size:20px!important;min-width:24px!important;}
      #sharedSidebar .shared-sidebar-motto{margin-top:auto;text-align:center;border:1px solid rgba(240,180,41,.25);border-radius:8px;padding:14px 10px;color:#cbd5e1;background:rgba(240,180,41,.045)}
      #sharedSidebar .shared-sidebar-motto div,#sharedSidebar .shared-sidebar-motto strong{color:var(--accent,#f0b429)}
      #sharedSidebar .shared-sidebar-motto p{margin:6px 0 0;font-size:13px;line-height:1.35}
      @media(max-width:1000px){#sharedSidebar .shared-sidebar-motto{display:none!important;}}
    `;
    document.head.appendChild(css);
  }
  function render(sidebar){
    ensureCss();
    const key=pageKey();
    const style=sidebar.dataset.navStyle || (sidebar.classList.contains('mock-sidebar')?'admin':'wood');
    const linkClass=style==='admin'?'mock-nav':'nav';
    const items=NAVS[key]||NAVS.default;
    sidebar.innerHTML=items.map(([icon,text,href])=>{
      const cls=linkClass+(active(href)?' active':'');
      return style==='admin'?`<a class="${cls}" href="${href}"><span>${icon}</span>${text}</a>`:`<a class="${cls}" href="${href}">${icon} ${text}</a>`;
    }).join('')+`<div class="shared-sidebar-motto"><div>★</div><p><strong>CajunVeteran Workshop</strong><br/>Built With Pride</p></div>`;
  }
  function openHashTarget(){
    const hash=location.hash;
    if(!hash) return;
    const target=document.querySelector(hash);
    if(target && target.tagName && target.tagName.toLowerCase()==='details') target.open=true;
    if(hash==='#fileManagement'){
      document.getElementById('cvCleanupPanel')?.setAttribute('open','');
      document.getElementById('jobFilesCleanupPanel')?.setAttribute('open','');
    }
  }
  function init(){document.querySelectorAll('#sharedSidebar,[data-shared-sidebar]').forEach(render);openHashTarget();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.addEventListener('hashchange',init);
})();
