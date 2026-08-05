(function(){
const page=(location.pathname.split('/').pop()||'dashboard.html').toLowerCase();
const icons={
dashboard:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 3l9 8.5V21h-6v-6H9v6H3z"/></svg>',
orders:'<svg viewBox="0 0 24 24"><path d="M7 4h10v3h3v14H4V7h3zM9 5.5h6M8 11h8M8 15h8M8 19h5"/></svg>',
box:'<svg viewBox="0 0 24 24"><path d="m4 7 8-4 8 4-8 4zM4 7v10l8 4 8-4V7M12 11v10"/></svg>',
palette:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h1.2a2 2 0 0 0 1.8-2.8l-.2-.4a2 2 0 0 1 1.8-2.8H18a3 3 0 0 0 3-3c0-5-4-9-9-9zM7.5 10h.01M10 6.8h.01M14 6.8h.01M17 10h.01"/></svg>',
hammer:'<svg viewBox="0 0 24 24"><path d="m14 5 5 5M12 7l5-5 5 5-5 5M3 21l9-9 3 3-9 9z"/></svg>',
wood:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 5v14M16 5v14M4 10h16M4 15h16"/></svg>',
layers:'<svg viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/></svg>',
warning:'<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20zM12 9v5M12 18h.01"/></svg>',
chart:'<svg viewBox="0 0 24 24"><path d="M4 20V9M10 20V4M16 20v-7M22 20H2"/></svg>',
gear:'<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 12H2M22 12h-2M12 4V2M12 22v-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4"/></svg>'};
const groups=[['',[['dashboard.html','dashboard','Dashboard']]],['3D PRINTING',[['print-orders.html','orders','Orders'],['print-items.html','box','Items'],['colors.html','palette','Colors / Filament']]],['WOODWORKING',[['woodworking-jobs.html','hammer','Jobs'],['woodworking-items.html','wood','Items']]],['INVENTORY',[['inventory.html','layers','Materials'],['inventory.html#low','warning','Low Stock']]],['',[['reports.html','chart','Reports'],['settings.html','gear','Settings']]]];
function run(){['css/v7-update01.css','css/v7-update02.css','css/v7-update03.css'].forEach(h=>{if(!document.querySelector(`link[href="${h}"]`)){const l=document.createElement('link');l.rel='stylesheet';l.href=h;document.head.appendChild(l)}});document.querySelectorAll('.sidebar,.cv-sidebar,.v7-sidebar').forEach(x=>x.remove());document.body.classList.add('v7-ready');document.body.insertAdjacentHTML('afterbegin',`<aside class="v7-sidebar"><div class="v7-brand"><img src="images/apple-touch-icon.png" alt="CajunVeteran"><div class="v7-brand-name">CajunVeteran</div><div class="v7-brand-sub">Workshop</div></div>${groups.map(([t,ls])=>`${t?`<div class="v7-nav-title">${t}</div>`:''}<nav class="v7-nav-list">${ls.map(([h,k,l])=>`<a class="v7-nav-link ${page===h.split('#')[0]?'active':''}" href="${h}"><span class="v7-nav-icon">${icons[k]}</span><span>${l}</span></a>`).join('')}</nav>`).join('')}<div class="v7-veteran-mark">⚜<span>CAJUN<br>VETERAN</span></div></aside>`)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();window.initNavigation=function(){};
})();
