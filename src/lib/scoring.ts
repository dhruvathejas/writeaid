import { db } from "./db";

// Speed and neatness are tracked internally but never shown as separate counters —
// they only ever surface combined, as XP and stars.

/** Letters per minute that counts as "full speed" for a young writer. */
const TARGET_LPM = 40;
const BASE_XP = 20;
const IMPROVEMENT_BONUS = 5;

export type RoundInput = {
  neatness: number; // 0–100 from the AI
  accuracy: number; // 0–100: how much of the target they actually wrote
  lettersWritten: number;
  durationMs: number;
  multiplier: number;
  previousAverage: number | null;
};

export function scoreRound(r: RoundInput) {
  const minutes = Math.max(r.durationMs, 2000) / 60000;
  const speedLpm = r.lettersWritten / minutes;
  const speedScore = Math.min(100, (speedLpm / TARGET_LPM) * 100);

  // Neatness matters a bit more than speed: fast scribbles shouldn't win.
  const blended = 0.55 * r.neatness + 0.45 * speedScore;
  // Writing something other than the challenge scales the round down.
  const combined = blended * (0.4 + 0.6 * (r.accuracy / 100));

  const improved = r.previousAverage !== null && combined > r.previousAverage + 2;
  const xpEarned = Math.max(1, Math.round((combined / 100) * BASE_XP * r.multiplier)) + (improved ? IMPROVEMENT_BONUS : 0);
  const stars = combined >= 75 ? 3 : combined >= 50 ? 2 : 1;

  return { speedLpm, combined, xpEarned, stars, improved };
}

export function recentAverage(userId: number, n = 10): number | null {
  const row = db
    .prepare(
      `SELECT AVG(combined_score) AS avg, COUNT(*) AS c FROM
         (SELECT combined_score FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)`,
    )
    .get(userId, n) as { avg: number | null; c: number };
  return row.c >= 3 ? row.avg : null;
}

export function insertAttempt(a: {
  userId: number;
  challengeId: string;
  durationMs: number;
  lettersWritten: number;
  speedLpm: number;
  neatness: number;
  accuracy: number;
  combined: number;
  xpEarned: number;
  tips: string[];
}) {
  db.prepare(
    `INSERT INTO attempts (user_id, challenge_id, duration_ms, letters_written, speed_lpm, neatness, accuracy,
                           combined_score, xp_earned, tips, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    a.userId,
    a.challengeId,
    a.durationMs,
    a.lettersWritten,
    a.speedLpm,
    a.neatness,
    a.accuracy,
    a.combined,
    a.xpEarned,
    JSON.stringify(a.tips),
    Date.now(),
  );
}
