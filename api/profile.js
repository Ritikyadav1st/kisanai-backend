const crypto = require('crypto');

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd + 'kisanai_salt_2026').digest('hex');
}
function generateFarmerId() {
  return 'f_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

async function sendWelcomeEmail(email, name, state) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email || !email.includes('@')) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'KisanAI <onboarding@resend.dev>',
        to: email,
        subject: '🌾 KisanAI mein Swagat hai!',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#F4F6F0;font-family:Arial,sans-serif;">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#3B6D11;padding:32px 24px;text-align:center;">
    <div style="font-size:48px;">🌾</div>
    <h1 style="color:#fff;font-size:24px;margin:8px 0 0;">KisanAI</h1>
    <p style="color:#C0DD97;font-size:13px;margin:6px 0 0;">Fasal Mitra — Har Kisan Ka Saathi</p>
  </div>
  <div style="padding:28px 24px;">
    <h2 style="color:#27500A;font-size:20px;margin:0 0 8px;">Namaste, ${name} Ji! 🙏</h2>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px;">KisanAI mein aapka swagat hai! Aapka account successfully ban gaya hai.</p>
    <div style="background:#EAF3DE;border-radius:12px;padding:16px;margin-bottom:20px;">
      <h3 style="color:#27500A;font-size:14px;margin:0 0 12px;">📋 Aapki Details</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="color:#3B6D11;font-size:13px;padding:5px 0;">👤 Naam</td><td style="color:#27500A;font-size:13px;font-weight:600;text-align:right;">${name}</td></tr>
        <tr><td style="color:#3B6D11;font-size:13px;padding:5px 0;">📍 State</td><td style="color:#27500A;font-size:13px;font-weight:600;text-align:right;">${state||'India'}</td></tr>
        <tr><td style="color:#3B6D11;font-size:13px;padding:5px 0;">📱 App Version</td><td style="color:#27500A;font-size:13px;font-weight:600;text-align:right;">v3.2</td></tr>
      </table>
    </div>
    <div style="background:#f8f9f5;border-radius:10px;padding:12px 16px;margin-bottom:8px;border:0.5px solid rgba(59,109,17,0.1);">
      <div style="font-size:20px;display:inline;">🔬</div>
      <div style="display:inline;margin-left:10px;"><strong style="color:#27500A;font-size:13px;">Rog Detect</strong><br><span style="color:#888;font-size:11px;">Photo lo — AI disease batayega</span></div>
    </div>
    <div style="background:#f8f9f5;border-radius:10px;padding:12px 16px;margin-bottom:8px;border:0.5px solid rgba(59,109,17,0.1);">
      <div style="font-size:20px;display:inline;">🌱</div>
      <div style="display:inline;margin-left:10px;"><strong style="color:#27500A;font-size:13px;">Crop Project</strong><br><span style="color:#888;font-size:11px;">Fasal ka poora track karo</span></div>
    </div>
    <div style="background:#f8f9f5;border-radius:10px;padding:12px 16px;margin-bottom:8px;border:0.5px solid rgba(59,109,17,0.1);">
      <div style="font-size:20px;display:inline;">💬</div>
      <div style="display:inline;margin-left:10px;"><strong style="color:#27500A;font-size:13px;">Fasal Mitra</strong><br><span style="color:#888;font-size:11px;">AI se koi bhi sawaal poochho</span></div>
    </div>
    <div style="text-align:center;margin:24px 0 8px;">
      <div style="background:#3B6D11;border-radius:12px;padding:14px 24px;display:inline-block;">
        <p style="color:#fff;font-size:14px;font-weight:700;margin:0;">🌾 Kheti Mubarak Ho!</p>
        <p style="color:#C0DD97;font-size:12px;margin:4px 0 0;">App kholo aur shuru karo</p>
      </div>
    </div>
  </div>
  <div style="background:#f5f7f2;padding:16px 24px;text-align:center;border-top:1px solid #e8ede2;">
    <p style="color:#888;font-size:11px;margin:0 0 4px;">Developed with ❤️ by <strong style="color:#3B6D11;">Ritik Yadav</strong></p>
    <p style="color:#aaa;font-size:10px;margin:0;">KisanAI · 2026 · Ghaziabad, UP, India</p>
  </div>
</div></body></html>`,
      }),
    });
    console.log('Welcome email sent to:', email);
  } catch (err) { console.error('Email error:', err.message); }
}

async function sendLoginAlert(email, name) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !email || !email.includes('@')) return;
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'KisanAI <onboarding@resend.dev>',
        to: email,
        subject: '🔔 KisanAI — Naya Login',
        html: `<!DOCTYPE html><html><body style="margin:0;padding:20px;background:#F4F6F0;font-family:Arial,sans-serif;">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:#3B6D11;padding:20px 24px;text-align:center;">
    <div style="font-size:32px;">🔔</div>
    <h2 style="color:#fff;margin:6px 0 0;font-size:18px;">Login Alert</h2>
  </div>
  <div style="padding:24px;">
    <p style="color:#333;font-size:14px;">Namaste <strong>${name} Ji</strong>,</p>
    <p style="color:#555;font-size:13px;line-height:1.7;">Aapke KisanAI account mein login detect hua:</p>
    <div style="background:#EAF3DE;border-radius:10px;padding:14px;margin:14px 0;">
      <p style="margin:0;color:#27500A;font-size:13px;">🕐 Samay: <strong>${now} IST</strong></p>
    </div>
    <p style="color:#888;font-size:12px;">Agar aapne login nahi kiya to password turant change karein.</p>
  </div>
  <div style="background:#f5f7f2;padding:12px 24px;text-align:center;">
    <p style="color:#aaa;font-size:10px;margin:0;">KisanAI · Ritik Yadav · 2026</p>
  </div>
