// GET /api/weather?lat=26.84&lng=80.94
// GET /api/weather?city=Lucknow
// Uses Open-Meteo (FREE, no API key!) as primary
// Uses OpenWeather as fallback (if OPENWEATHER_API_KEY set hai)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng, city } = req.query;

  // ─── Weather Emoji Map ────────────────────────────────────────
  const getEmoji = (code) => {
    if (code === 0) return '☀️';
    if (code <= 2) return '⛅';
    if (code === 3) return '☁️';
    if (code <= 49) return '🌫️';
    if (code <= 59) return '🌦️';
    if (code <= 69) return '🌧️';
    if (code <= 79) return '❄️';
    if (code <= 84) return '🌧️';
    if (code <= 99) return '⛈️';
    return '🌤️';
  };

  const getDescription = (code) => {
    if (code === 0) return 'Clear Sky';
    if (code <= 2) return 'Partly Cloudy';
    if (code === 3) return 'Overcast';
    if (code <= 49) return 'Foggy';
    if (code <= 59) return 'Drizzle';
    if (code <= 69) return 'Rain';
    if (code <= 79) return 'Snow';
    if (code <= 84) return 'Rain Showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Clear';
  };

  const getFarmingAlert = (code, temp, humidity) => {
    if (code >= 95) return '⚠️ Aandhi toofan aa sakta hai — fasal ko bachayein!';
    if (code >= 61 && code <= 69) return '🌧️ Baarish ho rahi hai — irrigation band karein';
    if (code >= 71 && code <= 79) return '❄️ Barf girne ki sambhavna — paalay se fasalon ko bachayein';
    if (temp > 40) return '🔥 Bahut zyada garmi — subah ya shaam paani dein';
    if (temp < 10) return '🥶 Thand zyada hai — paalay se fasalon ko bachayein';
    if (humidity > 85) return '💧 Nami zyada hai — fungal disease ka khatra, spray karein';
    if (humidity < 30) return '☀️ Sookha mausam — zyada paani dein';
    return '✅ Mausam theek hai — normal kheti karte rahein';
  };

  // ─── City to Lat/Lng (Indian cities) ─────────────────────────
  const CITY_COORDS = {
    'lucknow': { lat: 26.85, lng: 80.95, name: 'Lucknow', state: 'UP' },
    'delhi': { lat: 28.67, lng: 77.22, name: 'Delhi', state: 'Delhi' },
    'ghaziabad': { lat: 28.67, lng: 77.45, name: 'Ghaziabad', state: 'UP' },
    'noida': { lat: 28.54, lng: 77.39, name: 'Noida', state: 'UP' },
    'agra': { lat: 27.18, lng: 78.02, name: 'Agra', state: 'UP' },
    'kanpur': { lat: 26.44, lng: 80.33, name: 'Kanpur', state: 'UP' },
    'varanasi': { lat: 25.32, lng: 83.00, name: 'Varanasi', state: 'UP' },
    'allahabad': { lat: 25.45, lng: 81.84, name: 'Allahabad', state: 'UP' },
    'meerut': { lat: 28.98, lng: 77.71, name: 'Meerut', state: 'UP' },
    'patna': { lat: 25.59, lng: 85.13, name: 'Patna', state: 'Bihar' },
    'mumbai': { lat: 19.08, lng: 72.88, name: 'Mumbai', state: 'Maharashtra' },
    'pune': { lat: 18.52, lng: 73.86, name: 'Pune', state: 'Maharashtra' },
    'bangalore': { lat: 12.97, lng: 77.56, name: 'Bangalore', state: 'Karnataka' },
    'hyderabad': { lat: 17.38, lng: 78.49, name: 'Hyderabad', state: 'Telangana' },
    'chennai': { lat: 13.08, lng: 80.27, name: 'Chennai', state: 'Tamil Nadu' },
    'kolkata': { lat: 22.57, lng: 88.36, name: 'Kolkata', state: 'West Bengal' },
    'jaipur': { lat: 26.91, lng: 75.79, name: 'Jaipur', state: 'Rajasthan' },
    'chandigarh': { lat: 30.74, lng: 76.79, name: 'Chandigarh', state: 'Punjab' },
    'bhopal': { lat: 23.26, lng: 77.40, name: 'Bhopal', state: 'MP' },
    'indore': { lat: 22.72, lng: 75.86, name: 'Indore', state: 'MP' },
    'nagpur': { lat: 21.15, lng: 79.09, name: 'Nagpur', state: 'Maharashtra' },
    'ahmedabad': { lat: 23.03, lng: 72.58, name: 'Ahmedabad', state: 'Gujarat' },
    'surat': { lat: 21.17, lng: 72.83, name: 'Surat', state: 'Gujarat' },
    'amritsar': { lat: 31.63, lng: 74.87, name: 'Amritsar', state: 'Punjab' },
    'ludhiana': { lat: 30.91, lng: 75.85, name: 'Ludhiana', state: 'Punjab' },
  };

  // ─── Resolve coordinates ──────────────────────────────────────
  let finalLat, finalLng, cityName = 'India', stateName = '';

  if (lat && lng) {
    finalLat = parseFloat(lat);
    finalLng = parseFloat(lng);
    // Reverse geocode se city name lene ki koshish
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${finalLat}&lon=${finalLng}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'KisanAI/3.2' } }
      );
      const geo = await geoRes.json();
      cityName = geo.address?.city || geo.address?.town || geo.address?.village || geo.address?.county || 'Your Location';
      stateName = geo.address?.state || '';
    } catch {
      cityName = 'Your Location';
    }
  } else if (city) {
    const cityKey = city.toLowerCase().trim();
    const coords = CITY_COORDS[cityKey];
    if (coords) {
      finalLat = coords.lat;
      finalLng = coords.lng;
      cityName = coords.name;
      stateName = coords.state;
    } else {
      // OpenWeather fallback if key available
      const owKey = process.env.OPENWEATHER_API_KEY;
      if (owKey) {
        return await fetchOpenWeather(req, res, owKey, city, null, null, getFarmingAlert, getEmoji);
      }
      // Default to Lucknow
      finalLat = 26.85;
      finalLng = 80.95;
      cityName = city;
      stateName = 'India';
    }
  } else {
    // Default Delhi
    finalLat = 28.67;
    finalLng = 77.22;
    cityName = 'Delhi';
    stateName = 'Delhi';
  }

  // ─── Open-Meteo API (FREE — No Key Needed!) ───────────────────
  try {
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${finalLat}&longitude=${finalLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FKolkata&forecast_days=3`;

    const meteoRes = await fetch(meteoUrl);
    const meteo = await meteoRes.json();

    if (!meteoRes.ok || !meteo.current) {
      throw new Error('Open-Meteo failed');
    }

    const current = meteo.current;
    const daily = meteo.daily;

    const temp = Math.round(current.temperature_2m);
    const humidity = current.relative_humidity_2m;
    const feelsLike = Math.round(current.apparent_temperature);
    const windSpeed = Math.round(current.wind_speed_10m);
    const weatherCode = current.weather_code;

    // Forecast (3 days)
    const dayNames = ['Aaj', 'Kal', 'Parso'];
    const forecast = (daily.time || []).slice(0, 3).map((_, i) => ({
      day: dayNames[i],
      temp_high: Math.round(daily.temperature_2m_max[i]),
      temp_low: Math.round(daily.temperature_2m_min[i]),
      emoji: getEmoji(daily.weather_code[i]),
      rain: `${daily.precipitation_probability_max[i] || 0}%`,
    }));

    return res.status(200).json({
      success: true,
      source: 'open-meteo',
      data: {
        city: cityName,
        state: stateName,
        country: 'IN',
        temp,
        feels_like: feelsLike,
        humidity,
        description: getDescription(weatherCode),
        emoji: getEmoji(weatherCode),
        wind_speed: windSpeed,
        farming_alert: getFarmingAlert(weatherCode, temp, humidity),
        forecast,
        lat: finalLat,
        lng: finalLng,
      },
    });

  } catch (err) {
    console.error('Open-Meteo error:', err.message);

    // OpenWeather fallback
    const owKey = process.env.OPENWEATHER_API_KEY;
    if (owKey) {
      return await fetchOpenWeather(req, res, owKey, city, finalLat, finalLng, getFarmingAlert, getEmoji);
    }

    // Last resort: mock
    return res.status(200).json({
      success: true,
      source: 'mock',
      data: {
        city: cityName || 'Lucknow',
        state: stateName || 'UP',
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
    });
  }
};

// ─── OpenWeather Fallback ─────────────────────────────────────────
async function fetchOpenWeather(req, res, apiKey, city, lat, lng, getFarmingAlert, getEmoji) {
  let currentUrl, forecastUrl;
  if (lat && lng) {
    currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric&cnt=3`;
  } else {
    const c = city || 'Lucknow';
    currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${c},IN&appid=${apiKey}&units=metric`;
    forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${c},IN&appid=${apiKey}&units=metric&cnt=3`;
  }

  const getOWEmoji = (id) => {
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 400) return '🌦️';
    if (id >= 500 && id < 600) return '🌧️';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫️';
    if (id === 800) return '☀️';
    if (id === 801 || id === 802) return '⛅';
    return '☁️';
  };

  try {
    const [curRes, foreRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);
    const cur = await curRes.json();
    const fore = await foreRes.json();
    if (!curRes.ok) throw new Error('OpenWeather API error');

    const weatherId = cur.weather[0]?.id || 800;
    const temp = Math.round(cur.main.temp);
    const humidity = cur.main.humidity;
    const days = ['Aaj', 'Kal', 'Parso'];
    const forecast = (fore.list || []).slice(0, 3).map((f, i) => ({
      day: days[i],
      temp_high: Math.round(f.main.temp_max || f.main.temp),
      temp_low: Math.round(f.main.temp_min || f.main.temp - 4),
      emoji: getOWEmoji(f.weather[0]?.id || 800),
      rain: f.pop ? `${Math.round(f.pop * 100)}%` : '0%',
    }));

    return res.status(200).json({
      success: true,
      source: 'openweathermap',
      data: {
        city: cur.name || city || 'India',
        state: '',
        country: cur.sys?.country || 'IN',
        temp,
        feels_like: Math.round(cur.main.feels_like),
        humidity,
        description: cur.weather[0]?.description || 'Clear',
        emoji: getOWEmoji(weatherId),
        wind_speed: Math.round((cur.wind?.speed || 0) * 3.6),
        farming_alert: getFarmingAlert(weatherId, temp, humidity),
        forecast: forecast.length > 0 ? forecast : [],
        lat: cur.coord?.lat,
        lng: cur.coord?.lon,
      },
    });
  } catch (err) {
    console.error('OpenWeather fallback error:', err.message);
    return res.status(500).json({ success: false, error: 'Weather fetch failed' });
  }
}
