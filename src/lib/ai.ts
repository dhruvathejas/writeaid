import OpenAI from "openai";
import type { ResponseInputContent, ResponseInputItem } from "openai/resources/responses/responses";
import { z } from "zod";

export class AiNotConfiguredError extends Error {}

/** True when the OpenAI account has run out of credits (or hit its spending limit). */
export const isOutOfCredits = (e: unknown) =>
  e instanceof OpenAI.APIError &&
  e.status === 429 &&
  (e.type === "insufficient_quota" || e.code === "insufficient_quota" || e.code === "credit_balance_exhausted");
export const OUT_OF_CREDITS_MESSAGE =
  "Inky is out of ink credits! A grown-up needs to add credits at platform.openai.com → Billing.";

let client: OpenAI | null = null;
function ai() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new AiNotConfiguredError("OPENAI_API_KEY is not set in .env.local");
  return (client ??= new OpenAI({ apiKey }));
}

const model = () => process.env.OPENAI_MODEL || "gpt-5-mini";
// Reasoning models (gpt-5*, o*) accept a reasoning effort; older ones like gpt-4.1 reject it.
const reasoning = () => (/^(gpt-5|o\d)/.test(model()) ? { reasoning: { effort: "low" as const } } : {});

type Image = { mimeType: string; data: string };
const imagePart = (image: Image): ResponseInputContent => ({
  type: "input_image",
  image_url: `data:${image.mimeType};base64,${image.data}`,
  detail: "auto",
});

// ── Handwriting review ─────────────────────────────────────

const ReviewSchema = z.object({
  writingFound: z.boolean(),
  readText: z.string().max(500),
  lettersWritten: z.number().int().min(0),
  accuracy: z.number().min(0).max(100),
  neatness: z.number().min(0).max(100),
  praise: z.string().max(300),
  tips: z.array(z.string().max(200)).max(5),
});
export type Review = z.infer<typeof ReviewSchema>;

function reviewPrompt(target: string) {
  return `You are a kind but honest handwriting teacher for children aged 6–12.
The photo shows a child's notebook, taken by a webcam just now. The child was asked to copy this exact text by hand:

"${target}"

Look for the most recent attempt at that text (ignore older writing, printed text, and anything that isn't handwriting).
Return JSON with:
- writingFound: false if you cannot see any handwriting of the target (blank page, blurry, camera pointed elsewhere).
- readText: exactly what the child wrote, as you read it.
- lettersWritten: how many letters (a–z only, not spaces or punctuation) of the target text the child actually wrote readably.
- accuracy: 0–100, how closely the writing matches the target text (missing or wrong words lower it).
- neatness: 0–100. Judge: letters sitting on the line, even letter size, clear letter shapes (closed loops, straight sticks),
  even spaces between words, and no heavy scribbles. A typical careful 8-year-old scores around 60.
- praise: ONE short, specific, cheerful sentence about something they did well.
- tips: 1 to 3 short, specific, doable tips (max 15 words each) that would most improve neatness or speed next time.
  Mention specific letters when useful, e.g. "Close the top of your a so it doesn't look like a u."
Use simple words a young child understands. Never mention scores or numbers in praise or tips.`;
}

const REVIEW_JSON_SCHEMA = {
  type: "object",
  properties: {
    writingFound: { type: "boolean" },
    readText: { type: "string" },
    lettersWritten: { type: "integer" },
    accuracy: { type: "integer" },
    neatness: { type: "integer" },
    praise: { type: "string" },
    tips: { type: "array", items: { type: "string" } },
  },
  required: ["writingFound", "readText", "lettersWritten", "accuracy", "neatness", "praise", "tips"],
  additionalProperties: false,
};

export async function reviewHandwriting(image: Image, target: string): Promise<Review> {
  const res = await ai().responses.create({
    model: model(),
    input: [{ role: "user", content: [imagePart(image), { type: "input_text", text: reviewPrompt(target) }] }],
    text: { format: { type: "json_schema", name: "handwriting_review", strict: true, schema: REVIEW_JSON_SCHEMA } },
    ...reasoning(),
    max_output_tokens: 2000,
  });
  return ReviewSchema.parse(JSON.parse(res.output_text || "{}"));
}

// ── Inky the coach (chat) ─────────────────────────────────

export type ChatMessage = { role: "user" | "model"; text: string };

const COACH_SYSTEM = `You are Inky 🐙, a cheerful octopus handwriting coach inside a kids' writing game called WriteAid.
You talk to children aged 6–12.
- Keep replies short: 2–4 sentences, under 70 words. Simple words. At most one emoji.
- Help with handwriting: letter shapes, pencil grip, posture, spacing, sizing, writing faster while staying neat, fun warm-ups.
- You can also help with spelling and simple school writing questions.
- Be encouraging and specific. Never shame the child.
- Never ask for or repeat personal information (full name, address, school, phone, passwords). If the child shares some, kindly tell them to keep it private.
- If asked about anything unsafe, scary, or for grown-ups, gently say that's not something you can help with and suggest asking a trusted grown-up, then steer back to writing.
- If a photo of their notebook is attached, comment on what you actually see.`;

export async function chatWithCoach(opts: {
  history: ChatMessage[];
  image?: Image;
  context?: string;
  kidName: string;
}): Promise<string> {
  const last = opts.history.at(-1);
  if (!last || last.role !== "user") throw new Error("Last chat message must come from the user.");

  const input: ResponseInputItem[] = opts.history.map((m, i) =>
    m.role === "model"
      ? { role: "assistant", content: m.text }
      : {
          role: "user",
          content: [
            ...(i === opts.history.length - 1 && opts.image ? [imagePart(opts.image)] : []),
            { type: "input_text", text: m.text },
          ],
        },
  );

  const instructions =
    COACH_SYSTEM +
    `\nThe child's nickname is "${opts.kidName}".` +
    (opts.context ? `\nTheir most recent writing round:\n${opts.context}` : "");

  const res = await ai().responses.create({
    model: model(),
    instructions,
    input,
    ...reasoning(),
    max_output_tokens: 1000,
  });
  return res.output_text.trim() || "Hmm, my tentacles got tangled! Can you ask me again? 🐙";
}
