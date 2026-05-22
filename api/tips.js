// GET /api/tips — Daily tips from Supabase

const FALLBACK_TIPS = [
  { tip_hindi: 'Tomato ke liye drip irrigation best hai — 30% pani bachta hai', category: 'water', crop: 'tamatar' },
  { tip_hindi: 'Subah 6-8 baje paani dene se paudhe zyada healthy rehte hain', category: 'water', crop: 'all' },
  { tip_hindi: 'Neem oil spray se 80% keet khatam ho jaate hain', category: 'pest', crop: 'all' },
  { tip_hindi: 'Fasal chakra apnayen — ek hi khet mein alag alag fasalein ugayen', category: 'general', crop: 'all' },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { crop, category, limit = 1 } = req.query;
  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_ANON_KEY;

  if (!supaUrl || !supaKey) {
    const tip = FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
    return res.status(200).json({ success: true, data: [tip], source: 'fallback' });
  }

  try {
    let query = `active=eq.true&limit=${limit}&order=id.desc`;
    if (crop && crop !== 'all') query += `&or=(crop.eq.${crop},crop.eq.all)`;
    if (category) query += `&category=eq.${category}`;

    const response = await fetch(`${supaUrl}/rest/v1/daily_tips?${query}`, {
      headers: { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` },
    });
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      const tip = FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
      return res.status(200).json({ success: true, data: [tip], source: 'fallback' });
    }

    return res.status(200).json({ success: true, data, source: 'supabase' });
  } catch (err) {
    const tip = FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
    return res.status(200).json({ success: true, data: [tip], source: 'fallback' });
  }
};
