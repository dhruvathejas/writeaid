import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/email";
import { appUrl, jsonError, parseBody, rateLimit } from "@/lib/server-utils";
import { clearPendingGoogle, createSession, getPendingGoogle } from "@/lib/session";
import { AVATARS, COLORS, PASSCODE_RE, USERNAME_RE } from "@/lib/shared";
import { contactEmail, createUser, findUserByGoogleId, findUserByUsername } from "@/lib/users";

const Body = z.object({
  displayName: z.string().trim().min(1, "Tell us your nickname!").max(24, "That nickname is a bit long."),
  username: z.string().trim().regex(USERNAME_RE, "Username: 3–20 letters, numbers or _"),
  passcode: z.string().regex(PASSCODE_RE, "Passcode: 4–12 letters or numbers"),
  avatar: z.enum(AVATARS),
  color: z.enum(COLORS),
  email: z.union([z.literal(""), z.email("That grown-up email doesn't look right.")]).optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`signup:${req.headers.get("x-forwarded-for") ?? "local"}`, 10, 60_000)) {
    return jsonError("Whoa, slow down! Try again in a minute.", 429);
  }
  const { data, error } = await parseBody(req, Body);
  if (error) return error;

  if (findUserByUsername(data.username)) return jsonError("That username is taken. Try another one!", 409);

  const pending = await getPendingGoogle();
  if (pending && findUserByGoogleId(pending.sub)) {
    await clearPendingGoogle();
    return jsonError("That Google account is already connected to another WriteAid account.", 409);
  }

  const user = createUser({
    username: data.username,
    displayName: data.displayName,
    passcodeHash: await bcrypt.hash(data.passcode, 10),
    avatar: data.avatar,
    color: data.color,
    email: data.email || null,
    googleId: pending?.sub ?? null,
    googleEmail: pending?.email ?? null,
  });
  if (pending) await clearPendingGoogle();
  await createSession(user.id);

  const to = contactEmail(user);
  if (to) await sendWelcomeEmail(to, user.displayName, appUrl()).catch((e) => console.error(e));

  return NextResponse.json({ ok: true });
}
