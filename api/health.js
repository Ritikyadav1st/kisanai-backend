// GET /api/weather?city=Lucknow
// GET /api/weather?lat=26.8&lng=80.9
// Returns: formatted weather data

const MOCK_WEATHER = {
  city: 'Lucknow',
  temp: 32,
  feels_like: 36,
  description: 'Partly Cloudy',
  description_hindi: 'Aansik Baadal',
  humidity: 68,
  wind_speed: 12,
  wind_direction: 'NE',
  visibility: 8,
  uv_index: 7,
  forecast: [
    { day: 'Aaj', emoji: '⛅', temp_high: 32, temp_low: 24, rain: '10%' },
    { day: 'Kal', emoji: '🌧️', temp_high: 28, temp_low: 22, rain: '80%' },
    { day: 'Parson', emoji: '🌤️', temp_high: 30, temp_low: 23, rain: '20%' },
  ],
  farming_alert: 'Kal baarish ki sambhavna hai — koi bhi spray kaam kal na karein.',
  is_mock: true,
};

function getWeatherEmoji(code) {
  if (!code) return '🌤️';
  if (code < 300) return '⛈️';
  if (code < 400) return '🌧️';
  if (code < 600) return '🌧️';
  if (code < 700) return '❄️';
  if (code < 800) return '🌫️';
  if (code === 800) return '☀️';
  if (code <= 802) return '⛅';
  return '☁️';
}

function getFarmingAlert(weatherData) {
  const { main, wind, clouds } = weatherData;
  const rain = weatherData.rain?.['1h'] || weatherData.rain?.['3h'] || 0;
  if (rain > 5) return 'Aaj baarish ho rahi hai — koi bhi spray kaam mat karein. Drainage check karein.';
  if (main.humidity > 85) return 'Zyada nami hai — fungal rog ka khatra. Fungicide spray ready rakhein.';
  if (main.temp > 40) return 'Bahut zyada garmi — subah ya shaam ko paani dein. Paudhe dhoop se bachayein.';
  if (wind.speed > 30) return 'Tej hawa chal rahi hai — aaj spray mat karein, dawai udate hai.';
  if (clouds.all > 80) return 'Baadal chaye hain — baarish aa sakti hai. Harvested fasal ko dhak ke rakhein.';
  return 'Mausam theek hai — kheti ke kaam ke liye acha din hai! 🌱';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { city, lat, lng } = req.query;
  const weatherKey = process.env.OPENWEATHER_API_KEY;

  if (!weatherKey) {
    return res.status(200).json({ success: true, data: MOCK_WEATHER });
  }

  try {
    let apiUrl;
    if (lat && lng) {
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${weatherKey}&units=metric`;
    } else {
      const cityName = city || 'Lucknow';
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)},IN&appid=${weatherKey}&units=metric`;
    }

    const [currentRes, forecastRes] = await Promise.all([
      fetch(apiUrl),
      fetch(apiUrl.replace('weather', 'forecast')),
    ]);

    if (!currentRes.ok) {
      return res.status(200).json({ success: true, data: MOCK_WEATHER });
    }

    const current = await currentRes.json();
    let forecastDays = [];

    if (forecastRes.ok) {
      const forecastData = await forecastRes.json();
      const seenDays = new Set();
      forecastDays = (forecastData.list || [])
        .filter((item) => {
          const d = new Date(item.dt * 1000);
          const key = `${d.getDate()}-${d.getMonth()}`;
          if (seenDays.has(key) || d.getDate() === new Date().getDate()) return false;
          seenDays.add(key);
          return true;
        })
        .slice(0, 3)
        .map((item, i) => ({
          day: i === 0 ? 'Kal' : i === 1 ? 'Parson' : 'Tarsoon',
          emoji: getWeatherEmoji(item.weather?.[0]?.id),
          temp_high: Math.round(item.main.temp_max),
          temp_low: Math.round(item.main.temp_min),
          rain: `${Math.round((item.pop || 0) * 100)}%`,
        }));
    }

    const weatherCode = current.weather?.[0]?.id;
    const result = {
      city: current.name || city || 'Aapka Shehar',
      temp: Math.round(current.main.temp),
      feels_like: Math.round(current.main.feels_like),
      description: current.weather?.[0]?.main || 'Clear',
      description_hindi: current.weather?.[0]?.description || '',
      humidity: current.main.humidity,
      wind_speed: Math.round((current.wind?.speed || 0) * 3.6),
      wind_direction: current.wind?.deg ? getWindDir(current.wind.deg) : 'N',
      visibility: Math.round((current.visibility || 10000) / 1000),
      pressure: current.main.pressure,
      forecast: forecastDays.length > 0 ? forecastDays : MOCK_WEATHER.forecast,
      farming_alert: getFarmingAlert(current),
      emoji: getWeatherEmoji(weatherCode),
      is_mock: false,
    };

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Weather error:', err);
    return res.status(200).json({ success: true, data: MOCK_WEATHER });
  }
};

function getWindDir(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}
