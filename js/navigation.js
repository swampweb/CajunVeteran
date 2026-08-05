(function(){
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function iconSvg(label, color1, color2, glyph){
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color1}"/><stop offset="1" stop-color="${color2}"/></linearGradient></defs>
      <rect x="5" y="5" width="54" height="54" rx="15" fill="#17110a" stroke="#dca95c" stroke-width="3"/>
      <circle cx="32" cy="32" r="20" fill="url(#g)" opacity=".96"/>
      <text x="32" y="39" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-size="20" font-weight="900" fill="#fff7df">${glyph}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }

  const navIcons = {
    dashboard: iconSvg('Dashboard','#dca95c','#8b4f12','D'),
    orders: iconSvg('Orders','#d04027','#7b1b14','O'),
    printItems: iconSvg('Print Items','#2c6fa3','#0d2940','3D'),
    colors: iconSvg('Colors','#f0b429','#7b4b10','C'),
    jobs: iconSvg('Jobs','#9b6810','#3c2508','J'),
    woodItems: iconSvg('Wood Items','#8b5a2b','#2b1608','W'),
    materials: iconSvg('Materials','#5f7f34','#223312','M'),
    low: iconSvg('Low Stock','#a33a31','#4b1010','!'),
    reports: iconSvg('Reports','#5a6f8f','#15233a','R'),
    settings: iconSvg('Settings','#dca95c','#6b4210','S')
  };

  const groups = [
    ['', [['index.html','dashboard','Dashboard']]],
    ['3D PRINTING', [['print-orders.html','orders','Orders'], ['print-items.html','printItems','Items'], ['colors.html','colors','Colors / Filament']]],
    ['WOODWORKING', [['woodworking-jobs.html','jobs','Jobs'], ['woodworking-items.html','woodItems','Items']]],
    ['INVENTORY', [['inventory.html','materials','Materials'], ['inventory.html#low','low','Low Stock']]],
    ['', [['reports.html','reports','Reports'], ['settings.html','settings','Settings']]]
  ];

  function activeFor(href){
    const clean = href.split('#')[0].toLowerCase();
    if ((page === 'index.html' || page === 'dashboard.html') && clean === 'index.html') return true;
    if (page === 'inventory.html' && href.toLowerCase().includes('#low')) return location.hash === '#low';
    return page === clean;
  }

  function run(){
    document.querySelectorAll('.sidebar,.cv-sidebar,.v7-sidebar').forEach(el => el.remove());
    document.body.classList.add('v7-ready');
    const html = `<aside class="v7-sidebar image-nav-sidebar">
      <div class="v7-brand">
        <img src="images/apple-touch-icon.png" alt="CajunVeteran">
        <div class="v7-brand-name">CajunVeteran</div>
        <div class="v7-brand-sub">Workshop</div>
      </div>
      <nav>${groups.map(([title, links]) => `${title ? `<div class="v7-nav-title">${title}</div>` : ''}<div class="v7-nav-list">${links.map(([href,key,label]) => `<a class="v7-nav-link ${activeFor(href) ? 'active' : ''}" href="${href}"><span class="v7-img-icon"><img src="${navIcons[key]}" alt=""></span><span>${label}</span></a>`).join('')}</div>`).join('')}</nav>
    </aside>`;
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.initNavigation = function(){};
})();
