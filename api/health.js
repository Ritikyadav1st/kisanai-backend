module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    status: 'ok',
    message: 'KisanAI Backend chal raha hai! 🌾',
    ai_provider: 'Google Gemini',
    services: {
      ai_detect: process.env.GEMINI_API_KEY ? '✅ ready' : '❌ GEMINI_API_KEY missing',
      ai_guide:  process.env.GEMINI_API_KEY ? '✅ ready' : '❌ GEMINI_API_KEY missing',
      ai_chat:   process.env.GEMINI_API_KEY ? '✅ ready' : '❌ GEMINI_API_KEY missing',
      weather:   '✅ ready',
      sellers:   '✅ ready',
    },
  });
};
