// GET /api/calendar?crop=Tamatar
// GET /api/calendar (all crops)

const FALLBACK = [
  { crop:'Tamatar', crop_hindi:'टमाटर', season:'Year-round', sowing_months:'Jan-Feb, Jun-Jul, Sep-Oct', harvest_months:'Apr-May, Sep-Oct, Dec-Jan', duration_days:75, water_need:'Medium', temp_min:10, temp_max:35, soil_type:'Loamy, Well-drained', notes:'Greenhouse mein saal bhar ugaya ja sakta hai' },
  { crop:'Gehun', crop_hindi:'गेहूं', season:'Rabi', sowing_months:'Oct-Dec', harvest_months:'Mar-Apr', duration_days:120, water_need:'Medium', temp_min:5, temp_max:25, soil_type:'Clay-Loam', notes:'Zyada thand mein nahi, 5°C se zyada chahiye' },
  { crop:'Dhaan', crop_hindi:'धान', season:'Kharif', sowing_months:'Jun-Jul', harvest_months:'Oct-Nov', duration_days:110, water_need:'High', temp_min:20, temp_max:38, soil_type:'Clay, Wetland', notes:'Zyada paani chahiye' },
  { crop:'Aalu', crop_hindi:'आलू', season:'Rabi', sowing_months:'Oct-Nov', harvest_months:'Jan-Feb', duration_days:90, water_need:'Medium', temp_min:5, temp_max:20, soil_type:'Sandy-Loam', notes:'Thand mein acha ugta hai' },
  { crop:'Pyaaz', crop_hindi:'प्याज', season:'Both', sowing_months:'Oct-Nov, Feb-Mar', harvest_months:'Mar-Apr, Jun-Jul', duration_days:120, water_need:'Low-Medium', temp_min:10, temp_max:30, soil_type:'Well-drained Loam', notes:'Bulb development ke liye dry weather chahiye' },
  { crop:'Makka', crop_hindi:'मक्का', season:'Kharif', sowing_months:'Jun-Jul', harvest_months:'Sep-Oct', duration_days:90, water_need:'Medium', temp_min:18, temp_max:35, soil_type:'Sandy-Loam', notes:'Tez hawa se protected jagah par ugayein' },
  { crop:'Sarson', crop_hindi:'सरसों', season:'Rabi', sowing_months:'Oct-Nov', harvest_months:'Feb-Mar', duration_days:110, water_need:'Low', temp_min:5, temp_max:25, soil_type:'Sandy-Loam', notes:'Sookha tolerant crop' },
  { crop:'Arhar', crop_hindi:'अरहर', season:'Kharif', sowing_months:'Jun-Jul', harvest_months:'Dec-Jan', duration_days:180, water_need:'Low', temp_min:20, temp_max:35, soil_type:'Sandy-Loam', notes:'Deep roots — achha drainage chahiye' },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { crop } = req.query;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    const data = crop ? FALLBACK.filter(c => c.crop.toLowerCase() === crop.toLowerCase()) : FALLBACK;
    return res.status(200).json({ success: true, data });
  }

  try {
    let query = 'order=crop.asc';
    if (crop) query = `crop=eq.${encodeURIComponent(crop)}&limit=1`;
    const r = await fetch(`${url}/rest/v1/crop_calendar?${query}`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const data = await r.json();
    const result = Array.isArray(data) && data.length > 0 ? data : FALLBACK;
    return res.status(200).json({ success: true, data: crop ? result.slice(0,1) : result });
  } catch {
    const data = crop ? FALLBACK.filter(c => c.crop.toLowerCase() === crop.toLowerCase()) : FALLBACK;
    return res.status(200).json({ success: true, data });
  }
};
