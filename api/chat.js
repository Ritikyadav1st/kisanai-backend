// POST /api/chat — Prompt Supabase se aata hai!

const DEFAULT_SYSTEM = 'You are KisanAI, an expert AI farming assistant for Indian farmers. Deep knowledge of crop diseases, farming techniques, government schemes (PM Kisan, Fasal Bima), fertilizers, organic farming. Always respond in friendly Hinglish (Hindi + English mix). Keep answers practical, brief (3-5 sentences), actionable. Simple language for village farmers. Add emojis. Be respectful.';

async function getPrompt() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_SYSTEM;
  try {
    const res = await fetch(`${url}/rest/v1/prompts?feature=eq.chat&active=eq.true&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });
    const data = await res.json();
    return data[0]?.system_prompt || DEFAULT_SYSTEM;
  } catch {
    return DEFAULT_SYSTEM;
  }
}

async function isEnabled() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return true;
  try {
    const res = await fetch(`${url}/rest/v1/features?feature_name=eq.ai_chat&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });
    const data = await res.json();
    return data[0]?.enabled !== false;
  } catch {
    return true;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

  // ── Voice Transcription (Whisper) ────────────────────────────
  const { type } = req.query;
  if (type === 'transcribe') {
    const { audio_base64, language } = req.body || {};
    if (!audio_base64) return res.status(400).json({ error: 'audio_base64 required' });
    try {
      // Native Node.js 18 FormData + Blob (no external package needed)
      const audioBuffer = Buffer.from(audio_base64, 'base64');
      const form = new FormData();
      form.append('file', new Blob([audioBuffer], { type: 'audio/m4a' }), 'voice.m4a');
      form.append('model', 'whisper-1');
      form.append('language', language || 'hi');
      form.append('response_format', 'text');
      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: form,
      });
      const text = await whisperRes.text();
      if (!whisperRes.ok) return res.status(502).json({ error: text });
      const trimmed = text.trim();
      if (!trimmed) return res.status(200).json({ success: false, text: '' });
      return res.status(200).json({ success: true, text: trimmed });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Feature check
  const enabled = await isEnabled();
  if (!enabled) return res.status(403).json({ error: 'Chat feature is disabled', disabled: true });

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages required' });
  }

  // Get prompt from Supabase (or use default)
  const systemPrompt = await getPrompt();

  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => m.role && m.content)
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content) }))
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
    if (!response.ok) return res.status(502).json({ error: data?.error?.message });

    const reply = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ success: true, reply });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
