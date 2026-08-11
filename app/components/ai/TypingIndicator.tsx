"use client";

import { aiText } from "../../../lib/ai/client/i18n";

export default function TypingIndicator({ language }: { language?: string }) {
  return <span className="banmao-ai-typing" role="status" aria-label={aiText(language, "preparing")}><i /><i /><i /></span>;
}
