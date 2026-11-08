import { db } from "./db";
import type { FlipMode, PublicUser } from "./shared";

export type User = {
  id: number;
  username: string;
  displayName: string;
  passcodeHash: string;
  avatar: string;
  color: string;
  email: string | null;
  googleId: string | null;
  googleEmail: string | null;
  xp: number;
  flipMode: FlipMode | null;
  failedLogins: number;
  lockedUntil: number | null;
  lastReportAt: number | null;
  createdAt: number;
};

const COLUMNS = `
  id, username, display_name AS displayName, passcode_hash AS passcodeHash, avatar, color,
  email, google_id AS googleId, google_email AS googleEmail, xp, flip_mode AS flipMode,
  failed_logins AS failedLogins, locked_until AS lockedUntil, last_report_at AS lastReportAt,
  created_at AS createdAt`;

export function findUserById(id: number): User | null {
  return (db.prepare(`SELECT ${COLUMNS} FROM users WHERE id = ?`).get(id) as User) ?? null;
}

export function findUserByUsername(username: string): User | null {
  return (db.prepare(`SELECT ${COLUMNS} FROM users WHERE username = ?`).get(username) as User) ?? null;
}

export function findUserByGoogleId(googleId: string): User | null {
  return (db.prepare(`SELECT ${COLUMNS} FROM users WHERE google_id = ?`).get(googleId) as User) ?? null;
}

export function createUser(input: {
  username: string;
  displayName: string;
  passcodeHash: string;
  avatar: string;
  color: string;
  email: string | null;
  googleId: string | null;
  googleEmail: string | null;
}): User {
  const info = db
    .prepare(
      `INSERT INTO users (username, display_name, passcode_hash, avatar, color, email, google_id, google_email, created_at)
       VALUES (@username, @displayName, @passcodeHash, @avatar, @color, @email, @googleId, @googleEmail, @createdAt)`,
    )
    .run({ ...input, createdAt: Date.now() });
  return findUserById(Number(info.lastInsertRowid))!;
}

const UPDATABLE = {
  displayName: "display_name",
  passcodeHash: "passcode_hash",
  avatar: "avatar",
  color: "color",
  email: "email",
  googleId: "google_id",
  googleEmail: "google_email",
  flipMode: "flip_mode",
  failedLogins: "failed_logins",
  lockedUntil: "locked_until",
  lastReportAt: "last_report_at",
} as const satisfies Partial<Record<keyof User, string>>;

export type UserPatch = Partial<Pick<User, keyof typeof UPDATABLE>>;

export function updateUser(id: number, patch: UserPatch) {
  const keys = (Object.keys(patch) as (keyof typeof UPDATABLE)[]).filter((k) => k in UPDATABLE && patch[k] !== undefined);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${UPDATABLE[k]} = @${k}`).join(", ");
  db.prepare(`UPDATE users SET ${sets} WHERE id = @id`).run({ ...patch, id });
}

export function addXp(id: number, amount: number) {
  db.prepare(`UPDATE users SET xp = xp + ? WHERE id = ?`).run(amount, id);
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    color: u.color,
    xp: u.xp,
    flipMode: u.flipMode,
    email: u.email,
    googleEmail: u.googleEmail,
    googleLinked: u.googleId !== null,
  };
}

/** The address we can email for this kid (grown-up email first, then the linked Gmail). */
export function contactEmail(u: User) {
  return u.email ?? u.googleEmail ?? null;
}
