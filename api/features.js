// GET /api/features — Features ON/OFF from Supabase

const DEFAULTS = {
  ai_chat: true,
  ai_guide: true,
  ai_detect: true,
  shop: true,
  weather: true,
  daily_tips: true,
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_ANON_KEY;

  if (!supaUrl || !supaKey) {
    return res.status(200).json({ success: true, data: DEFAULTS, source: 'fallback' });
  }

  try {
    const response = await fetch(`${supaUrl}/rest/v1/features?select=feature_name,enabled`, {
      headers: { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` },
    });
    const data = await response.json();

    if (!Array.isArray(data)) {
      return res.status(200).json({ success: true, data: DEFAULTS, source: 'fallback' });
    }

    const features = { ...DEFAULTS };
    data.forEach(f => { features[f.feature_name] = f.enabled; });

    return res.status(200).json({ success: true, data: features, source: 'supabase' });
  } catch (err) {
    return res.status(200).json({ success: true, data: DEFAULTS, source: 'fallback' });
  }
};
