// community.js — Posts + Likes + Comments + Kisan University Videos
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

    // Likes count + liked by me
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

  // ─── KISAN UNIVERSITY VIDEOS ─────────────────────────────────

  // GET /api/community?type=videos — sab videos fetch karo
  if (type === 'videos' && req.method === 'GET') {
    const { category, search } = req.query;
    let endpoint = `${url}/rest/v1/kisan_videos?order=created_at.desc&limit=50`;
    if (category && category !== 'all') endpoint += `&category=eq.${category}`;

    const r = await fetch(endpoint, { headers });
    const data = await r.json();

    if (!Array.isArray(data)) {
      // Agar table nahi hai toh sample data return karo
      return res.status(200).json({ success: true, data: getSampleVideos(), source: 'sample' });
    }

    let videos = data;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      videos = videos.filter(v =>
        v.title?.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.crop?.toLowerCase().includes(q)
      );
    }

    return res.status(200).json({ success: true, data: videos.length > 0 ? videos : getSampleVideos(), source: videos.length > 0 ? 'db' : 'sample' });
  }

  // POST /api/community?type=add_video — naya video add karo (admin)
  if (type === 'add_video' && req.method === 'POST') {
    const { title, description, youtube_id, youtube_url, category, crop, duration, thumbnail, uploaded_by } = req.body || {};
    if (!title || (!youtube_id && !youtube_url)) {
      return res.status(400).json({ error: 'title aur youtube_id zaroori hai' });
    }

    // YouTube ID extract karo URL se
    let ytId = youtube_id;
    if (!ytId && youtube_url) {
      const match = youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
      ytId = match ? match[1] : null;
    }
    if (!ytId) return res.status(400).json({ error: 'Valid YouTube URL nahi hai' });

    const videoData = {
      title: title.trim(),
      description: description || '',
      youtube_id: ytId,
      category: category || 'general',
      crop: crop || 'all',
      duration: duration || '< 5 min',
      thumbnail: thumbnail || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      uploaded_by: uploaded_by || 'KisanAI',
      views: 0,
      likes: 0,
      created_at: new Date().toISOString(),
    };

    const r = await fetch(`${url}/rest/v1/kisan_videos`, {
      method: 'POST', headers,
      body: JSON.stringify(videoData),
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || data, message: 'Video add ho gaya!' });
  }

  // POST /api/community?type=video_view — view count badhao
  if (type === 'video_view' && req.method === 'POST') {
    const { video_id } = req.body || {};
    if (!video_id) return res.status(400).json({ error: 'video_id zaroori hai' });

    // Views increment karo (RPC ya manual fetch+update)
    const getR = await fetch(`${url}/rest/v1/kisan_videos?id=eq.${video_id}`, { headers });
    const videos = await getR.json();
    if (Array.isArray(videos) && videos.length > 0) {
      await fetch(`${url}/rest/v1/kisan_videos?id=eq.${video_id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ views: (videos[0].views || 0) + 1 }),
      });
    }
    return res.status(200).json({ success: true });
  }

  // GET /api/community?type=video_categories — categories list
  if (type === 'video_categories' && req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: [
        { id: 'all', label: 'Sab', emoji: '📚' },
        { id: 'disease', label: 'Rog Ilaaj', emoji: '🔬' },
        { id: 'fertilizer', label: 'Khad', emoji: '🌱' },
        { id: 'irrigation', label: 'Sinchai', emoji: '💧' },
        { id: 'harvest', label: 'Katai', emoji: '🌾' },
        { id: 'organic', label: 'Organic', emoji: '🍃' },
        { id: 'government', label: 'Sarkari', emoji: '🏛️' },
        { id: 'market', label: 'Mandi', emoji: '📊' },
        { id: 'weather', label: 'Mausam', emoji: '🌤️' },
        { id: 'seeds', label: 'Beej', emoji: '🫘' },
      ]
    });
  }

  return res.status(405).json({ error: 'Invalid type ya method' });
};

// ─── Sample Videos (jab DB empty ho) ─────────────────────────
function getSampleVideos() {
  return [
    {
      id: 1,
      title: 'Tamatar mein pani kitna dein — Complete Guide',
      description: 'Tamatar ki fasal mein sahi irrigation technique — drip vs flood',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'irrigation',
      crop: 'Tamatar',
      duration: '4:32',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      uploaded_by: 'KisanAI',
      views: 1240,
      likes: 89,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Gehun mein DAP kab aur kitna daalein',
      description: 'Rabi season mein gehun ke liye fertilizer schedule',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'fertilizer',
      crop: 'Gehun',
      duration: '3:15',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      uploaded_by: 'KisanAI',
      views: 890,
      likes: 67,
      created_at: new Date().toISOString(),
    },
    {
      id: 3,
      title: 'PM Kisan Samman Nidhi — Form kaise bharein',
      description: 'Step by step guide — PM Kisan registration aur payment status',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'government',
      crop: 'all',
      duration: '6:45',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      uploaded_by: 'KisanAI',
      views: 3400,
      likes: 210,
      created_at: new Date().toISOString(),
    },
    {
      id: 4,
      title: 'Neem spray ghar pe kaise banayein — Organic',
      description: 'Zero cost organic pesticide — sirf neem patti se',
      youtube_id: 'dQw4w9WgXcQ',
      category: 'organic',
      crop: 'all',
      duration: '2:50',
      thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      uploaded_by: 'KisanAI',
      views: 2100,
      likes: 156,
      created_at: new Date().toISOString(),
    },
  ];
}
