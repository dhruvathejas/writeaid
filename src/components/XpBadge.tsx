import { levelProgress } from "@/lib/shared";

/** One combined XP number + a perfectly round level ring. (No separate speed/neatness counters, on purpose.) */
export function XpBadge({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const p = levelProgress(xp);
  const size = compact ? 52 : 68;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = p.into / p.needed;

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="#fff" stroke="#e9d5ff" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#xpgrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          <defs>
            <linearGradient id="xpgrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[10px] font-semibold uppercase text-grape-dark">Lvl</span>
          <span className={compact ? "text-lg font-bold" : "text-2xl font-bold"}>{p.level}</span>
        </div>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-grape-dark">{p.title}</div>
        <div className={compact ? "text-lg font-bold" : "text-2xl font-bold"}>⭐ {xp.toLocaleString()} XP</div>
        {!compact && <div className="text-sm text-ink/70">{p.toNext} XP to level {p.level + 1}</div>}
      </div>
    </div>
  );
}
