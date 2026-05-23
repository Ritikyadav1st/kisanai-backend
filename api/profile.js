// Profile + Auth API
// POST /api/profile?type=register  { identifier, identifier_type, password, name, state, farm_size }
// POST /api/profile?type=login     { identifier, password }
// GET  /api/profile?farmer_id=xxx
// POST /api/profile                { farmer_id, name, state, ... }
// GET  /api/profile?farmer_id=xxx&type=scans
// POST /api/profile?type=scan      { farmer_id, ... }

const crypto = require('crypto');

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + 'kisanai_salt_2026').digest('hex');
}

function generateFarmerId() {
  return 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  const { type } = req.query;

  // ─── REGISTER ───────────────────────────────────────────────
  if (type === 'register' && req.method === 'POST') {
    const { identifier, identifier_type = 'email', password, name, state, farm_size_acres } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: 'identifier aur password zaroori hain' });

    // Check if already exists
    const checkR = await fetch(`${url}/rest/v1/kisan_auth?identifier=eq.${encodeURIComponent(identifier)}&limit=1`, { headers });
    const existing = await checkR.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({ error: 'Ye account pehle se exist karta hai. Login karein.' });
    }

    const farmerId = generateFarmerId();
    const pwHash = hashPassword(password);

    // Create auth record
    await fetch(`${url}/rest/v1/kisan_auth`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ farmer_id: farmerId, identifier, identifier_type, password_hash: pwHash }),
    });

    // Create profile
    await fetch(`${url}/rest/v1/kisan_users`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ farmer_id: farmerId, name: name || 'Kisan Ji', state: state || 'Uttar Pradesh', farm_size_acres: farm_size_acres || 1, onboarding_done: true }),
    });

    return res.status(200).json({ success: true, farmer_id: farmerId, name: name || 'Kisan Ji', message: 'Account ban gaya!' });
  }

  // ─── LOGIN ──────────────────────────────────────────────────
  if (type === 'login' && req.method === 'POST') {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: 'identifier aur password zaroori hain' });

    const pwHash = hashPassword(password);
    const authR = await fetch(`${url}/rest/v1/kisan_auth?identifier=eq.${encodeURIComponent(identifier)}&password_hash=eq.${pwHash}&limit=1`, { headers });
    const authData = await authR.json();

    if (!Array.isArray(authData) || authData.length === 0) {
      return res.status(401).json({ error: 'Galat identifier ya password' });
    }

    const farmerId = authData[0].farmer_id;

    // Get profile
    const profR = await fetch(`${url}/rest/v1/kisan_users?farmer_id=eq.${farmerId}&limit=1`, { headers });
    const profData = await profR.json();
    const profile = Array.isArray(profData) && profData.length > 0 ? profData[0] : { name: 'Kisan Ji', state: 'UP' };

    return res.status(200).json({ success: true, farmer_id: farmerId, name: profile.name, state: profile.state, message: 'Login successful!' });
  }

  // ─── SCAN HISTORY ───────────────────────────────────────────
  if (type === 'scans' && req.method === 'GET') {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/scan_history?farmer_id=eq.${farmer_id}&order=scanned_at.desc&limit=10`, { headers });
    const data = await r.json();
    return res.status(200).json({ success: true, data: Array.isArray(data) ? data : [] });
  }

  if (type === 'scan' && req.method === 'POST') {
    const body = req.body || {};
    if (!body.farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/scan_history`, {
      method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || data });
  }

  // ─── GET PROFILE ────────────────────────────────────────────
  if (req.method === 'GET') {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/kisan_users?farmer_id=eq.${farmer_id}&limit=1`, { headers });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || null });
  }

  // ─── UPDATE PROFILE ─────────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/kisan_users`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }),
    });
    const data = await r.json();
    return res.status(200).json({ success: true, data: data[0] || data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
