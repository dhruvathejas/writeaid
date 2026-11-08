"use client";

import Link from "next/link";
import { useState } from "react";
import { postJson } from "@/lib/client";

export default function ForgotPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await postJson("/api/auth/forgot", { username });
      setMessage(res.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <section className="card w-full space-y-4">
        <h1 className="text-3xl font-bold">🔑 Forgot your passcode?</h1>
        {message ? (
          <p className="rounded-2xl bg-mint/15 p-3 text-lg font-medium text-emerald-700">{message}</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-lg">No problem! We&apos;ll email a reset link to your grown-up.</p>
            <div>
              <label className="label" htmlFor="fg-user">Your username</label>
              <input id="fg-user" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            {error && <p className="font-medium text-bubblegum">{error}</p>}
            <button className="btn btn-grape w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
          </form>
        )}
        <Link href="/" className="block text-center font-semibold text-grape-dark underline">Back to sign in</Link>
      </section>
    </main>
  );
}
