const CORPORATE_PATTERNS = [
  /this highlights the importance of/i,
  /this marks a meaningful step forward/i,
  /this serves as a reminder/i,
  /in a world where/i,
  /\bgame[ -]?changer\b/i,
  /\brevolutionary\b/i,
];

const RUBRIC_PATTERNS = [
  /\bmy emotional arc\b/i,
  /\bmy core desire\b/i,
  /\bmy earned belief\b/i,
  /\bmy belief shifts?\b/i,
  /\bcharacter growth\b/i,
];

const FINANCIAL_PATTERNS = [
  /\bguaranteed (?:profit|return|win)s?\b/i,
  /\b(?:is|are|completely|totally) risk[ -]?free\b/i,
  /\b(?:you should|we should|must) go all[ -]?in\b/i,
  /\bto the moon\b/i,
];

export type VoiceDiagnostics = Readonly<{
  corporate: number;
  rubric: number;
  financial: number;
  total: number;
}>;

export function inspectBanmaoVoice(text: string): VoiceDiagnostics {
  const corporate = CORPORATE_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const rubric = RUBRIC_PATTERNS.filter((pattern) => pattern.test(text)).length;
  const financialClaims = text.replace(/\b(?:no|not|isn't|aren't|never)\b[^.!?]{0,40}\brisk[ -]?free\b/gi, "");
  const financial = FINANCIAL_PATTERNS.filter((pattern) => pattern.test(financialClaims)).length;
  return Object.freeze({ corporate, rubric, financial, total: corporate + rubric + financial });
}
