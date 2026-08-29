import { readFileSync } from "node:fs";
import { join } from "node:path";
import ganache from "ganache";
import { ethers } from "ethers";
import solc from "solc";
import sharp from "sharp";

type Artifact = {
  abi: ethers.ContractInterface;
  bytecode: string;
  runtimeBytecode: string;
};

const adversarialSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
interface IKing {
    function mint(address to, address paymentToken) external payable returns (uint256);
}
contract TestToken is ERC20 {
    constructor() ERC20("Test OKB", "TOKB") { _mint(msg.sender, 1_000_000 ether); }
}
contract FeeToken is ERC20 {
    constructor() ERC20("Fee Token", "FEE") { _mint(msg.sender, 1_000_000 ether); }
    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = amount / 10;
            super._update(from, to, amount - fee);
            super._update(from, address(0), fee);
        } else {
            super._update(from, to, amount);
        }
    }
}
contract ReenteringTreasury is IERC721Receiver {
    IKing public king;
    bool public attempted;
    bool public succeeded;
    function setKing(address king_) external { king = IKing(king_); }
    receive() external payable {
        if (address(king) != address(0) && !attempted) {
            attempted = true;
            (succeeded,) = address(king).call{value: msg.value}(
                abi.encodeCall(IKing.mint, (address(this), address(0)))
            );
        }
    }
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
contract RejectingReceiver is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        revert("NO_NFT");
    }
}
`;

const entries = [
  "contracts/BanmaoKing/NFT/BanmaoKingNFT.sol",
  "contracts/BanmaoKing/Renderer/BanmaoKingRenderer.sol",
  "contracts/BanmaoKing/Lib/BanmaoKingBodyLib.sol",
  "contracts/BanmaoKing/Lib/BanmaoKingExpressionLib.sol",
  "contracts/BanmaoKing/Lib/BanmaoKingAccessoryLib.sol",
];

function compile(): Record<string, Artifact> {
  const sources: Record<string, { content: string }> = Object.fromEntries(
    entries.map((name) => [name, { content: readFileSync(join(process.cwd(), name), "utf8") }]),
  );
  sources["test/AdversarialKing.sol"] = { content: adversarialSource };
  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), {
    import(path: string) {
      for (const candidate of [
        join(process.cwd(), path),
        join(process.cwd(), "node_modules", path),
        (() => { try { return require.resolve(path, { paths: [process.cwd()] }); } catch { return ""; } })(),
      ]) {
        try { return { contents: readFileSync(candidate, "utf8") }; } catch { /* continue */ }
      }
      return { error: `Import not found: ${path}` };
    },
  }));
  const errors = (output.errors ?? []).filter((item: { severity: string }) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item: { formattedMessage: string }) => item.formattedMessage).join("\n"));

  const artifacts: Record<string, Artifact> = {};
  for (const contracts of Object.values(output.contracts) as Array<Record<string, {
    abi: ethers.ContractInterface;
    evm: { bytecode: { object: string }; deployedBytecode: { object: string } };
  }>>) {
    for (const [name, contract] of Object.entries(contracts)) {
      if (contract.evm.bytecode.object) artifacts[name] = {
        abi: contract.abi,
        bytecode: `0x${contract.evm.bytecode.object}`,
        runtimeBytecode: `0x${contract.evm.deployedBytecode.object}`,
      };
    }
  }
  return artifacts;
}

const artifacts = compile();
jest.setTimeout(300_000);

async function deploy(name: string, signer: ethers.Signer, args: unknown[] = []) {
  const artifact = artifacts[name];
  const contract = await new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(...args);
  await contract.deployed();
  return contract;
}


describe("BanmaoKing immutable on-chain release", () => {
  let provider: ethers.providers.Web3Provider;
  let owner: ethers.Signer;
  let ownerAddress: string;
  let treasury: string;
  let token: ethers.Contract;
  let feeToken: ethers.Contract;
  let renderer: ethers.Contract;
  let king: ethers.Contract;
  const nativePrice = ethers.utils.parseEther("1");
  const erc20Price = ethers.utils.parseEther("25");

  beforeEach(async () => {
    provider = new ethers.providers.Web3Provider(ganache.provider({ logging: { quiet: true } }) as never);
    owner = provider.getSigner(0);
    ownerAddress = await owner.getAddress();
    treasury = await provider.getSigner(3).getAddress();
    token = await deploy("TestToken", owner);
    feeToken = await deploy("FeeToken", owner);
    const body = await deploy("BanmaoKingBodyLib", owner);
    const expression = await deploy("BanmaoKingExpressionLib", owner);
    const accessory = await deploy("BanmaoKingAccessoryLib", owner);
    renderer = await deploy("BanmaoKingRenderer", owner, [body.address, expression.address, accessory.address]);
    king = await deploy("BanmaoKingNFT", owner, [
      renderer.address, treasury, 3, nativePrice,
      [token.address, feeToken.address], [erc20Price, erc20Price],
      treasury, 500, ethers.utils.id("BANMAO_KING_TEST_SEED"),
    ]);
  });

  test("mints sequentially for exact native payment, forwards value, and enforces supply", async () => {
    const before = await provider.getBalance(treasury);
    await king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice });
    expect(await king.ownerOf(1)).toBe(ownerAddress);
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(1));
    expect((await provider.getBalance(treasury)).sub(before)).toEqual(nativePrice);

    await expect(king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice.sub(1) })).rejects.toThrow();
    await expect(king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice.add(1) })).rejects.toThrow();
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(1));

    await king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice });
    await king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice });
    await expect(king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice })).rejects.toThrow();
  });

  test("accepts exact ERC20 payment and rejects native value or fee-on-transfer tokens atomically", async () => {
    await token.approve(king.address, erc20Price);
    const before = await token.balanceOf(treasury);
    await king.mint(ownerAddress, token.address);
    expect((await token.balanceOf(treasury)).sub(before)).toEqual(erc20Price);

    await token.approve(king.address, erc20Price);
    await expect(king.mint(ownerAddress, token.address, { value: 1 })).rejects.toThrow();
    await feeToken.approve(king.address, erc20Price);
    await expect(king.mint(ownerAddress, feeToken.address)).rejects.toThrow();
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(1));
  });

  test("keeps traits immutable across transfers and emits complete data URIs", async () => {
    await king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice });
    const before = await king.traits(1);
    expect(Number(before.body)).toBeLessThan(8);
    expect(Number(before.expression)).toBeLessThan(12);
    expect(Number(before.accessory)).toBeLessThan(12);
    expect(Number(before.background)).toBeLessThan(8);

    const recipient = await provider.getSigner(1).getAddress();
    await king.transferFrom(ownerAddress, recipient, 1);
    expect(await king.traits(1)).toEqual(before);

    const uri = await king.tokenURI(1);
    expect(uri).toMatch(/^data:application\/json;base64,/);
    const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    expect(metadata.name).toBe("Banmao King #1");
    expect(metadata.attributes).toHaveLength(4);
    const svg = Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8");
    expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/);
    const parsedSvg = await sharp(Buffer.from(svg)).metadata();
    expect(parsedSvg.width).toBe(512);
    expect(parsedSvg.height).toBe(512);
    expect(svg).toContain('id="body"');
    expect(svg).toContain('id="expression"');
    expect(svg).toContain('id="accessory"');
    expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', "")).not.toMatch(
      /<script|foreignObject|\son\w+=|https?:\/\//i,
    );
  });

  test("renders every catalogue entry and rejects out-of-range traits", async () => {
    const base = { body: 0, expression: 0, accessory: 0, background: 0 };
    for (let body = 0; body < 8; body += 1) {
      expect(await renderer.renderSVG(1, { ...base, body })).toContain('id="body"');
    }
    for (let expression = 0; expression < 12; expression += 1) {
      expect(await renderer.renderSVG(1, { ...base, expression })).toContain('id="expression"');
    }
    for (let accessory = 0; accessory < 12; accessory += 1) {
      expect(await renderer.renderSVG(1, { ...base, accessory })).toContain('id="accessory"');
    }
    for (let background = 0; background < 8; background += 1) {
      expect(await renderer.renderSVG(1, { ...base, background })).toMatch(/^<svg[\s\S]*<\/svg>$/);
    }
    await expect(renderer.renderSVG(1, { ...base, body: 8 })).rejects.toThrow();
    await expect(renderer.renderSVG(1, { ...base, expression: 12 })).rejects.toThrow();
    await expect(renderer.renderSVG(1, { ...base, accessory: 12 })).rejects.toThrow();
    await expect(renderer.renderSVG(1, { ...base, background: 8 })).rejects.toThrow();
  });

  test("supports ERC721, metadata, ERC2981, ERC4906 and fixed royalties", async () => {
    expect(await king.supportsInterface("0x80ac58cd")).toBe(true);
    expect(await king.supportsInterface("0x5b5e139f")).toBe(true);
    expect(await king.supportsInterface("0x2a55205a")).toBe(true);
    expect(await king.supportsInterface("0x49064906")).toBe(true);
    const royalty = await king.royaltyInfo(1, 10_000);
    expect(royalty[0]).toBe(treasury);
    expect(royalty[1]).toEqual(ethers.BigNumber.from(500));
  });

  test("rolls back payment, supply, and traits if the receiver rejects safe mint", async () => {
    const rejecting = await deploy("RejectingReceiver", owner);
    const before = await provider.getBalance(treasury);
    await expect(king.mint(rejecting.address, ethers.constants.AddressZero, { value: nativePrice })).rejects.toThrow();
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(0));
    expect(await provider.getBalance(treasury)).toEqual(before);
    await expect(king.traits(1)).rejects.toThrow();
  });

  test("blocks treasury reentrancy while allowing the original mint", async () => {
    const reentering = await deploy("ReenteringTreasury", owner);
    const body = await deploy("BanmaoKingBodyLib", owner);
    const expression = await deploy("BanmaoKingExpressionLib", owner);
    const accessory = await deploy("BanmaoKingAccessoryLib", owner);
    const localRenderer = await deploy("BanmaoKingRenderer", owner, [body.address, expression.address, accessory.address]);
    const guardedKing = await deploy("BanmaoKingNFT", owner, [
      localRenderer.address, reentering.address, 3, nativePrice,
      [], [], treasury, 500, ethers.constants.HashZero,
    ]);
    await reentering.setKing(guardedKing.address);
    await guardedKing.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice });
    expect(await guardedKing.totalSupply()).toEqual(ethers.BigNumber.from(1));
    expect(await reentering.attempted()).toBe(true);
    expect(await reentering.succeeded()).toBe(false);
  });

  test("keeps every deployed contract below EIP-170 and excludes dangerous primitives", () => {
    const names = [
      "BanmaoKingNFT", "BanmaoKingRenderer", "BanmaoKingBodyLib",
      "BanmaoKingExpressionLib", "BanmaoKingAccessoryLib",
    ];
    for (const name of names) {
      expect((artifacts[name].runtimeBytecode.length - 2) / 2).toBeLessThanOrEqual(24_576);
    }
    const source = entries.map((name) => readFileSync(join(process.cwd(), name), "utf8")).join("\n");
    expect(source).not.toMatch(/\b(delegatecall|selfdestruct|tx\.origin)\b/);
    expect(source).not.toMatch(/\b(Ownable|AccessControl|Pausable)\b/);
  });
});
