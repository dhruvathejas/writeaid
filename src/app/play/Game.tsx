"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReviewResponse } from "@/app/api/review/route";
import { FlipView, useCamera, type FlipViewHandle } from "@/components/Camera";
import { Circle, CircleButton } from "@/components/Circle";
import { TopBar } from "@/components/TopBar";
import { randomChallenge, TIERS, type Challenge, type Tier } from "@/lib/challenges";
import { postJson } from "@/lib/client";
import type { PublicUser } from "@/lib/shared";
import CoachChat, { type ChatEntry } from "./CoachChat";

type Phase =
  | { name: "ready" }
  | { name: "countdown"; n: number }
  | { name: "writing" }
  | { name: "reviewing" }
  | { name: "result"; result: ReviewResponse }
  | { name: "error"; message: string };

const DEVICE_KEY = "writeaid:camera";

function loadDevice() {
  try {
    return localStorage.getItem(DEVICE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export default function Game({ user }: { user: PublicUser }) {
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  useEffect(() => setDeviceId(loadDevice()), []);
  const { state: cam, devices } = useCamera(deviceId);
  const camRef = useRef<FlipViewHandle>(null);

  const [xp, setXp] = useState(user.xp);
  const [tier, setTier] = useState<Tier>("easy");
  const [challenge, setChallenge] = useState<Challenge>(() => randomChallenge("easy"));
  const [phase, setPhase] = useState<Phase>({ name: "ready" });
  const startedAt = useRef(0);

  const [chat, setChat] = useState<ChatEntry[]>([
    {
      role: "model",
      text: `Hi ${user.displayName}! I'm Inky 🐙 your writing coach. Pick a challenge, press GO, write it in your notebook, then tap DONE. I'll tell you how it went!`,
    },
  ]);
  const [chatContext, setChatContext] = useState<string | undefined>();

  // Countdown 3 → 2 → 1 → write!
  useEffect(() => {
    if (phase.name !== "countdown") return;
    const t = setTimeout(() => {
      if (phase.n > 1) setPhase({ name: "countdown", n: phase.n - 1 });
      else {
        startedAt.current = Date.now();
        setPhase({ name: "writing" });
      }
    }, 800);
    return () => clearTimeout(t);
  }, [phase]);

  function pickTier(t: Tier) {
    setTier(t);
    setChallenge(randomChallenge(t));
  }

  function nextChallenge() {
    setChallenge((c) => randomChallenge(tier, c.id));
    setPhase({ name: "ready" });
  }

  const finish = useCallback(async () => {
    const durationMs = Date.now() - startedAt.current;
    const image = camRef.current?.capture();
    if (!image) {
      setPhase({ name: "error", message: "The camera isn't showing anything yet." });
      return;
    }
    setPhase({ name: "reviewing" });
    try {
      const result: ReviewResponse = await postJson("/api/review", { image, challengeId: challenge.id, durationMs });
      setPhase({ name: "result", result });
      if (result.kind === "scored") {
        setXp(result.totalXp);
        setChatContext(
          `Challenge: "${challenge.text}". Inky read: "${result.readText}". Praise given: ${result.praise} Tips given: ${result.tips.join(" | ")}`,
        );
        if (result.leveledUp || result.stars === 3) {
          const confetti = (await import("canvas-confetti")).default;
          confetti({ particleCount: result.leveledUp ? 220 : 120, spread: 90, origin: { y: 0.6 } });
        }
      }
      setChat((c) => [
        ...c,
        { role: "model", text: [result.praise, ...result.tips.map((t) => `• ${t}`)].join("\n") },
      ]);
    } catch (e) {
      setPhase({ name: "error", message: (e as Error).message });
    }
  }, [challenge]);

  const busy = phase.name !== "ready" && phase.name !== "result" && phase.name !== "error";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <TopBar user={user} xp={xp} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          {/* ── Notebook canvas ── */}
          <section className="card !p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-2">
              <h2 className="text-xl font-bold">📓 Your notebook</h2>
              <div className="flex items-center gap-2 text-sm">
                {devices.length > 1 && (
                  <select
                    aria-label="Choose camera"
                    className="rounded-full border-4 border-ink bg-paper px-3 py-1 font-semibold"
                    value={deviceId ?? ""}
                    onChange={(e) => {
                      setDeviceId(e.target.value || undefined);
                      try {
                        localStorage.setItem(DEVICE_KEY, e.target.value);
                      } catch {}
                    }}
                  >
                    <option value="">Default camera</option>
                    {devices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                )}
                <Link href="/setup-camera" className="rounded-full border-4 border-ink bg-sunny px-3 py-1 font-semibold">
                  🔄 Flip
                </Link>
              </div>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-[22px] border-4 border-ink bg-ink">
              {cam.status === "ready" && <FlipView ref={camRef} stream={cam.stream} flipMode={user.flipMode ?? "none"} />}
              {cam.status === "loading" && <Overlay>Waking up the camera… 📷</Overlay>}
              {cam.status === "error" && <Overlay>{cam.message}</Overlay>}

              {phase.name === "countdown" && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink/40">
                  <Circle key={phase.n} size={160} className="animate-pop border-8 border-white bg-bubblegum text-8xl font-bold text-white">
                    {phase.n}
                  </Circle>
                </div>
              )}
              {phase.name === "writing" && (
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border-4 border-ink bg-white px-4 py-1 text-lg font-bold">
                  <span className="inline-block animate-wiggle">✏️</span> Writing…
                </div>
              )}
              {phase.name === "reviewing" && (
                <Overlay>
                  <span className="inline-block animate-float text-6xl">🐙</span>
                  <span className="mt-2 block">Inky is looking at your writing…</span>
                </Overlay>
              )}
            </div>
          </section>

          {/* ── Challenge / result ── */}
          {phase.name === "result" ? (
            <ResultCard result={phase.result} onNext={nextChallenge} onRetry={() => setPhase({ name: "ready" })} />
          ) : (
            <section className="card">
              <div className="mb-4 flex flex-wrap gap-2">
                {(Object.keys(TIERS) as Tier[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    disabled={busy}
                    onClick={() => pickTier(t)}
                    className={`rounded-full border-4 border-ink px-4 py-1.5 text-lg font-bold transition disabled:opacity-60 ${
                      tier === t ? "bg-grape text-white" : "bg-white hover:bg-grape/10"
                    }`}
                  >
                    {TIERS[t].emoji} {TIERS[t].label}
                  </button>
                ))}
              </div>

              <p className="mb-1 text-lg font-semibold text-grape-dark">Copy this into your notebook:</p>
              <div className="ruled rounded-2xl border-4 border-ink bg-paper px-5 py-2">
                <p className="font-hand text-4xl leading-[48px] md:text-5xl md:leading-[48px]">{challenge.text}</p>
              </div>

              {phase.name === "error" && <p className="mt-4 rounded-2xl bg-bubblegum/15 p-3 font-medium text-bubblegum">{phase.message}</p>}

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {phase.name === "writing" ? (
                  <>
                    <CircleButton size={104} className="bg-bubblegum text-2xl text-white" onClick={finish}>
                      DONE!
                    </CircleButton>
                    <div>
                      <p className="text-lg font-semibold">Write it neatly, as fast as you can!</p>
                      <p className="text-ink/70">Hold your page up to the camera, then tap DONE.</p>
                      <button type="button" className="mt-1 font-semibold text-ink/60 underline" onClick={() => setPhase({ name: "ready" })}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <CircleButton
                      size={104}
                      className="bg-mint text-3xl text-white"
                      disabled={busy || cam.status !== "ready"}
                      onClick={() => setPhase({ name: "countdown", n: 3 })}
                    >
                      GO!
                    </CircleButton>
                    <button type="button" className="btn btn-white" disabled={busy} onClick={nextChallenge}>
                      🔀 New words
                    </button>
                  </>
                )}
              </div>
            </section>
          )}
        </div>

        <CoachChat
          entries={chat}
          setEntries={setChat}
          context={chatContext}
          capturePhoto={() => camRef.current?.capture(1024) ?? null}
        />
      </div>
    </main>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/70 p-6 text-center text-xl font-bold text-white">
      {children}
    </div>
  );
}

function ResultCard({ result, onNext, onRetry }: { result: ReviewResponse; onNext: () => void; onRetry: () => void }) {
  if (result.kind === "no-writing") {
    return (
      <section className="card text-center">
        <div className="text-6xl">🔍</div>
        <h2 className="mt-2 text-2xl font-bold">{result.praise}</h2>
        <ul className="mx-auto mt-3 max-w-md space-y-1 text-lg">
          {result.tips.map((t) => (
            <li key={t}>💡 {t}</li>
          ))}
        </ul>
        <button className="btn btn-grape mt-5" onClick={onRetry}>Try again</button>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <div className="flex gap-3">
          {[1, 2, 3].map((s) => (
            <Circle
              key={s}
              size={72}
              className={`animate-pop border-4 border-ink text-4xl ${s <= result.stars ? "bg-sunny" : "bg-ink/10 grayscale"}`}
              style={{ animationDelay: `${s * 150}ms` }}
            >
              ⭐
            </Circle>
          ))}
        </div>
        <div className="animate-pop text-center" style={{ animationDelay: "600ms" }}>
          <div className="text-5xl font-bold text-grape">+{result.xpEarned} XP</div>
          {result.improved && <div className="font-semibold text-mint">🚀 Better than your usual! Bonus XP</div>}
          {result.leveledUp && <div className="text-xl font-bold text-bubblegum">🎉 LEVEL UP! 🎉</div>}
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-grape/10 p-4">
        <p className="text-xl font-semibold">🐙 {result.praise}</p>
        <ul className="mt-2 space-y-1 text-lg">
          {result.tips.map((t) => (
            <li key={t}>💡 {t}</li>
          ))}
        </ul>
      </div>
      {result.readText && (
        <p className="mt-3 text-ink/70">
          Inky read: <span className="font-hand text-2xl text-ink">“{result.readText}”</span>
        </p>
      )}
      <div className="mt-5 flex justify-center">
        <button className="btn btn-pink px-10 text-xl" onClick={onNext}>
          Next challenge ➜
        </button>
      </div>
    </section>
  );
}
