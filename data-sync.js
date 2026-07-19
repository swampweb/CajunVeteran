/* CajunVeteran file-backed data sync
   Purpose: keep the existing site working while making data.json the source of truth.
   - On localhost server: reads/writes data.json through /api/kv
   - On GitHub Pages: reads data.json so phone can see the same data; writes are browser-only because GitHub Pages cannot save files.
*/
(function(){
  if (window.__cvDataSyncLoaded) return;
  window.__cvDataSyncLoaded = true;

  const KEYS = {
    store: 'inventory_orders_store_v9',
    woodJobs: 'cv_woodworking_jobs_v1',
    woodItems: 'cv_woodworking_items_v1',
    woodMaterials: 'cv_woodworking_material_inventory_v1'
  };
  const DEFAULT_DATA = {
    version: 2,
    items: [],
    orders: [],
    colors: [],
    woodworkingJobs: [],
    woodworkingItems: [],
    woodworkingMaterialInventory: []
  };
  const rawSetItem = localStorage.setItem.bind(localStorage);
  const rawGetItem = localStorage.getItem.bind(localStorage);
  let apiWriteAvailable = false;
  let syncing = false;

  function safeParse(value, fallback){
    try { return JSON.parse(value); } catch { return fallback; }
  }
  function syncXhr(method, url, body){
    try {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, false);
      if (body) xhr.setRequestHeader('Content-Type','application/json');
      xhr.send(body ? JSON.stringify(body) : null);
      if (xhr.status >= 200 && xhr.status < 300) return xhr.responseText;
    } catch(e) {}
    return null;
  }
  function normalizeData(data){
    data = Object.assign({}, DEFAULT_DATA, data || {});
    if (!Array.isArray(data.items)) data.items = [];
    if (!Array.isArray(data.orders)) data.orders = [];
    if (!Array.isArray(data.colors)) data.colors = [];
    if (!Array.isArray(data.woodworkingJobs)) data.woodworkingJobs = [];
    if (!Array.isArray(data.woodworkingItems)) data.woodworkingItems = [];
    if (!Array.isArray(data.woodworkingMaterialInventory)) data.woodworkingMaterialInventory = [];
    return data;
  }
  function dataToKv(data){
    data = normalizeData(data);
    return {
      [KEYS.store]: JSON.stringify({items:data.items, orders:data.orders, colors:data.colors}),
      [KEYS.woodJobs]: JSON.stringify(data.woodworkingJobs),
      [KEYS.woodItems]: JSON.stringify(data.woodworkingItems),
      [KEYS.woodMaterials]: JSON.stringify(data.woodworkingMaterialInventory)
    };
  }
  function kvToData(){
    const store = safeParse(rawGetItem(KEYS.store), {items:[],orders:[],colors:[]});
    return normalizeData({
      version: 2,
      items: Array.isArray(store.items) ? store.items : [],
      orders: Array.isArray(store.orders) ? store.orders : [],
      colors: Array.isArray(store.colors) ? store.colors : [],
      woodworkingJobs: safeParse(rawGetItem(KEYS.woodJobs), []),
      woodworkingItems: safeParse(rawGetItem(KEYS.woodItems), []),
      woodworkingMaterialInventory: safeParse(rawGetItem(KEYS.woodMaterials), [])
    });
  }
  function hydrateFromData(data){
    syncing = true;
    const kv = dataToKv(data);
    for (const [k,v] of Object.entries(kv)) rawSetItem(k,v);
    syncing = false;
  }
  function getInitialData(){
    // Preferred for local server because this endpoint returns confirmed data.json content.
    const kvText = syncXhr('GET','/api/kv');
    if (kvText) {
      const result = safeParse(kvText, null);
      if (result && result.ok && result.data) {
        apiWriteAvailable = true;
        return result.data;
      }
    }
    // GitHub Pages/static fallback: read data.json if uploaded to repo root.
    const dataText = syncXhr('GET','data.json');
    if (dataText) return safeParse(dataText, DEFAULT_DATA);
    // Last fallback: keep whatever is already in this browser.
    return kvToData();
  }
  function persistToFile(){
    if (syncing) return;
    const data = kvToData();
    if (apiWriteAvailable) {
      fetch('/api/kv', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({data}),
        keepalive: true
      }).catch(err => console.warn('CajunVeteran data.json save failed:', err));
    } else {
      console.warn('CajunVeteran is running without a write API. Data.json can be read but not saved on this host. Use localhost server.js or a backend for saving.');
    }
  }

  // Load file-backed data before the rest of the app initializes.
  hydrateFromData(getInitialData());

  // Patch localStorage writes made by existing app code so they persist to data.json.
  localStorage.setItem = function(key, value){
    rawSetItem(key, value);
    if ([KEYS.store, KEYS.woodJobs, KEYS.woodItems, KEYS.woodMaterials].includes(key)) persistToFile();
  };

  window.CajunVeteranDataSync = {
    keys: KEYS,
    exportData: kvToData,
    reloadFromFile: function(){ hydrateFromData(getInitialData()); },
    saveToFile: persistToFile,
    writeApi: function(){ return apiWriteAvailable; }
  };
})();
