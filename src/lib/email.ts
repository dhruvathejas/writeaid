import { Resend } from "resend";

let client: Resend | null = null;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#fdf4ff;font-family:'Trebuchet MS',Arial,sans-serif;color:#1e1b4b">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <div style="background:linear-gradient(135deg,#8b5cf6,#ec4899);border-radius:24px 24px 0 0;padding:20px 24px;color:#fff">
      <div style="font-size:26px;font-weight:bold">✏️ WriteAid</div>
      <div style="font-size:18px;margin-top:4px">${escapeHtml(title)}</div>
    </div>
    <div style="background:#fff;border-radius:0 0 24px 24px;padding:24px;font-size:16px;line-height:1.5">${body}</div>
    <p style="font-size:12px;color:#6b7280;text-align:center;margin-top:16px">Sent by WriteAid, a handwriting practice game.</p>
  </div></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="text-align:center;margin:24px 0"><a href="${escapeHtml(href)}" style="background:#8b5cf6;color:#fff;
    text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block">${escapeHtml(label)}</a></p>`;
}

async function send(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return false;
  }
  client ??= new Resend(apiKey);
  const { error } = await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "WriteAid <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] Resend error:", error);
    return false;
  }
  return true;
}

export function sendWelcomeEmail(to: string, name: string, appUrl: string) {
  return send(
    to,
    `Welcome to WriteAid, ${name}! ✏️`,
    layout(
      "Welcome aboard!",
      `<p>Hi! <b>${escapeHtml(name)}</b> just joined WriteAid, the game that makes handwriting faster and neater.</p>
       <p>Each round, they copy a word or sentence into their notebook, the webcam takes a look, and Inky the coach 🐙
       gives friendly tips and XP.</p>
       <p>This email address is now the grown-up contact for the account. We'll use it for passcode resets and a short weekly progress report.</p>
       ${button(appUrl, "Start writing")}`,
    ),
  );
}

export function sendGoogleLinkedEmail(to: string, name: string) {
  return send(
    to,
    "Gmail connected to WriteAid",
    layout(
      "Gmail connected ✅",
      `<p>This Google account is now connected to <b>${escapeHtml(name)}</b>'s WriteAid account.
       You can use <i>Sign in with Google</i> instead of typing the passcode.</p>
       <p>If you didn't do this, open WriteAid settings and disconnect it.</p>`,
    ),
  );
}

export function sendResetEmail(to: string, name: string, link: string) {
  return send(
    to,
    "Reset your WriteAid passcode",
    layout(
      "Forgot your passcode?",
      `<p>Someone asked to reset the passcode for <b>${escapeHtml(name)}</b>.</p>
       ${button(link, "Choose a new passcode")}
       <p style="font-size:14px;color:#6b7280">This link works for 30 minutes. If you didn't ask for this, you can ignore this email.</p>`,
    ),
  );
}

export function sendWeeklyReportEmail(
  to: string,
  r: { name: string; rounds: number; xpGained: number; level: number; title: string; trend: string; tips: string[] },
  appUrl: string,
) {
  const tips = r.tips.length
    ? `<p><b>What Inky suggested this week:</b></p><ul>${r.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`
    : "";
  const body =
    r.rounds === 0
      ? `<p><b>${escapeHtml(r.name)}</b> didn't play any rounds this week. A few minutes a day makes a big difference. Maybe try one together?</p>`
      : `<p>Here's how <b>${escapeHtml(r.name)}</b> did this week:</p>
         <ul>
           <li>🎯 <b>${r.rounds}</b> writing round${r.rounds === 1 ? "" : "s"}</li>
           <li>⭐ <b>+${r.xpGained} XP</b>, now Level ${r.level} (${escapeHtml(r.title)})</li>
           <li>📈 ${escapeHtml(r.trend)}</li>
         </ul>${tips}`;
  return send(to, `${r.name}'s WriteAid week`, layout("Weekly progress report", body + button(appUrl, "Open WriteAid")));
}
