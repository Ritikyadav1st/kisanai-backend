// POST /api/guide
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

  const { crop } = req.body || {};
  if (!crop) return res.status(400).json({ error: 'Crop name required' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert Indian agricultural scientist. Respond ONLY with valid JSON array. No markdown, no backticks, no extra text.' },
          { role: 'user', content: `Create farming roadmap for ${crop} in India. Return ONLY a JSON array with 6 steps. Each step: {"step":1,"title":"Hindi title (English)","description":"2-3 practical Hinglish sentences","duration":"e.g. Day 1-10","tips":"1 tip in Hinglish","status":"done"}. Steps 1-3 status=done, step 4 status=active, steps 5-6 status=upcoming.` }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message });

    const rawText = data.choices?.[0]?.message?.content || '';
    let steps;
    try {
      steps = JSON.parse(rawText.replace(/```json|```/g, '').trim());
      if (!Array.isArray(steps)) throw new Error('Not array');
    } catch {
      return res.status(500).json({ error: 'Parse error', raw: rawText });
    }

    return res.status(200).json({ success: true, crop, data: steps });
  } catch (err) {
    console.error('Guide error:', err);
    return res.status(500).json({ error: err.message });
  }
};
