// /api/sellers — Marketplace: listings GET/POST/DELETE + old sellers/products

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 60) return `${mins} min pehle`;
  if (mins < 1440) return `${Math.floor(mins/60)} ghante pehle`;
  return `${Math.floor(mins/1440)} din pehle`;
}

const FALLBACK_LISTINGS = [
  { id:'f1', farmer_id:'demo', farmer_name:'Ramesh Kumar', title:'Desi Gai — 2.5 saal, 8L dubh', category:'pashu', price:'38000', unit:'per gai', location:'Ghaziabad, UP', latitude:28.6692, longitude:77.4538, phone:'9876543210', description:'Healthy desi gai, koi bimari nahi, roz 8 litre milk.', is_active:true, created_at: new Date(Date.now()-3600000).toISOString() },
  { id:'f2', farmer_id:'demo', farmer_name:'Suresh Yadav', title:'Gehun — Lok-1, 10 Quintal', category:'fasal', price:'2100', unit:'per quintal', location:'Meerut, UP', latitude:28.9845, longitude:77.7064, phone:'9812345678', description:'Saaf gehun, nayi fasal 2025, no moisture.', is_active:true, created_at: new Date(Date.now()-86400000).toISOString() },
  { id:'f3', farmer_id:'demo', farmer_name:'AgriShop Hapur', title:'DAP Khad — 5 bags original', category:'khad', price:'1350', unit:'per bag', location:'Hapur, UP', latitude:28.7295, longitude:77.7754, phone:'9911223344', description:'Original IFFCO DAP, sealed bags, fresh stock.', is_active:true, created_at: new Date(Date.now()-7200000).toISOString() },
  { id:'f4', farmer_id:'demo', farmer_name:'Mohan Lal', title:'Bhusa — 50 Quintal dry', category:'bhusa', price:'800', unit:'per quintal', location:'Ghaziabad, UP', latitude:28.6450, longitude:77.4250, phone:'9988776655', description:'Dry clean bhusa, bagged ready.', is_active:true, created_at: new Date(Date.now()-172800000).toISOString() },
  { id:'f5', farmer_id:'demo', farmer_name:'Kiran Devi', title:'Tamatar — 5 crate fresh', category:'fasal', price:'600', unit:'per crate', location:'Noida, UP', latitude:28.5355, longitude:77.3910, phone:'9876501234', description:'Fresh tamatar, kal hi toda, direct khet se.', is_active:true, created_at: new Date(Date.now()-1800000).toISOString() },
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supaUrl = process.env.SUPABASE_URL;
  const supaKey = process.env.SUPABASE_ANON_KEY;
  const headers = supaUrl && supaKey ? {
    'apikey': supaKey,
    'Authorization': `Bearer ${supaKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  } : null;

  const { type } = req.query;

  // ── GET listings ─────────────────────────────────────────────
  if ((!type || type === 'listings') && req.method === 'GET') {
    const { lat, lng, distance, category } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxKm = parseFloat(distance) || null;

    let listings = FALLBACK_LISTINGS;

    if (headers) {
      try {
        let url = `${supaUrl}/rest/v1/marketplace_listings?is_active=eq.true&order=created_at.desc&limit=50`;
        if (category && category !== 'all') url += `&category=eq.${category}`;
        const r = await fetch(url, { headers });
        const data = await r.json();
        if (Array.isArray(data) && data.length > 0) listings = data;
      } catch {}
    }

    // Attach distance
    let result = listings.map(l => ({
      ...l,
      distance: (userLat && userLng && l.latitude && l.longitude)
        ? calcDistance(userLat, userLng, l.latitude, l.longitude)
        : null,
      time_ago: timeAgo(l.created_at),
    }));

    // Filter by distance
    if (maxKm && userLat && userLng) {
      result = result.filter(l => l.distance !== null && l.distance <= maxKm);
    }

    // Sort: nearest first, then newest
    result.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return res.status(200).json({ success: true, data: result });
  }

  // ── POST new listing ─────────────────────────────────────────
  if (type === 'listing' && req.method === 'POST') {
    const { farmer_id, farmer_name, title, category, price, unit, location, latitude, longitude, phone, description } = req.body || {};
    if (!title || !phone) return res.status(400).json({ error: 'Title aur phone zaroori hai' });

    const listing = {
      farmer_id: farmer_id || 'anon',
      farmer_name: farmer_name || 'Kisan Ji',
      title, category: category || 'other',
      price: price || '', unit: unit || '',
      location: location || '', latitude: latitude || null, longitude: longitude || null,
      phone, description: description || '',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (headers) {
      try {
        const r = await fetch(`${supaUrl}/rest/v1/marketplace_listings`, {
          method: 'POST', headers,
          body: JSON.stringify(listing),
        });
        const data = await r.json();
        return res.status(200).json({ success: true, data: Array.isArray(data) ? data[0] : data });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }
    return res.status(200).json({ success: true, data: { ...listing, id: 'local_' + Date.now() } });
  }

  // ── DELETE listing ───────────────────────────────────────────
  if (type === 'listing' && req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id zaroori hai' });
    if (headers) {
      try {
        await fetch(`${supaUrl}/rest/v1/marketplace_listings?id=eq.${id}`, { method: 'DELETE', headers });
      } catch {}
    }
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Invalid request' });
};
