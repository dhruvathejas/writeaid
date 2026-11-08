import { NextResponse } from "next/server";
import { sendWeeklyReport } from "@/lib/report";
import { jsonError, rateLimit } from "@/lib/server-utils";
import { getCurrentUser } from "@/lib/session";
import { contactEmail } from "@/lib/users";

// "Send the weekly report now" button in settings.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in first.", 401);
  if (!contactEmail(user)) return jsonError("Add a grown-up email (or connect Gmail) first.");
  if (!rateLimit(`report:${user.id}`, 3, 60 * 60_000)) return jsonError("Report already sent recently. Check the inbox!", 429);

  const sent = await sendWeeklyReport(user);
  if (!sent) return jsonError("Couldn't send the email. Is RESEND_API_KEY set in .env.local?", 502);
  return NextResponse.json({ ok: true });
}
