import { validateMintState, decodeKingMetadata } from "../app/collection/banmaoking/mint";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const price = 6666000000000000000000n;

describe("King receipt lifecycle regression", () => {
  const source = readFileSync(join(process.cwd(), "app/collection/banmaoking/KingMint.tsx"), "utf8");
  test("releases restored pending state before handling reverted receipts or mint events", () => {
    const receiptHandler = source.slice(source.indexOf("const receipt = await client.getTransactionReceipt"), source.indexOf("for (const log of receipt.logs)"));
    expect(receiptHandler).toContain("if (!active) return;");
    expect(receiptHandler).toContain("setPending(false);");
    expect(receiptHandler.indexOf("setPending(false);")).toBeLessThan(receiptHandler.indexOf('if (receipt.status === "reverted")'));
    expect(receiptHandler).toContain('functionName: "allowance", args: [address!, kingAddress]');
    expect(receiptHandler).toContain("if (active) setState({ supply, balance, allowance });");
  });
  test("releases direct receipt waiter but not an unknown pending transaction in finally", () => {
    const waiter = source.slice(source.indexOf("const receipt = await client.waitForTransactionReceipt"));
    expect(waiter.indexOf("setPending(false);")).toBeLessThan(waiter.indexOf('if (receipt.status !== "success")'));
    expect(source).toContain("finally { setBusy(false); lock.current = false; }");
    expect(source).not.toContain("finally { setPending(false)");
  });
});
describe("King post-mint metadata refresh", () => {
  const source = readFileSync(join(process.cwd(), "app/collection/banmaoking/KingMetadataRefresh.tsx"), "utf8");
  test("simulates refresh separately from mint and persists its transaction", () => {
    expect(source).toContain('functionName: "refreshMetadata", args: [tokenId]');
    expect(source).toContain("await wallet.writeContract(request)");
    expect(source).toContain("localStorage.setItem(key, sent)");
    expect(source).not.toContain('functionName: "mint"');
  });
  test("keeps unknown receipts locked and avoids automatic duplicate refresh", () => {
    expect(source).toContain("if (localStorage.getItem(key)) return;");
    expect(source).toContain('setDone(receipt.status === "success")');
    expect(source).toContain("localStorage.removeItem(key)");
    expect(source).not.toContain("finally { setPending(false)");
  });
  test("keeps the original animated SVG rather than rasterizing the minted image", () => {
    const mint = readFileSync(join(process.cwd(), "app/collection/banmaoking/KingMint.tsx"), "utf8");
    expect(mint).toContain("src={displayImage}");
    expect(mint).toContain("href={metadata.image}");
    expect(mint).not.toMatch(/KingMetadataRefresh|autoRefresh|functionName: "refreshMetadata"/);
    expect(mint).toContain("download={`BanmaoKing-${tokenId}.svg`}");
  });
});
describe("King mint guards", () => {
  test("accepts the immutable BANMAO configuration", () => expect(() => validateMintState(price, true, 0n, 9216n)).not.toThrow());
  test.each([[0n, true, 0n, 9216n], [price, false, 0n, 9216n], [price, true, 0n, 100n], [price, true, 9216n, 9216n]] as const)("blocks invalid or sold out state", (p, accepted, supply, max) => expect(() => validateMintState(p, accepted, supply, max)).toThrow());
  test("decodes actual on-chain metadata without HTML injection", () => {
    const data = { name: "King #1", image: "data:image/svg+xml;base64,PHN2Zy8+", attributes: [{ trait_type: "Body", value: "Gold" }] };
    expect(decodeKingMetadata(`data:application/json;base64,${btoa(JSON.stringify(data))}`)).toEqual(data);
  });
  test("rejects external metadata and executable image schemes", () => {
    expect(() => decodeKingMetadata("https://example.com")).toThrow();
    expect(() => decodeKingMetadata(`data:application/json;base64,${btoa(JSON.stringify({ name: "King", image: "javascript:alert(1)" }))}`)).toThrow();
  });
});
