/* CajunVeteran Supabase Data Bridge
   Loads/saves the full Workshop database object from Supabase public.app_data id='main'.
   This preserves the current app structure and keeps existing localStorage-based pages working.
*/
(function(){
  if (window.__cvSupabaseDataBridgeLoaded) return;
  window.__cvSupabaseDataBridgeLoaded = true;

  const SUPABASE_URL = 'https://fprbzavehflzqcmxvbxx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qjEyGhgiTpQKs-ti6yt3iQ_-AKzm3Qw';
  const APP_ROW_ID = 'main';

  const STORE_KEY = 'inventory_orders_store_v9';
  const WOOD_JOBS_KEY = 'cv_woodworking_jobs_v1';
  const WOOD_ITEMS_KEY = 'cv_woodworking_items_v1';
  const WOOD_MATERIALS_KEY = 'cv_woodworking_material_inventory_v1';
  const MANAGED_KEYS = [STORE_KEY, WOOD_JOBS_KEY, WOOD_ITEMS_KEY, WOOD_MATERIALS_KEY];

  const DEFAULT_DATA = {
    version: 2,
    items: [],
    orders: [],
    colors: [],
    woodworkingJobs: [],
    woodworkingItems: [],
    woodworkingMaterialInventory: []
  };

  const rawGetItem = localStorage.getItem.bind(localStorage);
  const rawSetItem = localStorage.setItem.bind(localStorage);
  const rawRemoveItem = localStorage.removeItem.bind(localStorage);
  let suppressSave = false;
  let saveTimer = null;

  function safeParse(value, fallback){
    try { return JSON.parse(value); } catch(e) { return fallback; }
  }
  function normalizeData(data){
    data = Object.assign({}, DEFAULT_DATA, data || {});
    for (const key of ['items','orders','colors','woodworkingJobs','woodworkingItems','woodworkingMaterialInventory']) {
      if (!Array.isArray(data[key])) data[key] = [];
    }
    data.version = data.version || 2;
    return data;
  }
  function isUsefulData(data){
    data = normalizeData(data);
    return data.items.length || data.orders.length || data.colors.length || data.woodworkingJobs.length || data.woodworkingItems.length || data.woodworkingMaterialInventory.length;
  }
  function dataToLocalStorage(data){
    data = normalizeData(data);
    suppressSave = true;
    rawSetItem(STORE_KEY, JSON.stringify({ items:data.items, orders:data.orders, colors:data.colors }));
    rawSetItem(WOOD_JOBS_KEY, JSON.stringify(data.woodworkingJobs));
    rawSetItem(WOOD_ITEMS_KEY, JSON.stringify(data.woodworkingItems));
    rawSetItem(WOOD_MATERIALS_KEY, JSON.stringify(data.woodworkingMaterialInventory));
    suppressSave = false;
  }
  function localStorageToData(){
    const store = safeParse(rawGetItem(STORE_KEY), {items:[], orders:[], colors:[]});
    return normalizeData({
      version: 2,
      items: Array.isArray(store.items) ? store.items : [],
      orders: Array.isArray(store.orders) ? store.orders : [],
      colors: Array.isArray(store.colors) ? store.colors : [],
      woodworkingJobs: safeParse(rawGetItem(WOOD_JOBS_KEY), []),
      woodworkingItems: safeParse(rawGetItem(WOOD_ITEMS_KEY), []),
      woodworkingMaterialInventory: safeParse(rawGetItem(WOOD_MATERIALS_KEY), [])
    });
  }
  function supabaseHeaders(extra){
    return Object.assign({
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json'
    }, extra || {});
  }
  function xhr(method, url, body, extraHeaders){
    try {
      const req = new XMLHttpRequest();
      req.open(method, url, false);
      const headers = supabaseHeaders(extraHeaders);
      Object.keys(headers).forEach(k => req.setRequestHeader(k, headers[k]));
      req.send(body ? JSON.stringify(body) : null);
      if (req.status >= 200 && req.status < 300) return req.responseText || '';
      console.warn('Supabase request failed:', method, url, req.status, req.responseText);
    } catch(e) {
      console.warn('Supabase request error:', e);
    }
    return null;
  }
  function readSupabaseDataSync(){
    const url = SUPABASE_URL + '/rest/v1/app_data?id=eq.' + encodeURIComponent(APP_ROW_ID) + '&select=data';
    const text = xhr('GET', url, null, { Prefer: 'return=representation' });
    if (!text) return null;
    const rows = safeParse(text, []);
    if (Array.isArray(rows) && rows[0] && rows[0].data) return normalizeData(rows[0].data);
    return null;
  }
  function upsertSupabaseDataSync(data){
    data = normalizeData(data);
    const url = SUPABASE_URL + '/rest/v1/app_data?on_conflict=id';
    return xhr('POST', url, [{ id: APP_ROW_ID, data, updated_at: new Date().toISOString() }], {
      Prefer: 'resolution=merge-duplicates,return=minimal'
    });
  }
  async function saveSupabaseDataAsync(data){
    data = normalizeData(data);
    const url = SUPABASE_URL + '/rest/v1/app_data?on_conflict=id';
    const res = await fetch(url, {
      method: 'POST',
      headers: supabaseHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify([{ id: APP_ROW_ID, data, updated_at: new Date().toISOString() }])
    });
    if (!res.ok) {
      const msg = await res.text().catch(()=>String(res.status));
      throw new Error('Supabase save failed: ' + msg);
    }
  }
  function queueSave(){
    if (suppressSave) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const data = localStorageToData();
      saveSupabaseDataAsync(data).then(() => {
        window.__cvSupabaseLastSave = new Date().toISOString();
      }).catch(err => {
        console.warn('CajunVeteran Supabase save failed. Browser copy was kept.', err);
      });
    }, 250);
  }
  function tryLoadDataJsonSync(){
    try {
      const req = new XMLHttpRequest();
      req.open('GET', 'data.json', false);
      req.send(null);
      if (req.status >= 200 && req.status < 300) {
        return normalizeData(safeParse(req.responseText, DEFAULT_DATA));
      }
    } catch(e) {}
    return null;
  }

  // Initial hydration order:
  // 1. Supabase app_data main row
  // 2. data.json beside the site, if Supabase is empty
  // 3. current browser storage, if both are empty
  let initialData = readSupabaseDataSync();
  if (!isUsefulData(initialData)) {
    const fileData = tryLoadDataJsonSync();
    if (isUsefulData(fileData)) {
      initialData = fileData;
      dataToLocalStorage(initialData);
      upsertSupabaseDataSync(initialData);
    }
  }
  if (!isUsefulData(initialData)) initialData = localStorageToData();
  dataToLocalStorage(initialData);

  // Patch storage writes from existing pages so old code automatically updates Supabase.
  localStorage.setItem = function(key, value){
    rawSetItem(key, value);
    if (MANAGED_KEYS.includes(key)) queueSave();
  };
  localStorage.removeItem = function(key){
    rawRemoveItem(key);
    if (MANAGED_KEYS.includes(key)) queueSave();
  };

  window.CajunVeteranSupabase = {
    exportData: localStorageToData,
    saveNow: function(){ return saveSupabaseDataAsync(localStorageToData()); },
    reload: function(){ const data = readSupabaseDataSync(); dataToLocalStorage(data || DEFAULT_DATA); return data; },
    keys: { STORE_KEY, WOOD_JOBS_KEY, WOOD_ITEMS_KEY, WOOD_MATERIALS_KEY },
    url: SUPABASE_URL
  };
})();
