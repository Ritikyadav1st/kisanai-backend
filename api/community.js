// community.js — Posts + Likes + Comments + Kisan University (YouTube API)
// Vercel Serverless API

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });

  const headers = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const { type } = req.query;

  // ─── COMMUNITY POSTS ────────────────────────────────────────

  if (type === 'posts' && req.method === 'GET') {
    const { farmer_id } = req.query;
    const r = await fetch(`${url}/rest/v1/community_posts?order=created_at.desc&limit=20`, { headers });
    const posts = await r.json();
    if (!Array.isArray(posts)) return res.status(200).json({ success: true, data: [] });

    const enriched = await Promise.all(posts.map(async p => {
      const lr = await fetch(`${url}/rest/v1/community_likes?post_id=eq.${p.id}`, { headers });
      const likes = await lr.json();
      const cr = await fetch(`${url}/rest/v1/community_comments?post_id=eq.${p.id}&select=count`, {
        headers: { ...headers, 'Prefer': 'count=exact' }
      });
      const commentsCount = cr.headers.get('content-range')?.split('/')[1] || 0;
      return {
        ...p,
        likes_count: Array.isArray(likes) ? likes.length : 0,
        liked_by_me: Array.isArray(likes) && farmer_id ? likes.some(l => l.farmer_id === farmer_id) : false,
        comments_count: parseInt(commentsCount) || 0,
      };
    }));
    return res.status(200).json({ success: true, data: enriched });
  }

  if (type === 'post' && req.method === 'POST') {
    const { farmer_id, farmer_name, content } = req.body || {};
    if (!farmer_id || !content) return res.status(400).json({ error: 'farmer_id aur content zaroori hai' });
    const r = await fetch(`${url}/rest/v1/community_posts`, {
      method: 'POST', headers,
      body: JSON.stringify({ farmer_id, farmer_name: farmer_name || 'Kisan Ji', content, created_at: new Date().toISOString() }),
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || data });
  }

  if (type === 'like' && req.method === 'POST') {
    const { farmer_id, post_id } = req.body || {};
    if (!farmer_id || !post_id) return res.status(400).json({ error: 'farmer_id aur post_id zaroori hai' });
    const check = await fetch(`${url}/rest/v1/community_likes?farmer_id=eq.${farmer_id}&post_id=eq.${post_id}`, { headers });
    const existing = await check.json();
    if (Array.isArray(existing) && existing.length > 0) {
      await fetch(`${url}/rest/v1/community_likes?farmer_id=eq.${farmer_id}&post_id=eq.${post_id}`, { method: 'DELETE', headers });
      return res.status(200).json({ success: true, action: 'unliked' });
    }
    await fetch(`${url}/rest/v1/community_likes`, {
      method: 'POST', headers,
      body: JSON.stringify({ farmer_id, post_id, created_at: new Date().toISOString() }),
    });
    return res.status(200).json({ success: true, action: 'liked' });
  }

  if (type === 'comments' && req.method === 'GET') {
    const { post_id } = req.query;
    if (!post_id) return res.status(400).json({ error: 'post_id zaroori hai' });
    const r = await fetch(`${url}/rest/v1/community_comments?post_id=eq.${post_id}&order=created_at.asc`, { headers });
    const data = await r.json();
    return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
  }

  if (type === 'comment' && req.method === 'POST') {
    const { farmer_id, farmer_name, post_id, content } = req.body || {};
    if (!farmer_id || !post_id || !content) return res.status(400).json({ error: 'Fields missing' });
    const r = await fetch(`${url}/rest/v1/community_comments`, {
      method: 'POST', headers,
      body: JSON.stringify({ farmer_id, farmer_name: farmer_name || 'Kisan Ji', post_id, content, created_at: new Date().toISOString() }),
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || data });
  }

  // ─── KISAN UNIVERSITY — YOUTUBE API ──────────────────────────

  // GET /api/community?type=videos&category=disease&search=tamatar
  if (type === 'videos' && req.method === 'GET') {
    const { category = 'all', search = '' } = req.query;
    const ytKey = process.env.YOUTUBE_API_KEY;

    if (!ytKey) {
      return res.status(200).json({ success: true, data: getSampleVideos(), source: 'sample' });
    }

    // Category → Hindi search query mapping
    const CATEGORY_QUERIES = {
      all:        'kheti kisani tips hindi kisan',
      disease:    'fasal mein rog keet prabandhan hindi',
      fertilizer: 'khet mein khad upyog DAP urea hindi',
      irrigation: 'khet sinchai pani prabandhan drip hindi',
      harvest:    'fasal katai threshing post harvest hindi',
      organic:    'jaivik kheti organic farming hindi',
      government: 'PM kisan yojana sarkari scheme kisan hindi',
      market:     'mandi bhav fasal bechna kisan market',
      seeds:      'beej upchar variety selection kisan hindi',
      weather:    'mausam aur kheti kharif rabi fasal',
    };

    const baseQuery = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.all;
    const finalQuery = search.trim()
      ? `${search} kheti kisan hindi`
      : baseQuery;

    try {
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet` +
        `&q=${encodeURIComponent(finalQuery)}` +
        `&type=video` +
        `&maxResults=20` +
        `&relevanceLanguage=hi` +
        `&regionCode=IN` +
        `&videoEmbeddable=true` +
        `&videoDuration=medium` +
        `&key=${ytKey}`;

      const ytRes = await fetch(ytUrl);
      const ytData = await ytRes.json();

      if (ytData.error) {
        console.error('YouTube API Error:', ytData.error.message);
        return res.status(200).json({ success: true, data: getSampleVideos(), source: 'sample', error: ytData.error.message });
      }

      if (!ytData.items || ytData.items.length === 0) {
        return res.status(200).json({ success: true, data: getSampleVideos(), source: 'sample' });
      }

      // YouTube response → our format mein convert karo
      const videos = ytData.items.map((item, idx) => {
        const snippet = item.snippet;
        const videoId = item.id.videoId;
        return {
          id: videoId,
          title: snippet.title,
          description: snippet.description?.substring(0, 120) || '',
          youtube_id: videoId,
          category: category,
          crop: extractCropFromTitle(snippet.title),
          duration: '',
          thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          channel: snippet.channelTitle,
          published: snippet.publishedAt,
          views: 0,
          likes: 0,
        };
      });

      return res.status(200).json({ success: true, data: videos, source: 'youtube' });

    } catch (err) {
      console.error('YouTube fetch error:', err);
      return res.status(200).json({ success: true, data: getSampleVideos(), source: 'sample' });
    }
  }

  // POST /api/community?type=video_view — view count (YouTube videos ke liye skip)
  if (type === 'video_view' && req.method === 'POST') {
    return res.status(200).json({ success: true });
  }

  // GET /api/community?type=video_categories
  if (type === 'video_categories' && req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: [
        { id: 'all',        label: 'Sab',      emoji: '📚' },
        { id: 'disease',    label: 'Rog Ilaaj', emoji: '🔬' },
        { id: 'fertilizer', label: 'Khad',      emoji: '🌱' },
        { id: 'irrigation', label: 'Sinchai',   emoji: '💧' },
        { id: 'harvest',    label: 'Katai',     emoji: '🌾' },
        { id: 'organic',    label: 'Organic',   emoji: '🍃' },
        { id: 'government', label: 'Sarkari',   emoji: '🏛️' },
        { id: 'market',     label: 'Mandi',     emoji: '📊' },
        { id: 'seeds',      label: 'Beej',      emoji: '🫘' },
        { id: 'weather',    label: 'Mausam',    emoji: '🌤️' },
      ]
    });
  }

  return res.status(405).json({ error: 'Invalid type ya method' });
};

// ─── Crop name extract from YouTube title ─────────────────────
function extractCropFromTitle(title) {
  const CROP_MAP = {
    'tamatar': 'Tamatar', 'tomato': 'Tamatar',
    'gehun': 'Gehun', 'wheat': 'Gehun',
    'dhaan': 'Dhaan', 'paddy': 'Dhaan', 'rice': 'Dhaan',
    'aalu': 'Aalu', 'potato': 'Aalu',
    'pyaaz': 'Pyaaz', 'onion': 'Pyaaz',
    'makka': 'Makka', 'maize': 'Makka', 'corn': 'Makka',
    'ganna': 'Ganna', 'sugarcane': 'Ganna',
    'sarson': 'Sarson', 'mustard': 'Sarson',
    'chana': 'Chana', 'chickpea': 'Chana',
    'mirchi': 'Mirchi', 'chilli': 'Mirchi',
    'arhar': 'Arhar', 'dal': 'Dal',
  };
  const lower = title.toLowerCase();
  for (const [key, val] of Object.entries(CROP_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'General';
}

// ─── Sample Videos fallback ───────────────────────────────────
function getSampleVideos() {
  return [
    {
      id: 'sample1',
      title: 'Tamatar mein pani kitna dein — Complete Guide',
      description: 'Tamatar ki fasal mein sahi irrigation technique — drip vs flood',
      youtube_id: 'WKxAWDHKEpI',
      category: 'irrigation',
      crop: 'Tamatar',
      thumbnail: 'https://img.youtube.com/vi/WKxAWDHKEpI/hqdefault.jpg',
      channel: 'KisanAI',
      views: 1240,
    },
    {
      id: 'sample2',
      title: 'Gehun mein DAP kab aur kitna daalein',
      description: 'Rabi season mein gehun ke liye fertilizer schedule',
      youtube_id: 'XcwLOe7bUiE',
      category: 'fertilizer',
      crop: 'Gehun',
      thumbnail: 'https://img.youtube.com/vi/XcwLOe7bUiE/hqdefault.jpg',
      channel: 'KisanAI',
      views: 890,
    },
    {
      id: 'sample3',
      title: 'PM Kisan Samman Nidhi — Form kaise bharein 2024',
      description: 'Step by step guide — PM Kisan registration aur payment status',
      youtube_id: 'RgKAFK5djSk',
      category: 'government',
      crop: 'General',
      thumbnail: 'https://img.youtube.com/vi/RgKAFK5djSk/hqdefault.jpg',
      channel: 'KisanAI',
      views: 3400,
    },
  ];
}
