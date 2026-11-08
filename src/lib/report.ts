import { db } from "./db";
import { sendWeeklyReportEmail } from "./email";
import { appUrl } from "./server-utils";
import { levelFromXp, levelTitle } from "./shared";
import { contactEmail, updateUser, type User } from "./users";

const WEEK = 7 * 24 * 60 * 60 * 1000;

type Row = { neatness: number; speed_lpm: number; xp_earned: number; tips: string };

function rowsBetween(userId: number, from: number, to: number) {
  return db
    .prepare(`SELECT neatness, speed_lpm, xp_earned, tips FROM attempts WHERE user_id = ? AND created_at >= ? AND created_at < ? ORDER BY created_at`)
    .all(userId, from, to) as Row[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Describe progress in words only. Parents get a feel for it, not separate speed/neatness numbers. */
function describeTrend(thisWeek: Row[], lastWeek: Row[]) {
  const nNow = avg(thisWeek.map((r) => r.neatness));
  const sNow = avg(thisWeek.map((r) => r.speed_lpm));
  const nPrev = avg(lastWeek.map((r) => r.neatness));
  const sPrev = avg(lastWeek.map((r) => r.speed_lpm));
  if (nNow === null || sNow === null) return "No rounds yet.";
  if (nPrev === null || sPrev === null) return "First week of practice. A great start!";
  const neater = nNow - nPrev > 3;
  const messier = nPrev - nNow > 3;
  const faster = sNow > sPrev * 1.08;
  const slower = sNow < sPrev * 0.92;
  if (neater && faster) return "Writing got both neater and faster than last week. Fantastic!";
  if (neater) return "Handwriting is getting neater than last week.";
  if (faster && !messier) return "Writing speed is picking up compared to last week.";
  if (faster && messier) return "Writing faster, but a little messier. Encourage slowing down slightly.";
  if (messier) return "A bit messier than last week. Short, calm rounds help.";
  if (slower) return "Taking more time per round this week, which is fine while working on neatness.";
  return "Steady progress, similar to last week.";
}

export function buildWeeklyReport(user: User) {
  const now = Date.now();
  const thisWeek = rowsBetween(user.id, now - WEEK, now);
  const lastWeek = rowsBetween(user.id, now - 2 * WEEK, now - WEEK);
  const tips = [...new Set(thisWeek.slice(-6).flatMap((r) => JSON.parse(r.tips) as string[]))].slice(-3);
  const level = levelFromXp(user.xp);
  return {
    name: user.displayName,
    rounds: thisWeek.length,
    xpGained: thisWeek.reduce((s, r) => s + r.xp_earned, 0),
    level,
    title: levelTitle(level),
    trend: describeTrend(thisWeek, lastWeek),
    tips,
  };
}

export async function sendWeeklyReport(user: User) {
  const to = contactEmail(user);
  if (!to) return false;
  updateUser(user.id, { lastReportAt: Date.now() });
  return sendWeeklyReportEmail(to, buildWeeklyReport(user), appUrl());
}

/**
 * There's no always-on server, so the weekly report is sent "lazily": whenever the kid opens
 * the game and it's been a week since the last report (or since signing up).
 */
export function sendWeeklyReportIfDue(user: User) {
  const since = user.lastReportAt ?? user.createdAt;
  if (!contactEmail(user) || Date.now() - since < WEEK) return;
  sendWeeklyReport(user).catch((e) => console.error("[report] failed:", e));
}
