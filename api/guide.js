// POST /api/guide — Prompt Supabase se aata hai!

const DEFAULT_SYSTEM = 'You are an expert Indian agricultural scientist. Respond ONLY with a valid JSON array. No markdown, no backticks, no explanation outside the JSON array.';
const DEFAULT_TEMPLATE = 'Create a complete farming roadmap for {crop} crop in India. Return ONLY a valid JSON array with exactly 6 steps. No markdown, no extra text. Each step object must have exactly: {"step":1,"title":"Hindi title (English)","description":"2-3 practical Hinglish sentences about this stage","duration":"e.g. Day 1-10","tips":"1 important tip in Hinglish","status":"done"}. Steps 1-3 status=done, step 4 status=active, steps 5-6 status=upcoming.';

async function getPrompt() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { system: DEFAULT_SYSTEM, template: DEFAULT_TEMPLATE };
  try {
    const res = await fetch(`${url}/rest/v1/prompts?feature=eq.guide&active=eq.true&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });
    const data = await res.json();
    return {
      system: data[0]?.system_prompt || DEFAULT_SYSTEM,
      template: data[0]?.user_template || DEFAULT_TEMPLATE,
    };
  } catch {
    return { system: DEFAULT_SYSTEM, template: DEFAULT_TEMPLATE };
  }
}

async function isEnabled() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return true;
  try {
    const res = await fetch(`${url}/rest/v1/features?feature_name=eq.ai_guide&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
    });
    const data = await res.json();
    return data[0]?.enabled !== false;
  } catch { return true; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY missing' });

  const enabled = await isEnabled();
  if (!enabled) return res.status(403).json({ error: 'Guide feature is disabled', disabled: true });

  const { crop } = req.body || {};
  if (!crop) return res.status(400).json({ error: 'Crop name required' });

  const { system, template } = await getPrompt();
  const userPrompt = template.replace('{crop}', crop);

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
          { role: 'system', content: system },
          { role: 'user', content: userPrompt },
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
    return res.status(500).json({ error: err.message });
  }
};
