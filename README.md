# writeaid
For people like me, who really need a digital writing aid.

WriteAid is a handwriting game for kids. You copy a word or sentence into your **real notebook**, the webcam shows it to
**Inky 🐙** (an AI coach), and you get friendly tips plus XP. Writing **faster** and **neater** both earn XP, combined into
one number. There are no separate speed or neatness counters.

## Features

- **Notebook camera canvas.** The webcam is drawn onto a canvas, flipped the way you pick on the "Which picture looks right?"
  screen (Normal / Mirror / Upside down / Spun around). The AI sees exactly what you see.
- **AI review + chat.** Uses the OpenAI API (`gpt-5-mini` by default) to read the handwriting, score it, and give tips. Kids can chat
  with Inky, and can attach a photo of their page.
- **Accounts.** Username + passcode (locked for 5 minutes after 5 wrong tries). Connect a Gmail account to sign in with Google.
- **Emails (Resend).** Welcome email, forgot-passcode reset link, Gmail-connected notice, and a weekly progress report to a
  grown-up (sent automatically the first time the game is opened after a week, or with "Send report now" in Settings).

## Run it

```bash
npm install
# fill in .env.local (see below)
npm run dev
```

Open http://localhost:3000. Data is stored in `data/writeaid.db` (SQLite, git-ignored).

## `.env.local`

Copy `.env.example` to `.env.local` if you don't have one yet.

| Key | Where to get it |
| --- | --- |
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys (paid, a tiny amount per photo or chat) |
| `OPENAI_MODEL` | Optional, defaults to `gpt-5-mini` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web). Redirect URI: `http://localhost:3000/api/auth/google/callback` |
| `RESEND_API_KEY` | https://resend.com/api-keys |
| `RESEND_FROM_EMAIL` | `WriteAid <onboarding@resend.dev>` only sends to your own Resend email; verify a domain to email anyone |

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · SQLite (better-sqlite3) · OpenAI (`openai`) ·
Google OAuth (`arctic`) · Resend · `jose` sessions · `bcryptjs`.
