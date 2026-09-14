import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KING_T, LANG_LIST, kingLanguage, kingError } from "../app/collection/banmaoking/i18n";
import { traitLabels } from "../app/collection/banmaoking/i18n/traits";
import { contractCopy } from "../app/collection/banmaoking/i18n/contracts";
const read = (name: string) => readFileSync(join(process.cwd(), "app/collection/banmaoking", name), "utf8");
describe("King localized experience", () => {
  test.each(LANG_LIST.map(l => l.code))("complete copy and trait catalogue for %s", lang => {
    expect(Object.keys(KING_T[lang]).sort()).toEqual(Object.keys(KING_T.en).sort());
    for (const value of Object.values(KING_T[lang])) expect(value.trim().length).toBeGreaterThan(0);
    expect(traitLabels[lang].map(group => group.length)).toEqual([8, 12, 12, 8]);
    if (lang !== "en" && lang !== "vi") expect(contractCopy[lang]).toHaveLength(11);
    if (lang !== "en") expect(KING_T[lang].step4Desc).not.toBe(KING_T.en.step4Desc);
  });
  test("normalizes invalid persisted languages safely", () => {
    expect(kingLanguage("__proto__")).toBe("en");
    expect(kingLanguage(null)).toBe("en");
    expect(kingLanguage("vi")).toBe("vi");
  });
  test("mint never mounts or calls metadata-refresh writes", () => {
    const mint = read("KingMint.tsx");
    expect(mint).not.toMatch(/KingMetadataRefresh|autoRefresh|functionName: "refreshMetadata"/);
    expect(mint).toContain('functionName: "tokenURI"');
    expect(mint).toContain('functionName: "mint"');
    expect(mint).toContain("simulateContract");
    expect(mint).toContain("validateMintState");
    expect(mint).toContain("kingError(error, t)");
  });
  test("keeps preview disclaimer and accessible controls", () => {
    const source = read("KingExperience.tsx");
    expect(source).toContain('aria-describedby="king-preview-only-note"');
    expect(source).toContain("aria-pressed=");
    expect(source).toContain('lang={lang}');
    expect(source).toContain('localStorage.setItem("banmao_language", next)');
    expect(source).toContain("traitLabels[lang]");
  });
  test("maps wallet and contract errors into selected language", () => {
    expect(kingError(new Error("User rejected request"), KING_T.vi)).toBe(KING_T.vi.rejected);
    expect(kingError(new Error("Contract configuration mismatch"), KING_T.ko)).toBe(KING_T.ko.configError);
    expect(kingError(new Error("RPC detail"), KING_T.ru)).toBe(KING_T.ru.transactionError);
  });
});
