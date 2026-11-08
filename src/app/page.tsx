import { redirect } from "next/navigation";
import { googleConfigured } from "@/lib/google";
import { getCurrentUser, getPendingGoogle } from "@/lib/session";
import AuthPanel from "./AuthPanel";

const ERRORS: Record<string, string> = {
  "google-failed": "Google sign-in didn't finish. Please try again.",
  "google-not-configured": "Google sign-in isn't set up yet. A grown-up needs to add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local.",
};

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string }> }) {
  if (await getCurrentUser()) redirect("/play");
  const params = await searchParams;
  const pending = await getPendingGoogle();

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2">
      <section className="text-center md:text-left">
        <div className="mb-4 inline-block animate-float text-7xl" aria-hidden>
          ✏️
        </div>
        <h1 className="text-5xl font-bold leading-tight md:text-6xl">
          <span className="text-grape">Write</span>
          <span className="text-bubblegum">Aid</span>
        </h1>
        <p className="mt-3 text-2xl font-medium">Write faster. Write neater. Level up!</p>
        <ul className="mx-auto mt-8 max-w-md space-y-3 text-left text-lg md:mx-0">
          <li className="card flex items-center gap-3 !p-3">
            <span className="text-3xl">📓</span> Copy a word into your real notebook
          </li>
          <li className="card flex items-center gap-3 !p-3">
            <span className="text-3xl">📸</span> Your webcam shows Inky your page
          </li>
          <li className="card flex items-center gap-3 !p-3">
            <span className="text-3xl">🐙</span> Inky gives tips, and you earn XP!
          </li>
        </ul>
      </section>

      <AuthPanel
        initialTab={params.tab === "signup" || pending ? "signup" : "login"}
        googleEnabled={googleConfigured()}
        pendingGoogle={pending ? { email: pending.email, name: pending.name } : null}
        error={params.error ? ERRORS[params.error] : undefined}
      />
    </main>
  );
}
