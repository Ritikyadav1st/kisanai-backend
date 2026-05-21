module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasWeatherKey = !!process.env.OPENWEATHER_API_KEY;

  return res.status(200).json({
    status: 'ok',
    message: 'KisanAI Backend chal raha hai! 🌾',
    ai_provider: 'Google Gemini',
    timestamp: new Date().toISOString(),
    services: {
      ai_detect: hasGeminiKey ? '✅ ready' : '❌ GEMINI_API_KEY missing',
      ai_guide:  hasGeminiKey ? '✅ ready' : '❌ GEMINI_API_KEY missing',
      ai_chat:   hasGeminiKey ? '✅ ready' : '❌ GEMINI_API_KEY missing',
      weather:   hasWeatherKey ? '✅ ready' : '⚠️ mock mode (add OPENWEATHER_API_KEY)',
      sellers:   '✅ ready',
    },
  });
};
