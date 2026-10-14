// Supabase Edge Function: send-meeting-reminder
// Mengirim email notifikasi H-3 meeting secara otomatis via Resend API
// Deploy command: supabase functions deploy send-meeting-reminder --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { eventTitle, eventDate, startTime, endTime, location, notes, recipients } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "Recipients list is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured in Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailAddresses = recipients.map((r: { email: string }) => r.email).filter(Boolean);
    const formattedDate = new Date(eventDate + "T00:00:00").toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const timeStr = `${startTime || "09:00"} - ${endTime || "Selesai"} WIB`;
    const subject = `[Pengingat H-3] Agenda: ${eventTitle} (${formattedDate})`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
          <h2 style="margin: 0; color: #fbbf24; font-size: 14px; text-transform: uppercase;">Pengingat H-3 Meeting</h2>
          <h1 style="margin: 8px 0 0; font-size: 20px;">UMARA TAX CONSULTANT</h1>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #334155;">Halo Bapak/Ibu Staf,</p>
          <p style="font-size: 14px; color: #475569;">Anda dijadwalkan menghadiri agenda/meeting dalam 3 hari ke depan (H-3):</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px; color: #0f172a;">${eventTitle}</h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Tanggal:</strong> ${formattedDate}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Waktu:</strong> ${timeStr}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Lokasi:</strong> ${location || "Kantor UMARA TAX / Online"}</p>
            ${notes ? `<p style="margin: 4px 0; font-size: 13px;"><strong>Catatan:</strong> ${notes}</p>` : ""}
          </div>
          <p style="font-size: 13px; color: #64748b;">Mohon persiapkan materi yang diperlukan. Terima kasih.</p>
        </div>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "UMARA TAX Reminder <onboarding@resend.dev>",
        to: emailAddresses,
        subject: subject,
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      throw new Error(resendData.message || "Failed to send email via Resend");
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
