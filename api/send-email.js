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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsed = await parseBody(req);
    const { to, subject, html, text, apiKey, senderEmail } = parsed;
    const token =
      apiKey ||
      process.env.MAIL_SENDER_API_KEY ||
      process.env.VITE_MAIL_SENDER_API_KEY ||
      process.env.VITE_RESEND_API_KEY ||
      process.env.RESEND_API_KEY;

    if (!token) {
      return res.status(400).json({
        code: 'MISSING_API_KEY',
        error: 'API Key Mail Sender belum diatur. Masukkan API Key di menu Pengaturan atau Environment Variables.',
      });
    }

    let fromEmail =
      senderEmail ||
      process.env.MAIL_SENDER_FROM_EMAIL ||
      process.env.VITE_MAIL_SENDER_FROM_EMAIL ||
      '';

    if (fromEmail && !fromEmail.includes('@')) {
      fromEmail = `MS_noreply@${fromEmail.trim()}`;
    }

    // 1. Dukungan MailerSend (Token berawalan mlsn.)
    if (token.startsWith('mlsn.')) {
      if (!fromEmail || fromEmail.includes('@example.com')) {
        fromEmail = 'MS_noreply@test-p7kx4xw0ny7g9yjr.mlsender.net';
      }

      const mailerSendRes = await fetch('https://api.mailersend.com/v1/email', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: {
            email: fromEmail,
            name: 'UMARA TAX Reminder',
          },
          to: (Array.isArray(to) ? to : [to]).map((em) => ({
            email: em,
          })),
          subject: subject,
          html: html,
          text: text,
        }),
      });

      if (mailerSendRes.status === 202 || mailerSendRes.status === 200) {
        return res.status(200).json({ success: true, provider: 'mailersend' });
      }

      const msData = await mailerSendRes.json().catch(() => ({}));
      return res.status(mailerSendRes.status).json({
        error:
          msData.message ||
          msData.errors?.from?.email?.[0] ||
          'Gagal mengirim email via MailerSend API',
      });
    }

    // 2. Dukungan Resend (Default)
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:
          fromEmail && !fromEmail.includes('@example.com')
            ? fromEmail
            : 'UMARA TAX Reminder <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: html,
        text: text,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      return res.status(resendRes.status).json({
        error: resendData.message || 'Gagal mengirim email via Resend API',
      });
    }

    return res.status(200).json({ success: true, id: resendData.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
