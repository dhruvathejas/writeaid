import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendResetEmail } from "@/lib/email";
import { appUrl, jsonError, parseBody, rateLimit } from "@/lib/server-utils";
import { contactEmail, findUserByUsername } from "@/lib/users";

const Body = z.object({ username: z.string().trim().min(1, "Type your username").max(40) });
const TOKEN_TTL = 30 * 60 * 1000;

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, Body);
  if (error) return error;
  if (!rateLimit(`forgot:${data.username.toLowerCase()}`, 3, 15 * 60_000)) {
    return jsonError("We already sent a few emails. Check the inbox, or try again later.", 429);
  }

  const user = findUserByUsername(data.username);
  const to = user && contactEmail(user);
  if (user && to) {
    const token = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    db.prepare(`INSERT INTO reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)`).run(hash, user.id, Date.now() + TOKEN_TTL);
    await sendResetEmail(to, user.displayName, `${appUrl()}/reset?token=${token}`);
  }
  // Same answer either way, so nobody can probe which usernames exist.
  return NextResponse.json({
    ok: true,
    message: "If that account has a grown-up email or a connected Gmail, we've sent a reset link there! 📬",
  });
}
