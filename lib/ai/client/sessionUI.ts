import type { ChatSession } from "./persistence";

export const SESSION_TITLE_MAX_LENGTH = 120;

export function filterSessions(sessions: readonly ChatSession[], query: string, archived: boolean): ChatSession[] {
  const needle = query.trim().toLocaleLowerCase();
  return sessions.filter((session) => Boolean(session.archivedAt) === archived && (!needle || session.title.toLocaleLowerCase().includes(needle)));
}

export function validateSessionTitle(value: string): { valid: boolean; title: string } {
  const title = value.trim();
  return { valid: title.length > 0 && title.length <= SESSION_TITLE_MAX_LENGTH, title };
}

export type QuotaLevel = "normal" | "near" | "full";
export function getQuotaState(used: number, quota: number): { level: QuotaLevel; percent: number } {
  const percent = quota > 0 ? Math.min(100, Math.max(0, Math.round((used / quota) * 100))) : 100;
  return { level: percent >= 100 ? "full" : percent >= 90 ? "near" : "normal", percent };
}

export async function runConfirmedDelete(pendingId: string | null, confirmedId: string, remove: (id: string) => Promise<void>): Promise<boolean> {
  if (!pendingId || pendingId !== confirmedId) return false;
  await remove(confirmedId);
  return true;
}
