import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/server-utils";
import { PASSCODE_RE } from "@/lib/shared";
import { updateUser } from "@/lib/users";

const Body = z.object({
  token: z.string().min(10).max(200),
  passcode: z.string().regex(PASSCODE_RE, "Passcode: 4–12 letters or numbers"),
});

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, Body);
  if (error) return error;

  const hash = crypto.createHash("sha256").update(data.token).digest("hex");
  const row = db
    .prepare(`SELECT user_id AS userId FROM reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`)
    .get(hash, Date.now()) as { userId: number } | undefined;
  if (!row) return jsonError("This reset link has expired or was already used. Ask for a new one!", 400);

  const passcodeHash = await bcrypt.hash(data.passcode, 10);
  db.transaction(() => {
    db.prepare(`UPDATE reset_tokens SET used_at = ? WHERE token_hash = ?`).run(Date.now(), hash);
    updateUser(row.userId, { passcodeHash, failedLogins: 0, lockedUntil: null });
  })();
  return NextResponse.json({ ok: true });
}
