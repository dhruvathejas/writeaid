import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

// Every circle in WriteAid goes through these two components so it is *perfectly* round:
// equal width & height, fixed (never squashed by flexbox), and a full border radius.
function roundStyle(size: number, style?: CSSProperties): CSSProperties {
  return {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    aspectRatio: "1 / 1",
    borderRadius: "9999px",
    flexShrink: 0,
    ...style,
  };
}

const CHUNKY =
  "inline-flex items-center justify-center border-4 border-ink leading-none font-bold transition-transform select-none hover:-translate-y-0.5 active:translate-y-1";

export function Circle({
  size,
  className = "",
  style,
  children,
  title,
}: {
  size: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  title?: string;
}) {
  return (
    <div title={title} className={`inline-flex items-center justify-center overflow-hidden leading-none ${className}`} style={roundStyle(size, style)}>
      {children}
    </div>
  );
}

export function CircleButton({
  size,
  className = "",
  style,
  children,
  ...rest
}: { size: number } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`${CHUNKY} disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={roundStyle(size, { boxShadow: "0 5px 0 0 var(--color-ink)", ...style })}
    >
      {children}
    </button>
  );
}

export function CircleLink({
  size,
  href,
  className = "",
  children,
  ...rest
}: { size: number; href: string; className?: string; children: ReactNode; "aria-label"?: string; title?: string }) {
  return (
    <Link href={href} {...rest} className={`${CHUNKY} ${className}`} style={roundStyle(size, { boxShadow: "0 5px 0 0 var(--color-ink)" })}>
      {children}
    </Link>
  );
}

export function Avatar({ emoji, color, size = 56 }: { emoji: string; color: string; size?: number }) {
  return (
    <Circle size={size} className="border-4 border-ink" style={{ background: color, fontSize: size * 0.55 }}>
      <span aria-hidden>{emoji}</span>
    </Circle>
  );
}
