import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ganache from "ganache";
import { ethers } from "ethers";
import solc from "solc";
import sharp from "sharp";

const { collectBanmaoBoxSources } = require("../../scripts/banmaobox-runtime.cjs");

type Artifact = {
  abi: ethers.ContractInterface;
  bytecode: string;
  runtimeBytecode: string;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const CLUSTER_TIMING = 'keyTimes="0;(?:\\.18;\\.42;\\.48;\\.72|\\.2;\\.44;\\.5;\\.74|\\.22;\\.46;\\.52;\\.76);1" dur="8s" repeatCount="indefinite"';
const SCALE_TIMING = 'keyTimes="0;\\.2;\\.38;\\.42;\\.58;\\.62;\\.8;1" dur="8s" repeatCount="indefinite"';
const LOGO_ANIMATION = new RegExp(`<(?:animate attributeName="d" values="[^"]+" ${CLUSTER_TIMING}|animateTransform attributeName="transform" type="(?:translate|rotate)" values="[^"]+" ${CLUSTER_TIMING}|animateTransform attributeName="transform" type="scale" values="[^"]+" ${SCALE_TIMING})\\/>`, "g");
const FRAME_ANIMATION = new RegExp(`<(?:animate attributeName="fill-opacity" values="[^"]+" dur="(?:2|5)s" repeatCount="indefinite"|animate attributeName="stroke-dashoffset" values="[^"]+" dur="4s" repeatCount="indefinite"|animate attributeName="color" values="[^"]+" keyTimes="0;.46;.53;.6;1" dur="8s" repeatCount="indefinite"|animateTransform attributeName="transform" type="translate" values="[^"]+" dur="10s" repeatCount="indefinite")\\/>`, "g");
const ENERGY_ANIMATION = /<(?:animateTransform attributeName="transform" type="translate" values="(?:\d+ \d+;){6}\d+ \d+" keyTimes="0;.16;.33;.5;.66;.83;1" dur="\d+\.\ds" repeatCount="indefinite"|animate attributeName="opacity" values=".45;.45;1;.45;.45" keyTimes="0;.44;.5;.56;1" dur="\d+\.\ds" repeatCount="indefinite"|animate attributeName="r" values="4;4;14;4;4" keyTimes="0;.44;.5;.56;1" dur="\d+\.\ds" repeatCount="indefinite")\/>/g;

const parseSvg = (svg: string) => {
  expect(svg).toMatch(/^<svg[\s\S]*<\/svg>$/);
  expect(svg.match(LOGO_ANIMATION)).toHaveLength(6);
  expect(svg.match(FRAME_ANIMATION)).toHaveLength(4);
  const energyAnimations = svg.match(ENERGY_ANIMATION) ?? [];
  expect(energyAnimations).toHaveLength(9);
  expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', "").replace(LOGO_ANIMATION, "").replace(FRAME_ANIMATION, "").replace(ENERGY_ANIMATION, "")).not.toMatch(
    /<script|foreignObject|<animate(?:Transform|Motion)?\b|\son\w+=|https?:\/\//i,
  );
};

const symbolBytes16 = (symbol: string) => ethers.utils.hexlify(
  ethers.utils.toUtf8Bytes(symbol),
).padEnd(34, "0");

const renderAssets = (assets: Array<[string, ethers.BigNumberish, number, string]>) =>
  ethers.utils.hexConcat(assets.map(([token, amount, decimals, symbol]) =>
    ethers.utils.solidityPack(
      ["address", "uint256", "uint8", "bytes16"],
      [token, amount, decimals, symbolBytes16(symbol)],
    ),
  ));

const adversarialSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {BanmaoBoxRenderData, IBanmaoBoxRenderer, IBanmaoBoxSVGRenderer} from "contracts/banmaobox/BanmaoBoxRenderer.sol";
interface IBox {
    function openBox(uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
}
contract TestToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1_000_000 ether);
    }
}
contract RawSymbolToken {
    bytes private response;
    uint8 private mode;
    constructor(bytes memory response_, uint8 mode_) { response = response_; mode = mode_; }
    fallback() external {
        if (mode == 1) revert("SYMBOL_REVERT");
        if (mode == 2) { assembly { return(0, 65536) } }
        if (mode == 3) { while (true) {} }
        bytes memory value = response;
        assembly { return(add(value, 0x20), mload(value)) }
    }
}
contract Nft5UsdToken {
    function symbol() external pure returns (string memory) { return unicode"USD₮0"; }
}
contract ReplacementSVGRenderer is IBanmaoBoxSVGRenderer {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IBanmaoBoxSVGRenderer).interfaceId;
    }
    function renderSVG(uint256 tokenId, BanmaoBoxRenderData calldata)
        external pure returns (string memory)
    {
        return tokenId == 1
            ? '<svg xmlns="http://www.w3.org/2000/svg"><text>REPLACEMENT SVG</text></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    }
}
contract ReplacementFullRenderer is IBanmaoBoxRenderer {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IBanmaoBoxRenderer).interfaceId ||
            interfaceId == type(IBanmaoBoxSVGRenderer).interfaceId;
    }
    function tokenURI(uint256 tokenId, BanmaoBoxRenderData calldata)
        external pure returns (string memory)
    { return tokenId == 1 ? "replacement-token-uri" : "other-token-uri"; }
    function renderSVG(uint256 tokenId, BanmaoBoxRenderData calldata)
        external pure returns (string memory)
    {
        return tokenId == 1
            ? '<svg xmlns="http://www.w3.org/2000/svg"><text>REPLACEMENT FULL SVG</text></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
    }
    function renderAttributes(BanmaoBoxRenderData calldata)
        external pure returns (string memory)
    { return '[{"trait_type":"Replacement","value":"Full"}]'; }
}
contract RevertingFullRenderer is IBanmaoBoxRenderer {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IBanmaoBoxRenderer).interfaceId ||
            interfaceId == type(IBanmaoBoxSVGRenderer).interfaceId;
    }
    function tokenURI(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { revert("LIE"); }
    function renderSVG(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { revert("LIE"); }
    function renderAttributes(BanmaoBoxRenderData calldata) external pure returns (string memory) { revert("LIE"); }
}
contract DerivedOnlyRenderer is IBanmaoBoxRenderer {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IBanmaoBoxRenderer).interfaceId;
    }
    function tokenURI(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { return "derived-only"; }
    function renderSVG(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { return "derived-only"; }
    function renderAttributes(BanmaoBoxRenderData calldata) external pure returns (string memory) { return "[]"; }
}
contract RevertingSVGClaimRenderer is IBanmaoBoxRenderer {
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        if (interfaceId == type(IBanmaoBoxSVGRenderer).interfaceId) revert("SVG_QUERY_REVERTS");
        return interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IBanmaoBoxRenderer).interfaceId;
    }
    function tokenURI(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { return "reverting-svg-claim"; }
    function renderSVG(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { return "reverting-svg-claim"; }
    function renderAttributes(BanmaoBoxRenderData calldata) external pure returns (string memory) { return "[]"; }
}
contract InvalidFullRenderer is IBanmaoBoxRenderer {
    function supportsInterface(bytes4) external pure returns (bool) { return true; }
    function tokenURI(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { return "invalid"; }
    function renderSVG(uint256, BanmaoBoxRenderData calldata) external pure returns (string memory) { return "invalid"; }
    function renderAttributes(BanmaoBoxRenderData calldata) external pure returns (string memory) { return "invalid"; }
}
contract ReturnBombToken is ERC20 {
    address public box;
    constructor() ERC20("Return Bomb", "BOMB") { _mint(msg.sender, 1_000_000 ether); }
    function setBox(address value) external { box = value; }
    function transfer(address to, uint256 amount) public override returns (bool) {
        if (msg.sender == box) { assembly { revert(0, 65536) } }
        return super.transfer(to, amount);
    }
}
contract CallbackToken is ERC20 {
    address public box;
    constructor() ERC20("Callback", "CALL") { _mint(msg.sender, 1_000_000 ether); }
    function setBox(address value) external { box = value; }
    function transfer(address to, uint256 amount) public override returns (bool) {
        bool result = super.transfer(to, amount);
        if (msg.sender == box) ICallbackOwner(to).onTokenTransfer();
        return result;
    }
}
interface ICallbackOwner { function onTokenTransfer() external; }
contract CallbackOwner is IERC721Receiver {
    IBox public immutable box;
    address public immutable destination;
    uint256 public tokenId;
    bool public callbackAttempted;
    bool public transferSucceeded;
    constructor(address box_, address destination_) {
        box = IBox(box_); destination = destination_;
    }
    function setTokenId(uint256 value) external { tokenId = value; }
    function open() external { box.openBox(tokenId); }
    function onTokenTransfer() external {
        callbackAttempted = true;
        (transferSucceeded,) = address(box).call(
            abi.encodeCall(IBox.transferFrom, (address(this), destination, tokenId))
        );
    }
    function onERC721Received(address, address, uint256, bytes calldata)
        external pure returns (bytes4)
    { return IERC721Receiver.onERC721Received.selector; }
}
contract RejectingReceiver is IERC721Receiver {
    uint256 public immutable rejectAt;
    uint256 public received;
    constructor(uint256 rejectAt_) { rejectAt = rejectAt_; }
    function onERC721Received(address, address, uint256, bytes calldata)
        external returns (bytes4)
    {
        ++received;
        require(received != rejectAt, "REJECTED_NFT");
        return IERC721Receiver.onERC721Received.selector;
    }
}
contract FeeOnTransferToken is ERC20 {
    constructor() ERC20("Fee Token", "FEE") { _mint(msg.sender, 1_000_000 ether); }
    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = amount / 100;
            super._update(from, address(0xdead), fee);
            amount -= fee;
        }
        super._update(from, to, amount);
    }
}
contract MutableFeeToken is ERC20 {
    bool public feeEnabled;
    constructor() ERC20("Mutable Fee", "MFEE") { _mint(msg.sender, 1_000_000 ether); }
    function setFeeEnabled(bool value) external { feeEnabled = value; }
    function _update(address from, address to, uint256 amount) internal override {
        if (feeEnabled && from != address(0) && to != address(0)) {
            uint256 fee = amount / 100;
            super._update(from, address(0xdead), fee);
            amount -= fee;
        }
        super._update(from, to, amount);
    }
}
`;

function compile(): Record<string, Artifact> {
  const sources: Record<string, { content: string }> = collectBanmaoBoxSources();
  sources["test/Adversarial.sol"] = { content: adversarialSource };
  const input = {
    language: "Solidity", sources,
    settings: {
      optimizer: { enabled: true, runs: 200 }, evmVersion: "shanghai",
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
  for (const contracts of Object.values(output.contracts) as Array<Record<string, { abi: ethers.ContractInterface; evm: { bytecode: { object: string }; deployedBytecode: { object: string } } }>>) {
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
jest.setTimeout(Number(process.env.BANMAOBOX_TEST_TIMEOUT_MS ?? 300_000));

async function deploy(name: string, signer: ethers.Signer, args: unknown[] = []) {
  const artifact = artifacts[name];
  const contract = await new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer).deploy(...args);
  await contract.deployed();
  return contract;
}


describe("BanmaoBox adversarial release security", () => {
  let provider: ethers.providers.Web3Provider;
  let owner: ethers.Signer;
  let otherAddress: string;
  let primary: ethers.Contract;
  let renderer: ethers.Contract;
  let box: ethers.Contract;

  beforeEach(async () => {
    provider = new ethers.providers.Web3Provider(ganache.provider({ logging: { quiet: true } }) as never);
    owner = provider.getSigner(0);
    otherAddress = await provider.getSigner(1).getAddress();
    primary = await deploy("TestToken", owner, ["Primary", "PRI"]);
    renderer = await deploy("BanmaoBoxRenderer", owner);
    box = await deploy("BanmaoBox", owner, [
      primary.address,
      renderer.address,
      await owner.getAddress(),
    ]);
  });

  async function unlock() {
    await provider.send("evm_increaseTime", [2]);
    await provider.send("evm_mine", []);
  }

  test("lets only the immutable renderer admin replace the full metadata renderer", async () => {
    const ownerAddress = await owner.getAddress();
    const other = provider.getSigner(1);
    const replacement = await deploy("ReplacementFullRenderer", owner);
    const svgOnly = await deploy("ReplacementSVGRenderer", owner);
    const derivedOnly = await deploy("DerivedOnlyRenderer", owner);
    const revertingSvgClaim = await deploy("RevertingSVGClaimRenderer", owner);
    const invalidFull = await deploy("InvalidFullRenderer", owner);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await box.createBox(ownerAddress, ethers.utils.parseEther("10"), 3_600);

    await expect(box.connect(other).setRenderer(replacement.address)).rejects.toThrow();
    await expect(box.setRenderer(otherAddress)).rejects.toThrow();
    await expect(box.setRenderer(svgOnly.address)).rejects.toThrow();
    await expect(box.setRenderer(derivedOnly.address)).rejects.toThrow();
    await expect(box.setRenderer(revertingSvgClaim.address)).rejects.toThrow();
    await expect(box.setRenderer(invalidFull.address)).rejects.toThrow();

    const receipt = await (await box.setRenderer(replacement.address)).wait();
    expect(await box.renderer()).toBe(replacement.address);
    expect(await box.rendererAdmin()).toBe(ownerAddress);
    expect(receipt.events?.find((event: { event?: string }) =>
      event.event === "RendererUpdated")?.args?.newRenderer).toBe(replacement.address);
    const refresh = receipt.events?.find((event: { event?: string }) =>
      event.event === "BatchMetadataUpdate");
    expect(refresh?.args?._fromTokenId.toString()).toBe("1");
    expect(refresh?.args?._toTokenId.toString()).toBe(ethers.constants.MaxUint256.toString());

    expect(await box.tokenURI(1)).toBe("replacement-token-uri");
    expect(await box.renderSVG(1)).toContain("REPLACEMENT FULL SVG");
    expect(await box.renderAttributes(1)).toBe('[{"trait_type":"Replacement","value":"Full"}]');
  });

  test("makes the Factory deployer admin of collections created by other callers", async () => {
    const factory = await deploy("BanmaoBoxFactory", owner, [
      renderer.address,
      ethers.constants.AddressZero,
    ]);
    const other = provider.getSigner(1);
    await factory.connect(other).createTokenBox(primary.address);
    const deployedBox = new ethers.Contract(
      await factory.boxForToken(primary.address),
      artifacts.BanmaoBox.abi,
      owner,
    );

    expect(await factory.rendererAdmin()).toBe(await owner.getAddress());
    expect(await factory.renderer()).toBe(renderer.address);
    expect(await factory.defaultRenderer()).toBe(renderer.address);
    expect(await factory.previousFactory()).toBe(ethers.constants.AddressZero);
    expect(await deployedBox.rendererAdmin()).toBe(await owner.getAddress());
    expect(await deployedBox.renderer()).toBe(renderer.address);
  });

  test("lets only the Factory renderer admin update the full default renderer", async () => {
    const ownerAddress = await owner.getAddress();
    const factory = await deploy("BanmaoBoxFactory", owner, [
      renderer.address,
      ethers.constants.AddressZero,
    ]);
    const replacement = await deploy("BanmaoBoxRenderer", owner);
    const other = provider.getSigner(1);

    await expect(factory.connect(other).setDefaultRenderer(replacement.address)).rejects.toThrow();
    await expect(factory.setDefaultRenderer(ethers.constants.AddressZero)).rejects.toThrow();
    await expect(factory.setDefaultRenderer(otherAddress)).rejects.toThrow();
    const svgOnly = await deploy("ReplacementSVGRenderer", owner);
    const derivedOnly = await deploy("DerivedOnlyRenderer", owner);
    const revertingSvgClaim = await deploy("RevertingSVGClaimRenderer", owner);
    const invalidFull = await deploy("InvalidFullRenderer", owner);
    await expect(factory.setDefaultRenderer(svgOnly.address)).rejects.toThrow();
    await expect(factory.setDefaultRenderer(derivedOnly.address)).rejects.toThrow();
    await expect(factory.setDefaultRenderer(revertingSvgClaim.address)).rejects.toThrow();
    await expect(factory.setDefaultRenderer(invalidFull.address)).rejects.toThrow();

    await expect(deploy("BanmaoBox", owner, [primary.address, derivedOnly.address, ownerAddress])).rejects.toThrow();
    await expect(deploy("BanmaoBox", owner, [primary.address, revertingSvgClaim.address, ownerAddress])).rejects.toThrow();
    await expect(deploy("BanmaoBoxFactory", owner, [derivedOnly.address, ethers.constants.AddressZero])).rejects.toThrow();
    await expect(deploy("BanmaoBoxFactory", owner, [revertingSvgClaim.address, ethers.constants.AddressZero])).rejects.toThrow();

    const receipt = await (await factory.setDefaultRenderer(replacement.address)).wait();
    expect(await factory.renderer()).toBe(renderer.address);
    expect(await factory.defaultRenderer()).toBe(replacement.address);
    expect(receipt.events?.find((event: { event?: string }) =>
      event.event === "DefaultRendererUpdated")?.args).toMatchObject({
      previousRenderer: renderer.address,
      newRenderer: replacement.address,
    });

    const secondary = await deploy("TestToken", owner, ["Secondary", "SEC"]);
    await factory.createTokenBox(secondary.address);
    const deployedBox = new ethers.Contract(
      await factory.boxForToken(secondary.address),
      artifacts.BanmaoBox.abi,
      owner,
    );
    expect(await deployedBox.renderer()).toBe(replacement.address);
    expect(await deployedBox.rendererAdmin()).toBe(await owner.getAddress());
  });

  test("inherits predecessor discovery and prevents duplicate token collections", async () => {
    const previous = await deploy("BanmaoBoxFactory", owner, [
      renderer.address,
      ethers.constants.AddressZero,
    ]);
    await previous.createTokenBox(primary.address);
    const inheritedBox = await previous.boxForToken(primary.address);
    await expect(deploy("BanmaoBoxFactory", owner, [
      renderer.address,
      otherAddress,
    ])).rejects.toThrow();
    const successor = await deploy("BanmaoBoxFactory", owner, [
      renderer.address,
      previous.address,
    ]);

    expect(await successor.previousFactory()).toBe(previous.address);
    expect(await successor.boxForToken(primary.address)).toBe(inheritedBox);
    expect(await successor.isTokenBox(inheritedBox)).toBe(true);
    await expect(successor.createTokenBox(primary.address)).rejects.toThrow();

    const secondary = await deploy("TestToken", owner, ["Secondary", "SEC"]);
    await successor.createTokenBox(secondary.address);
    const successorBox = await successor.boxForToken(secondary.address);
    expect(successorBox).not.toBe(ethers.constants.AddressZero);
    expect(await successor.isTokenBox(successorBox)).toBe(true);
    expect(await previous.boxForToken(secondary.address)).toBe(ethers.constants.AddressZero);
    expect(await previous.isTokenBox(successorBox)).toBe(false);
  });

  test("emits Transfer then exactly one MetadataUpdate on every successful mint path", async () => {
    const recipient = await owner.getAddress();
    const other = provider.getSigner(1);
    const secondary = await deploy("TestToken", owner, ["Secondary", "SEC"]);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await secondary.approve(box.address, ethers.constants.MaxUint256);

    const assertMintEvents = (
      receipt: { events?: Array<{ event?: string; args?: { _tokenId?: ethers.BigNumber } }> },
      tokenIds: number[],
    ) => {
      const relevant = receipt.events?.filter((event) =>
        event.event === "Transfer" || event.event === "MetadataUpdate");
      expect(relevant?.map((event) => event.event)).toEqual(
        tokenIds.flatMap(() => ["Transfer", "MetadataUpdate"]),
      );
      expect(relevant?.filter((event) => event.event === "MetadataUpdate")
        .map((event) => event.args?._tokenId?.toNumber())).toEqual(tokenIds);
    };

    const singleReceipt = await (
      await box.createBox(recipient, ethers.utils.parseEther("1"), 86_400)
    ).wait();
    assertMintEvents(singleReceipt, [1]);

    const batchReceipt = await (
      await box.createBoxes(
        [recipient, recipient],
        [ethers.utils.parseEther("2"), ethers.utils.parseEther("3")],
        86_400,
      )
    ).wait();
    assertMintEvents(batchReceipt, [2, 3]);

    const basketReceipt = await (
      await box.createMultiTokenBox(
        recipient,
        [primary.address, secondary.address],
        [ethers.utils.parseEther("4"), ethers.utils.parseEther("5")],
        86_400,
      )
    ).wait();
    assertMintEvents(basketReceipt, [4]);

    const lockedRefreshReceipt = await (await box.connect(other).refreshMetadata(1)).wait();
    expect(lockedRefreshReceipt.events?.find((event: { event?: string }) =>
      event.event === "MetadataUpdate")?.args?._tokenId.toString()).toBe("1");
    await expect(box.connect(other).refreshMetadata(999)).rejects.toThrow();
  });

  test("blocks ERC-721 ownership changes during token callbacks", async () => {
    const callback = await deploy("CallbackToken", owner);
    const recipient = await deploy("CallbackOwner", owner, [box.address, otherAddress]);
    await callback.setBox(box.address);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await callback.approve(box.address, ethers.constants.MaxUint256);
    await box.createMultiTokenBox(
      recipient.address,
      [primary.address, callback.address],
      [ethers.utils.parseEther("10"), ethers.utils.parseEther("20")],
      1,
    );
    await recipient.setTokenId(1);
    await unlock();

    await recipient.open();

    expect(await recipient.callbackAttempted()).toBe(true);
    expect(await recipient.transferSucceeded()).toBe(false);
    expect(await callback.balanceOf(recipient.address)).toEqual(ethers.utils.parseEther("20"));
    await expect(box.ownerOf(1)).rejects.toThrow();
  });

  test("caps malicious revert data and still releases unrelated assets", async () => {
    const bomb = await deploy("ReturnBombToken", owner);
    const good = await deploy("TestToken", owner, ["Good", "GOOD"]);
    await bomb.setBox(box.address);
    for (const token of [primary, bomb, good]) await token.approve(box.address, ethers.constants.MaxUint256);
    const amounts = ["10", "20", "30"].map(ethers.utils.parseEther);
    await box.createMultiTokenBox(await owner.getAddress(), [primary.address, bomb.address, good.address], amounts, 1);
    await unlock();

    const receipt = await (await box.openBox(1, { gasLimit: 2_500_000 })).wait();

    expect((await primary.balanceOf(box.address)).toString()).toBe("0");
    expect((await good.balanceOf(box.address)).toString()).toBe("0");
    expect((await bomb.balanceOf(box.address)).toString()).toBe(amounts[1].toString());
    expect((await box.boxAssetCount(1)).toString()).toBe("1");
    expect((await box.totalTokensLocked()).toString()).toBe("0");
    expect((await box.totalLockedByToken(bomb.address)).toString()).toBe(amounts[1].toString());
    const failure = receipt.events?.find((event: { event?: string }) => event.event === "BoxAssetReleaseFailed");
    expect(failure?.args?.reason.length).toBe(2 + 256 * 2);
  });

  test("preserves failure events and custody when every batch asset fails", async () => {
    const bomb = await deploy("ReturnBombToken", owner);
    await bomb.setBox(box.address);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await bomb.approve(box.address, ethers.constants.MaxUint256);
    const amount = ethers.utils.parseEther("20");
    await box.createMultiTokenBox(
      await owner.getAddress(),
      [primary.address, bomb.address],
      [ethers.utils.parseEther("10"), amount],
      1,
    );
    await unlock();
    await box["openAsset(uint256,uint256)"](1, 0);

    const receipt = await (await box.openBox(1, { gasLimit: 1_500_000 })).wait();

    expect(receipt.events?.filter((event: { event?: string }) =>
      event.event === "BoxAssetReleaseFailed")).toHaveLength(1);
    expect((await box.boxAssetCount(1)).toString()).toBe("1");
    expect((await box.totalLockedByToken(bomb.address)).toString()).toBe(amount.toString());
    expect(await box.ownerOf(1)).toBe(await owner.getAddress());
  });

  test("only the current NFT owner may abandon, even when an operator is approved", async () => {
    const ownerAddress = await owner.getAddress();
    const amount = ethers.utils.parseEther("10");
    await primary.approve(box.address, amount);
    await box.createBox(ownerAddress, amount, 1);

    await expect(box["abandonAsset(uint256,uint256)"](1, 0)).rejects.toThrow();
    await unlock();
    const operator = provider.getSigner(1);
    await expect(box.connect(operator)["abandonAsset(uint256,uint256)"](1, 0)).rejects.toThrow();

    await box.approve(otherAddress, 1);
    await expect(box.connect(operator)["abandonAsset(uint256,uint256)"](1, 0)).rejects.toThrow();
    await box.setApprovalForAll(otherAddress, true);
    await expect(box.connect(operator)["abandonAsset(uint256,uint256)"](1, 0)).rejects.toThrow();

    const receipt = await (await box[
      "abandonAsset(uint256,uint256,address,uint256)"
    ](
      1,
      0,
      primary.address,
      amount,
    )).wait();
    const abandoned = receipt.events?.find((event: { event?: string }) =>
      event.event === "BoxAssetAbandoned");
    expect(abandoned?.args?.owner).toBe(ownerAddress);
    expect(await box.totalTokensLocked()).toEqual(ethers.constants.Zero);
    expect(await box.totalLockedByToken(primary.address)).toEqual(amount);
    expect(await box.recoverableAbandoned(ownerAddress, primary.address)).toEqual(amount);
    expect(await primary.balanceOf(box.address)).toEqual(amount);
    await expect(box.ownerOf(1)).rejects.toThrow();

    await box.claimAbandonedAsset(primary.address);
    expect(await box.recoverableAbandoned(ownerAddress, primary.address)).toEqual(ethers.constants.Zero);
    expect(await box.totalLockedByToken(primary.address)).toEqual(ethers.constants.Zero);
    expect(await primary.balanceOf(box.address)).toEqual(ethers.constants.Zero);
  });

  test("moves a stuck final asset into a recoverable claim, burns the NFT and reports no final primary payout", async () => {
    const bomb = await deploy("ReturnBombToken", owner);
    await bomb.setBox(box.address);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await bomb.approve(box.address, ethers.constants.MaxUint256);
    const primaryAmount = ethers.utils.parseEther("10");
    const bombAmount = ethers.utils.parseEther("20");
    await box.createMultiTokenBox(
      await owner.getAddress(),
      [primary.address, bomb.address],
      [primaryAmount, bombAmount],
      1,
    );
    await unlock();

    await box["openAsset(uint256,uint256)"](1, 0);
    const detailsAfterPrimaryRelease = await box.boxDetails(1);
    expect(detailsAfterPrimaryRelease.amount).toEqual(ethers.constants.Zero);
    const receipt = await (await box[
      "abandonAsset(uint256,uint256)"
    ](1, 0)).wait();

    const abandoned = receipt.events?.find((event: { event?: string }) =>
      event.event === "BoxAssetAbandoned");
    expect(abandoned?.args?.token).toBe(bomb.address);
    expect(abandoned?.args?.owner).toBe(await owner.getAddress());
    expect(abandoned?.args?.amount).toEqual(bombAmount);
    const opened = receipt.events?.find((event: { event?: string }) =>
      event.event === "BoxOpened");
    expect(opened?.args?.amount).toEqual(ethers.constants.Zero);
    expect(await box.totalTokensLocked()).toEqual(ethers.constants.Zero);
    expect(await box.totalLockedByToken(bomb.address)).toEqual(bombAmount);
    expect(await box.recoverableAbandoned(await owner.getAddress(), bomb.address)).toEqual(bombAmount);
    expect(await bomb.balanceOf(box.address)).toEqual(bombAmount);
    await expect(box.claimAbandonedAsset(bomb.address)).rejects.toThrow();
    expect(await box.recoverableAbandoned(await owner.getAddress(), bomb.address)).toEqual(bombAmount);
    expect(await box.totalLockedByToken(bomb.address)).toEqual(bombAmount);
    await expect(box.ownerOf(1)).rejects.toThrow();
  });

  test("guarded asset APIs reject stale indexes without changing custody or liabilities", async () => {
    const secondary = await deploy("TestToken", owner, ["Secondary", "SEC"]);
    const third = await deploy("TestToken", owner, ["Third", "THIRD"]);
    for (const token of [primary, secondary, third]) {
      await token.approve(box.address, ethers.constants.MaxUint256);
    }
    const amounts = ["10", "20", "30"].map(ethers.utils.parseEther);
    await box.createMultiTokenBox(
      await owner.getAddress(),
      [primary.address, secondary.address, third.address],
      amounts,
      1,
    );
    await unlock();

    const staleToken = secondary.address;
    const staleAmount = amounts[1];
    await box["openAsset(uint256,uint256,address,uint256)"](
      1,
      1,
      staleToken,
      staleAmount,
    );
    const movedAsset = (await box.getBoxAssets(1))[1];
    expect(movedAsset.token).toBe(third.address);

    await expect(box["openAsset(uint256,uint256,address,uint256)"](
      1,
      1,
      staleToken,
      staleAmount,
    )).rejects.toThrow();
    await expect(box["abandonAsset(uint256,uint256,address,uint256)"](
      1,
      1,
      staleToken,
      staleAmount,
    )).rejects.toThrow();
    expect(await box.boxAssetCount(1)).toEqual(ethers.BigNumber.from(2));
    expect(await box.totalLockedByToken(third.address)).toEqual(amounts[2]);
    expect(await third.balanceOf(box.address)).toEqual(amounts[2]);

    await box["abandonAsset(uint256,uint256,address,uint256)"](
      1,
      1,
      movedAsset.token,
      movedAsset.amount,
    );
    expect(await box.recoverableAbandoned(await owner.getAddress(), third.address)).toEqual(amounts[2]);
  });

  test("BoxOpened reports primary tokens paid by the transaction that empties the box", async () => {
    const secondary = await deploy("TestToken", owner, ["Secondary", "SEC"]);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await secondary.approve(box.address, ethers.constants.MaxUint256);
    const primaryAmount = ethers.utils.parseEther("10");
    await box.createMultiTokenBox(
      await owner.getAddress(),
      [primary.address, secondary.address],
      [primaryAmount, ethers.utils.parseEther("20")],
      1,
    );
    await unlock();

    await box["openAsset(uint256,uint256)"](1, 1);
    const receipt = await (await box["openAsset(uint256,uint256)"](1, 0)).wait();
    const opened = receipt.events?.find((event: { event?: string }) =>
      event.event === "BoxOpened");
    expect(opened?.args?.amount).toEqual(primaryAmount);
    await expect(box.ownerOf(1)).rejects.toThrow();
  });

  test("openBox reports the primary amount released while emptying a basket", async () => {
    const secondary = await deploy("TestToken", owner, ["Secondary", "SEC"]);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await secondary.approve(box.address, ethers.constants.MaxUint256);
    const primaryAmount = ethers.utils.parseEther("10");
    await box.createMultiTokenBox(
      await owner.getAddress(),
      [primary.address, secondary.address],
      [primaryAmount, ethers.utils.parseEther("20")],
      1,
    );
    await unlock();

    const receipt = await (await box.openBox(1)).wait();
    const opened = receipt.events?.find((event: { event?: string }) =>
      event.event === "BoxOpened");
    expect(opened?.args?.amount).toEqual(primaryAmount);
    await expect(box.ownerOf(1)).rejects.toThrow();
  });

  test("openAsset releases a selected healthy asset and preserves accounting", async () => {
    const bomb = await deploy("ReturnBombToken", owner);
    const good = await deploy("TestToken", owner, ["Good", "GOOD"]);
    await bomb.setBox(box.address);
    for (const token of [primary, bomb, good]) await token.approve(box.address, ethers.constants.MaxUint256);
    const amounts = ["10", "20", "30"].map(ethers.utils.parseEther);
    await box.createMultiTokenBox(await owner.getAddress(), [primary.address, bomb.address, good.address], amounts, 1);
    await unlock();

    await box["openAsset(uint256,uint256)"](1, 2);

    expect((await good.balanceOf(box.address)).toString()).toBe("0");
    expect((await box.totalLockedByToken(good.address)).toString()).toBe("0");
    expect((await box.boxAssetCount(1)).toString()).toBe("2");
    expect(await box.ownerOf(1)).toBe(await owner.getAddress());
    await expect(box["openAsset(uint256,uint256)"](1, 2)).rejects.toThrow();
  });

  test("batch mints different amounts to recipients with consecutive IDs and exact accounting", async () => {
    const recipients = await Promise.all([0, 1, 2, 3, 4].map((index) => provider.getSigner(index).getAddress()));
    const amounts = [1, 2, 3, 4, 5].map((value) => ethers.utils.parseEther(String(value)));
    const total = amounts.reduce((sum, value) => sum.add(value), ethers.constants.Zero);
    await primary.approve(box.address, total);

    expect((await box.callStatic.createBoxes(recipients, amounts, 86400)).toString()).toBe("1");
    await box.createBoxes(recipients, amounts, 86400);

    for (let index = 0; index < recipients.length; index += 1) {
      expect(await box.ownerOf(index + 1)).toBe(recipients[index]);
      const details = await box.boxDetails(index + 1);
      expect(details.amount).toEqual(amounts[index]);
      expect(details.creator).toBe(await owner.getAddress());
    }
    expect(await box.totalSupply()).toEqual(ethers.BigNumber.from(5));
    expect(await box.totalTokensLocked()).toEqual(total);
    expect(await box.totalLockedByToken(primary.address)).toEqual(total);
    expect(await primary.balanceOf(box.address)).toEqual(total);
  });

  test("supports the maximum 36,500-day duration but rejects longer, empty, mismatched, oversized, zero recipient and zero amount batches", async () => {
    const recipient = await owner.getAddress();
    const amount = ethers.utils.parseEther("1");
    const maximumDuration = 36_500 * 86_400;
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await box.createBoxes([recipient], [amount], maximumDuration);
    expect(await box.MAX_LOCK_DURATION()).toEqual(ethers.BigNumber.from(maximumDuration));

    await expect(box.createBoxes([recipient], [amount], maximumDuration + 1)).rejects.toThrow();
    await expect(box.createBoxes([], [], 1)).rejects.toThrow();
    await expect(box.createBoxes([recipient], [], 1)).rejects.toThrow();
    await expect(box.createBoxes(Array(21).fill(recipient), Array(21).fill(amount), 1)).rejects.toThrow();
    await expect(box.createBoxes([ethers.constants.AddressZero], [amount], 1)).rejects.toThrow();
    await expect(box.createBoxes([recipient], [0], 1)).rejects.toThrow();
  });

  test("rolls back the token pull and every earlier mint when a receiver callback rejects", async () => {
    const receiver = await deploy("RejectingReceiver", owner, [1]);
    const recipient = await owner.getAddress();
    const recipients = [recipient, recipient, receiver.address, recipient];
    const amounts = Array(4).fill(ethers.utils.parseEther("1"));
    await primary.approve(box.address, ethers.constants.MaxUint256);
    const ownerBalanceBefore = await primary.balanceOf(recipient);
    const blockBefore = await provider.getBlockNumber();

    await expect(box.createBoxes(recipients, amounts, 1)).rejects.toThrow();

    expect(await box.totalSupply()).toEqual(ethers.constants.Zero);
    expect(await box.totalTokensLocked()).toEqual(ethers.constants.Zero);
    expect(await primary.balanceOf(box.address)).toEqual(ethers.constants.Zero);
    expect(await primary.balanceOf(recipient)).toEqual(ownerBalanceBefore);
    expect(await receiver.received()).toEqual(ethers.constants.Zero);
    expect(await box.queryFilter(box.filters.MetadataUpdate(), blockBefore + 1, "latest"))
      .toHaveLength(0);
  });

  test("rejects fee-on-transfer primary deposits atomically", async () => {
    const feeToken = await deploy("FeeOnTransferToken", owner);
    const feeBox = await deploy("BanmaoBox", owner, [
      feeToken.address,
      renderer.address,
      await owner.getAddress(),
    ]);
    const recipient = await owner.getAddress();
    await feeToken.approve(feeBox.address, ethers.constants.MaxUint256);

    await expect(feeBox.createBoxes([recipient, recipient], [
      ethers.utils.parseEther("10"), ethers.utils.parseEther("20"),
    ], 1)).rejects.toThrow();

    expect(await feeBox.totalSupply()).toEqual(ethers.constants.Zero);
    expect(await feeToken.balanceOf(feeBox.address)).toEqual(ethers.constants.Zero);
  });

  test("keeps custody and liability when a token enables an outbound fee after deposit", async () => {
    const mutableFee = await deploy("MutableFeeToken", owner);
    const recipient = await owner.getAddress();
    const primaryAmount = ethers.utils.parseEther("10");
    const feeAmount = ethers.utils.parseEther("20");
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await mutableFee.approve(box.address, ethers.constants.MaxUint256);
    await box.createMultiTokenBox(
      recipient,
      [primary.address, mutableFee.address],
      [primaryAmount, feeAmount],
      1,
    );
    await mutableFee.setFeeEnabled(true);
    await unlock();

    const receipt = await (await box.openBox(1)).wait();

    expect(receipt.events?.filter((event: { event?: string }) =>
      event.event === "BoxAssetReleaseFailed")).toHaveLength(1);
    expect(await box.ownerOf(1)).toBe(recipient);
    expect((await box.boxAssetCount(1)).toString()).toBe("1");
    expect((await box.totalLockedByToken(mutableFee.address)).toString()).toBe(feeAmount.toString());
    expect((await mutableFee.balanceOf(box.address)).toString()).toBe(feeAmount.toString());
    await expect(box["openAsset(uint256,uint256)"](1, 0)).rejects.toThrow();
    expect((await box.totalLockedByToken(mutableFee.address)).toString()).toBe(feeAmount.toString());

    await box["abandonAsset(uint256,uint256,address,uint256)"](
      1,
      0,
      mutableFee.address,
      feeAmount,
    );
    const balanceBeforeClaim = await mutableFee.balanceOf(recipient);
    const claimReceipt = await (await box.claimAbandonedAsset(mutableFee.address)).wait();
    const expectedReceived = feeAmount.sub(feeAmount.div(100));
    const claimed = claimReceipt.events?.find((event: { event?: string }) =>
      event.event === "AbandonedAssetClaimed");

    expect(claimed?.args?.amount).toEqual(feeAmount);
    expect(claimed?.args?.amountReceived).toEqual(expectedReceived);
    expect((await mutableFee.balanceOf(recipient)).sub(balanceBeforeClaim)).toEqual(expectedReceived);
    expect(await box.recoverableAbandoned(recipient, mutableFee.address)).toEqual(ethers.constants.Zero);
    expect(await box.totalLockedByToken(mutableFee.address)).toEqual(ethers.constants.Zero);
    expect(await mutableFee.balanceOf(box.address)).toEqual(ethers.constants.Zero);
    expect(await box.untrackedSurplus(mutableFee.address)).toEqual(ethers.constants.Zero);
    await expect(box.ownerOf(1)).rejects.toThrow();
  });

  test("decodes renderer JSON, SVG and attributes for locked, ready, basket and maximum-duration states", async () => {
    const latest = await provider.getBlock("latest");
    const maximumDuration = 36_500 * 86_400;
    const createdAt = latest.timestamp;
    const unlockTime = createdAt + maximumDuration;
    const timestamps = ethers.BigNumber.from(createdAt)
      .shl(64)
      .or(ethers.BigNumber.from(unlockTime));
    const banmaoAddress = ethers.utils.getAddress("0x16d91d1615fc55b76d5f92365bd60c069b46ef78");
    const addresses = [banmaoAddress, ...[1, 2, 3, 4].map((value) =>
      ethers.utils.getAddress(`0x${value.toString(16).padStart(40, String(value))}`),
    )];
    const ledgerAmounts = ["1,234,567.89", "0", "0.1", "115,792,089.23", "1"];
    const ledgerTokens = ["banmao / d18", "ZERO / d0", "ONE / d1", "MAXIMUM-LENGTH16 / d69", "D69 / d69"];
    const mintingWallet = await owner.getAddress();
    const renderData = {
      token: banmaoAddress,
      creator: mintingWallet,
      amount: ethers.utils.parseEther("1234567.89"),
      timestamps,
      tokenDecimals: 18,
      assetCount: 5,
      tokenSymbol: symbolBytes16("banmao"),
      renderAssets: renderAssets([
        [addresses[0], ethers.utils.parseEther("1234567.89"), 18, "banmao"],
        [addresses[1], 0, 0, "ZERO"],
        [addresses[2], 1, 1, "ONE"],
        [addresses[3], ethers.constants.MaxUint256, 69, "MAXIMUM-LENGTH16"],
        [addresses[4], ethers.BigNumber.from(10).pow(69), 69, "D69"],
      ]),
    };

    for (let count = 1; count <= 5; count += 1) {
      const svg = await renderer.renderSVG(count, {
        ...renderData,
        assetCount: count,
        renderAssets: renderAssets([
          [addresses[0], ethers.utils.parseEther("1234567.89"), 18, "banmao"],
          [addresses[1], 0, 0, "ZERO"],
          [addresses[2], 1, 1, "ONE"],
          [addresses[3], ethers.constants.MaxUint256, 69, "MAXIMUM-LENGTH16"],
          [addresses[4], ethers.BigNumber.from(10).pow(69), 69, "D69"],
        ].slice(0, count) as Array<[string, ethers.BigNumberish, number, string]>),
      });
      for (const address of addresses.slice(0, count)) expect(svg).toContain(ethers.utils.getAddress(address));
      for (const value of ledgerAmounts.slice(0, count)) expect(svg).toContain(value);
      for (const value of ledgerTokens.slice(0, count)) expect(svg).toContain(value);
    }

    const lockedSvg = await renderer.renderSVG(ethers.constants.MaxUint256, renderData);
    const attributes = JSON.parse(await renderer.renderAttributes(renderData));
    parseSvg(lockedSvg);
    expect(lockedSvg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 600 600">/);
    expect(lockedSvg.slice(0, lockedSvg.indexOf(">") + 1)).not.toMatch(/\s(?:width|height|aria-labelledby)=/);
    expect(lockedSvg).not.toMatch(/<(?:title|desc)\b/);
    expect(lockedSvg).toContain('<g transform="scale(0.75)"><rect width="800" height="800"');
    expect(lockedSvg).toContain('transform="matrix(.92 0 0 .92 31.84 21.28)"');
    expect(lockedSvg).toContain('</g></svg>');
    expect(lockedSvg).toContain("SEALED TREASURY  /  SEALED");
    expect(lockedSvg).toContain("ASSET PORTFOLIO / 5");
    expect(lockedSvg).toContain("ASSET LEDGER");
    expect(lockedSvg).toContain('id="shine"');
    expect(lockedSvg).not.toMatch(/<(?:feTurbulence|feDisplacementMap)\b/);
    expect(lockedSvg.match(LOGO_ANIMATION)).toHaveLength(6);
    expect(lockedSvg.match(FRAME_ANIMATION)).toHaveLength(4);
    expect(lockedSvg).not.toContain('values=".25;.9;.25"');
    expect(lockedSvg).toContain('opacity=".35" stroke-dasharray="6 4"');
    expect(lockedSvg).not.toContain('id="scan"');
    expect(lockedSvg).not.toContain('fill="url(#scan)"');
    expect(lockedSvg).not.toContain('values="0;.24;0"');
    expect(lockedSvg).toContain('attributeName="fill-opacity" values=".55;1;.55"');
    expect(lockedSvg).not.toContain('values="0 -10;0 0;0 0;0 -10"');
    expect(lockedSvg).toMatch(/<g><text[^>]+>BANMAOBOX[\s\S]+NFT TOKEN ID[\s\S]+#1157920\.\.\.9639935<\/text><\/g>/);
    expect(lockedSvg).not.toContain('<clipPath');
    expect(lockedSvg).not.toContain('attributeName="width"');
    expect(lockedSvg).toContain('attributeName="color" values="#D8B565;#D8B565;#F4EEDC;#D8B565;#D8B565"');
    expect(lockedSvg).not.toContain('stroke-dasharray="120 580"');
    expect(lockedSvg).not.toContain('values="700;0;-700"');
    expect(lockedSvg.match(/<animate attributeName="d"/g)).toHaveLength(5);
    expect(lockedSvg.match(/<animate attributeName="opacity"/g)).toHaveLength(3);
    expect(lockedSvg.match(/<animate attributeName="r"/g)).toHaveLength(3);
    expect(lockedSvg).not.toContain("<animateMotion");
    expect(lockedSvg.match(/<circle r="4" opacity=".72">/g)).toHaveLength(3);
    expect(lockedSvg).toContain('<g fill="#D8B565" filter="url(#snakeGlow)"><circle');
    expect(lockedSvg.match(/<animate attributeName="fill-opacity"/g)).toHaveLength(2);
    expect(lockedSvg.match(/<animate attributeName="color"/g)).toHaveLength(1);
    expect(lockedSvg.match(/<animateTransform\b/g)).toHaveLength(4);
    expect(lockedSvg).not.toContain('type="rotate"');
    expect(lockedSvg.match(/type="scale"/g)).toHaveLength(1);
    const clusterOrigins = [[276, 142], [444, 142], [360, 226], [276, 310], [444, 310]];
    const grids = clusterOrigins.map(([x, y]) => Array.from(
      { length: 25 }, (_, i) => `M${x + i % 5 * 16} ${y + Math.floor(i / 5) * 16}h16v16h-16z`,
    ).join(""));
    for (const grid of grids) expect(lockedSvg.match(new RegExp(escapeRegex(grid), "g"))).toHaveLength(4);
    const morphs = [...lockedSvg.matchAll(/<animate attributeName="d" values="([^"]+)"/g)].map((match) => match[1].split(";"));
    expect(morphs).toHaveLength(5);
    for (let i = 0; i < morphs.length; i += 1) {
      expect(morphs[i]).toHaveLength(6);
      expect(morphs[i].slice(2, 5)).toEqual([grids[i], grids[i], grids[i]]);
      expect(morphs[i][5]).toBe(morphs[i][0]);
      expect(morphs[i][1]).not.toBe(morphs[i][0]);
    }
    const particlePattern = /M(\d+) (\d+)h(\d+)v(\d+)h-(\d+)z/g;
    const scatterFrames = morphs.flatMap((states) => states.slice(0, 2));
    const particles = scatterFrames.map((path) => [...path.matchAll(particlePattern)].map((match) => ({
      x: Number(match[1]), y: Number(match[2]), width: Number(match[3]), height: Number(match[4]), closeWidth: Number(match[5]),
    })));
    expect(particles).toHaveLength(10);
    for (const frame of particles) {
      expect(frame).toHaveLength(25);
      expect(new Set(frame.map(({ x }) => Math.floor((x - 50) / 140))).size).toBe(5);
      expect(new Set(frame.map(({ y }) => Math.floor((y - 50) / 140))).size).toBe(5);
    }
    const allParticles = particles.flat();
    expect(allParticles).toHaveLength(250);
    expect(new Set(scatterFrames).size).toBe(10);
    for (const particle of allParticles) {
      expect(particle.x).toBeGreaterThanOrEqual(50);
      expect(particle.y).toBeGreaterThanOrEqual(50);
      expect(particle.x + particle.width).toBeLessThanOrEqual(714);
      expect(particle.y + particle.height).toBeLessThanOrEqual(714);
      expect(particle.width).toBeGreaterThanOrEqual(4);
      expect(particle.width).toBeLessThanOrEqual(14);
      expect(particle.height).toBe(particle.width);
      expect(particle.closeWidth).toBe(particle.width);
    }
    expect(Math.min(...allParticles.map(({ width }) => width))).toBe(4);
    expect(Math.max(...allParticles.map(({ width }) => width))).toBe(14);
    const clusterTimings = [...lockedSvg.matchAll(new RegExp(CLUSTER_TIMING, "g"))].map((match) => match[0]);
    expect(clusterTimings).toHaveLength(5);
    expect(new Set(clusterTimings).size).toBeGreaterThan(1);
    const gridBounds = clusterOrigins.map(([x, y]) => [x, y, x + 80, y + 80]);
    expect(gridBounds).toEqual([[276, 142, 356, 222], [444, 142, 524, 222], [360, 226, 440, 306], [276, 310, 356, 390], [444, 310, 524, 390]]);
    expect((Math.min(...gridBounds.map((bound) => bound[0])) + Math.max(...gridBounds.map((bound) => bound[2]))) / 2).toBe(400);
    expect((Math.min(...gridBounds.map((bound) => bound[1])) + Math.max(...gridBounds.map((bound) => bound[3]))) / 2).toBe(266);
    const alternateSvg = await renderer.renderSVG(ethers.constants.MaxUint256.sub(1), renderData);
    const alternateScatter = [...alternateSvg.matchAll(/<animate attributeName="d" values="([^"]+)"/g)].flatMap((match) => match[1].split(";").slice(0, 2));
    expect(alternateScatter).toHaveLength(10);
    expect(alternateScatter).not.toEqual(scatterFrames);
    for (let i = 0; i < alternateScatter.length; i += 1) expect(alternateScatter[i]).not.toBe(scatterFrames[i]);
    const energyOrbit = lockedSvg.match(ENERGY_ANIMATION);
    const alternateOrbit = alternateSvg.match(ENERGY_ANIMATION);
    expect(energyOrbit).toHaveLength(9);
    expect(alternateOrbit).toHaveLength(9);
    expect(alternateOrbit).not.toEqual(energyOrbit);
    expect(await renderer.renderSVG(ethers.constants.MaxUint256, renderData)).toBe(lockedSvg);
    expect(lockedSvg).toContain('<filter id="m"><feDropShadow dx="-16" dy="8" stdDeviation="7" flood-opacity=".55"/></filter>');
    expect(lockedSvg).toContain('filter="url(#m)"');
    expect(lockedSvg).not.toContain('stroke-opacity=".25"');
    expect(lockedSvg).not.toContain('M-54 -36h20v20h-20z');
    expect(lockedSvg).not.toContain('values="-248 -122;-248 -122;0 0;0 0;0 0;-248 -122"');
    expect(lockedSvg).toContain('<filter id="snakeGlow"><feDropShadow stdDeviation="5" flood-color="#F4EEDC" flood-opacity="1"/></filter>');
    expect(lockedSvg).not.toContain('id="snakeReveal"');
    expect(lockedSvg).not.toContain('stroke-dasharray="5 3007"');
    expect(lockedSvg).not.toContain('stroke-dasharray="5 7"');
    expect(lockedSvg).not.toContain('values="0;-3012"');
    expect(lockedSvg.match(/keyTimes="0;.16;.33;.5;.66;.83;1"/g)).toHaveLength(3);
    expect(lockedSvg.match(/keyTimes="0;.44;.5;.56;1"/g)).toHaveLength(6);
    expect(lockedSvg.match(/values="4;4;14;4;4"/g)).toHaveLength(3);
    expect(lockedSvg).not.toContain('0xe01f1391381105044117de781945140173913810000001');
    expect(lockedSvg).not.toContain('stroke-width="0"');
    expect(lockedSvg).not.toContain('attributeName="stroke-width"');
    expect(lockedSvg).not.toContain('additive="sum"');
    expect(lockedSvg.match(new RegExp(SCALE_TIMING, "g"))).toHaveLength(1);
    expect(lockedSvg).not.toContain('keyTimes="0;.04;.85;1"');
    expect(lockedSvg).not.toContain(' begin="');
    expect(lockedSvg).toContain('keyTimes="0;.2;.38;.42;.58;.62;.8;1"');
    expect(lockedSvg).toContain('opacity=".66"');
    expect(lockedSvg).not.toContain('values="0;.66;.66;0"');
    expect(lockedSvg).toContain('>BANMAOBOX<animate attributeName="fill-opacity"');
    expect(lockedSvg).toContain('<path d="M29 29H771V771H29Z"/>');
    expect(lockedSvg).not.toContain('stroke-dasharray="1 9"');
    expect(lockedSvg).toContain('values=".9;.9;.9;1.08;.96;1;.9;.9"');
    expect(lockedSvg).not.toMatch(/<path d="M\d+ \d+h5v5h-5z"><animateMotion/);
    expect(lockedSvg).not.toContain('values="63;66;63"');
    expect(lockedSvg).not.toContain('url(#metal)');
    expect(lockedSvg).not.toContain('values="0 0;0 -3;0 0"');
    expect(lockedSvg).not.toContain('M216 325v-15');
    expect(lockedSvg).not.toContain('M209 323H251V359H209Z');
    expect(lockedSvg).not.toContain('M228 341H232V351H228Z');
    expect(lockedSvg).toContain("banmao");
    expect(lockedSvg).toContain(" UTC");
    expect(lockedSvg).toContain("MINTED BY");
    expect(lockedSvg).toContain(ethers.utils.getAddress(mintingWallet));
    expect(lockedSvg).not.toContain(`${mintingWallet.slice(0, 10)}...${mintingWallet.slice(-8)}`);
    expect(lockedSvg).toContain("NFT TOKEN ID");
    expect(lockedSvg).not.toMatch(/>(?:CLASSIC|DELUXE|GOLD|LEGENDARY)<\/text>/);
    expect(lockedSvg).not.toContain('M360 48H490M360 82H490');
    expect(lockedSvg).toContain("#1157920...9639935");
    expect(lockedSvg).toContain('font-size="34" font-weight="700">#1157920...9639935</text>');
    expect(lockedSvg).toContain('font-size="24" font-weight="700"');
    expect(lockedSvg).toContain('font-size="22" font-weight="700"');
    expect(lockedSvg).toContain('font-size="18" font-weight="700">');
    expect(lockedSvg).toContain('font-size="12" font-weight="700">');
    expect(lockedSvg).not.toMatch(/\b(?:textLength|lengthAdjust)=/);
    for (const address of addresses) {
      const full = ethers.utils.getAddress(address);
      expect(lockedSvg).toContain(full);
      expect(lockedSvg).not.toContain(`${full.slice(0, 10)}...${full.slice(-8)}`);
    }
    for (const value of [...ledgerAmounts, ...ledgerTokens]) expect(lockedSvg).toContain(value);
    expect(lockedSvg).toContain('x="48" y="632" font-size="12">TOKEN CONTRACT</text>');
    expect(lockedSvg).toContain('x="560" y="632" text-anchor="end" font-size="12">AMOUNT</text>');
    expect(lockedSvg).toContain('x="752" y="632" text-anchor="end" font-size="12">SYMBOL / DECIMALS</text>');
    expect(lockedSvg).toContain('<rect x="500" y="586" width="236" height="30" rx="7" fill="#D8B565" fill-opacity=".1" stroke="#D8B565"><animate attributeName="fill-opacity" values=".08;.22;.08" dur="2s" repeatCount="indefinite"/></rect>');
    expect(lockedSvg).toContain('<text class="mono gold" x="684" y="607" text-anchor="end" font-size="16" font-weight="700">banmao.fun/defi/box</text><path d="M696 608l12-12m-8 0h8v8" fill="none" stroke="#D8B565" stroke-width="2"/>');
    expect(lockedSvg.match(/>banmao\.fun\/defi\/box<\/text>/g)).toHaveLength(1);
    expect(lockedSvg).not.toContain("TOTAL VALUE");
    expect(lockedSvg).not.toContain("OWNER");
    expect(ethers.utils.getAddress(mintingWallet)).toMatch(/[A-F]/);
    expect(banmaoAddress).toMatch(/[A-F]/);
    expect(attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Status", value: "Sealed" }),
      expect.objectContaining({ trait_type: "Token Symbol", value: "banmao" }),
      expect.objectContaining({ trait_type: "Asset Count", value: 5 }),
      expect.objectContaining({ trait_type: "Token Contract", value: banmaoAddress }),
      expect.objectContaining({ trait_type: "Minting Wallet", value: ethers.utils.getAddress(mintingWallet) }),
      expect.objectContaining({ trait_type: "Unlock Time", value: latest.timestamp + maximumDuration }),
    ]));

    const uri = await renderer.tokenURI(ethers.constants.MaxUint256, renderData);
    expect(uri).toMatch(/^data:application\/json;base64,/);
    const metadataJson = Buffer.from(uri.split(",")[1], "base64").toString("utf8");
    const metadata = JSON.parse(metadataJson);
    expect(metadata.name).toBe(`BanmaoBox #${ethers.constants.MaxUint256.toString()}`);
    expect(metadata.attributes).toEqual(attributes);
    expect(metadata.image).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(metadata).not.toHaveProperty("animation_url");
    expect(Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8")).toBe(lockedSvg);
    expect(metadata.description).toContain("compact display values; on-chain balances remain exact");
    expect(metadata.external_url).toBe("https://banmao.fun/defi/box");
    expect(metadata.properties).toEqual({
      type: "banmaobox",
      metadataMode: "fully-onchain",
      renderer: "solidity-full-renderer",
      chain: "X Layer",
      chainId: (await provider.getNetwork()).chainId,
    });
    console.info(`BanmaoBox worst SVG bytes: ${Buffer.byteLength(lockedSvg)}`);
    console.info(`BanmaoBox worst tokenURI bytes: ${Buffer.byteLength(uri)}`);
    console.info(`BanmaoBox renderSVG gas estimate: ${(await renderer.estimateGas.renderSVG(ethers.constants.MaxUint256, renderData)).toString()}`);
    console.info(`BanmaoBox tokenURI gas estimate: ${(await renderer.estimateGas.tokenURI(ethers.constants.MaxUint256, renderData)).toString()}`);
    const previewDir = join(process.cwd(), "preview", "banmaobox");
    mkdirSync(previewDir, { recursive: true });
    writeFileSync(join(previewDir, "banmaobox-locked-basket.svg"), lockedSvg);
    const fixtureDir = mkdtempSync(join(tmpdir(), "banmaobox-render-"));
    try {
      const intrinsic = await sharp(Buffer.from(lockedSvg), { density: 72 }).metadata();
      expect(intrinsic.width).toBe(600);
      expect(intrinsic.height).toBe(600);
      for (const size of [600, 320, 210]) {
        const rendered = sharp(Buffer.from(lockedSvg), { density: 72 })
          .resize(size, size)
          .png();
        await rendered.toFile(join(fixtureDir, `sealed-treasury-${size}.png`));
        const raster = await rendered.toBuffer({ resolveWithObject: true });
        expect(raster.info.width).toBe(size);
        expect(raster.info.height).toBe(size);
      }
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }

    const lockedAttributes = await renderer.renderAttributes(renderData);
    const lockedTokenUri = await renderer.tokenURI(ethers.constants.MaxUint256, renderData);
    await provider.send("evm_setTime", [unlockTime * 1_000]);
    await provider.send("evm_mine", []);
    expect((await provider.getBlock("latest")).timestamp).toBe(unlockTime);
    expect(await renderer.renderSVG(ethers.constants.MaxUint256, renderData)).toBe(lockedSvg);
    expect(await renderer.renderAttributes(renderData)).toBe(lockedAttributes);
    expect(await renderer.tokenURI(ethers.constants.MaxUint256, renderData)).toBe(lockedTokenUri);

    await provider.send("evm_increaseTime", [1]);
    await provider.send("evm_mine", []);
    expect(await renderer.renderSVG(ethers.constants.MaxUint256, renderData)).toBe(lockedSvg);
    expect(await renderer.renderAttributes(renderData)).toBe(lockedAttributes);
    expect(await renderer.tokenURI(ethers.constants.MaxUint256, renderData)).toBe(lockedTokenUri);
    expect(lockedSvg).toContain("SEALED");
    expect(lockedSvg).toContain("UNLOCK TIME");
    expect(attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Created Time", value: Number(createdAt) }),
      expect.objectContaining({ trait_type: "Unlock Time", value: Number(unlockTime) }),
      expect.objectContaining({ trait_type: "Lock Duration Seconds", value: maximumDuration }),
    ]));
  });

  test("recovers bounded safe UTF-8 TOKEN snapshots and falls back safely for hostile metadata", async () => {
    const latest = await provider.getBlock("latest");
    const timestamps = ethers.BigNumber.from(latest.timestamp).shl(64).or(latest.timestamp + 60);
    const abiString = (value: string) => ethers.utils.defaultAbiCoder.encode(["string"], [value]);
    const raw = async (response: string, mode = 0) => deploy("RawSymbolToken", owner, [response, mode]);
    const cases = [
      "USD₮0", "Việt Nam", "中文", "한국", "Кириллица", "📦💎",
      "A&B<C>D\"E'F", "123456789012345678901234567890😀tail",
    ];

    for (const value of cases) {
      const token = await raw(abiString(value));
      const expected = value === cases[7] ? "123456789012345678901234567890" : value;
      const data = {
        token: token.address,
        creator: await owner.getAddress(),
        amount: 1,
        timestamps,
        tokenDecimals: 6,
        assetCount: 1,
        tokenSymbol: symbolBytes16("TOKEN"),
        renderAssets: renderAssets([[token.address, 1, 6, "TOKEN"]]),
      };
      const svg = await renderer.renderSVG(5, data);
      parseSvg(svg);
      const attributesText = await renderer.renderAttributes(data);
      const attributes = JSON.parse(attributesText);
      const metadata = JSON.parse(Buffer.from((await renderer.tokenURI(5, data)).split(",")[1], "base64").toString("utf8"));
      expect(attributes).toEqual(expect.arrayContaining([
        expect.objectContaining({ trait_type: "Token Symbol", value: expected }),
      ]));
      expect(metadata.attributes).toEqual(attributes);
      expect(Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8")).toBe(svg);
      if (value === "A&B<C>D\"E'F") {
        expect(svg).toContain("A&amp;B&lt;C&gt;D&quot;E&apos;F");
        expect(attributesText).toContain('A&B<C>D\\"E\'F');
        const raster = await sharp(Buffer.from(svg)).png().toBuffer({ resolveWithObject: true });
        expect(raster.info.width).toBe(600);
        expect(raster.info.height).toBe(600);
      } else {
        expect(svg).toContain(expected);
      }
    }

    const stable = await raw(abiString("CHANGED"));
    const stableData = {
      token: stable.address,
      creator: await owner.getAddress(),
      amount: 1,
      timestamps,
      tokenDecimals: 18,
      assetCount: 1,
      tokenSymbol: symbolBytes16("STABLE"),
      renderAssets: renderAssets([[stable.address, 1, 18, "STABLE"]]),
    };
    expect(await renderer.renderSVG(1, stableData)).toContain("STABLE / d18");
    expect(JSON.parse(await renderer.renderAttributes(stableData))).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Token Symbol", value: "STABLE" }),
    ]));

    const hostile = [
      await raw("0x", 1),
      await raw("0x", 2),
      await raw("0x", 3),
      await raw("0x1234"),
      await raw(ethers.utils.hexConcat([ethers.utils.hexZeroPad("0x40", 32), ethers.utils.hexZeroPad("0x01", 32), "0x41"])),
      await raw("0x" + "00".repeat(31) + "20" + "ff".repeat(32) + "00".repeat(32)),
      await raw("0x" + "00".repeat(31) + "20" + "00".repeat(31) + "01" + "41ff" + "00".repeat(30)),
      await raw(abiString("BAD\u0001")),
      await raw(abiString("BAD\u202eTXT")),
      await raw(abiString("BAD\ufffeTXT")),
      await raw("0x" + "00".repeat(31) + "20" + "00".repeat(31) + "02" + "c0af" + "00".repeat(30)),
      await raw(abiString("X".repeat(65))),
    ];
    for (const token of hostile) {
      const fallback = `TOKEN ${token.address.slice(0, 8)}...${token.address.slice(-4)}`;
      const data = {
        ...stableData,
        token: token.address,
        tokenSymbol: symbolBytes16("TOKEN"),
        renderAssets: renderAssets([[token.address, 1, 18, "TOKEN"]]),
      };
      const svg = await renderer.renderSVG(1, data, { gasLimit: 4_000_000 });
      expect(svg).toContain(`${fallback} / d18`);
      expect(JSON.parse(await renderer.renderAttributes(data, { gasLimit: 4_000_000 }))).toEqual(expect.arrayContaining([
        expect.objectContaining({ trait_type: "Token Symbol", value: fallback }),
      ]));
    }

    const nft5TokenAddress = ethers.utils.getAddress("0x779Ded0c9e1022225f8E0630b35a9b54bE713736");
    const nft5Token = await deploy("Nft5UsdToken", owner);
    await provider.send("evm_setAccountCode", [nft5TokenAddress, await provider.getCode(nft5Token.address)]);
    expect(await new ethers.Contract(nft5TokenAddress, ["function symbol() view returns (string)"], provider).symbol()).toBe("USD₮0");
    const nft5Data = {
      ...stableData,
      token: primary.address,
      assetCount: 2,
      tokenSymbol: symbolBytes16("PRI"),
      renderAssets: renderAssets([
        [primary.address, ethers.utils.parseEther("1"), 18, "PRI"],
        [nft5TokenAddress, 1_000_000, 6, "TOKEN"],
      ]),
    };
    const nft5Svg = await renderer.renderSVG(5, nft5Data);
    expect(nft5Svg).toContain(nft5TokenAddress);
    expect(nft5Svg).toContain("USD₮0 / d6");
    expect(nft5Svg).not.toContain("TOKEN / d6");
    console.info(`BanmaoBox NFT #5 equivalent renderSVG gas: ${(await renderer.estimateGas.renderSVG(5, nft5Data)).toString()}`);
  });

  test("keeps adversarial renderer data valid for XML and JSON and rejects unsafe numeric fields", async () => {
    const latest = await provider.getBlock("latest");
    const timestamps = ethers.BigNumber.from(latest.timestamp)
      .shl(64)
      .or(latest.timestamp + 60);
    const baseData = {
      token: primary.address,
      creator: await owner.getAddress(),
      amount: 1,
      timestamps,
      tokenDecimals: 18,
      assetCount: 1,
      tokenSymbol: symbolBytes16('BAD<&"'),
      renderAssets: renderAssets([
        [primary.address, 1, 18, 'BAD<&"'],
      ]),
    };

    const tinySvg = await renderer.renderSVG(1, baseData);
    parseSvg(tinySvg);
    expect(tinySvg).toContain("&lt;0.01");
    expect(tinySvg).not.toContain(">\u003c0.01");
    expect(tinySvg).toContain("TOKEN / d18");
    expect(tinySvg).not.toContain('BAD<&"');

    const amountWithTinyRemainder = ethers.constants.WeiPerEther.add(1);
    const mixedSvg = await renderer.renderSVG(2, {
      ...baseData,
      amount: amountWithTinyRemainder,
      tokenSymbol: symbolBytes16("SAFE"),
      renderAssets: renderAssets([
        [primary.address, amountWithTinyRemainder, 18, "SAFE"],
      ]),
    });
    expect(mixedSvg).toContain("1 + &lt;0.01");
    expect(mixedSvg).not.toContain("1 + <0.01");

    const attributes = JSON.parse(await renderer.renderAttributes(baseData));
    expect(attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Token Symbol", value: "TOKEN" }),
    ]));
    const uri = await renderer.tokenURI(1, baseData);
    expect(() => JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"))).not.toThrow();

    const excessiveDecimals = {
      ...baseData,
      renderAssets: renderAssets([
        [primary.address, 1, 70, "BAD"],
      ]),
    };
    await expect(renderer.renderSVG(1, excessiveDecimals)).rejects.toThrow();
    await expect(renderer.renderAttributes(excessiveDecimals)).rejects.toThrow();
    await expect(renderer.tokenURI(1, excessiveDecimals)).rejects.toThrow();

    const reversedTimestamps = {
      ...baseData,
      timestamps: ethers.BigNumber.from(latest.timestamp + 1)
        .shl(64)
        .or(latest.timestamp),
    };
    await expect(renderer.renderSVG(1, reversedTimestamps)).rejects.toThrow();
    await expect(renderer.renderAttributes(reversedTimestamps)).rejects.toThrow();
    await expect(renderer.tokenURI(1, reversedTimestamps)).rejects.toThrow();

    const equalTimestamps = {
      ...baseData,
      timestamps: ethers.BigNumber.from(latest.timestamp)
        .shl(64)
        .or(latest.timestamp),
    };
    expect(await renderer.renderSVG(1, equalTimestamps)).toContain("0 MINUTES");
  });

  test("Box exposes fully on-chain tokenURI metadata for live storage", async () => {
    const recipient = await owner.getAddress();
    await primary.approve(box.address, ethers.utils.parseEther("42"));
    await box.createBox(recipient, ethers.utils.parseEther("42"), 1);

    const uri = await box.tokenURI(1);
    expect(uri).toMatch(/^data:application\/json;base64,/);
    const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    const svg = await box.renderSVG(1);
    expect(metadata.name).toBe("BanmaoBox #1");
    expect(metadata.image).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(metadata).not.toHaveProperty("animation_url");
    expect(Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8")).toBe(svg);
    expect(metadata.description).toContain("compact display values; on-chain balances remain exact");
    expect(metadata.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Token Symbol", value: "PRI" }),
      expect.objectContaining({ trait_type: "Asset Count", value: 1 }),
      expect.objectContaining({ trait_type: "Token Contract", value: primary.address }),
    ]));
    expect(svg).toContain("42");
    expect(svg).toContain("PRI / d18");
    expect(svg).toContain("MINTED BY");
    expect(svg).toContain(recipient);
    expect(metadata.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Minting Wallet", value: recipient }),
    ]));
    await expect(box.tokenURI(999)).rejects.toThrow();
  });

  test("allows renderer metadata failure without granting custody authority", async () => {
    const ownerAddress = await owner.getAddress();
    const amount = ethers.utils.parseEther("5");
    await primary.approve(box.address, amount);
    await box.createBox(ownerAddress, amount, 3_600);
    const malicious = await deploy("RevertingFullRenderer", owner);
    await box.setRenderer(malicious.address);

    const detailsBefore = await box.boxDetails(1);
    await expect(box.tokenURI(1)).rejects.toThrow();
    await expect(box.renderSVG(1)).rejects.toThrow();
    await expect(box.renderAttributes(1)).rejects.toThrow();
    expect(await box.ownerOf(1)).toBe(ownerAddress);
    expect(await box.boxDetails(1)).toEqual(detailsBefore);
    expect(await box.totalTokensLocked()).toEqual(amount);
    expect(await box.totalLockedByToken(primary.address)).toEqual(amount);
    expect(await primary.balanceOf(box.address)).toEqual(amount);
    await expect(box.openBox(1)).rejects.toThrow();
    expect(await primary.balanceOf(box.address)).toEqual(amount);

    await provider.send("evm_increaseTime", [3_601]);
    await provider.send("evm_mine", []);
    const ownerBalanceBefore = await primary.balanceOf(ownerAddress);
    await box.openBox(1);
    expect(await primary.balanceOf(ownerAddress)).toEqual(ownerBalanceBefore.add(amount));
    expect(await primary.balanceOf(box.address)).toEqual(ethers.constants.Zero);
    expect(await box.totalTokensLocked()).toEqual(ethers.constants.Zero);
    expect(await box.totalLockedByToken(primary.address)).toEqual(ethers.constants.Zero);
    await expect(box.ownerOf(1)).rejects.toThrow();
  });

  test("snapshots every asset metadata field and updates the rendered ledger after partial release", async () => {
    const secondary = await deploy("TestToken", owner, ["Secondary", "SEC"]);
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await secondary.approve(box.address, ethers.constants.MaxUint256);
    await box.createMultiTokenBox(
      await owner.getAddress(),
      [primary.address, secondary.address],
      [ethers.utils.parseEther("3"), ethers.utils.parseEther("7")],
      1,
    );

    const before = await box.renderSVG(1);
    parseSvg(before);
    expect(before).toContain(primary.address);
    expect(before).toContain(secondary.address);
    expect(before).toContain("3");
    expect(before).toContain("PRI / d18");
    expect(before).toContain("7");
    expect(before).toContain("SEC / d18");

    await unlock();
    const releaseReceipt = await (await box["openAsset(uint256,uint256)"](1, 0)).wait();
    expect(releaseReceipt.events?.filter((event: { event?: string }) =>
      event.event === "MetadataUpdate")).toHaveLength(1);
    expect(releaseReceipt.events?.find((event: { event?: string }) =>
      event.event === "MetadataUpdate")?.args?._tokenId.toString()).toBe("1");
    const after = await box.renderSVG(1);
    expect(after).not.toContain(primary.address);
    expect(after).toContain(secondary.address);
    expect(after).toContain("ASSET PORTFOLIO / 1");
    expect(after).toContain("PRIMARY ASSET RELEASED");
    expect(after).toContain(">7</text>");
    expect(after.match(LOGO_ANIMATION)).toHaveLength(6);
    expect(after.match(FRAME_ANIMATION)).toHaveLength(4);
    expect(after).toContain("SEC / d18");
    expect(after).not.toContain("PRI / d18");
  });

  test("keeps all production contracts within the EIP-170 runtime limit", () => {
    for (const name of ["BanmaoBoxRenderer", "BanmaoBox", "BanmaoBoxFactory"]) {
      const init = (artifacts[name].bytecode.length - 2) / 2;
      const runtime = (artifacts[name].runtimeBytecode.length - 2) / 2;
      console.info(`${name} init/runtime/headroom bytes: ${init}/${runtime}/${24_576 - runtime}`);
      expect(runtime).toBeLessThanOrEqual(24_576);
    }
  });

  test.each([1, 5, 10, 20])("batch size %i stays within a practical gas envelope", async (size) => {
    const recipient = await owner.getAddress();
    const amount = ethers.utils.parseEther("1");
    await primary.approve(box.address, ethers.constants.MaxUint256);
    const transaction = await box.createBoxes(Array(size).fill(recipient), Array(size).fill(amount), 1);
    const receipt = await transaction.wait();
    expect(receipt.gasUsed.lt(ethers.BigNumber.from(12_000_000))).toBe(true);
    console.info(`BanmaoBox createBoxes(${size}) gas: ${receipt.gasUsed.toString()}`);
  });
});
