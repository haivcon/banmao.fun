import {
  formatExactTokenAmount,
  formatTokenAmountForDisplay,
  formatTokenAmountInput,
  normalizeTokenAmountInput,
  tokenAmountInWords,
  tokenBalancePercentage,
} from "../app/defi/box/amountFormat";

describe("BanmaoBox exact localized amount formatting", () => {
  test("preserves every significant decimal without converting through Number", () => {
    expect(formatExactTokenAmount(1n, 18, "en")).toBe("0.000000000000000001");
    expect(formatExactTokenAmount(1_234_567_890_123_456_789n, 18, "en"))
      .toBe("1.234567890123456789");
    expect(formatExactTokenAmount(12_345_678_901_234_567_890_000_000n, 6, "en"))
      .toBe("12,345,678,901,234,567,890");
  });

  test("uses the selected locale separators", () => {
    expect(formatExactTokenAmount(1_234_500n, 3, "en")).toBe("1,234.5");
    expect(formatExactTokenAmount(1_234_500n, 3, "vi")).toBe("1.234,5");
  });

  test("truncates display balances without rounding", () => {
    const balance = 77_661_369_081_300_765_143_016n;
    expect(formatTokenAmountForDisplay(balance, 18, "en")).toBe("77,661.3690");
    expect(formatTokenAmountForDisplay(balance, 18, "vi")).toBe("77.661,3690");
    expect(formatTokenAmountForDisplay(19_999n, 4, "en", 2)).toBe("1.99");
  });

  test("formats editable amounts with locale grouping and restores canonical transaction values", () => {
    expect(formatTokenAmountInput("1234567.8900", "en")).toBe("1,234,567.8900");
    expect(formatTokenAmountInput("1234567.8900", "vi")).toBe("1.234.567,8900");
    expect(normalizeTokenAmountInput("1,234,567.8900", "en", 6)).toBe("1234567.8900");
    expect(normalizeTokenAmountInput("1.234.567,8900", "vi", 6)).toBe("1234567.8900");
    expect(normalizeTokenAmountInput("1.234,", "vi", 6)).toBe("1234.");
    expect(normalizeTokenAmountInput("12.3456789", "en", 4)).toBe("12.3456");
  });

  test("calculates quick percentages in base units without floating-point loss", () => {
    expect(tokenBalancePercentage(1_000_000n, 25, 3)).toBe("250");
    expect(tokenBalancePercentage(1n, 50, 18)).toBe("0");
    expect(tokenBalancePercentage(1_234_567_890_123_456_789n, 100, 18))
      .toBe("1.234567890123456789");
  });

  test("reads decimal digits in the selected language without rounding", () => {
    expect(tokenAmountInWords(1_250n, 3, "en")).toBe("one point two five");
    expect(tokenAmountInWords(1_250n, 3, "vi")).toBe("một phẩy hai năm");
    expect(tokenAmountInWords(1n, 18, "zh")).toBe("零 点 零 零 零 零 零 零 零 零 零 零 零 零 零 零 零 零 零 一");
  });
});