</div></body></html>`,
      }),
    });
  } catch (err) { console.error('Login alert error:', err.message); }
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

  if (type === 'register' && req.method === 'POST') {
    const { identifier, identifier_type='email', password, name, state, farm_size_acres } = req.body||{};
    if (!identifier||!password) return res.status(400).json({ error: 'identifier aur password zaroori hain' });
    const checkR = await fetch(`${url}/rest/v1/kisan_auth?identifier=eq.${encodeURIComponent(identifier)}&limit=1`, { headers });
    const existing = await checkR.json();
    if (Array.isArray(existing)&&existing.length>0) return res.status(409).json({ error: 'Ye account pehle se exist karta hai. Login karein.' });
    const farmerId = generateFarmerId();
    const pwHash = hashPassword(password);
    await fetch(`${url}/rest/v1/kisan_auth`, { method:'POST', headers:{...headers,'Prefer':'return=minimal'}, body:JSON.stringify({farmer_id:farmerId,identifier,identifier_type,password_hash:pwHash}) });
    await fetch(`${url}/rest/v1/kisan_users`, { method:'POST', headers:{...headers,'Prefer':'return=minimal'}, body:JSON.stringify({farmer_id:farmerId,name:name||'Kisan Ji',state:state||'Uttar Pradesh',farm_size_acres:farm_size_acres||1,onboarding_done:true}) });
    const email = identifier.includes('@') ? identifier : null;
    sendWelcomeEmail(email, name||'Kisan Ji', state||'India');
    return res.status(200).json({ success:true, farmer_id:farmerId, name:name||'Kisan Ji', message:'Account ban gaya! Welcome email bheja ja raha hai 📧' });
  }

  if (type === 'login' && req.method === 'POST') {
    const { identifier, password } = req.body||{};
    if (!identifier||!password) return res.status(400).json({ error: 'identifier aur password zaroori hain' });
    const pwHash = hashPassword(password);
    const authR = await fetch(`${url}/rest/v1/kisan_auth?identifier=eq.${encodeURIComponent(identifier)}&password_hash=eq.${pwHash}&limit=1`, { headers });
    const authData = await authR.json();
    if (!Array.isArray(authData)||authData.length===0) return res.status(401).json({ error: 'Galat identifier ya password' });
    const farmerId = authData[0].farmer_id;
    const profR = await fetch(`${url}/rest/v1/kisan_users?farmer_id=eq.${farmerId}&limit=1`, { headers });
    const profData = await profR.json();
    const profile = Array.isArray(profData)&&profData.length>0 ? profData[0] : { name:'Kisan Ji', state:'UP' };
    if (identifier.includes('@')) sendLoginAlert(identifier, profile.name);
    return res.status(200).json({ success:true, farmer_id:farmerId, name:profile.name, state:profile.state, message:'Login successful!' });
  }

  if (type==='scans'&&req.method==='GET') {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error:'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/scan_history?farmer_id=eq.${farmer_id}&order=scanned_at.desc&limit=10`, { headers });
    const data = await r.json();
    return res.status(200).json({ success:true, data:Array.isArray(data)?data:[] });
  }

  if (type==='scan'&&req.method==='POST') {
    const body = req.body||{};
    if (!body.farmer_id) return res.status(400).json({ error:'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/scan_history`, { method:'POST', headers:{...headers,'Prefer':'return=representation'}, body:JSON.stringify(body) });
    const data = await r.json();
    return res.status(200).json({ success:true, data:data[0]||data });
  }

  if (req.method==='GET') {
    const { farmer_id } = req.query;
    if (!farmer_id) return res.status(400).json({ error:'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/kisan_users?farmer_id=eq.${farmer_id}&limit=1`, { headers });
    const data = await r.json();
    return res.status(200).json({ success:true, data:data[0]||null });
  }

  if (req.method==='POST') {
    const body = req.body||{};
    if (!body.farmer_id) return res.status(400).json({ error:'farmer_id required' });
    const r = await fetch(`${url}/rest/v1/kisan_users`, { method:'POST', headers:{...headers,'Prefer':'resolution=merge-duplicates,return=representation'}, body:JSON.stringify({...body,updated_at:new Date().toISOString()}) });
    const data = await r.json();
    return res.status(200).json({ success:true, data:data[0]||data });
  }

  return res.status(405).json({ error:'Method not allowed' });
};
