(function(){
  if((location.pathname.split('/').pop()||'').toLowerCase()!=='settings.html')return;
  const key='cv_wood_low_stock_threshold';
  const value=Math.max(1,Number(localStorage.getItem(key)||5));
  function install(){
    if(document.getElementById('woodStockSettings'))return;
    const host=document.querySelector('.v7-container,.settings-page,main');
    if(!host)return;
    const section=document.createElement('section');
    section.id='woodStockSettings';
    section.className='v7-card wood-stock-settings';
    section.innerHTML=`<div class="v7-card-head"><h2>Woodworking Stock Levels</h2></div><div class="v7-card-body"><label>Low Stock Threshold<input id="woodLowStockThreshold" type="number" min="1" step="1" value="${value}"></label><p>Quantity 0 is Out of Stock. Quantity 1 through this number is Low Stock. Higher quantities are In Stock.</p><button class="btn primary" type="button" id="saveWoodStockThreshold">Save Threshold</button><span id="woodStockSaved" class="wood-stock-saved"></span></div>`;
    host.appendChild(section);
    document.getElementById('saveWoodStockThreshold').onclick=()=>{
      const threshold=Math.max(1,Number(document.getElementById('woodLowStockThreshold').value||1));
      localStorage.setItem(key,String(threshold));
      document.getElementById('woodLowStockThreshold').value=threshold;
      const status=document.getElementById('woodStockSaved');status.textContent='Saved';setTimeout(()=>status.textContent='',1500);
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
