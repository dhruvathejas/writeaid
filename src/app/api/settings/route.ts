import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseBody } from "@/lib/server-utils";
import { getCurrentUser } from "@/lib/session";
import { AVATARS, COLORS, FLIP_MODES } from "@/lib/shared";
import { findUserById, toPublicUser, updateUser } from "@/lib/users";

const Body = z.object({
  displayName: z.string().trim().min(1, "Tell us your nickname!").max(24).optional(),
  avatar: z.enum(AVATARS).optional(),
  color: z.enum(COLORS).optional(),
  email: z.union([z.literal(""), z.email("That grown-up email doesn't look right.")]).optional(),
  flipMode: z.enum(FLIP_MODES).optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in first.", 401);
  const { data, error } = await parseBody(req, Body);
  if (error) return error;

  updateUser(user.id, {
    displayName: data.displayName,
    avatar: data.avatar,
    color: data.color,
    flipMode: data.flipMode,
    email: data.email === undefined ? undefined : data.email || null,
  });
  return NextResponse.json({ user: toPublicUser(findUserById(user.id)!) });
}
