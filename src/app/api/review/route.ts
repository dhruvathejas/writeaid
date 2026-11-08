import { NextResponse } from "next/server";
import { z } from "zod";
import { getChallenge, letterCount, TIERS } from "@/lib/challenges";
import { AiNotConfiguredError, reviewHandwriting, isOutOfCredits, OUT_OF_CREDITS_MESSAGE } from "@/lib/ai";
import { insertAttempt, recentAverage, scoreRound } from "@/lib/scoring";
import { jsonError, parseBody, parseImageDataUrl, rateLimit } from "@/lib/server-utils";
import { getCurrentUser } from "@/lib/session";
import { levelFromXp } from "@/lib/shared";
import { addXp } from "@/lib/users";

const Body = z.object({
  image: z.string().max(6_000_000),
  challengeId: z.string().max(20),
  durationMs: z.number().int().min(0).max(30 * 60_000),
});

export type ReviewResponse =
  | { kind: "no-writing"; praise: string; tips: string[] }
  | {
      kind: "scored";
      readText: string;
      praise: string;
      tips: string[];
      stars: 1 | 2 | 3;
      xpEarned: number;
      improved: boolean;
      totalXp: number;
      leveledUp: boolean;
    };

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Please sign in first.", 401);
  if (!rateLimit(`review:${user.id}`, 8, 60_000)) return jsonError("Inky needs a tiny rest. Try again in a moment!", 429);

  const { data, error } = await parseBody(req, Body);
  if (error) return error;
  const image = parseImageDataUrl(data.image);
  if (!image) return jsonError("The camera picture didn't come through. Try again!");
  const challenge = getChallenge(data.challengeId);
  if (!challenge) return jsonError("Unknown challenge.");

  let review;
  try {
    review = await reviewHandwriting(image, challenge.text);
  } catch (e) {
    if (e instanceof AiNotConfiguredError) {
      return jsonError("Inky isn't set up yet. A grown-up needs to add OPENAI_API_KEY to .env.local.", 503);
    }
    if (isOutOfCredits(e)) return jsonError(OUT_OF_CREDITS_MESSAGE, 503);
    console.error("[review] AI failed:", e);
    return jsonError("Inky couldn't see clearly that time. Try again!", 502);
  }

  if (!review.writingFound || review.lettersWritten === 0) {
    return NextResponse.json<ReviewResponse>({
      kind: "no-writing",
      praise: "I couldn't spot your writing this time!",
      tips: review.tips.length ? review.tips : ["Hold your page so the camera can see it clearly, then tap Done."],
    });
  }

  const lettersWritten = Math.min(review.lettersWritten, letterCount(challenge.text));
  const score = scoreRound({
    neatness: review.neatness,
    accuracy: review.accuracy,
    lettersWritten,
    durationMs: data.durationMs,
    multiplier: TIERS[challenge.tier].multiplier,
    previousAverage: recentAverage(user.id),
  });

  insertAttempt({
    userId: user.id,
    challengeId: challenge.id,
    durationMs: data.durationMs,
    lettersWritten,
    speedLpm: score.speedLpm,
    neatness: review.neatness,
    accuracy: review.accuracy,
    combined: score.combined,
    xpEarned: score.xpEarned,
    tips: review.tips,
  });
  addXp(user.id, score.xpEarned);
  const totalXp = user.xp + score.xpEarned;

  return NextResponse.json<ReviewResponse>({
    kind: "scored",
    readText: review.readText,
    praise: review.praise,
    tips: review.tips.slice(0, 3),
    stars: score.stars as 1 | 2 | 3,
    xpEarned: score.xpEarned,
    improved: score.improved,
    totalXp,
    leveledUp: levelFromXp(totalXp) > levelFromXp(user.xp),
  });
}
