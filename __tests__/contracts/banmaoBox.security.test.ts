import { readFileSync } from "node:fs";
import { join } from "node:path";
import ganache from "ganache";
import { ethers } from "ethers";
import solc from "solc";

type Artifact = { abi: ethers.ContractInterface; bytecode: string };

const adversarialSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
interface IBox {
    function openBox(uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
}
contract TestToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        _mint(msg.sender, 1_000_000 ether);
    }
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
  const sources: Record<string, { content: string }> = {};
  for (const file of ["BanmaoBox.sol", "BanmaoBoxRenderer.sol"]) {
    sources[`contracts/banmaobox/${file}`] = {
      content: readFileSync(join(process.cwd(), "contracts", "banmaobox", file), "utf8"),
    };
  }
  sources["test/Adversarial.sol"] = { content: adversarialSource };
  const input = {
    language: "Solidity", sources,
    settings: {
      optimizer: { enabled: true, runs: 200 }, evmVersion: "shanghai",
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), {
    import(path: string) {
      for (const candidate of [join(process.cwd(), path), join(process.cwd(), "node_modules", path)]) {
        try { return { contents: readFileSync(candidate, "utf8") }; } catch { /* continue */ }
      }
      return { error: `Import not found: ${path}` };
    },
  }));
  const errors = (output.errors ?? []).filter((item: { severity: string }) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item: { formattedMessage: string }) => item.formattedMessage).join("\n"));

  const artifacts: Record<string, Artifact> = {};
  for (const contracts of Object.values(output.contracts) as Array<Record<string, { abi: ethers.ContractInterface; evm: { bytecode: { object: string } } }>>) {
    for (const [name, contract] of Object.entries(contracts)) {
      if (contract.evm.bytecode.object) artifacts[name] = { abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}` };
    }
  }
  return artifacts;
}

const artifacts = compile();
jest.setTimeout(60_000);

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
    box = await deploy("BanmaoBox", owner, [primary.address, renderer.address]);
  });

  async function unlock() {
    await provider.send("evm_increaseTime", [2]);
    await provider.send("evm_mine", []);
  }

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
    await box.openAsset(1, 0);

    const receipt = await (await box.openBox(1, { gasLimit: 1_500_000 })).wait();

    expect(receipt.events?.filter((event: { event?: string }) =>
      event.event === "BoxAssetReleaseFailed")).toHaveLength(1);
    expect((await box.boxAssetCount(1)).toString()).toBe("1");
    expect((await box.totalLockedByToken(bomb.address)).toString()).toBe(amount.toString());
    expect(await box.ownerOf(1)).toBe(await owner.getAddress());
  });

  test("openAsset releases a selected healthy asset and preserves accounting", async () => {
    const bomb = await deploy("ReturnBombToken", owner);
    const good = await deploy("TestToken", owner, ["Good", "GOOD"]);
    await bomb.setBox(box.address);
    for (const token of [primary, bomb, good]) await token.approve(box.address, ethers.constants.MaxUint256);
    const amounts = ["10", "20", "30"].map(ethers.utils.parseEther);
    await box.createMultiTokenBox(await owner.getAddress(), [primary.address, bomb.address, good.address], amounts, 1);
    await unlock();

    await box.openAsset(1, 2);

    expect((await good.balanceOf(box.address)).toString()).toBe("0");
    expect((await box.totalLockedByToken(good.address)).toString()).toBe("0");
    expect((await box.boxAssetCount(1)).toString()).toBe("2");
    expect(await box.ownerOf(1)).toBe(await owner.getAddress());
    await expect(box.openAsset(1, 2)).rejects.toThrow();
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

  test("supports exactly 100 years but rejects longer, empty, mismatched, oversized, zero recipient and zero amount batches", async () => {
    const recipient = await owner.getAddress();
    const amount = ethers.utils.parseEther("1");
    const hundredYears = 36500 * 86400;
    await primary.approve(box.address, ethers.constants.MaxUint256);
    await box.createBoxes([recipient], [amount], hundredYears);
    expect(await box.MAX_LOCK_DURATION()).toEqual(ethers.BigNumber.from(hundredYears));

    await expect(box.createBoxes([recipient], [amount], hundredYears + 1)).rejects.toThrow();
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

    await expect(box.createBoxes(recipients, amounts, 1)).rejects.toThrow();

    expect(await box.totalSupply()).toEqual(ethers.constants.Zero);
    expect(await box.totalTokensLocked()).toEqual(ethers.constants.Zero);
    expect(await primary.balanceOf(box.address)).toEqual(ethers.constants.Zero);
    expect(await primary.balanceOf(recipient)).toEqual(ownerBalanceBefore);
    expect(await receiver.received()).toEqual(ethers.constants.Zero);
  });

  test("rejects fee-on-transfer primary deposits atomically", async () => {
    const feeToken = await deploy("FeeOnTransferToken", owner);
    const feeBox = await deploy("BanmaoBox", owner, [feeToken.address, renderer.address]);
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
    await expect(box.openAsset(1, 0)).rejects.toThrow();
    expect((await box.totalLockedByToken(mutableFee.address)).toString()).toBe(feeAmount.toString());
  });

  test("decodes renderer JSON, SVG and attributes for locked, ready, basket and 100-year states", async () => {
    const latest = await provider.getBlock("latest");
    const hundredYears = 36_500 * 86_400;
    const timestamps = ethers.BigNumber.from(latest.timestamp)
      .shl(64)
      .or(ethers.BigNumber.from(latest.timestamp + hundredYears));
    const renderData = {
      token: primary.address,
      creator: await owner.getAddress(),
      amount: ethers.utils.parseEther("1234567.89"),
      timestamps,
      tokenDecimals: 18,
      assetCount: 5,
      tokenSymbol: "banmao",
    };

    const lockedSvg = await renderer.renderSVG(77, renderData);
    const attributes = JSON.parse(await renderer.renderAttributes(renderData));
    expect(lockedSvg).toContain("LOCKED");
    expect(lockedSvg).toContain("banmao");
    expect(lockedSvg).toContain(" UTC");
    expect(attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Status", value: "Locked" }),
      expect.objectContaining({ trait_type: "Token Symbol", value: "banmao" }),
      expect.objectContaining({ trait_type: "Asset Count", value: 5 }),
      expect.objectContaining({ trait_type: "Unlock Time", value: latest.timestamp + hundredYears }),
    ]));

    const uri = await renderer.tokenURI(77, renderData);
    expect(uri).toMatch(/^data:application\/json;base64,/);
    const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    expect(metadata.name).toBe("BanmaoBox #77");
    expect(metadata.attributes).toEqual(attributes);
    expect(metadata.image).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8")).toBe(lockedSvg);

    await provider.send("evm_increaseTime", [hundredYears + 1]);
    await provider.send("evm_mine", []);
    const readySvg = await renderer.renderSVG(77, renderData);
    const readyAttributes = JSON.parse(await renderer.renderAttributes(renderData));
    expect(readySvg).toContain("READY TO OPEN");
    expect(readyAttributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Status", value: "Ready to open" }),
    ]));
  });

  test("Box tokenURI serializes its live storage through the immutable renderer", async () => {
    const recipient = await owner.getAddress();
    await primary.approve(box.address, ethers.utils.parseEther("42"));
    await box.createBox(recipient, ethers.utils.parseEther("42"), 1);

    const uri = await box.tokenURI(1);
    const metadata = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    const svg = Buffer.from(metadata.image.split(",")[1], "base64").toString("utf8");
    expect(metadata.name).toBe("BanmaoBox #1");
    expect(metadata.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ trait_type: "Token Symbol", value: "PRI" }),
      expect.objectContaining({ trait_type: "Asset Count", value: 1 }),
      expect.objectContaining({ trait_type: "Token Contract", value: primary.address.toLowerCase() }),
    ]));
    expect(svg).toContain("42 PRI");
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
