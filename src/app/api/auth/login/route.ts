import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody } from "@/lib/server-utils";
import { createSession } from "@/lib/session";
import { findUserByUsername, updateUser } from "@/lib/users";

const Body = z.object({
  username: z.string().trim().min(1, "Type your username").max(40),
  passcode: z.string().min(1, "Type your passcode").max(40),
});

const MAX_TRIES = 5;
const LOCK_MS = 5 * 60 * 1000;
const WRONG = "Hmm, that username or passcode isn't right.";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, Body);
  if (error) return error;

  const user = findUserByUsername(data.username);
  if (!user) return jsonError(WRONG, 401);

  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    return jsonError("Too many tries! Take a little break and try again in a few minutes.", 429);
  }

  if (!(await bcrypt.compare(data.passcode, user.passcodeHash))) {
    const fails = user.failedLogins + 1;
    updateUser(user.id, fails >= MAX_TRIES ? { failedLogins: 0, lockedUntil: Date.now() + LOCK_MS } : { failedLogins: fails });
    return jsonError(WRONG, 401);
  }

  updateUser(user.id, { failedLogins: 0, lockedUntil: null });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
