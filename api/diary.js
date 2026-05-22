// GET /api/diary?farmer_id=xxx&month=2026-05
// POST /api/diary  body: { farmer_id, type, category, amount, description, crop, entry_date }
// DELETE /api/diary?id=xxx

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });

  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' };

  if (req.method === 'GET') {
    const { farmer_id, month } = req.query;
    if (!farmer_id) return res.status(400).json({ error: 'farmer_id required' });
    try {
      let query = `farmer_id=eq.${farmer_id}&order=entry_date.desc&limit=100`;
      if (month) {
        const start = `${month}-01`;
        const end = `${month}-31`;
        query += `&entry_date=gte.${start}&entry_date=lte.${end}`;
      }
      const r = await fetch(`${url}/rest/v1/farm_diary?${query}`, { headers });
      const data = await r.json();
      const entries = Array.isArray(data) ? data : [];
      const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + Number(e.amount), 0);
      const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + Number(e.amount), 0);
      return res.status(200).json({
        success: true,
        data: entries,
        summary: { total_income: totalIncome, total_expense: totalExpense, profit: totalIncome - totalExpense }
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    if (!body.farmer_id || !body.type || !body.amount) {
      return res.status(400).json({ error: 'farmer_id, type, amount required' });
    }
    if (!['income', 'expense'].includes(body.type)) {
      return res.status(400).json({ error: 'type must be income or expense' });
    }
    try {
      const r = await fetch(`${url}/rest/v1/farm_diary`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({ ...body, entry_date: body.entry_date || new Date().toISOString().split('T')[0] }),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data[0] || data });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      await fetch(`${url}/rest/v1/farm_diary?id=eq.${id}`, { method: 'DELETE', headers });
      return res.status(200).json({ success: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
