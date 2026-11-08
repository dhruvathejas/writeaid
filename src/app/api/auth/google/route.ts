import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleClient, googleConfigured } from "@/lib/google";
import { appUrl } from "@/lib/server-utils";
import { cookieBase, getCurrentUser } from "@/lib/session";

// GET /api/auth/google?mode=login  → "Sign in with Google"
// GET /api/auth/google?mode=link   → "Connect my Gmail" from settings (must be signed in)
export async function GET(req: Request) {
  if (!googleConfigured()) return NextResponse.redirect(`${appUrl()}/?error=google-not-configured`);

  const mode = new URL(req.url).searchParams.get("mode") === "link" ? "link" : "login";
  if (mode === "link" && !(await getCurrentUser())) return NextResponse.redirect(`${appUrl()}/`);

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  url.searchParams.set("prompt", "select_account");

  const store = await cookies();
  const opts = { ...cookieBase, maxAge: 10 * 60 };
  store.set("g_state", state, opts);
  store.set("g_verifier", verifier, opts);
  store.set("g_mode", mode, opts);

  return NextResponse.redirect(url);
}
