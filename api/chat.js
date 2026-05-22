// POST /api/chat
// Body: { messages: [{ role: "user", content: "..." }] }

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent';
const SYSTEM_PROMPT = `You are KisanAI, an expert AI farming assistant for Indian farmers. You have deep knowledge of Indian crop diseases, farming techniques, government schemes (PM Kisan, Fasal Bima, Kisan Credit Card), fertilizers, organic farming, pest control, soil health, irrigation, and market prices. Always respond in friendly Hinglish (mix of Hindi and English). Keep answers practical, brief (3-5 sentences), and actionable. Use simple language that village farmers can understand. Add relevant emojis. Address farmers respectfully.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array required' });
  }

  // Convert messages to Gemini format
  // Gemini requires: role must be 'user' or 'model', and first message must be 'user'
  let contents = messages
    .filter(m => m.role && m.content && String(m.content).trim())
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }));

  // Gemini requires conversation to START with 'user' role
  while (contents.length > 0 && contents[0].role === 'model') {
    contents = contents.slice(1);
  }

  if (contents.length === 0) {
    return res.status(400).json({ error: 'No valid user messages found' });
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Gemini chat error:', err);
      return res.status(502).json({ error: 'Gemini API error', details: err });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!reply) {
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    return res.status(200).json({ success: true, reply });
  } catch (err) {
    console.error('Chat handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
