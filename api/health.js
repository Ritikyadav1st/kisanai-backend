module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    status: 'ok',
    message: 'KisanAI Backend chal raha hai! 🌾',
    ai_provider: 'OpenAI GPT-4o-mini',
    services: {
      ai_detect: process.env.OPENAI_API_KEY ? '✅ ready' : '❌ OPENAI_API_KEY missing',
      ai_guide:  process.env.OPENAI_API_KEY ? '✅ ready' : '❌ OPENAI_API_KEY missing',
      ai_chat:   process.env.OPENAI_API_KEY ? '✅ ready' : '❌ OPENAI_API_KEY missing',
      weather:   '✅ ready',
      sellers:   '✅ ready',
    },
  });
};
