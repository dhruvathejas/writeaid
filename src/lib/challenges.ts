// Things to copy into the notebook. Safe to import on client and server.

export type Tier = "easy" | "medium" | "hard";

export const TIERS: Record<Tier, { label: string; emoji: string; multiplier: number; items: string[] }> = {
  easy: {
    label: "Warm-up",
    emoji: "🌱",
    multiplier: 1,
    items: [
      "sun and moon",
      "big red bus",
      "happy frog",
      "a cat nap",
      "jump high",
      "blue kite",
      "fish swim",
      "my best pen",
      "ice cream",
      "zoom zoom",
    ],
  },
  medium: {
    label: "Sentence",
    emoji: "🚀",
    multiplier: 1.5,
    items: [
      "The dog ran to the park.",
      "I like to read books at night.",
      "Birds sing in the tall green tree.",
      "We baked a cake for Grandma.",
      "My bike has a shiny bell.",
      "The moon is bright tonight.",
      "Frogs hop over the wet rocks.",
      "Pack a snack for the trip.",
    ],
  },
  hard: {
    label: "Champion",
    emoji: "🏆",
    multiplier: 2,
    items: [
      "The quick brown fox jumps over the lazy dog.",
      "Pack my box with five dozen juicy jugs.",
      "How vexingly quick daft zebras jump!",
      "Sphinx of black quartz, judge my vow.",
      "Jackdaws love my big sphinx of quartz.",
      "Brave kids quickly fix every jumbled puzzle.",
    ],
  },
};

export type Challenge = { id: string; tier: Tier; text: string };

export function getChallenge(id: string): Challenge | null {
  const [tier, idx] = id.split("-") as [Tier, string];
  const text = TIERS[tier]?.items[Number(idx)];
  return text ? { id, tier, text } : null;
}

export function randomChallenge(tier: Tier, excludeId?: string): Challenge {
  const items = TIERS[tier].items;
  let i = Math.floor(Math.random() * items.length);
  if (`${tier}-${i}` === excludeId && items.length > 1) i = (i + 1) % items.length;
  return { id: `${tier}-${i}`, tier, text: items[i] };
}

export function letterCount(text: string) {
  return (text.match(/[a-z]/gi) ?? []).length;
}
