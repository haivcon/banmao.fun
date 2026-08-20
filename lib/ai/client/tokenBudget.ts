/** Model-context estimate, deliberately separate from the conservative UTF-8 storage quota. */
export function estimateModelTokens(value: string): number {
  if (!value) return 0;
  // ASCII prose averages several characters/token; non-ASCII is counted one-for-one so
  // CJK, Vietnamese diacritics, and emoji cannot silently overflow the model window.
  let ascii = 0, nonAscii = 0;
  for (const character of value) { if (character.codePointAt(0)! <= 0x7f) ascii += 1; else nonAscii += 1; }
  return Math.max(1, Math.ceil(ascii / 3) + nonAscii);
}

export const AI_MODEL_CONTEXT_TOKENS = 500_000;
export const AI_CURRENT_HISTORY_TOKEN_BUDGET = 380_000;
export const AI_CROSS_SESSION_MEMORY_TOKEN_BUDGET = 32_000;
export const AI_REQUEST_CONTEXT_TOKEN_BUDGET = 450_000;
