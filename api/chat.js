// POST /api/chat
// Body: { messages: [{ role: "user", content: "..." }] }

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

const SYSTEM = `You are KisanAI, an expert AI farming assistant for Indian farmers. Deep knowledge of Indian crop diseases, farming techniques, government schemes (PM Kisan, Fasal Bima), fertilizers, organic farming, pest control. Always respond in friendly Hinglish (Hindi + English mix). Keep answers practical, brief (3-5 sentences), actionable. Simple language for village farmers. Add emojis. Be respectful.`;

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

  // Convert to Gemini format, only user/model roles
  let contents = messages
    .filter(m => m.role && m.content && String(m.content).trim())
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }));

  // Must start with user role
  while (contents.length > 0 && contents[0].role === 'model') {
    contents = contents.slice(1);
  }

  if (contents.length === 0) {
    return res.status(400).json({ error: 'No valid messages' });
  }

  // Inject system prompt into first user message (no system_instruction needed)
  contents[0] = {
    role: 'user',
    parts: [{ text: `[System: ${SYSTEM}]\n\nUser message: ${contents[0].parts[0].text}` }],
  };

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(502).json({ error: 'Gemini error', details: data?.error?.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!reply) return res.status(500).json({ error: 'Empty response' });

    return res.status(200).json({ success: true, reply });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err.message });
  }
};
