import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { findUserById, type User } from "./users";

const SESSION_COOKIE = "wa_session";
const SESSION_DAYS = 30;

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or too short. Set it in .env.local (openssl rand -base64 48).");
  }
  return new TextEncoder().encode(secret);
}

export const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Sign a short-lived token (used for sessions and the "pending Google link" during signup). */
export async function signToken(payload: JWTPayload, expiresIn: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(key());
}

export async function verifyToken<T extends JWTPayload>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as T;
  } catch {
    return null;
  }
}

export async function createSession(userId: number) {
  const token = await signToken({ uid: userId }, `${SESSION_DAYS}d`);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_DAYS * 86400 });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const payload = await verifyToken<{ uid: number }>((await cookies()).get(SESSION_COOKIE)?.value);
  return payload?.uid ? findUserById(payload.uid) : null;
}

// ── Pending Google link (Google sign-in with no account yet → finish signup) ──
const PENDING_COOKIE = "wa_google_pending";
export type PendingGoogle = { sub: string; email: string | null; name: string | null };

export async function setPendingGoogle(p: PendingGoogle) {
  const token = await signToken({ g: p }, "15m");
  (await cookies()).set(PENDING_COOKIE, token, { ...cookieBase, maxAge: 15 * 60 });
}

export async function getPendingGoogle(): Promise<PendingGoogle | null> {
  const payload = await verifyToken<{ g: PendingGoogle }>((await cookies()).get(PENDING_COOKIE)?.value);
  return payload?.g ?? null;
}

export async function clearPendingGoogle() {
  (await cookies()).delete(PENDING_COOKIE);
}
