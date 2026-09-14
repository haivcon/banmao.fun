import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ethers } from "ethers";
import KingContracts from "../app/collection/banmaoking/KingContracts";
import { KING_CONTRACTS } from "../app/collection/banmaoking/contract-directory";
import { BANMAO_KING_DEPLOYMENT } from "../app/collection/banmaoking/deployment";

describe("BanmaoKing public contract directory", () => {
  test("lists four new contracts and seven reused artwork dependencies", () => {
    expect(KING_CONTRACTS).toHaveLength(11);
    expect(KING_CONTRACTS.filter(c => !c.reused)).toHaveLength(4);
    expect(new Set(KING_CONTRACTS.map(c => c.address)).size).toBe(11);
    for (const contract of KING_CONTRACTS) {
      expect(ethers.utils.isAddress(contract.address)).toBe(true);
      expect(contract.vi.length).toBeGreaterThan(30);
      expect(contract.en.length).toBeGreaterThan(30);
    }
    expect(KING_CONTRACTS[0].address).toBe(BANMAO_KING_DEPLOYMENT.contractAddress);
    expect(KING_CONTRACTS[0].address.endsWith("eeee")).toBe(true);
    expect(KING_CONTRACTS[1].address).toBe(BANMAO_KING_DEPLOYMENT.rendererAddress);
  });
  test.each([true, false])("renders all addresses and localized responsibilities (Vietnamese: %s)", isVi => {
    const html = renderToStaticMarkup(createElement(KingContracts, { isVi }));
    for (const contract of KING_CONTRACTS) {
      expect(html).toContain(`https://www.oklink.com/xlayer/address/${contract.address}`);
      expect(html).toContain(contract.name);
      expect(html).toContain(isVi ? contract.vi : contract.en);
    }
    expect(html).toContain(BANMAO_KING_DEPLOYMENT.paymentToken);
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain(isVi ? "không đồng nghĩa" : "not an independent audit");
  });
});
