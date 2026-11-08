"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Circle";
import { GoogleG } from "@/components/GoogleG";
import { postJson } from "@/lib/client";
import { AVATARS, COLORS } from "@/lib/shared";

type Props = {
  initialTab: "login" | "signup";
  googleEnabled: boolean;
  pendingGoogle: { email: string | null; name: string | null } | null;
  error?: string;
};

export default function AuthPanel({ initialTab, googleEnabled, pendingGoogle, error }: Props) {
  const [tab, setTab] = useState(initialTab);
  return (
    <section className="card mx-auto w-full max-w-md">
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-full border-4 border-ink bg-paper p-1">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full py-2 text-lg font-bold transition ${tab === t ? "bg-grape text-white" : "text-ink/70 hover:bg-grape/10"}`}
          >
            {t === "login" ? "I have an account" : "I'm new!"}
          </button>
        ))}
      </div>
      {error && <p className="mb-4 rounded-2xl bg-bubblegum/15 p-3 font-medium text-bubblegum">{error}</p>}
      {tab === "login" ? <LoginForm googleEnabled={googleEnabled} /> : <SignupForm googleEnabled={googleEnabled} pending={pendingGoogle} />}
    </section>
  );
}

function GoogleButton({ label }: { label: string }) {
  return (
    // Full-page navigation: the OAuth flow redirects through Google and back.
    <a href="/api/auth/google?mode=login" className="btn btn-white w-full">
      <GoogleG /> {label}
    </a>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-sm font-semibold text-ink/50">
      <div className="h-1 flex-1 rounded-full bg-ink/10" /> or <div className="h-1 flex-1 rounded-full bg-ink/10" />
    </div>
  );
}

function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await postJson("/api/auth/login", { username, passcode });
      router.push("/play");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="li-user">Username</label>
        <input id="li-user" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="li-pass">Passcode</label>
        <input id="li-pass" className="input tracking-[0.3em]" type="password" autoComplete="current-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required />
      </div>
      {error && <p className="font-medium text-bubblegum">{error}</p>}
      <button className="btn btn-grape w-full" disabled={busy}>{busy ? "Opening…" : "Let's write! ✏️"}</button>
      <p className="text-center">
        <Link href="/forgot" className="font-semibold text-grape-dark underline decoration-2 underline-offset-4">Forgot passcode?</Link>
      </p>
      {googleEnabled && (
        <>
          <Divider />
          <GoogleButton label="Sign in with Google" />
        </>
      )}
    </form>
  );
}

function SignupForm({ googleEnabled, pending }: { googleEnabled: boolean; pending: Props["pendingGoogle"] }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(pending?.name ?? "");
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [color, setColor] = useState<string>(COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode !== confirm) return setError("The two passcodes don't match.");
    setBusy(true);
    setError("");
    try {
      await postJson("/api/auth/signup", { displayName, username, passcode, avatar, color, email });
      router.push("/setup-camera");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {pending && (
        <p className="rounded-2xl bg-mint/15 p-3 font-medium text-emerald-700">
          ✅ Google account {pending.email ? <b>{pending.email}</b> : ""} will be connected. Just finish making your account!
        </p>
      )}

      <div className="flex flex-col items-center gap-3">
        <Avatar emoji={avatar} color={color} size={88} />
        <div className="flex flex-wrap justify-center gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={`Pick ${a}`}
              onClick={() => setAvatar(a)}
              className={`rounded-full transition ${a === avatar ? "ring-4 ring-grape ring-offset-2" : "opacity-80 hover:opacity-100"}`}
            >
              <Avatar emoji={a} color="#fff" size={40} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
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

      <div>
        <label className="label" htmlFor="su-name">Nickname</label>
        <input id="su-name" className="input" value={displayName} maxLength={24} onChange={(e) => setDisplayName(e.target.value)} placeholder="Super Sam" required />
      </div>
      <div>
        <label className="label" htmlFor="su-user">Username <span className="font-normal text-ink/60">(for signing in)</span></label>
        <input id="su-user" className="input" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="supersam_7" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="su-pass">Passcode</label>
          <input id="su-pass" className="input tracking-[0.3em]" type="password" autoComplete="new-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="4+ chars" required />
        </div>
        <div>
          <label className="label" htmlFor="su-pass2">Again</label>
          <input id="su-pass2" className="input tracking-[0.3em]" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
      </div>
      {!pending && (
        <div>
          <label className="label" htmlFor="su-email">Grown-up&apos;s email <span className="font-normal text-ink/60">(optional)</span></label>
          <input id="su-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="parent@example.com" />
          <p className="mt-1 text-sm text-ink/60">For passcode resets and a weekly progress report.</p>
        </div>
      )}
      {error && <p className="font-medium text-bubblegum">{error}</p>}
      <button className="btn btn-pink w-full" disabled={busy}>{busy ? "Making your account…" : "Create my account 🎉"}</button>
      {googleEnabled && !pending && (
        <>
          <Divider />
          <GoogleButton label="Sign up with Google" />
        </>
      )}
    </form>
  );
}
