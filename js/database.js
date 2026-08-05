// CajunVeteran Workshop V6 - Supabase table database layer
const CVDB = (() => {
  const SUPABASE_URL = 'https://fprbzavehflzqcmxvbxx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_qjEyGhgiTpQKs-ti6yt3iQ_-AKzm3Qw';
  const BASE = `${SUPABASE_URL}/rest/v1`;
  const headers = (extra = {}) => ({
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  });

  async function request(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
      cache: 'no-store',
      ...options,
      headers: headers(options.headers || {})
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`Supabase ${options.method || 'GET'} ${path} failed: ${res.status} ${msg}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  const select = (table, query = 'select=*') => request(`/${table}?${query}`);
  const insert = (table, rows) => request(`/${table}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
  });
  const patch = (table, filter, row) => request(`/${table}?${filter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row)
  });
  const remove = (table, filter) => request(`/${table}?${filter}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' }});

  async function loadDashboard() {
    const [orders, orderLines, items, colors, woodJobs, woodItems, woodMaterials] = await Promise.all([
      select('cv_orders', 'select=*&order=order_date.desc'),
      select('cv_order_lines', 'select=*'),
      select('cv_items', 'select=*&order=sku.asc'),
      select('cv_colors', 'select=*&order=brand.asc,color.asc'),
      select('cv_woodworking_jobs', 'select=*&order=due_date.asc'),
      select('cv_woodworking_items', 'select=*&order=item_id.asc'),
      select('cv_woodworking_material_inventory', 'select=*&order=material.asc')
    ]);
    return { orders, orderLines, items, colors, woodJobs, woodItems, woodMaterials };
  }
  return { select, insert, patch, remove, loadDashboard };
})();
window.CVDB = CVDB;
