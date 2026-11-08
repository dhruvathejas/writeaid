"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { postJson } from "@/lib/client";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [passcode, setPasscode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (passcode !== confirm) return setError("The two passcodes don't match.");
    setBusy(true);
    setError("");
    try {
      await postJson("/api/auth/reset", { token, passcode });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <p className="text-lg">This link is missing its secret code. Ask for a new reset email.</p>;
  if (done)
    return (
      <div className="space-y-4">
        <p className="rounded-2xl bg-mint/15 p-3 text-lg font-medium text-emerald-700">🎉 New passcode saved!</p>
        <Link href="/" className="btn btn-grape w-full">Sign in</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="rs-pass">New passcode</label>
        <input id="rs-pass" className="input tracking-[0.3em]" type="password" autoComplete="new-password" value={passcode} onChange={(e) => setPasscode(e.target.value)} required />
      </div>
      <div>
        <label className="label" htmlFor="rs-pass2">Type it again</label>
        <input id="rs-pass2" className="input tracking-[0.3em]" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      {error && <p className="font-medium text-bubblegum">{error}</p>}
      <button className="btn btn-pink w-full" disabled={busy}>{busy ? "Saving…" : "Save new passcode"}</button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <section className="card w-full space-y-4">
        <h1 className="text-3xl font-bold">🔐 Pick a new passcode</h1>
        <Suspense>
          <ResetForm />
        </Suspense>
      </section>
    </main>
  );
}
