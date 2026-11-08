"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, CircleButton, CircleLink } from "@/components/Circle";
import { XpBadge } from "@/components/XpBadge";
import { postJson } from "@/lib/client";
import type { PublicUser } from "@/lib/shared";

export function TopBar({ user, xp }: { user: PublicUser; xp: number }) {
  const router = useRouter();
  async function logout() {
    await postJson("/api/auth/logout", {});
    router.push("/");
    router.refresh();
  }
  return (
    <header className="card mb-6 flex flex-wrap items-center justify-between gap-4 !py-3">
      <Link href="/play" className="text-3xl font-bold">
        <span className="text-grape">Write</span>
        <span className="text-bubblegum">Aid</span> ✏️
      </Link>
      <XpBadge xp={xp} compact />
      <div className="flex items-center gap-3">
        <Avatar emoji={user.avatar} color={user.color} size={48} />
        <span className="hidden text-lg font-bold sm:inline">{user.displayName}</span>
        <CircleLink href="/settings" size={48} className="bg-sunny text-2xl" aria-label="Settings" title="Settings">
          ⚙️
        </CircleLink>
        <CircleButton size={48} className="bg-white text-xl" onClick={logout} aria-label="Sign out" title="Sign out">
          👋
        </CircleButton>
      </div>
    </header>
  );
}
