import { redirect } from "next/navigation";
import { googleConfigured } from "@/lib/google";
import { getCurrentUser } from "@/lib/session";
import { toPublicUser } from "@/lib/users";
import SettingsForm from "./SettingsForm";

const MESSAGES: Record<string, { tone: "good" | "bad"; text: string }> = {
  linked: { tone: "good", text: "✅ Gmail connected! You can now use “Sign in with Google”." },
  "google-taken": { tone: "bad", text: "That Google account is already connected to a different WriteAid account." },
  "google-failed": { tone: "bad", text: "Connecting Google didn't finish. Please try again." },
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ linked?: string; error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const p = await searchParams;
  const notice = p.linked ? MESSAGES.linked : p.error ? MESSAGES[p.error] : undefined;
  return <SettingsForm user={toPublicUser(user)} googleEnabled={googleConfigured()} notice={notice} />;
}
