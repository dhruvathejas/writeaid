"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Circle, CircleButton } from "@/components/Circle";
import { postJson } from "@/lib/client";

export type ChatEntry = { role: "user" | "model"; text: string; image?: string };

const SUGGESTIONS = [
  "How do I make my letters the same size?",
  "How can I write faster?",
  "Give me a fun warm-up! 🤸",
  "How should I hold my pencil?",
];

export default function CoachChat({
  entries,
  setEntries,
  context,
  capturePhoto,
}: {
  entries: ChatEntry[];
  setEntries: Dispatch<SetStateAction<ChatEntry[]>>;
  context?: string;
  capturePhoto: () => string | null;
}) {
  const [text, setText] = useState("");
  const [withPhoto, setWithPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [entries, busy]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    const image = withPhoto ? (capturePhoto() ?? undefined) : undefined;
    const next: ChatEntry[] = [...entries, { role: "user", text: trimmed, image }];
    setEntries(next);
    setText("");
    setWithPhoto(false);
    setBusy(true);
    try {
      const { reply } = await postJson("/api/chat", {
        messages: next.map(({ role, text }) => ({ role, text })),
        image,
        context,
      });
      setEntries((e) => [...e, { role: "model", text: reply }]);
    } catch (err) {
      setEntries((e) => [...e, { role: "model", text: (err as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="card flex h-[640px] flex-col !p-0 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-3 rounded-t-[24px] bg-gradient-to-r from-grape to-bubblegum p-4 text-white">
        <Circle size={52} className="animate-float border-4 border-ink bg-white text-3xl">
          🐙
        </Circle>
        <div>
          <div className="text-xl font-bold">Inky the Coach</div>
          <div className="text-sm opacity-90">Ask me anything about writing!</div>
        </div>
      </div>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
        {entries.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-3xl border-4 border-ink px-4 py-2 text-[17px] ${
                m.role === "user" ? "rounded-br-md bg-grape text-white" : "rounded-bl-md bg-paper"
              }`}
            >
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="My notebook" className="mb-2 max-h-32 rounded-xl border-2 border-white" />
              )}
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-1.5 px-2 py-1" aria-label="Inky is typing">
            {[0, 1, 2].map((d) => (
              <Circle key={d} size={12} className="animate-bounce bg-grape" style={{ animationDelay: `${d * 150}ms` }} />
            ))}
          </div>
        )}
        {entries.length <= 2 && !busy && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="rounded-full border-2 border-grape bg-white px-3 py-1 text-sm font-semibold text-grape-dark hover:bg-grape/10">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        className="flex items-center gap-2 border-t-4 border-ink p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <CircleButton
          size={48}
          className={`text-xl ${withPhoto ? "bg-sunny" : "bg-white"}`}
          onClick={() => setWithPhoto((w) => !w)}
          aria-pressed={withPhoto}
          title={withPhoto ? "Your notebook photo will be sent" : "Show Inky my notebook"}
          aria-label="Show Inky my notebook"
        >
          📸
        </CircleButton>
        <input
          className="min-w-0 flex-1 rounded-full border-4 border-ink bg-paper px-4 py-2.5 text-[17px] outline-none focus:border-grape"
          placeholder={withPhoto ? "Ask about your page…" : "Type to Inky…"}
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
        />
        <CircleButton size={48} type="submit" className="bg-grape text-xl text-white" disabled={busy || !text.trim()} aria-label="Send">
          ➤
        </CircleButton>
      </form>
    </aside>
  );
}
