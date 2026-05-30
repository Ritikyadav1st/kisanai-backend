// POST /api/detect  { image, mimeType, crop_name }

// Step 1: Validation prompt — is this a plant/crop image?
const VALIDATION_PROMPT = `Look at this image carefully. Answer ONLY with valid JSON, nothing else:
{"is_plant": true/false, "reason": "one line explanation in English"}
Rules:
- is_plant = true ONLY if image shows: a plant, crop, leaf, stem, root, flower, fruit on plant, or agricultural field
- is_plant = false if: human face, animal, building, vehicle, food on plate, cartoon, screenshot, or anything non-agricultural
Be strict. When in doubt, return false.`;

// Step 2: Analysis prompt
const DEFAULT_PROMPT = `You are an expert agricultural scientist. Analyze this plant/crop image very carefully.
Respond ONLY in valid JSON (no markdown, no extra text):
{
  "plant_name": "Paudhe ka naam Hindi mein (English mein)",
  "disease_name": "Bimari ka naam Hinglish mein (ya 'Swastha - Koi Bimari Nahi')",
  "confidence": 0-100,
  "cause": "Bimari ki wajah Hinglish mein (fungus/bacteria/virus/nutrient/pest)",
  "severity": "Low/Medium/High/None",
  "description": "2-3 practical Hinglish sentences — kya dikha, kya ho raha hai",
  "organic_solution": "Jaivik ilaaj Hinglish mein (neem, gobar, etc.)",
  "chemical_solution": "Dawai ka naam aur dose Hinglish mein",
  "immediate_action": "Abhi turant kya karein — 1 line Hinglish",
  "prevention": "Aage se kaise bachein — 1 line Hinglish",
  "voice_message": "Hindi mein 2 sentences — text-to-speech ke liye",
  "healthy": true/false
}
Important: If plant looks healthy, set healthy=true and disease_name="Swastha - Koi Bimari Nahi", severity="None". Give confidence % of your diagnosis.`;

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

  const imgUrl = `data:${mimeType || 'image/jpeg'};base64,${image}`;

  try {
    // ── STEP 1: Validate — is this a plant image? ──────────────
    const validRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imgUrl, detail: 'low' } },
            { type: 'text', text: VALIDATION_PROMPT }
          ]
        }],
        max_tokens: 80,
        temperature: 0,
      }),
    });
    const validData = await validRes.json();
    const validRaw = validData.choices?.[0]?.message?.content || '{}';
    let validation = {};
    try { validation = JSON.parse(validRaw.replace(/```json|```/g, '').trim()); } catch {}

    if (validation.is_plant === false) {
      return res.status(200).json({
        success: false,
        not_plant: true,
        message: 'Yeh fasal ya paudhe ki photo nahi hai. Kripya khet mein kisi paudhe, patte, ya fasal ki photo lo.',
        reason: validation.reason || '',
      });
    }

    // ── STEP 2: Full disease analysis ─────────────────────────
    const prompt = await getPrompt(crop_name || 'paudha');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imgUrl, detail: 'high' } },
            { type: 'text', text: prompt }
          ]
        }],
        max_tokens: 1200,
        temperature: 0.1,
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

    // Ensure voice message
    if (!result.voice_message) {
      result.voice_message = result.healthy
        ? `Aapka ${crop_name || 'paudha'} bilkul swastha hai. Koi bimari nahi mili.`
        : `Aapke ${crop_name || 'paudhe'} mein ${result.disease_name} detect hua hai. Turant ${result.immediate_action}`;
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
