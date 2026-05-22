// POST /api/guide
// Body: { crop: "Tamatar" }

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  const { crop } = req.body || {};
  if (!crop) return res.status(400).json({ error: 'Crop name required' });

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: 'You are an expert Indian agricultural scientist. Respond ONLY with a valid JSON array. No markdown, no backticks, no explanation outside the JSON array.' }],
        },
        contents: [{
          role: 'user',
          parts: [{
            text: `Create a complete farming roadmap for ${crop} crop in India. Return ONLY a valid JSON array with exactly 6 steps. No markdown, no extra text. Each step object must have exactly: {"step":1,"title":"Hindi title (English)","description":"2-3 practical Hinglish sentences about this stage","duration":"e.g. Day 1-10","tips":"1 important tip in Hinglish","status":"done"}. Steps 1-3 status=done, step 4 status=active, steps 5-6 status=upcoming.`,
          }],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini guide error:', err);
      return res.status(502).json({ error: 'Gemini API error', details: err });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let steps;
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      steps = JSON.parse(cleaned);
      if (!Array.isArray(steps)) throw new Error('Not array');
    } catch (parseErr) {
      console.error('Guide parse error:', rawText);
      return res.status(500).json({ error: 'Parse error', raw: rawText });
    }

    return res.status(200).json({ success: true, crop, data: steps });
  } catch (err) {
    console.error('Guide handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
