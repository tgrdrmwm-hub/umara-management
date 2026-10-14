import { createClient } from '@supabase/supabase-js';

async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsed = await parseBody(req);
    const input = (parsed.input || '').trim().toLowerCase();
    if (!input) {
      return res.status(400).json({ error: 'Input wajib diisi' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      // Fallback
      const fallbackEmail = !input.includes('@') ? `${input}@umaratax.com` : input;
      return res.status(200).json({ email: fallbackEmail });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    let targetEmail = input;
    if (!input.includes('@')) {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('email')
        .ilike('name', input)
        .maybeSingle();

      targetEmail = userRow?.email || `${input}@umaratax.com`;
    } else {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('email')
        .ilike('personal_email', input)
        .maybeSingle();

      if (userRow?.email) {
        targetEmail = userRow.email;
      }
    }

    return res.status(200).json({ email: targetEmail });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
