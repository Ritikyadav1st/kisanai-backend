// config.js — alerts + features in one file
// GET /api/config?type=alerts
// GET /api/config?type=features

const FALLBACK_ALERTS = [
  { id:1, title:'Tamatar mein White Fly Alert', description:'Is season mein white fly attack zyada hai.', severity:'high', affected_crops:'tamatar', prevention:'Neem oil 2% spray karein.', created_at: new Date().toISOString() },
  { id:2, title:'Gehun mein Yellow Rust', description:'Rabi mein yellow rust fungus ka khatra.', severity:'medium', affected_crops:'gehun', prevention:'Propiconazole spray karein.', created_at: new Date().toISOString() },
  { id:3, title:'Dhaan mein Stem Borer', description:'Kharif mein stem borer attack.', severity:'high', affected_crops:'dhaan', prevention:'Cartap hydrochloride use karein.', created_at: new Date().toISOString() },
];

const FALLBACK_FEATURES = { ai_chat: true, ai_guide: true, ai_detect: true, shop: true, weather: true, voice: true };

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { type } = req.query;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

  if (type === 'alerts') {
    if (!url || !key) return res.status(200).json({ success: true, data: FALLBACK_ALERTS });
    try {
      const r = await fetch(`${url}/rest/v1/pest_alerts?active=eq.true&order=created_at.desc&limit=5`, { headers });
      const data = await r.json();
      return res.status(200).json({ success: true, data: Array.isArray(data) && data.length > 0 ? data : FALLBACK_ALERTS });
    } catch { return res.status(200).json({ success: true, data: FALLBACK_ALERTS }); }
  }

  if (type === 'features') {
    if (!url || !key) return res.status(200).json({ success: true, data: FALLBACK_FEATURES });
    try {
      const r = await fetch(`${url}/rest/v1/features?select=feature_name,enabled`, { headers });
      const data = await r.json();
      const features = { ...FALLBACK_FEATURES };
      if (Array.isArray(data)) data.forEach(f => { features[f.feature_name] = f.enabled; });
      return res.status(200).json({ success: true, data: features });
    } catch { return res.status(200).json({ success: true, data: FALLBACK_FEATURES }); }
  }

  return res.status(400).json({ error: 'type required: alerts or features' });
};
