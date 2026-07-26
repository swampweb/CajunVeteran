/* CajunVeteran Woodworking Layout Update v4
   Drop-in replacement for woodworking-layout-update.js.
   HTML does NOT need to change if woodworking.html already has:
   <script src="woodworking-layout-update.js"></script>

   Fixes:
   - status changes showing locally but reverting after Dashboard reloads Supabase
   - Delivered not sticking
   - old duplicate submit handlers fighting each other
   - fallback navigation missing Public View
   - #jobs / #orders anchor jump behavior
*/
(function(){
  if (window.__cvWoodLayoutUpdateV4Loaded) return;
  window.__cvWoodLayoutUpdateV4Loaded = true;

  const SUPABASE_URL = 'https://fprbzavehflzqcmxvbxx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qjEyGhgiTpQKs-ti6yt3iQ_-AKzm3Qw';
  const PRINT_KEY = 'inventory_orders_store_v9';
  const JOBS_KEY = 'cv_woodworking_jobs_v1';
  const ITEMS_KEY = 'cv_woodworking_items_v1';
  const MATERIAL_KEY = 'cv_woodworking_material_inventory_v1';

  const $ = id => document.getElementById(id);
  const val = id => ($(id)?.value || '').trim();
  const checked = id => !!$(id)?.checked;
  const moneyNum = v => Number(v || 0) || 0;

  function addStyle(){
    let style = document.getElementById('cvWoodLayoutStyle');
    if(!style){
      style = document.createElement('style');
      style.id = 'cvWoodLayoutStyle';
      document.head.appendChild(style);
    }
    style.textContent = `
      body{background:radial-gradient(circle at 25% 0%,rgba(47,128,237,.10),transparent 28%),radial-gradient(circle at 80% 20%,rgba(201,130,50,.12),transparent 32%),#06111e!important;}
      .topbar{min-height:104px!important;height:auto!important;background:linear-gradient(90deg,#06111e,#0b2136 55%,#06111e)!important;border-bottom:2px solid #f0b429!important;box-shadow:0 10px 28px rgba(0,0,0,.35)!important;}
      .name{color:#f0b429!important}.sub{color:#f8ead0!important}.title strong{color:#f0b429!important}.title span{color:#dce8f6!important}
      .top-actions,.wood-close-site{display:none!important;}
      .cv-app-nav{max-width:1500px;margin:0 auto;padding:10px 14px 0;display:flex;gap:10px;flex-wrap:wrap}
      .cv-app-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 14px;border:1px solid rgba(86,142,198,.55);background:#10283f;color:#e8eef7;text-decoration:none;border-radius:9px;font-weight:900;letter-spacing:.01em}
      .cv-app-nav a:hover{border-color:#f0b429;color:#ffd36a}.cv-app-nav a.active{background:linear-gradient(135deg,rgba(240,180,41,.24),rgba(201,130,50,.18));border-color:rgba(240,180,41,.7);color:#ffd36a}
      .shell{display:block!important;max-width:1500px!important;margin:0 auto!important;padding:18px 14px 20px!important}.sidebar{display:none!important}.main{width:100%!important}.motto{display:none!important}
      .kpis{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important}.kpi{min-height:102px!important;height:auto!important;border-radius:10px!important;border:1px solid rgba(86,142,198,.72)!important}.kpi-icon{font-size:30px!important;width:54px!important;height:54px!important;min-width:54px!important;border-radius:12px!important;background:rgba(240,180,41,.10)!important;border:1px solid rgba(240,180,41,.42)!important}.kpi strong{color:#ffd36a!important;font-size:30px!important}.kpi b{font-size:13px!important}.kpi span,.kpi em{font-size:12px!important;color:#b0bfd2!important}
      .card{border-radius:10px!important;border:1px solid rgba(86,142,198,.75)!important;background:linear-gradient(180deg,rgba(9,32,55,.96),rgba(7,25,44,.96))!important}.card>h2,.card summary{border-bottom:1px solid rgba(86,142,198,.35)!important}.card h2,.card summary h2{color:#f0b429!important}
      .btn,.row-btn,.wood-status-chip{border-radius:8px!important}.save{background:linear-gradient(135deg,#f0b429,#e5a91f)!important;color:#071321!important;border:0!important;border-radius:8px!important}
      .badge{font-weight:900!important;border:1px solid rgba(255,255,255,.12)!important;min-width:86px;text-align:center;text-transform:uppercase}.danger-badge{background:#374151!important;color:#e5e7eb!important;border-color:#6b7280!important}.warn{background:#c98232!important;color:#071321!important;border-color:#f0b429!important}.ok{background:#10b981!important;color:#fff!important;border-color:#6ee7b7!important}.muted-badge{background:#065f46!important;color:#fff!important;border-color:#10b981!important}.status-approved{background:#1d4ed8!important;color:#fff!important;border-color:#60a5fa!important}
      .wood-status-chip[data-wood-status="quote"]{border-color:#6b7280!important;color:#e5e7eb!important}.wood-status-chip[data-wood-status="approved"]{border-color:#60a5fa!important;color:#8ec5ff!important}.wood-status-chip[data-wood-status="in_progress"]{border-color:#f0b429!important;color:#ffd36a!important}.wood-status-chip[data-wood-status="completed"]{border-color:#6ee7b7!important;color:#6ee7b7!important}.wood-status-chip[data-wood-status="delivered"]{border-color:#10b981!important;color:#34d399!important}
      #jobs table{table-layout:auto!important;min-width:1050px!important}#jobs th,#jobs td{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}#jobs th:nth-child(6),#jobs td:nth-child(6){max-width:130px!important}#jobs th:nth-child(8),#jobs td:nth-child(8){width:90px!important;text-align:center!important}#jobs th:nth-child(10),#jobs td:nth-child(10),#jobs th:nth-child(11),#jobs td:nth-child(11){text-align:center!important}
      .note-modal-dialog{border-radius:14px!important;border-color:rgba(240,180,41,.6)!important}.note-modal-dialog h3{color:#f0b429!important}.note-modal-close{background:#ef4444!important}.site-footer{border-top-color:#f0b429!important;color:#9fb0c4!important}
      @media(max-width:1200px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
      @media(max-width:760px){.cv-app-nav a{flex:1 1 auto}.kpis{grid-template-columns:1fr!important}.topbar{align-items:flex-start!important;flex-direction:column!important}.logo{height:64px!important}.name{font-size:26px!important}}
    `;
  }

  function ensureNav(){
    document.querySelectorAll('.cv-app-nav').forEach(n=>n.remove());
    const nav = document.createElement('nav');
    nav.className = 'cv-app-nav';
    nav.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <a href="admin.html">3D Printing</a>
      <a class="active" href="woodworking.html">Woodworking</a>
      <a href="reports.html">Reports</a>
      <a href="mobile.html">Mobile</a>
      <a href="index.html">Public View</a>
    `;
    const header = document.querySelector('.topbar');
    if(header) header.insertAdjacentElement('afterend', nav);
  }

  function cleanLabels(){
    document.title = 'CajunVeteran Workshop Management - Woodworking';
    const sub = document.querySelector('.sub'); if(sub) sub.textContent = 'Woodworking';
    const strong = document.querySelector('.title strong'); if(strong) strong.textContent = 'WOODWORKING';
    const span = document.querySelector('.title span'); if(span) span.textContent = 'Custom projects, job details, materials, files, and plaque work.';
    document.querySelectorAll('a.nav[href="admin.html#orders"],a.nav[href="admin.html"]').forEach(a=>a.innerHTML='🖨️ 3D Printing');
    const footer = document.querySelector('.site-footer'); if(footer) footer.textContent = '★ CajunVeteran Workshop • Woodworking • Built With Pride ★';
  }

  function recolorApprovedRows(){
    document.querySelectorAll('#jobsTable .badge').forEach(b=>{
      if((b.textContent||'').trim().toLowerCase()==='approved') b.classList.add('status-approved');
    });
  }

  function patchRenderJobs(){
    if(typeof window.renderJobs === 'function' && !window.renderJobs.__cvWoodLayoutWrappedV4){
      const old = window.renderJobs;
      window.renderJobs = function(){
        const r = old.apply(this, arguments);
        setTimeout(recolorApprovedRows, 0);
        return r;
      };
      window.renderJobs.__cvWoodLayoutWrappedV4 = true;
    }
  }

  function readJsonStorage(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
  }

  function buildSupabasePayloadFromLocal(){
    const printStore = readJsonStorage(PRINT_KEY, {items:[],orders:[],colors:[]});
    return {
      version: 2,
      items: Array.isArray(printStore.items) ? printStore.items : [],
      orders: Array.isArray(printStore.orders) ? printStore.orders : [],
      colors: Array.isArray(printStore.colors) ? printStore.colors : [],
      woodworkingJobs: readJsonStorage(JOBS_KEY, []),
      woodworkingItems: readJsonStorage(ITEMS_KEY, []),
      woodworkingMaterialInventory: readJsonStorage(MATERIAL_KEY, [])
    };
  }

  async function pushSupabaseNow(){
    const payload = buildSupabasePayloadFromLocal();
    const res = await fetch(SUPABASE_URL + '/rest/v1/app_data?on_conflict=id', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify([{id:'main', data:payload, updated_at:new Date().toISOString()}])
    });
    if(!res.ok) throw new Error('Supabase save failed: ' + res.status);
    localStorage.setItem('cv_last_supabase_push', new Date().toISOString());
    return true;
  }

  function safeLoadJobs(){
    if(typeof window.loadJobs === 'function') return window.loadJobs();
    return readJsonStorage(JOBS_KEY, []);
  }

  function safeSaveJobs(jobs){
    if(typeof window.saveJobs === 'function') return window.saveJobs(jobs);
    localStorage.setItem(JOBS_KEY, JSON.stringify(jobs || []));
  }

  function safeNextJobId(){
    if(typeof window.nextJobId === 'function') return window.nextJobId();
    const nums = safeLoadJobs().map(j=>Number(String(j.jobId||'').replace(/\D/g,''))).filter(n=>!isNaN(n));
    return 'W' + String((nums.length ? Math.max(...nums) : 1000) + 1);
  }

  function getMaterialUses(){ return typeof window.getJobMaterialUses === 'function' ? window.getJobMaterialUses() : []; }
  function materialUseTotal(uses){ return typeof window.jobMaterialUseTotal === 'function' ? window.jobMaterialUseTotal(uses || []) : 0; }
  function applyMaterialDelta(oldUses, newUses){ if(typeof window.applyMaterialUseDelta === 'function') window.applyMaterialUseDelta(oldUses || [], newUses || []); }
  function getPlaqueRows(){
    if(typeof window.getPlaques === 'function') return window.getPlaques();
    const p = {name:val('plaqueName'), rank:val('plaqueRank'), monthPromoted:val('plaqueMonthPromoted')};
    return (p.name || p.rank || p.monthPromoted) ? [p] : [];
  }
  function calculatedTotal(){ return typeof window.getCalculatedJobTotal === 'function' ? window.getCalculatedJobTotal() : moneyNum($('total')?.value); }

  async function uploadNewJobFiles(jobId){
    const input = $('jobInfoFiles');
    if(!input || !input.files || !input.files.length) return [];
    const fd = new FormData();
    Array.from(input.files).forEach(file=>fd.append('files', file));
    fd.append('jobId', jobId || 'job');
    const res = await fetch('/api/upload-job-file', {method:'POST', body:fd});
    let data = {};
    try { data = await res.json(); } catch {}
    if(!res.ok || data.ok === false) throw new Error(data.error || 'Job file upload failed. Job was not saved.');
    return Array.isArray(data.files) ? data.files : [];
  }

  function currentJobFiles(oldJob){
    if(Array.isArray(window.__woodCurrentJobFiles)) return window.__woodCurrentJobFiles.slice();
    if(oldJob && Array.isArray(oldJob.files)) return oldJob.files.slice();
    return [];
  }

  function buildJobRecord(id, oldJob, uploadedFiles){
    const materialUses = getMaterialUses();
    const plaques = getPlaqueRows();
    const firstPlaque = plaques[0] || {};
    return {
      id,
      jobId: val('jobId') || safeNextJobId(),
      customer: val('customer'),
      sourceItemId: $('jobItemSelect')?.value || '',
      project: val('project'),
      status: $('status')?.value || oldJob?.status || 'quote',
      dueDate: $('dueDate')?.value || '',
      woodType: val('woodType'),
      finish: val('finish'),
      dimensions: val('dimensions'),
      materialUses,
      jobMaterialCost: materialUseTotal(materialUses),
      plaques,
      total: calculatedTotal(),
      paid: checked('paid'),
      materialPurchased: !!oldJob?.materialPurchased,
      plaqueName: firstPlaque.name || val('plaqueName'),
      plaqueRank: firstPlaque.rank || val('plaqueRank'),
      plaqueMonthPromoted: firstPlaque.monthPromoted || val('plaqueMonthPromoted'),
      notes: val('notes'),
      files: [...currentJobFiles(oldJob), ...(uploadedFiles || [])]
    };
  }

  function refreshAfterSave(){
    try { if(typeof window.clearForm === 'function') window.clearForm(); } catch(e){console.warn(e);}
    try { if(typeof window.renderJobFileEditorList === 'function') window.renderJobFileEditorList([]); } catch(e){console.warn(e);}
    try { const input = $('jobInfoFiles'); if(input) input.value = ''; } catch {}
    try { if(typeof window.renderJobs === 'function') window.renderJobs(); } catch(e){console.warn(e);}
    try { if(typeof window.renderMaterialInventory === 'function') window.renderMaterialInventory(); } catch(e){console.warn(e);}
    try { const formCard = $('formCard'); if(formCard?.tagName?.toLowerCase() === 'details') formCard.open = false; } catch {}
    try { $('jobs')?.scrollIntoView({behavior:'smooth', block:'start'}); } catch {}
  }

  async function fixedWoodFormSave(e){
    const form = e.target && e.target.closest ? e.target.closest('#woodForm') : null;
    if(!form) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const jobs = safeLoadJobs();
    const id = val('editId') || String(Date.now());
    const oldJob = jobs.find(j=>String(j.id) === String(id));
    let uploadedFiles = [];
    try { uploadedFiles = await uploadNewJobFiles(val('jobId') || oldJob?.jobId || id); }
    catch(err){ alert(err.message || 'Job file upload failed.'); return; }

    const record = buildJobRecord(id, oldJob, uploadedFiles);
    applyMaterialDelta(oldJob?.materialUses || [], record.materialUses || []);

    const idx = jobs.findIndex(j=>String(j.id) === String(id));
    if(idx >= 0) jobs[idx] = record;
    else jobs.push(record);

    safeSaveJobs(jobs);

    // This is the critical part: Dashboard reads Supabase, so push before navigating away.
    try { await pushSupabaseNow(); }
    catch(err){ console.warn('Direct Supabase push failed after woodworking save', err); }

    refreshAfterSave();
  }

  function installSaveFix(){
    if(window.__cvWoodSaveFixInstalledV4) return;
    window.__cvWoodSaveFixInstalledV4 = true;
    document.addEventListener('submit', fixedWoodFormSave, true);
  }

  function installSaveJobsBridge(){
    if(window.__cvSaveJobsSupabaseBridgeV4) return;
    if(typeof window.saveJobs !== 'function') return;
    window.__cvSaveJobsSupabaseBridgeV4 = true;
    const original = window.saveJobs;
    window.saveJobs = function(jobs){
      const r = original.apply(this, arguments);
      pushSupabaseNow().catch(err=>console.warn('Supabase push failed after saveJobs', err));
      return r;
    };
  }

  function init(){
    addStyle();
    ensureNav();
    cleanLabels();
    patchRenderJobs();
    recolorApprovedRows();
    installSaveJobsBridge();
    installSaveFix();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 250);
  setTimeout(init, 1000);
})();
