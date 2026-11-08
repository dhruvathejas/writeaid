import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server-utils";
import { getCurrentUser } from "@/lib/session";
import { updateUser } from "@/lib/users";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in first.", 401);
  updateUser(user.id, { googleId: null, googleEmail: null });
  return NextResponse.json({ ok: true });
}
