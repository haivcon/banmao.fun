import { en, type KingCopy } from "./en";
import { vi } from "./vi";
import { zh } from "./zh";
import { ko } from "./ko";
import { ru } from "./ru";
import { id } from "./id";
import type { Lang } from "../../i18n";
export { LANG_LIST } from "../../i18n";
export type { Lang, KingCopy };
export const KING_T: Record<Lang, KingCopy> = { en, vi, zh, ko, ru, id };
export function kingLanguage(value: string | null): Lang {
  return value && Object.hasOwn(KING_T, value) ? value as Lang : "en";
}
export function kingError(error: unknown, t: KingCopy): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/reject|denied|4001/i.test(message)) return t.rejected;
  if (/configuration mismatch/i.test(message)) return t.configError;
  if (/UnsupportedPaymentToken|InexactERC20Payment/i.test(message)) return t.configError;
  if (/sold out|SoldOut/i.test(message)) return t.soldOut;
  if (/allowance updated/i.test(message)) return t.allowanceUpdated;
  if (/wallet (?:or network )?changed/i.test(message)) return t.walletChanged;
  if (/switch to X Layer/i.test(message)) return t.switchHelp;
  if (/not enough BANMAO/i.test(message)) return t.insufficient;
  if (/OKB|insufficient funds/i.test(message)) return t.needGas;
  if (/revert/i.test(message)) return t.reverted;
  return t.transactionError;
}
