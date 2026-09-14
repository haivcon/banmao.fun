import { readFileSync } from "node:fs";
import { join } from "node:path";
import ganache from "ganache";
import { ethers } from "ethers";
import solc from "solc";
import sharp from "sharp";
import {
  bodySvg,
  actionTransform,
  actionShadowSvg,

} from "../../app/collection/banmaoking/artwork";
import { animatedExpressionSvg } from "../../app/collection/banmaoking/motion";
import { ACCESSORY_SVGS, BACKGROUND_SVGS, accessoryRearSvg } from "../../app/collection/banmaoking/scene";
import { tokenBadgeSvg } from "../../app/collection/banmaoking/badge";
import { BODY_TRAITS } from "../../app/collection/banmaoking/traits";

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
contract KingBatchMinter {
    function run(address king, address to, uint256 count) external payable {
        require(msg.value == count);
        for (uint256 i; i < count; ++i) IKing(king).mint{value: 1}(to, address(0));
    }
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
    entries.map((name) => [
      name,
      { content: readFileSync(join(process.cwd(), name), "utf8") },
    ]),
  );
  sources["test/AdversarialKing.sol"] = { content: adversarialSource };
  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "shanghai",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"],
        },
      },
    },
  };
  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import(path: string) {
        for (const candidate of [
          join(process.cwd(), path),
          join(process.cwd(), "node_modules", path),
          (() => {
            try {
              return require.resolve(path, { paths: [process.cwd()] });
            } catch {
              return "";
            }
          })(),
        ]) {
          try {
            return { contents: readFileSync(candidate, "utf8") };
          } catch {
            /* continue */
          }
        }
        return { error: `Import not found: ${path}` };
      },
    }),
  );
  const errors = (output.errors ?? []).filter(
    (item: { severity: string }) => item.severity === "error",
  );
  if (errors.length)
    throw new Error(
      errors
        .map((item: { formattedMessage: string }) => item.formattedMessage)
        .join("\n"),
    );

  const artifacts: Record<string, Artifact> = {};
  for (const contracts of Object.values(output.contracts) as Array<
    Record<
      string,
      {
        abi: ethers.ContractInterface;
        evm: {
          bytecode: { object: string };
          deployedBytecode: { object: string };
        };
      }
    >
  >) {
    for (const [name, contract] of Object.entries(contracts)) {
      if (contract.evm.bytecode.object)
        artifacts[name] = {
          abi: contract.abi,
          bytecode: `0x${contract.evm.bytecode.object}`,
          runtimeBytecode: `0x${contract.evm.deployedBytecode.object}`,
        };
    }
  }
  return artifacts;
}

const artifacts = compile();
// Full on-chain SVG calls are intentionally expensive; allow the JS Ganache fallback on Windows.
jest.setTimeout(600_000);

