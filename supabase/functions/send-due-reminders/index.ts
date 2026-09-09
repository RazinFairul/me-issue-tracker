import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseToStandardDate(dateInput: any): string | null {
  if (!dateInput) return null;
  const raw = String(dateInput).trim().split("T")[0].split(" ")[0];

  if (raw.includes("/") || (raw.includes("-") && raw.split("-")[0].length === 2)) {
    const parts = raw.includes("/") ? raw.split("/") : raw.split("-");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  if (raw.includes("-") && raw.split("-")[0].length === 4) {
    return raw;
  }

  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const gmailUser = Deno.env.get("GMAIL_USER") ?? "";
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD") ?? "";
    const bossEmail = Deno.env.get("BOSS_EMAIL") || "razinfairul@gmail.com";

    if (!gmailUser || !gmailAppPassword) {
      throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD is not set in Supabase Secrets.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ambil semua isu yang mempunyai e-mel PIC dan anggaran tarikh tutup
    const { data: issues, error: fetchError } = await supabase
      .from("issues")
      .select("*")
      .not("pic_email", "is", null)
      .not("estimated_closing", "is", null);

    if (fetchError) throw fetchError;

    const today = new Date();
    const todayFormatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kuala_Lumpur",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(today);

    const todayMs = new Date(todayFormatted).getTime();
    const sentResults = [];
    let client: SMTPClient | null = null;

    const APP_URL = "https://me-issue-tracker.vercel.app";

    for (const issue of issues || []) {
      if (!issue.estimated_closing || !issue.pic_email) continue;

      // Tapisan kebal: Abaikan jika status adalah Closed, Completed, atau Complete (tidak peka huruf besar/kecil)
      const currentStatus = String(issue.status || "").trim().toLowerCase();
      if (
        currentStatus === "closed" ||
        currentStatus === "completed" ||
        currentStatus === "complete"
      ) {
        continue;
      }

      const closingDateStr = parseToStandardDate(issue.estimated_closing);
      if (!closingDateStr) continue;

      const closingMs = new Date(closingDateStr).getTime();
      const daysDiff = Math.round((closingMs - todayMs) / (1000 * 3600 * 24));

      let shouldSend = false;
      let tagLabel = "";
      let titleHeader = "";
      let headerColor = "#d97706";
      let btnColor = "#2563eb";
      let descriptionText = "";

      if (daysDiff === 3) {
        shouldSend = true;
        tagLabel = "3 DAYS BEFORE DUE";
        titleHeader = "⚠️ Due Date Reminder";
        headerColor = "#d97706";
        btnColor = "#2563eb";
        descriptionText = `The following issue assigned to you is approaching its target closing date in <strong>3 DAYS</strong>:`;
      } else if (daysDiff === -3) {
        shouldSend = true;
        tagLabel = "OVERDUE (3 DAYS LATE)";
        titleHeader = "🚨 Overdue Issue Reminder";
        headerColor = "#dc2626";
        btnColor = "#dc2626";
        descriptionText = `The following issue assigned to you is now <strong>OVERDUE by 3 DAYS</strong>:`;
      } else if (daysDiff === -6) {
        shouldSend = true;
        tagLabel = "CRITICAL OVERDUE (6 DAYS LATE)";
        titleHeader = "🛑 Critical Overdue Notice";
        headerColor = "#7f1d1d";
        btnColor = "#7f1d1d";
        descriptionText = `The following issue is strictly <strong>OVERDUE by 6 DAYS</strong> and requires immediate action:`;
      }

      if (shouldSend) {
        if (!client) {
          client = new SMTPClient({
            connection: {
              hostname: "smtp.gmail.com",
              port: 465,
              tls: true,
              auth: {
                username: gmailUser,
                password: gmailAppPassword,
              },
            },
          });
        }

        const subject = `[${tagLabel}] Issue: ${issue.what_issue || "Pending Issue"}`;
        const reporterName = issue.staff_name || issue.staff_id || "-";

        const htmlContent = '<div style="font-family: Arial, sans-serif; padding: 24px; color: #333333; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">' +
          `<h2 style="color: ${headerColor}; margin-top: 0; margin-bottom: 12px; font-size: 20px;">${titleHeader}</h2>` +
          `<p style="font-size: 14px; line-height: 1.5; margin-bottom: 18px;">${descriptionText}</p>` +
          '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">' +
            `<tr><td style="padding: 10px; font-weight: bold; background-color: #f8fafc; border: 1px solid #e2e8f0; width: 35%;">Issue:</td><td style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0;">${issue.what_issue || "-"}</td></tr>` +
            `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Reported by:</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${reporterName}</td></tr>` +
            `<tr><td style="padding: 10px; font-weight: bold; background-color: #f8fafc; border: 1px solid #e2e8f0;">Group:</td><td style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0;">${issue.group_name || "-"}</td></tr>` +
            `<tr><td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">Location:</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${issue.location || "-"}</td></tr>` +
            `<tr><td style="padding: 10px; font-weight: bold; background-color: #f8fafc; border: 1px solid #e2e8f0;">PIC:</td><td style="padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0;">${issue.pic_name || "-"}</td></tr>` +
            `<tr><td style="padding: 10px; font-weight: bold; background-color: #fee2e2; color: #991b1b; border: 1px solid #e2e8f0;">Target Due Date:</td><td style="padding: 10px; background-color: #fee2e2; color: #991b1b; font-weight: bold; border: 1px solid #e2e8f0;">${closingDateStr}</td></tr>` +
          '</table>' +
          '<p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">' +
            'Please update the issue status to <strong>Closed</strong> in the ME Data Tracker system once the issue has been resolved.' +
          '</p>' +
          '<div style="text-align: center; margin: 25px 0;">' +
            `<a href="${APP_URL}" target="_blank" style="background-color: ${btnColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Open ME Issue Tracker ↗</a>` +
          '</div>' +
          `<p style="font-size: 13px; color: #475569; text-align: center; margin-top: 10px;">Or copy link: <a href="${APP_URL}" style="color: #2563eb;">${APP_URL}</a></p>` +
          '<hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px;" />' +
          '<p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">Manufacturing Engineering - Data Tracker System</p>' +
        '</div>';

        await client.send({
          from: `ME Issue Tracker <${gmailUser}>`,
          to: issue.pic_email,
          cc: bossEmail ? [bossEmail] : undefined,
          subject: subject,
          html: htmlContent,
        });

        sentResults.push({
          issue_id: issue.id,
          recipient: issue.pic_email,
          cc: bossEmail,
          condition: tagLabel,
          target_date: closingDateStr,
        });
      }
    }

    if (client) {
      try {
        await client.close();
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Peringatan dihantar: ${sentResults.length} e-mel`,
        processed_date: todayFormatted,
        data: sentResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});