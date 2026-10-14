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
    const { username, personalEmail, origin } = parsed;

    const cleanUsername = (username || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanPersonalEmail = (personalEmail || '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 2) {
      return res.status(400).json({ error: 'Nama/Username minimal 2 karakter dan wajib diisi.' });
    }

    if (!cleanPersonalEmail || !cleanPersonalEmail.includes('@') || !cleanPersonalEmail.includes('.')) {
      return res.status(400).json({ error: 'Email pribadi tidak valid.' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: 'Konfigurasi database server belum lengkap. Pastikan SUPABASE_SERVICE_ROLE_KEY diatur di Environment Variables hosting.',
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const accountEmail = `${cleanUsername}@umaratax.com`;

    // 1. Cek apakah username / email / personal_email sudah ada
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('id, name, email, personal_email')
      .or(`name.ilike.${cleanUsername},email.ilike.${accountEmail},personal_email.ilike.${cleanPersonalEmail}`);

    if (existingUsers && existingUsers.length > 0) {
      const found = existingUsers[0];
      let errMsg = 'Akun dengan data ini sudah terdaftar.';
      if (found.name?.toLowerCase() === cleanUsername) {
        errMsg = `Username "${cleanUsername}" sudah digunakan. Silakan gunakan username lain.`;
      } else if (found.personal_email?.toLowerCase() === cleanPersonalEmail) {
        errMsg = `Email pribadi "${cleanPersonalEmail}" sudah terdaftar pada akun lain.`;
      }
      return res.status(400).json({ error: errMsg });
    }

    // 2. Default password awal
    const generatedPassword = '123456';

    // 3. Buat user di Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: accountEmail,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { name: cleanUsername },
    });

    if (authErr) {
      if (authErr.message?.includes('already registered')) {
        return res.status(400).json({
          error: `Username/Email "${cleanUsername}" sudah terdaftar di sistem otentikasi.`,
        });
      }
      throw new Error(`Gagal membuat akun otentikasi: ${authErr.message}`);
    }

    // 4. Simpan profil ke tabel public.users
    const { error: dbErr } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      name: cleanUsername,
      email: accountEmail,
      personal_email: cleanPersonalEmail,
      role: 'staff',
      status: 'active',
      is_first_login: true,
      points: 0,
      attendance_rate: 0,
    });

    if (dbErr) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Gagal menyimpan profil pengguna: ${dbErr.message}`);
    }

    // 5. Kirim email konfirmasi ke email pribadi via MailerSend
    const hostHeader = req.headers?.host ? `https://${req.headers.host}` : 'http://localhost:5173';
    const webBaseUrl = origin || hostHeader;
    const confirmationUrl = `${webBaseUrl}/login?confirmed=1&u=${encodeURIComponent(cleanUsername)}`;

    const emailSubject = `Verifikasi Akun Baru Staf - UMARA TAX Consultant`;
    const emailText = `Halo ${cleanUsername},\n\nSelamat datang di Sistem Manajemen UMARA TAX.\nAkun Anda telah berhasil dibuat. Silakan konfirmasi akun Anda menggunakan tautan berikut:\n${confirmationUrl}\n\nInformasi Akun Anda:\n- Username: ${cleanUsername}\n- Email Akun: ${accountEmail}\n- Kata Sandi Default: ${generatedPassword}\n\nCatatan: Demi keamanan akun, Anda akan diminta untuk mengganti kata sandi setelah berhasil login pertama kali.\n\nSalam hormat,\nUMARA TAX Consultant`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifikasi Akun UMARA TAX</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
          Selamat datang di UMARA TAX. Silakan konfirmasi akun staf Anda untuk mengaktifkan akses sistem.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                    <span style="background-color: rgba(59, 130, 246, 0.2); color: #93c5fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 14px; border-radius: 9999px; display: inline-block; margin-bottom: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
                      Aktivasi Akun Staf
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">UMARA TAX CONSULTANT</h1>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Sistem Manajemen Perpajakan & Operasional Kantor</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 32px 28px;">
                    <p style="margin: 0 0 16px; font-size: 16px; color: #1e293b; line-height: 1.5;">
                      Halo <strong>${cleanUsername}</strong>,
                    </p>
                    <p style="margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.6;">
                      Selamat datang di <strong>Umaratax Management</strong>. Akun baru Anda telah berhasil didaftarkan. Silakan klik tombol konfirmasi di bawah ini untuk mengaktifkan akun Anda:
                    </p>

                    <div style="text-align: center; margin: 28px 0;">
                      <a href="${confirmationUrl}" style="background-color: #1a1a2e; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(26, 26, 46, 0.25);">
                        Konfirmasi Akun & Masuk Sekarang →
                      </a>
                    </div>

                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 14px; font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                        Informasi Akun Anda
                      </h3>
                      <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                        <tr>
                          <td style="padding: 8px 0; width: 140px; font-weight: 600; color: #64748b;">Username</td>
                          <td style="padding: 8px 0; font-weight: 700; color: #0f172a; font-family: monospace;">${cleanUsername}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Email Akun</td>
                          <td style="padding: 8px 0; font-weight: 600; color: #2563eb; font-family: monospace;">${accountEmail}</td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Kata Sandi Default</td>
                          <td style="padding: 8px 0;">
                            <code style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 15px; letter-spacing: 1px;">${generatedPassword}</code>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; font-weight: 600; color: #64748b;">Email Pribadi</td>
                          <td style="padding: 8px 0; color: #475569;">${cleanPersonalEmail}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;">
                      <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.5;">
                        🔒 <strong>Penting:</strong> Kata sandi default adalah <strong>${generatedPassword}</strong>. Setelah berhasil masuk pertama kali, sistem akan langsung mengarahkan Anda untuk mengganti kata sandi dengan kata sandi pribadi Anda demi keamanan akun.
                      </p>
                    </div>

                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5; text-align: center;">
                      Anda dapat masuk menggunakan Username (<strong>${cleanUsername}</strong>) atau Email Akun di atas.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
                    <p style="margin: 0 0 4px; font-weight: 600; color: #64748b;">UMARA TAX CONSULTANT</p>
                    <p style="margin: 0 0 6px;">Email otomatis dikirim ke email pribadi staf untuk aktivasi akun sistem.</p>
                    <p style="margin: 0; color: #cbd5e1;">© 2026 UMARA TAX. Hak cipta dilindungi undang-undang.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const mailerToken = process.env.MAIL_SENDER_API_KEY || process.env.VITE_MAIL_SENDER_API_KEY;
    const senderFrom = process.env.MAIL_SENDER_FROM_EMAIL || process.env.VITE_MAIL_SENDER_FROM_EMAIL || 'MS_noreply@test-p7kx4xw0ny7g9yjr.mlsender.net';

    if (mailerToken) {
      try {
        await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mailerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: {
              email: senderFrom,
              name: 'UMARA TAX Consultant',
            },
            reply_to: {
              email: senderFrom,
              name: 'Administrator UMARA TAX',
            },
            to: [{ email: cleanPersonalEmail, name: cleanUsername }],
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
          }),
        });
      } catch (mailErr) {
        console.error('Failed to send activation email:', mailErr);
      }
    }

    return res.status(200).json({
      success: true,
      username: cleanUsername,
      accountEmail,
      personalEmail: cleanPersonalEmail,
      password: generatedPassword,
      confirmationUrl,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      error: err.message || 'Terjadi kesalahan saat pendaftaran akun.',
    });
  }
}
