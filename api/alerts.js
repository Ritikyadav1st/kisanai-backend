// GET /api/alerts?state=UP&crop=tamatar
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  const FALLBACK = [
    { id:1, title:'Tamatar mein White Fly Alert', description:'Is season mein white fly attack zyada hai.', severity:'high', affected_crops:'tamatar', prevention:'Neem oil 2% spray karein.', created_at: new Date().toISOString() },
    { id:2, title:'Gehun mein Yellow Rust', description:'Rabi season mein yellow rust ka khatra.', severity:'medium', affected_crops:'gehun', prevention:'Propiconazole spray karein.', created_at: new Date().toISOString() },
  ];

  if (!url || !key) return res.status(200).json({ success: true, data: FALLBACK });

  try {
    const r = await fetch(`${url}/rest/v1/pest_alerts?active=eq.true&order=created_at.desc&limit=5`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: Array.isArray(data) && data.length > 0 ? data : FALLBACK });
  } catch {
    return res.status(200).json({ success: true, data: FALLBACK });
  }
};
