// POST /api/chat
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages required' });
  }

  const openaiMessages = [
    { role: 'system', content: 'You are KisanAI, an expert AI farming assistant for Indian farmers. Deep knowledge of crop diseases, farming techniques, government schemes (PM Kisan, Fasal Bima), fertilizers, organic farming. Always respond in friendly Hinglish (Hindi + English). Keep answers brief (3-5 sentences), practical, actionable. Simple language for village farmers. Add emojis. Be respectful.' },
    ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI error:', JSON.stringify(data));
      return res.status(502).json({ error: data?.error?.message || 'OpenAI error' });
    }

    const reply = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ success: true, reply });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err.message });
  }
};
