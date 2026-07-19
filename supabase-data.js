/* CajunVeteran Supabase Data Bridge - Phase 1
   Single-source sync bridge for GitHub Pages.
   Existing pages can keep using their current load/save functions, but the managed
   data is hydrated from Supabase and every managed write is pushed back to Supabase.
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
    ['items','orders','colors','woodworkingJobs','woodworkingItems','woodworkingMaterialInventory'].forEach(key => {
      if (!Array.isArray(data[key])) data[key] = [];
    });
    data.version = data.version || 2;
    return data;
  }

  function isUsefulData(data){
    data = normalizeData(data);
    return !!(data.items.length || data.orders.length || data.colors.length || data.woodworkingJobs.length || data.woodworkingItems.length || data.woodworkingMaterialInventory.length);
  }

  function recordKey(record, fields){
    for (const field of fields){
      if (record && record[field] !== undefined && record[field] !== null && String(record[field]).trim() !== '') {
        return field + ':' + String(record[field]).trim().toLowerCase();
      }
    }
    return 'auto:' + JSON.stringify(record || {});
  }

  function mergeArray(remoteArr, localArr, fields){
    const map = new Map();
    (Array.isArray(remoteArr) ? remoteArr : []).forEach(rec => map.set(recordKey(rec, fields), rec));
    (Array.isArray(localArr) ? localArr : []).forEach(rec => {
      const key = recordKey(rec, fields);
      if (!map.has(key)) map.set(key, rec);
      // Phase 1 rule: for matching records, keep the Supabase copy to avoid stale browser edits overwriting another device.
      // Local-only records such as newly-created jobs are still added and saved to Supabase.
    });
    return Array.from(map.values());
  }

  function mergeData(remoteData, localData){
    remoteData = normalizeData(remoteData);
    localData = normalizeData(localData);
    return normalizeData({
      version: Math.max(Number(remoteData.version || 2), Number(localData.version || 2), 2),
      items: mergeArray(remoteData.items, localData.items, ['sku','id','name']),
      orders: mergeArray(remoteData.orders, localData.orders, ['orderId','id']),
      colors: mergeArray(remoteData.colors, localData.colors, ['id','color','name']),
      woodworkingJobs: mergeArray(remoteData.woodworkingJobs, localData.woodworkingJobs, ['id','jobId']),
      woodworkingItems: mergeArray(remoteData.woodworkingItems, localData.woodworkingItems, ['id','itemId','name']),
      woodworkingMaterialInventory: mergeArray(remoteData.woodworkingMaterialInventory, localData.woodworkingMaterialInventory, ['id','name'])
    });
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

  // Initial load order:
  // 1) Supabase app_data main row.
  // 2) data.json, if Supabase is empty.
  // 3) Current browser storage.
  // All sources are merged, so local-only records like W1003 are preserved and pushed into Supabase.
  const remoteData = readSupabaseDataSync();
  let fileData = null;
  if (!isUsefulData(remoteData)) fileData = tryLoadDataJsonSync();
  const localData = localStorageToData();
  let initialData = mergeData(remoteData || fileData || DEFAULT_DATA, localData);

  if (!isUsefulData(initialData)) initialData = normalizeData(DEFAULT_DATA);
  dataToLocalStorage(initialData);

  // If browser local storage added records not yet in Supabase, push the merge immediately.
  upsertSupabaseDataSync(initialData);

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
    reload: function(){ const data = readSupabaseDataSync(); const merged = mergeData(data || DEFAULT_DATA, localStorageToData()); dataToLocalStorage(merged); upsertSupabaseDataSync(merged); return merged; },
    mergeNow: function(){ const merged = mergeData(readSupabaseDataSync() || DEFAULT_DATA, localStorageToData()); dataToLocalStorage(merged); return saveSupabaseDataAsync(merged); },
    keys: { STORE_KEY, WOOD_JOBS_KEY, WOOD_ITEMS_KEY, WOOD_MATERIALS_KEY },
    url: SUPABASE_URL
  };

  window.loadAppData = function(){ return window.CajunVeteranSupabase.exportData(); };
  window.saveAppData = function(data){ dataToLocalStorage(data); return window.CajunVeteranSupabase.saveNow(); };
})();
