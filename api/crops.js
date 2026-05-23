// GET /api/crops?farmer_id=xxx
// POST /api/crops  { farmer_id, crop_name, crop_hindi, crop_emoji, season, sowing_date, field_name, field_size_acres }
// DELETE /api/crops?id=xxx

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    try {
      const r = await fetch(`${url}/rest/v1/farmer_crops?farmer_id=eq.${farmer_id}&order=created_at.desc`, { headers });
      const data = await r.json();
      return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.farmer_id || !body.crop_name) return res.status(400).json({ error: 'farmer_id and crop_name required' });
    try {
      const r = await fetch(`${url}/rest/v1/farmer_crops`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      await fetch(`${url}/rest/v1/farmer_crops?id=eq.${id}`, { method: 'DELETE', headers });
      return res.status(200).json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
