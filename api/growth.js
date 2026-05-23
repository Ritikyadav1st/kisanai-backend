// GET /api/growth?farmer_id=xxx&crop_name=Tamatar
// POST /api/growth { farmer_id, crop_name, image_data, notes, ai_analysis, growth_stage }
// DELETE /api/growth?id=xxx

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
    const { farmer_id, crop_name } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    const cropQ = crop_name ? `&crop_name=eq.${encodeURIComponent(crop_name)}` : '';
    const r = await fetch(`${url}/rest/v1/crop_growth?farmer_id=eq.${farmer_id}${cropQ}&order=recorded_date.desc`, { headers });
    const data = await r.json();
    return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.farmer_id) return res.status(400).json({ error: 'farmer_id required' });

    // If needs AI analysis
    if (body.analyze && body.image_data && process.env.OPENAI_API_KEY) {
      try {
        const aiR = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.image_data}` } },
              { type: 'text', text: `Ye ${body.crop_name || 'paudha'} ki photo hai. Growth stage batao aur ek brief Hinglish analysis do (2 sentences). Format: {"stage": "Vegetative/Flowering/Fruiting/Harvest Ready", "analysis": "Hinglish mein..."}` }
            ]}],
            max_tokens: 200,
          }),
        });
        const aiData = await aiR.json();
        const text = aiData.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        body.growth_stage = parsed.stage;
        body.ai_analysis = parsed.analysis;
      } catch { body.ai_analysis = 'Analysis ho nahi payi.'; }
    }

    delete body.analyze;
    const r = await fetch(`${url}/rest/v1/crop_growth`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ ...body, recorded_date: body.recorded_date || new Date().toISOString().split('T')[0] }),
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    await fetch(`${url}/rest/v1/crop_growth?id=eq.${id}`, { method: 'DELETE', headers });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
