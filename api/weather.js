// GET /api/weather?lat=26.84&lng=80.94
// GET /api/weather?city=Lucknow

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENWEATHER_API_KEY;

  // ─── Mock data fallback (jab key nahi ho) ───────────────────
  const MOCK = {
    success: true,
    source: 'mock',
    data: {
      city: 'Lucknow',
      state: 'UP',
      country: 'IN',
      temp: 32,
      feels_like: 36,
      humidity: 68,
      description: 'Partly Cloudy',
      emoji: '⛅',
      wind_speed: 12,
      farming_alert: 'Aaj irrigation ka acha din hai — dhoop kam hai',
      forecast: [
        { day: 'Aaj', temp_high: 32, temp_low: 24, emoji: '⛅', rain: '20%' },
        { day: 'Kal', temp_high: 29, temp_low: 22, emoji: '🌧️', rain: '80%' },
        { day: 'Parso', temp_high: 31, temp_low: 23, emoji: '☀️', rain: '10%' },
      ],
    },
  };

  if (!apiKey) return res.status(200).json(MOCK);

  const { lat, lng, city } = req.query;

  // Build OpenWeatherMap URL
  let currentUrl, forecastUrl;
  if (lat && lng) {
    currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&lang=hi`;
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&cnt=3`;
  } else {
    const c = city || 'Lucknow';
    currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${c},IN&appid=${apiKey}&units=metric&lang=hi`;
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${c},IN&appid=${apiKey}&units=metric&cnt=3`;
  }

  try {
    // Fetch current + forecast
    const [curRes, foreRes] = await Promise.all([
      fetch(currentUrl),
      fetch(forecastUrl),
    ]);

    const cur = await curRes.json();
    const fore = await foreRes.json();

    if (!curRes.ok) {
      console.error('OpenWeather error:', cur);
      return res.status(200).json(MOCK);
    }

    // Weather emoji map
    const getEmoji = (id) => {
      if (id >= 200 && id < 300) return '⛈️';
      if (id >= 300 && id < 400) return '🌦️';
      if (id >= 500 && id < 600) return '🌧️';
      if (id >= 600 && id < 700) return '❄️';
      if (id >= 700 && id < 800) return '🌫️';
      if (id === 800) return '☀️';
      if (id === 801 || id === 802) return '⛅';
      if (id === 803 || id === 804) return '☁️';
      return '🌤️';
    };

    // Farming alert based on weather
    const getFarmingAlert = (weatherId, temp, humidity) => {
      if (weatherId >= 200 && weatherId < 300) return '⚠️ Aandhi toofan aa sakta hai — fasal ko bachayein!';
      if (weatherId >= 500 && weatherId < 600) return '🌧️ Baarish ho rahi hai — irrigation band karein';
      if (temp > 40) return '🔥 Bahut zyada garmi — subah ya shaam paani dein';
      if (temp < 10) return '🥶 Thand zyada hai — paalay se fasalon ko bachayein';
      if (humidity > 85) return '💧 Nami zyada hai — fungal disease ka khatra, spray karein';
      if (humidity < 30) return '☀️ Sookha mausam — zyada paani dein';
      return '✅ Mausam theek hai — normal kheti karte rahein';
    };

    // Process forecast
    const days = ['Aaj', 'Kal', 'Parso'];
    const forecast = (fore.list || []).slice(0, 3).map((f, i) => ({
      day: days[i] || `Day ${i + 1}`,
      temp_high: Math.round(f.main.temp_max || f.main.temp),
      temp_low: Math.round(f.main.temp_min || f.main.temp - 4),
      emoji: getEmoji(f.weather[0]?.id || 800),
      rain: f.pop ? `${Math.round(f.pop * 100)}%` : '0%',
    }));

    const weatherId = cur.weather[0]?.id || 800;
    const temp = Math.round(cur.main.temp);
    const humidity = cur.main.humidity;

    return res.status(200).json({
      success: true,
      source: 'openweathermap',
      data: {
        city: cur.name || 'Unknown',
        state: '',
        country: cur.sys?.country || 'IN',
        temp,
        feels_like: Math.round(cur.main.feels_like),
        humidity,
        description: cur.weather[0]?.description || 'Clear',
        emoji: getEmoji(weatherId),
        wind_speed: Math.round((cur.wind?.speed || 0) * 3.6), // m/s to km/h
        farming_alert: getFarmingAlert(weatherId, temp, humidity),
        forecast: forecast.length > 0 ? forecast : MOCK.data.forecast,
        lat: cur.coord?.lat,
        lng: cur.coord?.lon,
      },
    });

  } catch (err) {
    console.error('Weather fetch error:', err);
    return res.status(200).json(MOCK);
  }
};
