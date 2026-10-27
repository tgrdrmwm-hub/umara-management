/**
 * Service Notifikasi Email Agenda & Meeting Kantor UmaraTax
 * Menangani pencocokan staf terlibat (PIC) ke email pribadi mereka,
 * kalkulasi H-3 hari, serta pengiriman email pengingat.
 */

import { supabase } from "./supabase";

/**
 * Menghitung selisih hari dari hari ini ke tanggal agenda.
 * Return:
 *  0 = Hari ini
 *  1 = H-1 (besok)
 *  3 = H-3 (tiga hari lagi)
 *  < 0 = Agenda sudah lewat
 */
export function getDaysUntilEvent(eventDateStr) {
  if (!eventDateStr) return null;
  const eventDate = new Date(eventDateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = eventDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Mencocokkan nama staf pada field PIC agenda dengan data users di database,
 * mengutamakan email pribadi staf jika sudah diisi.
 */
export function resolveEventStaffRecipients(event, allUsers = []) {
  if (!event || !allUsers || allUsers.length === 0) return [];

  const picString = event.pic || "";
  const picNames = picString
    .split(/,|\bdan\b/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const recipients = [];

  for (const name of picNames) {
    const cleanName = name.toLowerCase().replace(/\s*\(owner\)/i, "").trim();

    // Cari user yang namanya cocok
    const matchedUser = allUsers.find((u) => {
      const uName = (u.name || "").toLowerCase().trim();
      return (
        uName === cleanName ||
        uName.includes(cleanName) ||
        cleanName.includes(uName)
      );
    });

    if (matchedUser) {
      // Prioritaskan email pribadi jika sudah diisi, fallback ke email akun
      const targetEmail = matchedUser.personalEmail?.trim() || matchedUser.email?.trim();
      recipients.push({
        id: matchedUser.id,
        name: matchedUser.name,
        targetEmail: targetEmail || "Belum ada email",
        hasValidEmail: Boolean(targetEmail && targetEmail.includes("@")),
        isPersonalEmail: Boolean(matchedUser.personalEmail?.trim()),
        personalEmail: matchedUser.personalEmail || "",
        accountEmail: matchedUser.email || "",
        role: matchedUser.role,
      });
    } else {
      recipients.push({
        id: `unknown-${name}`,
        name: name,
        targetEmail: "Staf tidak terdaftar di sistem",
        hasValidEmail: false,
        isPersonalEmail: false,
        personalEmail: "",
        accountEmail: "",
        role: "Tamu/Eksternal",
      });
    }
  }

  return recipients;
}

/**
 * Format email pengingat meeting H-3 untuk staf
 */
export function buildMeetingEmailTemplate(event, staffName = "Staf") {
  const formattedDate = new Date(event.eventDate + "T00:00:00").toLocaleDateString(
    "id-ID",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  const timeStr = event.isAllDay
    ? "Sepanjang Hari"
    : `${event.startTime || "09:00"} - ${event.endTime || "Selesai"} WIB`;

  const subject = `[Pengingat H-3] Agenda: ${event.title} (${formattedDate})`;

  const bodyText = `Halo ${staffName},

Ini adalah pengingat otomatis bahwa Anda dijadwalkan menghadiri agenda/meeting kantor dalam 3 hari ke depan (H-3):

--------------------------------------------------
* DETAIL AGENDA / MEETING *
--------------------------------------------------
Judul Kegiatan : ${event.title}
Hari, Tanggal  : ${formattedDate}
Waktu          : ${timeStr}
Lokasi         : ${event.location || "Kantor UMARA TAX / Online"}
Staf Terlibat  : ${event.pic || "-"}
Catatan        : ${event.notes || "-"}
Dibuat Oleh    : ${event.createdBy || "Admin"}
--------------------------------------------------

Mohon persiapkan materi dan berkas yang diperlukan sebelum agenda berlangsung.
Jika ada kendala kehadiran, harap segera konfirmasi ke penanggung jawab agenda.

Salam hormat,
Sistem Manajemen UMARA TAX`;

  return { subject, bodyText, formattedDate, timeStr };
}

/**
 * Format HTML email profesional untuk staf
 */
export function buildMeetingEmailHtml(event, staffName = "Staf") {
  const { formattedDate, timeStr } = buildMeetingEmailTemplate(event, staffName);

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
        <span style="background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; display: inline-block; margin-bottom: 10px; border: 1px solid rgba(245, 158, 11, 0.3);">
          Pengingat H-3 Meeting
        </span>
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">UMARA TAX CONSULTANT</h1>
        <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8;">Sistem Manajemen Jadwal & Kegiatan Internal</p>
      </div>

      <div style="padding: 28px 24px;">
        <p style="margin: 0 0 16px; font-size: 15px; color: #334155; line-height: 1.5;">
          Halo <strong>${staffName}</strong>,
        </p>
        <p style="margin: 0 0 20px; font-size: 14px; color: #475569; line-height: 1.6;">
          Ini adalah pengingat otomatis bahwa Anda dijadwalkan menghadiri agenda/meeting kantor dalam <strong>3 hari ke depan (H-3)</strong>:
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px; font-size: 17px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
            ${event.title}
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; width: 120px; font-weight: 600; color: #64748b;">📅 Hari, Tanggal</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">⏰ Waktu</td>
              <td style="padding: 6px 0; color: #0f172a;">${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">📍 Lokasi</td>
              <td style="padding: 6px 0; color: #0f172a;">${event.location || "Kantor UMARA TAX / Online"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">👥 Staf Terlibat</td>
              <td style="padding: 6px 0; color: #2563eb; font-weight: 600;">${event.pic || "-"}</td>
            </tr>
            ${
              event.notes
                ? `<tr>
                    <td style="padding: 6px 0; font-weight: 600; color: #64748b; vertical-align: top;">📝 Catatan</td>
                    <td style="padding: 6px 0; color: #475569;">${event.notes}</td>
                  </tr>`
                : ""
            }
          </table>
        </div>

        <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; line-height: 1.5;">
          Mohon persiapkan materi dan berkas yang diperlukan sebelum agenda berlangsung. Jika berhalangan hadir, harap segera konfirmasi ke penanggung jawab agenda.
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
        Email otomatis dikirim oleh Sistem Website Manajemen UMARA TAX ke email pribadi staf.
      </div>
    </div>
  `;
}

/**
 * Mengirim notifikasi email agenda ke staf yang terlibat.
 * Prioritas 1: Background automated mail sender (1-klik langsung terkirim)
 * Prioritas 2: Supabase Edge Function
 * Prioritas 3: Fallback ke Gmail Web / Client mailto
 */
export async function sendEventMeetingReminder(event, recipients = [], forceDirectClient = false, customSenderEmail = null) {
  const validRecipients = recipients.filter((r) => r.hasValidEmail);
  if (validRecipients.length === 0) {
    throw new Error("Tidak ada email staf valid yang ditemukan untuk agenda ini.");
  }

  const { subject, bodyText } = buildMeetingEmailTemplate(event);
  const htmlBody = buildMeetingEmailHtml(event);
  const emailList = validRecipients.map((r) => r.targetEmail);
  const savedApiKey =
    localStorage.getItem("umara_mail_sender_api_key") ||
    localStorage.getItem("umara_resend_api_key") ||
    "";
  const effectiveSenderEmail =
    (customSenderEmail || localStorage.getItem("umara_email") || "").trim();

  // 1. Kirim via Background Mail Sender (/api/send-email)
  let authToken = localStorage.getItem("umara_token") || sessionStorage.getItem("umara_token");
  if (!authToken && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    authToken = sessionData?.session?.access_token;
  }

  const reqHeaders = { "Content-Type": "application/json" };
  if (authToken) {
    reqHeaders["Authorization"] = `Bearer ${authToken}`;
  }

  const apiRes = await fetch("/api/send-email", {
    method: "POST",
    headers: reqHeaders,
    body: JSON.stringify({
      to: emailList,
      subject,
      html: htmlBody,
      text: bodyText,
      apiKey: savedApiKey,
      senderEmail: effectiveSenderEmail,
    }),
  });

  if (apiRes.ok) {
    const data = await apiRes.json();
    return {
      method: "automated-sender",
      count: validRecipients.length,
      recipients: emailList,
      id: data.id,
      provider: data.provider,
    };
  }

  const errData = await apiRes.json().catch(() => ({}));
  throw new Error(errData.error || "Gagal mengirim email via mail sender otomatis");
}
