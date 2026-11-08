import { NextResponse } from "next/server";
import { z } from "zod";
import { AiNotConfiguredError, chatWithCoach, isOutOfCredits, OUT_OF_CREDITS_MESSAGE } from "@/lib/ai";
import { jsonError, parseBody, parseImageDataUrl, rateLimit } from "@/lib/server-utils";
import { getCurrentUser } from "@/lib/session";

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "model"]), text: z.string().trim().min(1).max(1200) }))
    .min(1)
    .max(40),
  image: z.string().max(6_000_000).optional(),
  context: z.string().max(1500).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in first.", 401);
  if (!rateLimit(`chat:${user.id}`, 20, 60_000)) return jsonError("Let's take a breath. Try again in a minute! 🐙", 429);

  const { data, error } = await parseBody(req, Body);
  if (error) return error;

  const image = data.image ? parseImageDataUrl(data.image) : undefined;
  if (data.image && !image) return jsonError("The camera picture didn't come through.");

  try {
    const reply = await chatWithCoach({
      history: data.messages.slice(-14),
      image: image ?? undefined,
      context: data.context,
      kidName: user.displayName,
    });
    return NextResponse.json({ reply });
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return jsonError("Inky isn't set up yet. A grown-up needs to add OPENAI_API_KEY to .env.local.", 503);
    }
    if (isOutOfCredits(e)) return jsonError(OUT_OF_CREDITS_MESSAGE, 503);
    console.error("[chat] AI failed:", e);
    return jsonError("Inky's ink ran dry for a second. Try again!", 502);
  }
}
