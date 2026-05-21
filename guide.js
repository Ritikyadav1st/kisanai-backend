// GET /api/sellers?lat=26.8&lng=80.9&disease=blight&city=Lucknow
// Returns: { sellers: [...], products: [...] }

const PRODUCTS = [
  { id: 1, name: 'Mancozeb 75% WP', brand: 'Dhanuka Group', category: 'Fungicide', price: 240, unit: '500g', rating: 4.8, reviews: 342, diseases: ['blight', 'fungal', 'rust', 'mildew'], organic: false, emoji: '💧' },
  { id: 2, name: 'Neem Oil Spray', brand: 'GreenFarm Organics', category: 'Organic', price: 185, unit: '1 Litre', rating: 4.6, reviews: 218, diseases: ['blight', 'aphid', 'mite', 'whitefly', 'fungal'], organic: true, emoji: '🌿' },
  { id: 3, name: 'Copper Sulphate 0.3%', brand: 'Tata Rally', category: 'Fungicide', price: 320, unit: '250g', rating: 4.4, reviews: 156, diseases: ['blight', 'fungal', 'bacterial'], organic: false, emoji: '⚗️' },
  { id: 4, name: 'Carbendazim 50% WP', brand: 'BASF India', category: 'Fungicide', price: 290, unit: '250g', rating: 4.7, reviews: 289, diseases: ['fungal', 'wilt', 'rust', 'blight'], organic: false, emoji: '🧪' },
  { id: 5, name: 'Imidacloprid 17.8% SL', brand: 'Bayer CropScience', category: 'Insecticide', price: 450, unit: '250ml', rating: 4.5, reviews: 412, diseases: ['aphid', 'whitefly', 'thrips', 'mealybug'], organic: false, emoji: '🔬' },
  { id: 6, name: 'Chlorpyrifos 20% EC', brand: 'Coromandel', category: 'Insecticide', price: 380, unit: '500ml', rating: 4.3, reviews: 198, diseases: ['caterpillar', 'beetle', 'borer', 'termite'], organic: false, emoji: '💊' },
  { id: 7, name: 'DAP Fertilizer', brand: 'IFFCO', category: 'Fertilizer', price: 1350, unit: '50kg bag', rating: 4.9, reviews: 892, diseases: ['nutrient_deficiency', 'yellowing'], organic: false, emoji: '🌾' },
  { id: 8, name: 'NPK 19-19-19', brand: 'Yara India', category: 'Fertilizer', price: 850, unit: '25kg bag', rating: 4.6, reviews: 534, diseases: ['nutrient_deficiency', 'slow_growth'], organic: false, emoji: '⚡' },
  { id: 9, name: 'Vermicompost', brand: 'NatureFarm', category: 'Organic Fertilizer', price: 350, unit: '10kg', rating: 4.8, reviews: 267, diseases: ['nutrient_deficiency', 'soil_health'], organic: true, emoji: '🌱' },
  { id: 10, name: 'Trichoderma Viride', brand: 'T-Stanes', category: 'Bio-Fungicide', price: 220, unit: '1kg', rating: 4.5, reviews: 143, diseases: ['wilt', 'root_rot', 'damping_off'], organic: true, emoji: '🍄' },
  { id: 11, name: 'Pseudomonas Spray', brand: 'Multiplex Bio', category: 'Bio-Pesticide', price: 280, unit: '1 Litre', rating: 4.4, reviews: 89, diseases: ['bacterial', 'leaf_spot', 'blight'], organic: true, emoji: '🧬' },
  { id: 12, name: 'Propiconazole 25% EC', brand: 'Syngenta India', category: 'Fungicide', price: 520, unit: '500ml', rating: 4.6, reviews: 234, diseases: ['rust', 'blight', 'mildew', 'sheath_blight'], organic: false, emoji: '💉' },
  { id: 13, name: 'Emamectin Benzoate 5%', brand: 'FMC India', category: 'Insecticide', price: 680, unit: '250ml', rating: 4.7, reviews: 312, diseases: ['caterpillar', 'borer', 'diamond_back_moth'], organic: false, emoji: '🔴' },
  { id: 14, name: 'Urea (46% N)', brand: 'NFL India', category: 'Fertilizer', price: 266, unit: '45kg bag', rating: 4.9, reviews: 1243, diseases: ['yellowing', 'nutrient_deficiency'], organic: false, emoji: '🌿' },
  { id: 15, name: 'Kasugamycin 3% SL', brand: 'Aries Agro', category: 'Bactericide', price: 420, unit: '250ml', rating: 4.3, reviews: 167, diseases: ['bacterial', 'leaf_blight', 'bacterial_wilt'], organic: false, emoji: '💊' },
];

