import { NextResponse } from "next/server";
import type { z } from "zod";

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Parse a JSON request body with a zod schema. Returns the data or a ready-made 400 response. */
export async function parseBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ data: z.infer<S>; error?: never } | { data?: never; error: NextResponse }> {
  const raw = await req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? "Something in that form looks off.";
    return { error: jsonError(msg) };
  }
  return { data: result.data };
}

// Tiny in-memory sliding-window rate limiter (fine for a single local server).
const hits = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Validate a camera snapshot data URL and split it into mime type + base64 payload. */
export function parseImageDataUrl(dataUrl: string) {
  const m = DATA_URL_RE.exec(dataUrl);
  if (!m) return null;
  if ((m[2].length * 3) / 4 > MAX_IMAGE_BYTES) return null;
  return { mimeType: m[1], data: m[2] };
}
