import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { createClient } from '@supabase/supabase-js'

function emailSenderPlugin(env = {}) {
  const setupMiddlewares = (server) => {
    server.middlewares.use('/api/send-email', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { to, subject, html, text, apiKey, senderEmail } = parsed;
            const token =
              apiKey ||
              env.MAIL_SENDER_API_KEY ||
              env.VITE_MAIL_SENDER_API_KEY ||
              env.VITE_RESEND_API_KEY ||
              env.RESEND_API_KEY ||
              process.env.MAIL_SENDER_API_KEY;

            if (!token) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  code: 'MISSING_API_KEY',
                  error:
                    'API Key Mail Sender belum diatur. Masukkan API Key di menu Pengaturan atau file .env.',
                }),
              );
              return;
            }

            let fromEmail =
              senderEmail ||
              env.MAIL_SENDER_FROM_EMAIL ||
              env.VITE_MAIL_SENDER_FROM_EMAIL ||
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

              const mailerSendRes = await fetch(
                'https://api.mailersend.com/v1/email',
                {
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
                },
              );

              if (
                mailerSendRes.status === 202 ||
                mailerSendRes.status === 200
              ) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({ success: true, provider: 'mailersend' }),
                );
                return;
              }

              const msData = await mailerSendRes.json().catch(() => ({}));
              res.statusCode = mailerSendRes.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    msData.message ||
                    msData.errors?.from?.email?.[0] ||
                    'Gagal mengirim email via MailerSend API',
                }),
              );
              return;
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
              res.statusCode = resendRes.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    resendData.message || 'Gagal mengirim email via Resend API',
                }),
              );
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, id: resendData.id }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      // Endpoint Resolusi Username / Personal Email ke Account Email (/api/resolve-login)
      server.middlewares.use('/api/resolve-login', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const input = (parsed.input || '').trim().toLowerCase();
            if (!input) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Input wajib diisi' }));
              return;
            }

            const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
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

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ email: targetEmail }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });

      // Endpoint Pendaftaran Pengguna Baru (/api/signup)
      server.middlewares.use('/api/signup', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { username, personalEmail, origin } = parsed;

            const cleanUsername = (username || '').trim().toLowerCase().replace(/\s+/g, '');
            const cleanPersonalEmail = (personalEmail || '').trim().toLowerCase();

            if (!cleanUsername || cleanUsername.length < 2) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Nama/Username minimal 2 karakter dan wajib diisi.' }));
              return;
            }

            if (!cleanPersonalEmail || !cleanPersonalEmail.includes('@') || !cleanPersonalEmail.includes('.')) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Email pribadi tidak valid.' }));
              return;
            }

            const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
            const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (!supabaseUrl || !serviceKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Konfigurasi database server belum lengkap.' }));
              return;
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
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: errMsg }));
              return;
            }

            // 2. Gunakan default password 123456
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
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: `Username/Email "${cleanUsername}" sudah terdaftar di sistem otentikasi.` }));
                return;
              }
              throw new Error(`Gagal membuat akun otentikasi: ${authErr.message}`);
            }

            // 4. Simpan profil ke tabel public.users dengan is_first_login = true (wajib ganti password setelah login)
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
            const webBaseUrl = origin || 'http://localhost:5173';
            const confirmationUrl = `${webBaseUrl}/login?confirmed=1&u=${encodeURIComponent(cleanUsername)}`;

            // Subjek bersih dan profesional untuk mencegah trigger filter spam Gmail
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
                <!-- Preheader snippet -->
                <div style="display:none;font-size:1px;color:#fff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
                  Selamat datang di UMARA TAX. Silakan konfirmasi akun staf Anda untuk mengaktifkan akses sistem.
                </div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0" border="0">
                        <!-- Header -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
                            <span style="background-color: rgba(59, 130, 246, 0.2); color: #93c5fd; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 14px; border-radius: 9999px; display: inline-block; margin-bottom: 12px; border: 1px solid rgba(59, 130, 246, 0.3);">
                              Aktivasi Akun Staf
                            </span>
                            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">UMARA TAX CONSULTANT</h1>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">Sistem Manajemen Perpajakan & Operasional Kantor</p>
                          </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                          <td style="padding: 32px 28px;">
                            <p style="margin: 0 0 16px; font-size: 16px; color: #1e293b; line-height: 1.5;">
                              Halo <strong>${cleanUsername}</strong>,
                            </p>
                            <p style="margin: 0 0 24px; font-size: 14px; color: #475569; line-height: 1.6;">
                              Selamat datang di <strong>Umaratax Management</strong>. Akun baru Anda telah berhasil didaftarkan. Silakan klik tombol konfirmasi di bawah ini untuk mengaktifkan akun Anda:
                            </p>

                            <!-- Button CTA -->
                            <div style="text-align: center; margin: 28px 0;">
                              <a href="${confirmationUrl}" style="background-color: #1a1a2e; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(26, 26, 46, 0.25);">
                                Konfirmasi Akun & Masuk Sekarang →
                              </a>
                            </div>

                            <!-- Detail Card -->
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

                            <!-- Catatan Ganti Password -->
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

                        <!-- Footer resmi anti-spam -->
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

            const mailerToken = env.MAIL_SENDER_API_KEY || process.env.MAIL_SENDER_API_KEY;
            const senderFrom = env.MAIL_SENDER_FROM_EMAIL || process.env.MAIL_SENDER_FROM_EMAIL || 'MS_noreply@test-p7kx4xw0ny7g9yjr.mlsender.net';

            if (mailerToken) {
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
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: true,
                username: cleanUsername,
                accountEmail,
                personalEmail: cleanPersonalEmail,
                password: generatedPassword,
                confirmationUrl,
              }),
            );
          } catch (err) {
            console.error('Signup error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Terjadi kesalahan saat pendaftaran' }));
          }
      });
    });
  };

  return {
    name: 'email-sender-plugin',
    configureServer(server) {
      setupMiddlewares(server);
    },
    configurePreviewServer(server) {
      setupMiddlewares(server);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), emailSenderPlugin(env)],
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'vendor-recharts'
              if (id.includes('framer-motion')) return 'vendor-motion'
              if (id.includes('lucide-react')) return 'vendor-lucide'
              if (id.includes('react/') || id.includes('react-dom/')) return 'vendor-react'
              return 'vendor-core'
            }
          },
        },
      },
    },
  };
});
