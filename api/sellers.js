// GET /api/sellers?lat=xx&lng=xx&disease=xxx

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

const FALLBACK_PRODUCTS = [
  { id:1, name:'Mancozeb 75% WP', brand:'Dhanuka', category:'Fungicide', price:240, unit:'500g', rating:4.8, diseases:'blight,fungal', organic:false, emoji:'💧', available:true },
  { id:2, name:'Neem Oil Spray', brand:'GreenFarm', category:'Organic', price:185, unit:'1L', rating:4.6, diseases:'blight,aphid,fungal', organic:true, emoji:'🌿', available:true },
  { id:3, name:'DAP Fertilizer', brand:'IFFCO', category:'Fertilizer', price:1350, unit:'50kg', rating:4.9, diseases:'nutrient_deficiency', organic:false, emoji:'🌾', available:true },
];

const FALLBACK_SELLERS = [
  { id:1, name:'Ramji Krishi Bhandar', city:'Lucknow', lat:26.8467, lng:80.9462, address:'Near Charbagh', phone:'9839XXXXXX', rating:4.8, open:true, hours:'8am-8pm', home_delivery:true },
  { id:2, name:'Kisan Sewa Kendra', city:'Lucknow', lat:26.8553, lng:80.9590, address:'Aliganj', phone:'9415XXXXXX', rating:4.6, open:true, hours:'7am-7pm', home_delivery:false },
  { id:3, name:'GreenGrow Agri Store', city:'Lucknow', lat:26.8300, lng:80.9200, address:'Gomti Nagar', phone:'9935XXXXXX', rating:4.9, open:true, hours:'8am-9pm', home_delivery:true },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng, disease } = req.query;
  const userLat = parseFloat(lat) || 26.8467;
  const userLng = parseFloat(lng) || 80.9462;

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_ANON_KEY;

  let products = FALLBACK_PRODUCTS;
  let sellers = FALLBACK_SELLERS;

  if (supaUrl && supaKey) {
    try {
      const headers = { 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` };
      const [pRes, sRes] = await Promise.all([
        fetch(`${supaUrl}/rest/v1/products?active=eq.true&order=rating.desc`, { headers }),
        fetch(`${supaUrl}/rest/v1/sellers?active=eq.true`, { headers }),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      if (Array.isArray(pData) && pData.length > 0) products = pData;
      if (Array.isArray(sData) && sData.length > 0) sellers = sData;
    } catch (e) { console.error('Supabase error:', e); }
  }

  // Filter by disease
  let recommended = products;
  if (disease) {
    const keywords = disease.toLowerCase().split(/[\s,]+/);
    const scored = products.map(p => ({
      ...p,
      score: (p.diseases || '').split(',').filter(d => keywords.some(k => d.includes(k) || k.includes(d))).length
    }));
    const matched = scored.filter(p => p.score > 0).sort((a,b) => b.score - a.score || b.rating - a.rating);
    if (matched.length > 0) recommended = matched;
  }

  const sellersWithDist = sellers
    .map(s => ({ ...s, distance: calcDistance(userLat, userLng, s.lat, s.lng) }))
    .sort((a,b) => a.distance - b.distance);

  return res.status(200).json({
    success: true,
    data: {
      sellers: sellersWithDist.slice(0, 5),
      recommended_products: recommended.slice(0, 6),
      all_products: products,
    },
  });
};
