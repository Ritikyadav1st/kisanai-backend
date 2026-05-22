// GET /api/progress?farmer_id=xxx&crop=Tamatar
// POST /api/progress  body: { farmer_id, crop, step_number, completed, completed_date, target_date }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });

  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const { farmer_id, crop } = req.query;
    if (!farmer_id || !crop) return res.status(400).json({ error: 'farmer_id and crop required' });
    try {
      const r = await fetch(
        `${url}/rest/v1/crop_progress?farmer_id=eq.${farmer_id}&crop=eq.${encodeURIComponent(crop)}&order=step_number.asc`,
        { headers }
      );
      const data = await r.json();
      return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const { farmer_id, crop, step_number } = body;
    if (!farmer_id || !crop || step_number === undefined) {
      return res.status(400).json({ error: 'farmer_id, crop, step_number required' });
    }
    try {
      const r = await fetch(`${url}/rest/v1/crop_progress`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
