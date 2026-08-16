import {
  formatExactTokenAmount,
  tokenAmountInWords,
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

  test("reads decimal digits in the selected language without rounding", () => {
    expect(tokenAmountInWords(1_250n, 3, "en")).toBe("one point two five");
    expect(tokenAmountInWords(1_250n, 3, "vi")).toBe("một phẩy hai năm");
    expect(tokenAmountInWords(1n, 18, "zh")).toBe("零 点 零 零 零 零 零 零 零 零 零 零 零 零 零 零 零 零 零 一");
  });
});
