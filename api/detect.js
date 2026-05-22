// POST /api/detect
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

  const { image, mimeType } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Image required' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${image}` } },
            { type: 'text', text: 'Aap expert Indian agricultural AI hain. Is plant image analyze karein. Respond ONLY in valid JSON (no markdown): {"plant_name":"Hindi (English)","disease_name":"Hinglish ya Swastha Paudha","confidence":0-100,"cause":"Hinglish","severity":"Low/Medium/High","description":"2-3 sentences Hinglish","organic_solution":"Hinglish","chemical_solution":"Hinglish","immediate_action":"Hinglish","healthy":true/false}' }
          ]
        }],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(502).json({ error: data?.error?.message });

    const rawText = data.choices?.[0]?.message?.content || '';
    let result;
    try {
      result = JSON.parse(rawText.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(500).json({ error: 'Parse error', raw: rawText });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Detect error:', err);
    return res.status(500).json({ error: err.message });
  }
};