async function deploy(
  name: string,
  signer: ethers.Signer,
  args: unknown[] = [],
) {
  if (args.length === 0 && name === "BanmaoKingBodyLib") {
    args = [(await deploy("BanmaoKingAnatomyPart", signer)).address];
  }
  if (args.length === 0 && name === "BanmaoKingExpressionLib") {
    args = [];
    for (let i = 0; i < 3; i++) args.push((await deploy(`BanmaoKingExpressionPart${i}`, signer)).address);
  }
  const artifact = artifacts[name];
  const contract = await new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    signer,
  ).deploy(...args);
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
    provider = new ethers.providers.Web3Provider(
      ganache.provider({ logging: { quiet: true } }) as never,
    );
    provider.pollingInterval = 10;
    owner = provider.getSigner(0);
    ownerAddress = await owner.getAddress();
    treasury = await provider.getSigner(3).getAddress();
    token = await deploy("TestToken", owner);
    feeToken = await deploy("FeeToken", owner);
    const body = await deploy("BanmaoKingBodyLib", owner);
    const expression = await deploy("BanmaoKingExpressionLib", owner);
    const accessory = await deploy("BanmaoKingAccessoryLib", owner);
    renderer = await deploy("BanmaoKingRenderer", owner, [
      body.address,
      expression.address,
      accessory.address,
    ]);
    king = await deploy("BanmaoKingNFT", owner, [
      renderer.address,
      treasury,
      3,
      nativePrice,
      [token.address, feeToken.address],
      [erc20Price, erc20Price],
      treasury,
      500,
      ethers.utils.id("BANMAO_KING_TEST_SEED"),
    ]);
  });

  test("exhausts all 9216 combinations without replacement and rejects oversized supply", async () => {
    const args = [renderer.address, treasury, 9216, 1, [], [], treasury, 500, ethers.constants.HashZero];
    await expect(deploy("BanmaoKingNFT", owner, [...args.slice(0, 2), 9217, ...args.slice(3)])).rejects.toThrow();
    const uniqueKing = await deploy("BanmaoKingNFT", owner, args);
    const batch = await deploy("KingBatchMinter", owner);
    const seen = new Set<number>();
    for (let start = 0; start < 9216; start += 128) {
      const count = Math.min(128, 9216 - start);
      const receipt = await (await batch.run(uniqueKing.address, ownerAddress, count, { value: count, gasLimit: 29_000_000 })).wait();
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== uniqueKing.address.toLowerCase()) continue;
        const event = uniqueKing.interface.parseLog(log);
        if (event.name !== "KingMinted") continue;
        const packed = Number(event.args.packedTraits);
        expect(seen.has(packed)).toBe(false);
        expect(packed & 255).toBeLessThan(8);
        expect((packed >>> 8) & 255).toBeLessThan(12);
        expect((packed >>> 16) & 255).toBeLessThan(12);
        expect(packed >>> 24).toBeLessThan(8);
        seen.add(packed);
      }
    }
    expect(seen.size).toBe(9216);
    expect(await uniqueKing.totalSupply()).toEqual(ethers.BigNumber.from(9216));
    await expect(uniqueKing.mint(ownerAddress, ethers.constants.AddressZero, { value: 1 })).rejects.toThrow();
  }, 900_000);

  test("dead-address payments preserve repeated wallet minting and the new symbol", async () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), "deployments/banmaoking-mainnet-config.json"), "utf8"));
    const dead = "0x000000000000000000000000000000000000dEaD";
    const price = ethers.utils.parseUnits("6666", 18);
    expect(config.treasury).toBe(dead);
    expect(config.royaltyReceiver).toBe(dead);
    expect(config.royaltyBps).toBe(200);
    expect(config.nativePrice).toBe("0");
    expect(config.payments[0].price).toBe(price.toString());
    const burnKing = await deploy("BanmaoKingNFT", owner, [
      renderer.address, config.treasury, config.maxSupply, config.nativePrice,
      [token.address], [price], config.royaltyReceiver, config.royaltyBps, config.collectionSeed,
    ]);
    expect(await burnKing.symbol()).toBe("banmaoKING");
    const before = await token.balanceOf(dead);
    await (await token.approve(burnKing.address, price.mul(2))).wait();
    await (await burnKing.mint(ownerAddress, token.address)).wait();
    await (await burnKing.mint(ownerAddress, token.address)).wait();
    expect(await burnKing.ownerOf(1)).toBe(ownerAddress);
    expect(await burnKing.ownerOf(2)).toBe(ownerAddress);
    expect(await burnKing.balanceOf(ownerAddress)).toEqual(ethers.BigNumber.from(2));
    expect((await token.balanceOf(dead)).sub(before)).toEqual(price.mul(2));
    expect(await token.balanceOf(burnKing.address)).toEqual(ethers.constants.Zero);
    expect(await burnKing.traits(1)).not.toEqual(await burnKing.traits(2));
    const royalty = await burnKing.royaltyInfo(1, 10000);
    expect(royalty[0]).toBe(dead);
    expect(royalty[1]).toEqual(ethers.BigNumber.from(200));
  });

  test("ERC20-only minting rejects OKB and other tokens and reports two percent royalties", async () => {
    const price = ethers.utils.parseUnits("6666", 18);
    const args = [renderer.address, treasury, 3, 0, [token.address], [price], treasury, 200, ethers.constants.HashZero];
    const onlyToken = await deploy("BanmaoKingNFT", owner, args);
    expect(await onlyToken.isPaymentToken(ethers.constants.AddressZero)).toBe(false);
    for (const value of [0, 1, nativePrice]) {
      await expect(onlyToken.mint(ownerAddress, ethers.constants.AddressZero, { value })).rejects.toThrow();
    }
    await expect(onlyToken.mint(ownerAddress, feeToken.address)).rejects.toThrow();
    await expect(onlyToken.mint(ownerAddress, token.address)).rejects.toThrow();
    await token.approve(onlyToken.address, price);
    await expect(onlyToken.mint(ownerAddress, token.address, { value: 1 })).rejects.toThrow();
    expect(await onlyToken.totalSupply()).toEqual(ethers.constants.Zero);
    const before = await token.balanceOf(treasury);
    await (await onlyToken.mint(ownerAddress, token.address)).wait();
    expect(await onlyToken.ownerOf(1)).toBe(ownerAddress);
    expect((await token.balanceOf(treasury)).sub(before)).toEqual(price);
    const royalty = await onlyToken.royaltyInfo(1, 10000);
    expect(royalty[0]).toBe(treasury);
    expect(royalty[1]).toEqual(ethers.BigNumber.from(200));
    await expect(deploy("BanmaoKingNFT", owner, [renderer.address, treasury, 3, 0, [], [], treasury, 200, ethers.constants.HashZero])).rejects.toThrow();
  });

  test("mints sequentially for exact native payment, forwards value, and enforces supply", async () => {
    const before = await provider.getBalance(treasury);
    await king.mint(ownerAddress, ethers.constants.AddressZero, {
      value: nativePrice,
    });
    expect(await king.ownerOf(1)).toBe(ownerAddress);
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(1));
    expect((await provider.getBalance(treasury)).sub(before)).toEqual(
      nativePrice,
    );

    await expect(
      king.mint(ownerAddress, ethers.constants.AddressZero, {
        value: nativePrice.sub(1),
      }),
    ).rejects.toThrow();
    await expect(
      king.mint(ownerAddress, ethers.constants.AddressZero, {
        value: nativePrice.add(1),
      }),
    ).rejects.toThrow();
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(1));

    await king.mint(ownerAddress, ethers.constants.AddressZero, {
      value: nativePrice,
    });
    await king.mint(ownerAddress, ethers.constants.AddressZero, {
      value: nativePrice,
    });
    await expect(
      king.mint(ownerAddress, ethers.constants.AddressZero, {
        value: nativePrice,
      }),
    ).rejects.toThrow();
  });

  test("accepts exact ERC20 payment and rejects native value or fee-on-transfer tokens atomically", async () => {
    await token.approve(king.address, erc20Price);
    const before = await token.balanceOf(treasury);
    await king.mint(ownerAddress, token.address);
    expect((await token.balanceOf(treasury)).sub(before)).toEqual(erc20Price);

    await token.approve(king.address, erc20Price);
    await expect(
      king.mint(ownerAddress, token.address, { value: 1 }),
    ).rejects.toThrow();
    await feeToken.approve(king.address, erc20Price);
    await expect(king.mint(ownerAddress, feeToken.address)).rejects.toThrow();
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(1));
  });

  test("emits one ERC4906 metadata update in each mint transaction", async () => {
    for (const tokenId of [1, 2]) {
      const receipt = await (await king.mint(ownerAddress, ethers.constants.AddressZero, {
        value: nativePrice,
      })).wait();
      const events = receipt.logs.filter((log: ethers.providers.Log) =>
        log.address.toLowerCase() === king.address.toLowerCase(),
      ).map((log: ethers.providers.Log) => king.interface.parseLog(log));
      expect(events.map((event: ethers.utils.LogDescription) => event.name)).toEqual([
        "Transfer", "KingMinted", "MetadataUpdate",
      ]);
      const updates = receipt.logs.filter((log: ethers.providers.Log) =>
        log.address.toLowerCase() === king.address.toLowerCase() &&
        log.topics[0] === ethers.utils.id("MetadataUpdate(uint256)"),
      );
      expect(updates).toHaveLength(1);
      expect(updates[0].topics).toHaveLength(1);
      expect(king.interface.parseLog(updates[0]).args[0]).toEqual(ethers.BigNumber.from(tokenId));
      expect(await king.ownerOf(tokenId)).toBe(ownerAddress);
    }
  });

  test("keeps traits immutable across transfers and emits complete data URIs", async () => {
    await king.mint(ownerAddress, ethers.constants.AddressZero, {
      value: nativePrice,
    });
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
    const metadata = JSON.parse(
      Buffer.from(uri.split(",")[1], "base64").toString("utf8"),
    );
    expect(metadata.name).toBe("Banmao King #1");
    expect(metadata.attributes).toHaveLength(5);
    expect(metadata.attributes[4]).toEqual({
      trait_type: "Action",
      value: "Banana Wave",
    });
    const svg = Buffer.from(metadata.image.split(",")[1], "base64").toString(
      "utf8",
    );
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

  test("matches complete frontend layers and immutable motion chunks across mixed scenes", async () => {
    const normalize = (svg: string) => staticGeometry(svg).replace(/>\s+</g, "><");
    for (let id = 0; id < 12; id++) {
      const traits = { body: id % 8, expression: id, accessory: id, background: id % 8 };
      const svg = normalize(await renderer.renderSVG(id, traits));
      const palette = BODY_TRAITS[traits.body];
      const character = normalize(accessoryRearSvg(id) + bodySvg(palette.color, palette.shade, id) + animatedExpressionSvg(id) + ACCESSORY_SVGS[id]);
      expect(svg).toContain(`<g class="king-character-motion">${character}</g>`);
      expect(svg).toContain(BACKGROUND_SVGS[traits.background]);
      expect(svg).toContain(actionShadowSvg(id));
      expect(svg).toContain(staticGeometry(tokenBadgeSvg(id, traits.background)));
      expect(svg).toContain(`transform="${actionTransform(id)}"`);
      const part0 = new ethers.Contract(await renderer.motionPart0(), artifacts.BanmaoKingMotionPart0.abi, provider);
      const part1 = new ethers.Contract(await renderer.motionPart1(), artifacts.BanmaoKingMotionPart1.abi, provider);
      expect(await renderer.renderSVG(id, traits)).toContain((await part0.contentFor(id)) + (await part1.contentFor(id)));
    }
    expect((artifacts.BanmaoKingRenderer.bytecode.length - 2) / 2 + 96).toBeLessThanOrEqual(49_152);
  });

  test("matches pixel badges at digit boundaries and uint256 fallback", async () => {
    for (const id of [42, 999, 9216, 10000, ethers.constants.MaxUint256.toString()]) {
      const svg = staticGeometry(await renderer.renderSVG(id, { body: 0, expression: 0, accessory: 0, background: 4 }));
      expect(svg).toContain(staticGeometry(tokenBadgeSvg(BigInt(id), 4)));
    }
  });

  test("renders six deterministic on-chain action poses from token ID", async () => {
    const base = { body: 0, expression: 0, accessory: 0, background: 0 };
    for (let tokenId = 0; tokenId < 6; tokenId += 1) {
      const svg = staticGeometry(await renderer.renderSVG(tokenId, base)).replace(
        />\s+</g,
        "><",
      );
      const expectedBody = staticGeometry(bodySvg(
        BODY_TRAITS[0].color,
        BODY_TRAITS[0].shade,
        tokenId,
      )).replace(/>\s+</g, "><");
      expect(svg).toContain(expectedBody);
      expect(svg).toContain(`data-pose="${tokenId}"`);
      await expect(sharp(Buffer.from(svg)).metadata()).resolves.toMatchObject({
        width: 512,
        height: 512,
      });
    }
    expect(await renderer.renderSVG(6, base)).toContain('data-pose="0"');
  });

  test("embeds self-contained animation in minted token metadata with a raster fallback", async () => {
    await king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice });
    const uri: string = await king.tokenURI(1);
    const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString());
    const svg = Buffer.from(metadata.image.split(",")[1], "base64").toString();
    expect(svg).toBe(await king.renderSVG(1));
    expect(svg).toContain('<animateTransform');
    expect(svg).toContain('<animate ');
    expect(svg).toContain('href="#smil-king-tail"');
    expect(svg).not.toMatch(/@keyframes|animation:/);
    expect(svg).toContain('additive="sum"');
    expect(svg).not.toMatch(/<script|<foreignObject|<image|@import|onload=/i);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    expect(png.length).toBeGreaterThan(1000);
    for (const name of ["BanmaoKingRenderer", "BanmaoKingExpressionLib"]) {
      console.info(`${name} runtime bytes: ${(artifacts[name].runtimeBytecode.length - 2) / 2}`);
    }
  });

  test("renders every catalogue entry and rejects out-of-range traits", async () => {
    const base = { body: 0, expression: 0, accessory: 0, background: 0 };
    for (let body = 0; body < 8; body += 1) {
      const svg = await renderer.renderSVG(1, { ...base, body });
      const palette = BODY_TRAITS[body];
      const normalizedSvg = staticGeometry(svg).replace(/>\s+</g, "><");
      const normalizedBody = staticGeometry(bodySvg(palette.color, palette.shade, 1)).replace(
        />\s+</g,
        "><",
      );
      expect(normalizedSvg).toContain(normalizedBody);
      expect(normalizedBody).toContain(
        "M318 382c29-2 39 25 61 30 22 5 41-8 42-27",
      );
      expect(normalizedBody).toContain("M178 418l-2 39c-16 6-24 19-19 29");
      expect(normalizedBody).toContain(
        "M171 301c-27 7-48 29-49 53-1 20 13 34 30 28",
      );
      expect(normalizedBody).toContain(
        'transform="translate(318 405) scale(1.07) translate(-318 -382)"',
      );
      expect(normalizedBody).toContain(
        "M342 387q9 15 20 20M362 402q9 10 19 12M385 405q9 5 18 3",
      );
      expect(normalizedBody).toContain("M162 477q22-9 45 0M305 477q23-9 45 0");
      expect(normalizedBody).toContain(
        "M143 330q16 3 32 12M139 347q15 4 30 13",
      );
      expect(normalizedBody).toContain("M139 361q8 10 18 7M373 362q-8 10-18 7");
      expect(normalizedBody).not.toContain('id="bk-tail-clip"');
      expect(normalizedBody).not.toContain('id="tail"');
      expect(normalizedBody).not.toContain('id="hind-legs"');
      expect(normalizedBody).not.toContain('id="forelegs"');
      expect(normalizedBody.indexOf('id="cat-behind"')).toBeLessThan(
        normalizedBody.indexOf('id="banana-shell"'),
      );
      expect(normalizedBody.indexOf('id="banana-shell"')).toBeLessThan(
        normalizedBody.indexOf('id="cat"'),
      );
    }
    for (let expression = 0; expression < 12; expression += 1) {
      const svg = await renderer.renderSVG(1, { ...base, expression });
      expect(staticGeometry(svg)).toContain(staticGeometry(animatedExpressionSvg(expression)));
      expect(svg).toContain(`data-expression="${expression}"`);
    }
    for (let accessory = 0; accessory < 12; accessory += 1) {
      expect(await renderer.renderSVG(1, { ...base, accessory })).toContain(
        'id="accessory"',
      );
    }
    for (let background = 0; background < 8; background += 1) {
      expect(await renderer.renderSVG(1, { ...base, background })).toMatch(
        /^<svg[\s\S]*<\/svg>$/,
      );
    }
    await expect(renderer.renderSVG(1, { ...base, body: 8 })).rejects.toThrow();
    await expect(
      renderer.renderSVG(1, { ...base, expression: 12 }),
    ).rejects.toThrow();
    await expect(
      renderer.renderSVG(1, { ...base, accessory: 12 }),
    ).rejects.toThrow();
    await expect(
      renderer.renderSVG(1, { ...base, background: 8 }),
    ).rejects.toThrow();
  });

  test("allows anyone to refresh metadata repeatedly without changing token state or funds", async () => {
    await (await king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice })).wait();
    const before = {
      uri: await king.tokenURI(1),
      traits: await king.traits(1),
      supply: await king.totalSupply(),
      renderer: await king.renderer(),
      treasuryBalance: await provider.getBalance(treasury),
      contractBalance: await provider.getBalance(king.address),
    };
    const unrelated = provider.getSigner(2);
    expect(await king.getApproved(1)).toBe(ethers.constants.AddressZero);
    expect(await king.isApprovedForAll(ownerAddress, await unrelated.getAddress())).toBe(false);

    for (const caller of [owner, unrelated, unrelated]) {
      const receipt = await (await king.connect(caller).refreshMetadata(1)).wait();
      expect(receipt.logs).toHaveLength(1);
      const log = receipt.logs[0];
      expect(log.address).toBe(king.address);
      expect(log.topics).toEqual([ethers.utils.id("MetadataUpdate(uint256)")]);
      const event = king.interface.parseLog(log);
      expect(event.name).toBe("MetadataUpdate");
      expect(event.args[0]).toEqual(ethers.BigNumber.from(1));
    }

    expect(await king.tokenURI(1)).toBe(before.uri);
    expect(await king.traits(1)).toEqual(before.traits);
    expect(await king.totalSupply()).toEqual(before.supply);
    expect(await king.renderer()).toBe(before.renderer);
    expect(await king.ownerOf(1)).toBe(ownerAddress);
    expect(await king.getApproved(1)).toBe(ethers.constants.AddressZero);
    expect(await provider.getBalance(treasury)).toEqual(before.treasuryBalance);
    expect(await provider.getBalance(king.address)).toEqual(before.contractBalance);
  });

  test("rejects metadata refresh for nonexistent tokens and rejects attached native value", async () => {
    for (const tokenId of [0, 1, ethers.constants.MaxUint256]) {
      await expect(king.refreshMetadata(tokenId)).rejects.toThrow();
    }
    await (await king.mint(ownerAddress, ethers.constants.AddressZero, { value: nativePrice })).wait();
    await expect(king.refreshMetadata(2)).rejects.toThrow();
    await expect(owner.sendTransaction({
      to: king.address,
      data: king.interface.encodeFunctionData("refreshMetadata", [1]),
      value: 1,
    })).rejects.toThrow();
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(1));
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
    await expect(
      king.mint(rejecting.address, ethers.constants.AddressZero, {
        value: nativePrice,
      }),
    ).rejects.toThrow();
    expect(await king.totalSupply()).toEqual(ethers.BigNumber.from(0));
    expect(await provider.getBalance(treasury)).toEqual(before);
    await expect(king.traits(1)).rejects.toThrow();
  });

  test("blocks treasury reentrancy while allowing the original mint", async () => {
    const reentering = await deploy("ReenteringTreasury", owner);
    const body = await deploy("BanmaoKingBodyLib", owner);
    const expression = await deploy("BanmaoKingExpressionLib", owner);
    const accessory = await deploy("BanmaoKingAccessoryLib", owner);
    const localRenderer = await deploy("BanmaoKingRenderer", owner, [
      body.address,
      expression.address,
      accessory.address,
    ]);
    const guardedKing = await deploy("BanmaoKingNFT", owner, [
      localRenderer.address,
      reentering.address,
      3,
      nativePrice,
      [],
      [],
      treasury,
      500,
      ethers.constants.HashZero,
    ]);
    await reentering.setKing(guardedKing.address);
    await guardedKing.mint(ownerAddress, ethers.constants.AddressZero, {
      value: nativePrice,
    });
    expect(await guardedKing.totalSupply()).toEqual(ethers.BigNumber.from(1));
    expect(await reentering.attempted()).toBe(true);
    expect(await reentering.succeeded()).toBe(false);
  });

  test("keeps every deployed contract below EIP-170 and excludes dangerous primitives", () => {
    const names = [
      "BanmaoKingNFT",
      "BanmaoKingRenderer",
      "BanmaoKingBodyLib",
      "BanmaoKingExpressionLib",
      "BanmaoKingAccessoryLib",
      "BanmaoKingMotionPart0",
      "BanmaoKingMotionPart1",
    ];
    for (const name of names) {
      expect(
        (artifacts[name].runtimeBytecode.length - 2) / 2,
      ).toBeLessThanOrEqual(24_576);
    }
    const source = entries
      .map((name) => readFileSync(join(process.cwd(), name), "utf8"))
      .join("\n");
    expect(source).not.toMatch(/\b(delegatecall|selfdestruct|tx\.origin)\b/);
    expect(source).not.toMatch(/\b(Ownable|AccessControl|Pausable)\b/);
  });
});

// Only motion markup is normalized; artwork and base transforms remain exact.
function staticGeometry(svg: string): string {
  return svg.replace(/ id="smil-[^"]+"/g, "")
    .replace(/<animate(?:Transform)?\b[^>]*\/>/g, "")
    .replace(/><\/rect>/g, "/>");
}
