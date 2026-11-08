import { decodeIdToken, type OAuth2Tokens } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sendGoogleLinkedEmail } from "@/lib/email";
import { googleClient, googleConfigured } from "@/lib/google";
import { appUrl } from "@/lib/server-utils";
import { createSession, getCurrentUser, setPendingGoogle } from "@/lib/session";
import { findUserByGoogleId, updateUser } from "@/lib/users";

type GoogleClaims = { sub: string; email?: string; email_verified?: boolean; name?: string; given_name?: string };

export async function GET(req: Request) {
  const go = (path: string) => NextResponse.redirect(`${appUrl()}${path}`);
  if (!googleConfigured()) return go("/?error=google-not-configured");

  const params = new URL(req.url).searchParams;
  const store = await cookies();
  const state = store.get("g_state")?.value;
  const verifier = store.get("g_verifier")?.value;
  const mode = store.get("g_mode")?.value;
  store.delete("g_state");
  store.delete("g_verifier");
  store.delete("g_mode");

  const back = mode === "link" ? "/settings" : "/";
  const code = params.get("code");
  if (!code || !state || !verifier || params.get("state") !== state) return go(`${back}?error=google-failed`);

  let tokens: OAuth2Tokens;
  try {
    tokens = await googleClient().validateAuthorizationCode(code, verifier);
  } catch (e) {
    console.error("[google] code exchange failed:", e);
    return go(`${back}?error=google-failed`);
  }
  const claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  const email = claims.email && claims.email_verified !== false ? claims.email : null;
  const owner = findUserByGoogleId(claims.sub);

  if (mode === "link") {
    const me = await getCurrentUser();
    if (!me) return go("/");
    if (owner && owner.id !== me.id) return go("/settings?error=google-taken");
    updateUser(me.id, { googleId: claims.sub, googleEmail: email });
    if (email) sendGoogleLinkedEmail(email, me.displayName).catch((e) => console.error(e));
    return go("/settings?linked=1");
  }

  // Sign-in mode
  if (owner) {
    await createSession(owner.id);
    return go("/play");
  }
  // No account with this Google yet → finish signup, then it gets linked automatically.
  await setPendingGoogle({ sub: claims.sub, email, name: claims.given_name ?? claims.name ?? null });
  return go("/?tab=signup");
}
