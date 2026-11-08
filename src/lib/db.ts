import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "writeaid.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name   TEXT    NOT NULL,
  passcode_hash  TEXT    NOT NULL,
  avatar         TEXT    NOT NULL,
  color          TEXT    NOT NULL,
  email          TEXT,
  google_id      TEXT    UNIQUE,
  google_email   TEXT,
  xp             INTEGER NOT NULL DEFAULT 0,
  flip_mode      TEXT,
  failed_logins  INTEGER NOT NULL DEFAULT 0,
  locked_until   INTEGER,
  last_report_at INTEGER,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id    TEXT    NOT NULL,
  duration_ms     INTEGER NOT NULL,
  letters_written INTEGER NOT NULL,
  speed_lpm       REAL    NOT NULL,
  neatness        INTEGER NOT NULL,
  accuracy        INTEGER NOT NULL,
  combined_score  REAL    NOT NULL,
  xp_earned       INTEGER NOT NULL,
  tips            TEXT    NOT NULL,
  created_at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS attempts_user_time ON attempts(user_id, created_at);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER
);
`;

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

// Reuse one connection across hot reloads in dev.
const g = globalThis as unknown as { __writeaidDb?: Database.Database };
export const db: Database.Database = (g.__writeaidDb ??= open());
