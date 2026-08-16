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
