// POST /api/detect
// Body: { image: "base64string", mimeType: "image/jpeg" }

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, mimeType } = req.body || {};
  if (!image) return res.status(400).json({ error: 'Image base64 required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing in environment variables' });

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: image,
              },
            },
            {
              text: `Aap expert Indian agricultural AI hain. Is plant image ko carefully analyze karein.
Respond ONLY in valid JSON — no markdown, no backticks, no extra text:
{
  "plant_name": "plant name Hindi (English)",
  "disease_name": "disease name in Hinglish, ya 'Swastha Paudha' agar healthy ho",
  "confidence": 85,
  "cause": "1-2 sentences cause in Hinglish",
  "severity": "Low ya Medium ya High",
  "description": "2-3 sentences Hinglish mein kya dikh raha hai",
  "organic_solution": "organic remedy Hinglish mein",
  "chemical_solution": "chemical remedy with dosage Hinglish mein",
  "immediate_action": "sabse zaroori ek kaam Hinglish mein",
  "recommended_products": ["product1", "product2"],
  "healthy": true
}`,
            },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini error:', err);
      return res.status(502).json({ error: 'Gemini API error', details: err });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let result;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error('Parse error:', rawText);
      return res.status(500).json({ error: 'Response parse error', raw: rawText });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Detect error:', err);
    return res.status(500).json({ error: err.message });
  }
};
