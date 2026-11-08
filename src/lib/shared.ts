// Constants and pure helpers that are safe to import from both client and server code.

export const FLIP_MODES = ["none", "mirror", "flip", "rotate"] as const;
export type FlipMode = (typeof FLIP_MODES)[number];

export const FLIP_LABELS: Record<FlipMode, string> = {
  none: "Normal",
  mirror: "Mirror",
  flip: "Upside down",
  rotate: "Spun around",
};

/** Apply the chosen flip to a 2D context so drawing the video at (0,0,w,h) comes out the right way. */
export function applyFlip(ctx: CanvasRenderingContext2D, mode: FlipMode, w: number, h: number) {
  switch (mode) {
    case "mirror":
      ctx.setTransform(-1, 0, 0, 1, w, 0);
      break;
    case "flip":
      ctx.setTransform(1, 0, 0, -1, 0, h);
      break;
    case "rotate":
      ctx.setTransform(-1, 0, 0, -1, w, h);
      break;
    default:
      ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

export const AVATARS = ["🦊", "🐼", "🐯", "🐸", "🦄", "🐙", "🐧", "🦁", "🐨", "🐲", "🦖", "🐝"] as const;
export const COLORS = ["#8b5cf6", "#ec4899", "#f97316", "#10b981", "#0ea5e9", "#eab308"] as const;

export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
export const PASSCODE_RE = /^[a-zA-Z0-9]{4,12}$/;

// ── Levels ──────────────────────────────────────────────
// Level n starts at 25·(n−1)·(n+2) XP → 0, 100, 250, 450, 700, 1000 …
export function xpForLevel(level: number) {
  return 25 * (level - 1) * (level + 2);
}

export function levelFromXp(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

const TITLES = [
  "Pencil Pup",
  "Doodle Dasher",
  "Letter Ranger",
  "Loop Explorer",
  "Ink Knight",
  "Word Wizard",
  "Script Superstar",
  "Penmanship Pro",
  "Legend of Lines",
];

export function levelTitle(level: number) {
  return TITLES[Math.min(level, TITLES.length) - 1];
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const start = xpForLevel(level);
  const end = xpForLevel(level + 1);
  return { level, title: levelTitle(level), into: xp - start, needed: end - start, toNext: end - xp };
}

export type PublicUser = {
  id: number;
  username: string;
  displayName: string;
  avatar: string;
  color: string;
  xp: number;
  flipMode: FlipMode | null;
  email: string | null;
  googleEmail: string | null;
  googleLinked: boolean;
};
