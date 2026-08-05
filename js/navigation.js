(function(){
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const icon = {
    dashboard:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z"/></svg>',
    orders:'<svg viewBox="0 0 24 24"><path d="M7 4h10v3h3v14H4V7h3zM9 4v4h6V4M8 12h8M8 16h8"/></svg>',
    items:'<svg viewBox="0 0 24 24"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
    colors:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0 0 18h1.3a2 2 0 0 0 1.8-2.8 2 2 0 0 1 1.8-2.8H18a3 3 0 0 0 3-3c0-5-4-9-9-9zM7.5 10h.01M10 7h.01M14 7h.01M17 10h.01"/></svg>',
    jobs:'<svg viewBox="0 0 24 24"><path d="m14 5 5 5M12 7l5-5 5 5-5 5M3 21l9-9 3 3-9 9z"/></svg>',
    wooditems:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 5v14M16 5v14M4 10h16M4 15h16"/></svg>',
    materials:'<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>',
    low:'<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20zM12 9v5M12 18h.01"/></svg>',
    reports:'<svg viewBox="0 0 24 24"><path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12H2M22 12h-2M12 4V2M12 22v-2"/></svg>'
  };
  const groups = [
    ['', [['index.html','dashboard','Dashboard']]],
    ['3D PRINTING', [['print-orders.html','orders','Orders'], ['print-items.html','items','Items'], ['colors.html','colors','Colors / Filament']]],
    ['WOODWORKING', [['woodworking-jobs.html','jobs','Jobs'], ['woodworking-items.html','wooditems','Items']]],
    ['INVENTORY', [['inventory.html','materials','Materials'], ['inventory.html#low','low','Low Stock']]],
    ['', [['reports.html','reports','Reports'], ['settings.html','settings','Settings']]]
  ];
  function activeFor(href){
    const clean = href.split('#')[0].toLowerCase();
    if ((page === 'index.html' || page === 'dashboard.html') && clean === 'index.html') return true;
    return page === clean || (page === 'inventory.html' && href.toLowerCase().includes('#low') && location.hash === '#low');
  }
  function run(){
    document.querySelectorAll('.sidebar,.cv-sidebar,.v7-sidebar').forEach(el => el.remove());
    document.body.classList.add('v7-ready');
    const html = `<aside class="v7-sidebar">
      <div class="v7-brand"><img src="images/apple-touch-icon.png" alt="CajunVeteran"><div class="v7-brand-name">CajunVeteran</div><div class="v7-brand-sub">Workshop</div></div>
      <nav>${groups.map(([title, links]) => `${title ? `<div class="v7-nav-title">${title}</div>` : ''}<div class="v7-nav-list">${links.map(([href,key,label]) => `<a class="v7-nav-link ${activeFor(href) ? 'active' : ''}" href="${href}"><span class="v7-nav-icon">${icon[key] || ''}</span><span>${label}</span></a>`).join('')}</div>`).join('')}</nav>
    </aside>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.initNavigation = function(){};
})();
