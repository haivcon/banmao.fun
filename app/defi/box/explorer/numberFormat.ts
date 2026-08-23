import type { BoxLanguage } from "../i18n";

export const NUMBER_LOCALES: Record<BoxLanguage, string> = {
  en: "en-US",
  vi: "vi-VN",
  zh: "zh-CN",
  ko: "ko-KR",
  ru: "ru-RU",
  id: "id-ID",
};

export function formatInteger(value: string | number, language: BoxLanguage) {
  return new Intl.NumberFormat(NUMBER_LOCALES[language]).format(
    typeof value === "number" ? value : BigInt(value),
  );
}

export function formatTokenAmount(value: string, language: BoxLanguage) {
  const [integer = "0", fraction = ""] = value.split(".");
  const grouped = formatInteger(integer || "0", language);
  const trimmedFraction = fraction.replace(/0+$/, "");
  const decimalSeparator = language === "vi" || language === "id" ? "," : ".";
  return trimmedFraction ? `${grouped}${decimalSeparator}${trimmedFraction}` : grouped;
}
