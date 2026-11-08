"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FlipView, useCamera } from "@/components/Camera";
import { Circle } from "@/components/Circle";
import { TopBar } from "@/components/TopBar";
import { postJson } from "@/lib/client";
import { FLIP_LABELS, FLIP_MODES, type FlipMode, type PublicUser } from "@/lib/shared";

const BADGES = ["A", "B", "C", "D"];
const BADGE_COLORS = ["bg-grape", "bg-bubblegum", "bg-tangerine", "bg-mint"];

/** Shows the webcam four ways at once; the kid taps whichever looks right. */
export default function FlipPicker({ user }: { user: PublicUser }) {
  const router = useRouter();
  const { state } = useCamera();
  const [picked, setPicked] = useState<FlipMode | null>(user.flipMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!picked) return;
    setSaving(true);
    try {
      await postJson("/api/settings", { flipMode: picked }, "PATCH");
      router.push("/play");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <TopBar user={user} xp={user.xp} />
      <section className="card mb-6 text-center">
        <h1 className="text-3xl font-bold">📸 Which picture looks right?</h1>
        <p className="mx-auto mt-2 max-w-2xl text-lg">
          Hold up your notebook (or a book with words) where the camera can see it. Then tap the picture where the
          words read the normal way: <b>not backwards</b> and <b>not upside down</b>.
        </p>
      </section>

      {state.status === "loading" && <p className="card text-center text-xl">Waking up the camera… 📷</p>}
      {state.status === "error" && <p className="card text-center text-xl text-bubblegum">{state.message}</p>}

      {state.status === "ready" && (
        <div className="grid gap-5 sm:grid-cols-2">
          {FLIP_MODES.map((mode, i) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPicked(mode)}
              className={`card relative overflow-hidden !p-2 text-left transition hover:-translate-y-1 ${
                picked === mode ? "ring-8 ring-mint" : ""
              }`}
            >
              <div className="relative aspect-video overflow-hidden rounded-[20px]">
                <FlipView stream={state.stream} flipMode={mode} />
              </div>
              <div className="flex items-center gap-3 p-2">
                <Circle size={40} className={`${BADGE_COLORS[i]} border-4 border-ink text-xl font-bold text-white`}>
                  {BADGES[i]}
                </Circle>
                <span className="text-xl font-bold">{FLIP_LABELS[mode]}</span>
                {picked === mode && (
                  <Circle size={40} className="ml-auto animate-pop border-4 border-ink bg-mint text-xl text-white">
                    ✓
                  </Circle>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col items-center gap-2">
        {error && <p className="font-medium text-bubblegum">{error}</p>}
        <button className="btn btn-pink px-10 text-2xl" disabled={!picked || saving} onClick={save}>
          {saving ? "Saving…" : "This one! Let's write ✏️"}
        </button>
        <p className="text-ink/60">You can change this anytime in Settings ⚙️</p>
      </div>
    </main>
  );
}