const SELLERS = [
  { id: 1, name: 'Ramji Krishi Bhandar', owner: 'Ramji Lal', city: 'Lucknow', lat: 26.8467, lng: 80.9462, address: 'Near Charbagh, Lucknow', phone: '9839XXXXXX', rating: 4.8, reviews: 234, open: true, hours: '8am–8pm', home_delivery: true, products: [1, 2, 3, 4, 5, 7, 8, 14] },
  { id: 2, name: 'Kisan Sewa Kendra', owner: 'Suresh Kumar', city: 'Lucknow', lat: 26.8553, lng: 80.9590, address: 'Aliganj, Lucknow', phone: '9415XXXXXX', rating: 4.6, reviews: 189, open: true, hours: '7am–7pm', home_delivery: false, products: [1, 3, 5, 6, 7, 8, 9, 14] },
  { id: 3, name: 'GreenGrow Agri Store', owner: 'Anita Devi', city: 'Lucknow', lat: 26.8300, lng: 80.9200, address: 'Gomti Nagar, Lucknow', phone: '9935XXXXXX', rating: 4.9, reviews: 412, open: true, hours: '8am–9pm', home_delivery: true, products: [2, 9, 10, 11, 7, 8, 14] },
  { id: 4, name: 'Bharat Agrochemicals', owner: 'Mohan Prasad', city: 'Lucknow', lat: 26.8700, lng: 80.9700, address: 'Hazratganj, Lucknow', phone: '9450XXXXXX', rating: 4.5, reviews: 156, open: false, hours: '9am–6pm', home_delivery: true, products: [4, 5, 6, 12, 13, 15] },
  { id: 5, name: 'Khet Khalyan Centre', owner: 'Vijay Singh', city: 'Varanasi', lat: 25.3176, lng: 82.9739, address: 'Sigra, Varanasi', phone: '9415XXXXXX', rating: 4.7, reviews: 298, open: true, hours: '7:30am–8pm', home_delivery: true, products: [1, 2, 3, 7, 8, 9, 14] },
  { id: 6, name: 'Agro Plus Store', owner: 'Rajendra Yadav', city: 'Kanpur', lat: 26.4499, lng: 80.3319, address: 'Kidwai Nagar, Kanpur', phone: '9918XXXXXX', rating: 4.4, reviews: 134, open: true, hours: '8am–7pm', home_delivery: false, products: [1, 4, 5, 6, 12, 14] },
  { id: 7, name: 'Fasal Mitra Agri', owner: 'Shiv Shankar', city: 'Agra', lat: 27.1767, lng: 78.0081, address: 'Sikandra, Agra', phone: '9760XXXXXX', rating: 4.6, reviews: 203, open: true, hours: '8am–8pm', home_delivery: true, products: [2, 3, 9, 10, 11, 7, 8] },
  { id: 8, name: 'Jain Krishi Vitaran', owner: 'Santosh Jain', city: 'Delhi', lat: 28.6139, lng: 77.2090, address: 'Azadpur Mandi, Delhi', phone: '9958XXXXXX', rating: 4.8, reviews: 567, open: true, hours: '6am–9pm', home_delivery: true, products: [1, 2, 3, 4, 5, 6, 7, 8, 9, 14] },
];

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchProducts(disease) {
  if (!disease) return PRODUCTS.slice(0, 6);
  const keywords = disease.toLowerCase().split(/[\s,]+/);
  const scored = PRODUCTS.map((p) => {
    const score = p.diseases.filter((d) => keywords.some((k) => d.includes(k) || k.includes(d))).length;
    return { ...p, score };
  });
  const matched = scored.filter((p) => p.score > 0).sort((a, b) => b.score - a.score || b.rating - a.rating);
  return matched.length > 0 ? matched.slice(0, 6) : PRODUCTS.slice(0, 6);
}

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng, disease, city } = req.query;
  const userLat = parseFloat(lat) || 26.8467;
  const userLng = parseFloat(lng) || 80.9462;

  const sellersWithDistance = SELLERS.map((s) => ({
    ...s,
    distance: parseFloat(calcDistance(userLat, userLng, s.lat, s.lng).toFixed(1)),
    product_objects: s.products.map((pid) => PRODUCTS.find((p) => p.id === pid)).filter(Boolean),
  }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  const recommendedProducts = matchProducts(disease || '');

  const allProducts = PRODUCTS.map((p) => {
    const nearestSeller = sellersWithDistance.find((s) => s.products.includes(p.id));
    return {
      ...p,
      nearest_seller: nearestSeller ? { name: nearestSeller.name, distance: nearestSeller.distance } : null,
      available: !!nearestSeller,
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      sellers: sellersWithDistance.map((s) => ({
        id: s.id, name: s.name, owner: s.owner, address: s.address,
        phone: s.phone, rating: s.rating, reviews: s.reviews,
        open: s.open, hours: s.hours, home_delivery: s.home_delivery,
        distance: s.distance,
        top_products: s.product_objects.slice(0, 4).map((p) => ({ id: p.id, name: p.name, price: p.price, emoji: p.emoji })),
      })),
      recommended_products: recommendedProducts,
      all_products: allProducts.slice(0, 15),
      disease_searched: disease || null,
    },
  });
};
