// GET /api/profile?farmer_id=xxx
// POST /api/profile  { farmer_id, name, state, ... }
// GET /api/profile?farmer_id=xxx&type=scans  → scan history
// POST /api/profile?type=scan  { farmer_id, crop_name, disease_name, ... }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  const { type } = req.query;

  // ─── SCAN HISTORY ───────────────────────────────────────────
  if (type === 'scans') {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    try {
      const r = await fetch(`${url}/rest/v1/scan_history?farmer_id=eq.${farmer_id}&order=scanned_at.desc&limit=10`, { headers });
      const data = await r.json();
      return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (type === 'scan' && req.method === 'POST') {
    const body = req.body || {};
    if (!body.farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    try {
      const r = await fetch(`${url}/rest/v1/scan_history`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // ─── FARMER PROFILE ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    try {
      const r = await fetch(`${url}/rest/v1/kisan_users?farmer_id=eq.${farmer_id}&limit=1`, { headers });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || null });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    try {
      const r = await fetch(`${url}/rest/v1/kisan_users`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
