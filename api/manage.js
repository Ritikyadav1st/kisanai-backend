// manage.js — diary + progress + custom tasks in one file

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  const { type, farmer_id, id, crop } = req.query;

  // ─── DIARY ──────────────────────────────────────────────────
  if (type === 'diary') {
    if (req.method === 'GET') {
      if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
      const r = await fetch(`${url}/rest/v1/farm_diary?farmer_id=eq.${farmer_id}&order=entry_date.desc&limit=100`, { headers });
      const data = await r.json();
      const entries = Array.isArray(data) ? data : [];
      const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
      const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
      return res.status(200).json({ success: true, data: entries, summary: { total_income: totalIncome, total_expense: totalExpense, profit: totalIncome - totalExpense } });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.farmer_id) return res.status(400).json({ error: 'farmer_id required' });
      const r = await fetch(`${url}/rest/v1/farm_diary`, {
        method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ ...body, entry_date: body.entry_date || new Date().toISOString().split('T')[0] }),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      await fetch(`${url}/rest/v1/farm_diary?id=eq.${id}`, { method: 'DELETE', headers });
      return res.status(200).json({ success: true });
    }
  }

  // ─── PROGRESS ───────────────────────────────────────────────
  if (type === 'progress') {
    if (req.method === 'GET') {
      if (!farmer_id || !crop) return res.status(400).json({ error: 'farmer_id and crop required' });
      const r = await fetch(`${url}/rest/v1/crop_progress?farmer_id=eq.${farmer_id}&crop=eq.${encodeURIComponent(crop)}&order=step_number.asc`, { headers });
      const data = await r.json();
      return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.farmer_id || !body.crop || body.step_number === undefined) return res.status(400).json({ error: 'farmer_id, crop, step_number required' });
      const r = await fetch(`${url}/rest/v1/crop_progress`, {
        method: 'POST', headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    }
  }

  // ─── CUSTOM TASKS ───────────────────────────────────────────
  if (type === 'tasks') {
    if (req.method === 'GET') {
      if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
      const cropQ = crop ? `&crop=eq.${encodeURIComponent(crop)}` : '';
      const r = await fetch(`${url}/rest/v1/custom_tasks?farmer_id=eq.${farmer_id}${cropQ}&order=created_at.desc`, { headers });
      const data = await r.json();
      return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.farmer_id || !body.crop || !body.title) return res.status(400).json({ error: 'farmer_id, crop, title required' });
      const r = await fetch(`${url}/rest/v1/custom_tasks`, {
        method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      await fetch(`${url}/rest/v1/custom_tasks?id=eq.${id}`, { method: 'DELETE', headers });
      return res.status(200).json({ success: true });
    }
  }

  return res.status(400).json({ error: 'type required: diary, progress, or tasks' });
};
