// GET /api/community?type=posts&state=UP
// POST /api/community?type=post  { farmer_id, farmer_name, state, content, image_data }
// POST /api/community?type=like  { farmer_id, post_id }
// GET /api/community?type=comments&post_id=xxx
// POST /api/community?type=comment  { farmer_id, farmer_name, post_id, content }

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  const { type, post_id } = req.query;

  // GET POSTS
  if (type === 'posts' && req.method === 'GET') {
    const { farmer_id } = req.query;
    try {
      const r = await fetch(`${url}/rest/v1/community_posts?order=created_at.desc&limit=20`, { headers });
      const posts = await r.json();
      if (!Array.isArray(posts)) return res.status(200).json({ success: true, data: [] });

      // Get likes for current user
      let myLikes = [];
      if (farmer_id) {
        const lR = await fetch(`${url}/rest/v1/community_likes?farmer_id=eq.${farmer_id}`, { headers });
        myLikes = await lR.json();
        if (!Array.isArray(myLikes)) myLikes = [];
      }

      const likedPostIds = new Set(myLikes.map(l => l.post_id));
      const postsWithLike = posts.map(p => ({ ...p, liked_by_me: likedPostIds.has(p.id) }));
      return res.status(200).json({ success: true, data: postsWithLike });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // CREATE POST
  if (type === 'post' && req.method === 'POST') {
    const { farmer_id, farmer_name, state, content, image_data } = req.body || {};
    if (!farmer_id || !content) return res.status(400).json({ error: 'farmer_id and content required' });
    const r = await fetch(`${url}/rest/v1/community_posts`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({ farmer_id, farmer_name: farmer_name || 'Kisan Ji', state, content, image_data: image_data || null }),
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || data });
  }

  // LIKE/UNLIKE
  if (type === 'like' && req.method === 'POST') {
    const { farmer_id, post_id: pid } = req.body || {};
    if (!farmer_id || !pid) return res.status(400).json({ error: 'farmer_id and post_id required' });

    // Check existing
    const chR = await fetch(`${url}/rest/v1/community_likes?farmer_id=eq.${farmer_id}&post_id=eq.${pid}&limit=1`, { headers });
    const existing = await chR.json();

    if (Array.isArray(existing) && existing.length > 0) {
      // Unlike
      await fetch(`${url}/rest/v1/community_likes?farmer_id=eq.${farmer_id}&post_id=eq.${pid}`, { method: 'DELETE', headers });
      await fetch(`${url}/rest/v1/community_posts?id=eq.${pid}`, {
        method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ likes_count: Math.max(0, (existing[0]?.likes_count || 1) - 1) }),
      });
      return res.status(200).json({ success: true, liked: false });
    } else {
      // Like
      await fetch(`${url}/rest/v1/community_likes`, {
        method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ farmer_id, post_id: pid }),
      });
      // Get current likes count
      const pR = await fetch(`${url}/rest/v1/community_posts?id=eq.${pid}&select=likes_count`, { headers });
      const pData = await pR.json();
      const current = (pData[0]?.likes_count || 0) + 1;
      await fetch(`${url}/rest/v1/community_posts?id=eq.${pid}`, {
        method: 'PATCH', headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ likes_count: current }),
      });
      return res.status(200).json({ success: true, liked: true });
    }
  }

  // GET COMMENTS
  if (type === 'comments' && req.method === 'GET') {
    if (!post_id) return res.status(400).json({ error: 'post_id required' });
    const r = await fetch(`${url}/rest/v1/community_comments?post_id=eq.${post_id}&order=created_at.asc`, { headers });
    const data = await r.json();
    return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
  }

  // ADD COMMENT
  if (type === 'comment' && req.method === 'POST') {
    const { farmer_id, farmer_name, post_id: pid, content } = req.body || {};
    if (!farmer_id || !pid || !content) return res.status(400).json({ error: 'farmer_id, post_id, content required' });
    await fetch(`${url}/rest/v1/community_comments`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ farmer_id, farmer_name: farmer_name || 'Kisan Ji', post_id: pid, content }),
    });
    // Update comment count
    const pR = await fetch(`${url}/rest/v1/community_posts?id=eq.${pid}&select=comments_count`, { headers });
    const pData = await pR.json();
    const current = (pData[0]?.comments_count || 0) + 1;
    await fetch(`${url}/rest/v1/community_posts?id=eq.${pid}`, {
      method: 'PATCH', headers, body: JSON.stringify({ comments_count: current }),
    });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Invalid type' });
};
