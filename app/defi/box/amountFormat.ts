import { formatUnits } from "viem";
import { numberToWords } from "../../web3d/locals/numberToWords";
import type { BoxLanguage } from "./i18n";

const DIGIT_WORDS: Record<BoxLanguage, readonly string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  vi: ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"],
  zh: ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"],
  ko: ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"],
  ru: ["ноль", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"],
  id: ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan"],
};

const DECIMAL_WORD: Record<BoxLanguage, string> = {
  en: "point",
  vi: "phẩy",
  zh: "点",
  ko: "점",
  ru: "запятая",
  id: "koma",
};

function exactParts(value: bigint, decimals: number): [string, string] {
  const normalized = formatUnits(value, decimals);
  const [whole, fraction = ""] = normalized.split(".");
  return [whole, fraction.replace(/0+$/, "")];
}

function groupWhole(whole: string, language: BoxLanguage): string {
  const parts = new Intl.NumberFormat(language, {
    useGrouping: true,
    maximumFractionDigits: 0,
  }).formatToParts(12345);
  const group = parts.find((part) => part.type === "group")?.value ?? ",";
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, group);
}

/** Formats base units without converting the value to Number or dropping precision. */
export function formatExactTokenAmount(
  value: bigint | undefined,
  decimals = 18,
  language: BoxLanguage = "en",
): string {
  if (value === undefined) return "0";
  const [whole, fraction] = exactParts(value, decimals);
  const decimal = new Intl.NumberFormat(language).formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value ?? ".";
  return fraction ? `${groupWhole(whole, language)}${decimal}${fraction}` : groupWhole(whole, language);
}

/** Compact display formatting only. It truncates and never changes transaction values. */
export function formatTokenAmountForDisplay(
  value: bigint | undefined,
  decimals = 18,
  language: BoxLanguage = "en",
  maximumFractionDigits = 4,
): string {
  if (value === undefined) return "0";
  const [whole, fraction] = exactParts(value, decimals);
  const visibleFraction = fraction.slice(0, Math.max(0, maximumFractionDigits));
  const decimal = new Intl.NumberFormat(language).formatToParts(1.1)
    .find((part) => part.type === "decimal")?.value ?? ".";
  return visibleFraction
    ? `${groupWhole(whole, language)}${decimal}${visibleFraction}`
    : groupWhole(whole, language);
}

function inputSeparators(language: BoxLanguage): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(language, { useGrouping: true }).formatToParts(12345.6);
  return {
    decimal: parts.find((part) => part.type === "decimal")?.value ?? ".",
    group: parts.find((part) => part.type === "group")?.value ?? ",",
  };
}

/** Converts localized, grouped user input into the canonical decimal string consumed by parseUnits. */
export function normalizeTokenAmountInput(
  input: string,
  language: BoxLanguage = "en",
  decimals = 18,
): string {
  const { decimal, group } = inputSeparators(language);
  let value = input.trim().split(group).join("").replace(/\s/g, "");
  if (decimal !== ".") value = value.replace(decimal, ".");
  value = value.replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = value.split(".");
  const hasDecimal = value.includes(".") && decimals > 0;
  const fraction = fractionParts.join("").slice(0, Math.max(0, decimals));
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || (hasDecimal ? "0" : "");
  return hasDecimal ? `${normalizedWhole}.${fraction}` : normalizedWhole;
}

/** Groups a canonical amount for editing while preserving its exact digits and trailing decimal mark. */
export function formatTokenAmountInput(
  value: string,
  language: BoxLanguage = "en",
): string {
  if (!value) return "";
  const { decimal } = inputSeparators(language);
  const [whole = "", fraction] = value.split(".");
  const groupedWhole = whole ? groupWhole(whole, language) : "";
  return fraction !== undefined ? `${groupedWhole}${decimal}${fraction}` : groupedWhole;
}

/** Returns an exact percentage of a base-unit balance, rounded down to valid base units. */
export function tokenBalancePercentage(balance: bigint, percentage: number, decimals = 18): string {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) return "";
  return formatUnits((balance * BigInt(percentage)) / 100n, decimals);
}

/** Reads every significant decimal digit and never rounds the represented token amount. */
export function tokenAmountInWords(
  value: bigint | undefined,
  decimals = 18,
  language: BoxLanguage = "en",
): string {
  if (value === undefined) return DIGIT_WORDS[language][0];
  const [whole, fraction] = exactParts(value, decimals);
  const supportedWhole = BigInt(whole) <= 999_999_999n;
  const wholeWords = supportedWhole
    ? numberToWords(Number(whole), language).toLocaleLowerCase(language)
    : [...whole].map((digit) => DIGIT_WORDS[language][Number(digit)]).join(" ");
  if (!fraction) return wholeWords;
  const fractionWords = [...fraction]
    .map((digit) => DIGIT_WORDS[language][Number(digit)])
    .join(language === "zh" || language === "ko" ? " " : " ");
  return `${wholeWords} ${DECIMAL_WORD[language]} ${fractionWords}`;
}
