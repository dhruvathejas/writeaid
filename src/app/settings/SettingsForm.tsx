"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Circle";
import { GoogleG } from "@/components/GoogleG";
import { TopBar } from "@/components/TopBar";
import { postJson } from "@/lib/client";
import { AVATARS, COLORS, FLIP_LABELS, type PublicUser } from "@/lib/shared";

type Notice = { tone: "good" | "bad"; text: string };

function NoticeBox({ notice }: { notice?: Notice }) {
  if (!notice) return null;
  return (
    <p className={`rounded-2xl p-3 font-medium ${notice.tone === "good" ? "bg-mint/15 text-emerald-700" : "bg-bubblegum/15 text-bubblegum"}`}>
      {notice.text}
    </p>
  );
}

export default function SettingsForm({ user, googleEnabled, notice }: { user: PublicUser; googleEnabled: boolean; notice?: Notice }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatar, setAvatar] = useState(user.avatar);
  const [color, setColor] = useState(user.color);
  const [email, setEmail] = useState(user.email ?? "");
  const [profileMsg, setProfileMsg] = useState<Notice>();
  const [googleMsg, setGoogleMsg] = useState<Notice | undefined>(notice);
  const [reportMsg, setReportMsg] = useState<Notice>();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>, onError: (n: Notice) => void) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      onError({ tone: "bad", text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  const saveProfile = () =>
    run(
      "profile",
      async () => {
        await postJson("/api/settings", { displayName, avatar, color, email }, "PATCH");
        setProfileMsg({ tone: "good", text: "Saved! ✨" });
        router.refresh();
      },
      setProfileMsg,
    );

  const unlink = () =>
    run(
      "unlink",
      async () => {
        await postJson("/api/auth/google/unlink", {});
        setGoogleMsg({ tone: "good", text: "Gmail disconnected." });
        router.refresh();
      },
      setGoogleMsg,
    );

  const sendReport = () =>
    run(
      "report",
      async () => {
        await postJson("/api/report", {});
        setReportMsg({ tone: "good", text: "Report sent! 📬 Check the inbox." });
      },
      setReportMsg,
    );

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <TopBar user={{ ...user, displayName, avatar, color }} xp={user.xp} />
      <div className="mb-4">
        <Link href="/play" className="btn btn-white">
          ← Back to writing
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile */}
        <section className="card space-y-4">
          <h2 className="text-2xl font-bold">🎨 My profile</h2>
          <div className="flex items-center gap-4">
            <Avatar emoji={avatar} color={color} size={80} />
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label="Pick color"
                  onClick={() => setColor(c)}
                  className={`rounded-full border-4 border-ink ${c === color ? "ring-4 ring-grape ring-offset-2" : ""}`}
                  style={{ background: c, width: 32, height: 32, aspectRatio: "1/1", flexShrink: 0 }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button key={a} type="button" onClick={() => setAvatar(a)} aria-label={`Pick ${a}`} className={`rounded-full ${a === avatar ? "ring-4 ring-grape ring-offset-2" : ""}`}>
                <Avatar emoji={a} color="#fff" size={40} />
              </button>
            ))}
          </div>
          <div>
            <label className="label" htmlFor="st-name">Nickname</label>
            <input id="st-name" className="input" value={displayName} maxLength={24} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="st-email">Grown-up&apos;s email</label>
            <input id="st-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" />
            <p className="mt-1 text-sm text-ink/60">Gets passcode-reset links and the weekly progress report.</p>
          </div>
          <NoticeBox notice={profileMsg} />
          <button className="btn btn-grape w-full" onClick={saveProfile} disabled={busy !== null}>
            {busy === "profile" ? "Saving…" : "Save"}
          </button>
          <p className="text-sm text-ink/60">Username: <b>{user.username}</b></p>
        </section>

        <div className="space-y-6">
          {/* Google */}
          <section className="card space-y-3">
            <h2 className="text-2xl font-bold">📧 Gmail</h2>
            <NoticeBox notice={googleMsg} />
            {user.googleLinked ? (
              <>
                <p className="text-lg">
                  Connected to <b>{user.googleEmail ?? "your Google account"}</b>. You can sign in with Google.
                </p>
                <button className="btn btn-white" onClick={unlink} disabled={busy !== null}>
                  {busy === "unlink" ? "Disconnecting…" : "Disconnect"}
                </button>
              </>
            ) : googleEnabled ? (
              <>
                <p className="text-lg">Connect a Gmail account to sign in with one tap.</p>
                <a href="/api/auth/google?mode=link" className="btn btn-white">
                  <GoogleG /> Connect my Gmail
                </a>
              </>
            ) : (
              <p className="text-ink/70">
                Google sign-in isn&apos;t set up yet. A grown-up needs to add <code>GOOGLE_CLIENT_ID</code> and{" "}
                <code>GOOGLE_CLIENT_SECRET</code> to <code>.env.local</code>.
              </p>
            )}
          </section>

          {/* Camera */}
          <section className="card space-y-3">
            <h2 className="text-2xl font-bold">📸 Camera</h2>
            <p className="text-lg">
              Picture is shown: <b>{user.flipMode ? FLIP_LABELS[user.flipMode] : "not picked yet"}</b>
            </p>
            <Link href="/setup-camera" className="btn btn-sunny">
              🔄 Pick again
            </Link>
          </section>

          {/* Report */}
          <section className="card space-y-3">
            <h2 className="text-2xl font-bold">📬 Weekly report</h2>
            <p className="text-ink/80">
              A short progress email goes to the grown-up email (or connected Gmail) once a week. Send one now?
            </p>
            <NoticeBox notice={reportMsg} />
            <button className="btn btn-mint" onClick={sendReport} disabled={busy !== null}>
              {busy === "report" ? "Sending…" : "Send report now"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
