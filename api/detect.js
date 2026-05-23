// POST /api/detect  { image, mimeType, crop_name }

const DEFAULT_PROMPT = 'Analyze this plant image. Respond ONLY in valid JSON (no markdown): {"plant_name":"Hindi (English)","disease_name":"Hinglish","confidence":0-100,"cause":"Hinglish","severity":"Low/Medium/High","description":"2-3 Hinglish sentences","organic_solution":"Hinglish","chemical_solution":"Hinglish","immediate_action":"Hinglish","voice_message":"Hindi mein: Aapke paudhe mein... (2 sentences for text-to-speech)","healthy":true/false}';

async function getPrompt(crop) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_PROMPT;
  try {
    const r = await fetch(`${url}/rest/v1/prompts?feature=eq.detect&active=eq.true&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });
    const data = await r.json();
    const template = data[0]?.user_template || DEFAULT_PROMPT;
    return template.replace(/{crop}/g, crop || 'paudha');
  } catch { return DEFAULT_PROMPT; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

  const { image, mimeType, crop_name } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Image required' });

  const prompt = await getPrompt(crop_name || 'paudha');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${image}` } },
            { type: 'text', text: prompt }
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

    // Add voice message if missing
    if (!result.voice_message) {
      if (result.healthy) {
        result.voice_message = `Aapka ${crop_name || 'paudha'} bilkul swastha hai. Koi bimari nahi mili. Aise hi dekhbhaal karte rahein.`;
      } else {
        result.voice_message = `Aapke ${crop_name || 'paudhe'} mein ${result.disease_name} detect hua hai. Turant ${result.immediate_action}`;
      }
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
