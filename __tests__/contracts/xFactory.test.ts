import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ganache from "ganache";
import solc from "solc";
import { ethers } from "ethers";

type Artifact = { abi: ConstructorParameters<typeof ethers.utils.Interface>[0]; evm: { bytecode: { object: string } } };
const fixture = `pragma solidity ^0.8.30;
contract Child {
 address public creator; address public owner; uint public initialValue; uint public callValue;
 constructor() payable { creator=msg.sender; initialValue=msg.value; }
 function initialize(address who) external payable { require(owner==address(0)); require(who!=address(0)); owner=who; callValue=msg.value; }
}`;

describe("xFactory local EVM", () => {
  let chain: ReturnType<typeof ganache.provider>;
  let provider: ethers.providers.Web3Provider;
  let factory: ethers.Contract;
  let owner: string;
  let other: string;
  let initCode: string;
  let childArtifact: Artifact;
  beforeAll(async () => {
    const output = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources: {
      "xFactory.sol": { content: readFileSync(resolve("contracts/xFactory/xFactory.sol"), "utf8") },
      "Child.sol": { content: fixture },
    }, settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "shanghai", outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } }), {
      import: (name: string) => ({ contents: readFileSync(resolve("node_modules", name), "utf8") }),
    }));
    expect((output.errors || []).filter((e: { severity: string }) => e.severity === "error")).toEqual([]);
    chain = ganache.provider({ logging: { quiet: true }, chain: { hardfork: "shanghai" }, wallet: { totalAccounts: 3 } });
    provider = new ethers.providers.Web3Provider(chain as unknown as ethers.providers.ExternalProvider);
    [owner, other] = await provider.listAccounts();
    const artifact: Artifact = output.contracts["xFactory.sol"].xFactory;
    childArtifact = output.contracts["Child.sol"].Child;
    initCode = "0x" + childArtifact.evm.bytecode.object;
    factory = await new ethers.ContractFactory(artifact.abi, "0x" + artifact.evm.bytecode.object, provider.getSigner(0)).deploy(owner);
    await factory.deployed();
  }, 60000);
  afterAll(async () => { if (chain) await chain.disconnect(); });

  test("permissions, pause, operator revocation and invalid deployment inputs", async () => {
    const outsider = factory.connect(provider.getSigner(1));
    await expect(outsider.callStatic.deployCreate(initCode)).rejects.toThrow();
    await expect(outsider.callStatic.setOperator(other, true)).rejects.toThrow();
    await expect(outsider.callStatic.recoverNative(other, 0)).rejects.toThrow();
    await expect(outsider.callStatic.recoverERC20(other, other, 0)).rejects.toThrow();
    await (await factory.setOperator(other, true)).wait();
    await (await outsider.deployCreate(initCode)).wait();
    await (await factory.pause()).wait();
    await expect(outsider.callStatic.deployCreate(initCode)).rejects.toThrow();
    await expect(factory.callStatic.deployCreate2(ethers.constants.HashZero, initCode)).rejects.toThrow();
    await (await factory.unpause()).wait();
    await (await factory.setOperator(other, false)).wait();
    await expect(outsider.callStatic.deployCreate(initCode)).rejects.toThrow();
    await expect(factory.callStatic.deployCreate("0x")).rejects.toThrow();
    await expect(factory.callStatic.deployCreate("0x60006000f3")).rejects.toThrow();
    await expect(factory.callStatic.deployCreateAndCall(initCode, 1, "0x")).rejects.toThrow();
    await expect(factory.callStatic.renounceOwnership()).rejects.toThrow();
    await expect(provider.getSigner(0).estimateGas({ to: factory.address, value: 1 })).rejects.toThrow();
  });
  test("batch permissions, enumeration, duplicate updates and atomic rejection", async () => {
    await expect(factory.connect(provider.getSigner(1)).callStatic.batchSetOperator([other], [true])).rejects.toThrow();
    await expect(factory.callStatic.batchSetOperator([other], [])).rejects.toThrow();
    await (await factory.batchSetOperator([other, other, owner], [true, true, true])).wait();
    expect((await factory.operatorCount()).toString()).toBe("2");
    expect(new Set([await factory.operatorAt(0), await factory.operatorAt(1)])).toEqual(new Set([owner, other]));
    const failed = await factory.batchSetOperator([other, ethers.constants.AddressZero], [false, true], { gasLimit: 500000 });
    await expect(failed.wait()).rejects.toThrow();
    expect(await factory.operators(other)).toBe(true);
    expect((await factory.operatorCount()).toString()).toBe("2");
    await (await factory.batchSetOperator([other, owner, other], [false, false, false])).wait();
    expect((await factory.operatorCount()).toString()).toBe("0");
    expect(await factory.operators(other)).toBe(false);
    await expect(factory.callStatic.operatorAt(0)).rejects.toThrow();
  });
  test("input hardening and deployment registry rollback on a mined failed transaction", async () => {
    const salt = ethers.utils.id("empty-call");
    const predicted = await factory.predictCreate2Address(owner, salt, ethers.utils.keccak256(initCode));
    await expect(factory.callStatic.deployCreateAndCall(initCode, 0, "0x")).rejects.toThrow();
    const failed = await factory.deployCreate2AndCall(salt, initCode, 0, "0x", { gasLimit: 2000000 });
    await expect(failed.wait()).rejects.toThrow();
    expect(await factory.deployedBy(predicted)).toBe(false);
    expect(await provider.getCode(predicted)).toBe("0x");
    const data = new ethers.utils.Interface(childArtifact.abi).encodeFunctionData("initialize", [owner]);
    await (await factory.deployCreate2AndCall(salt, initCode, 0, data)).wait();
    expect(await factory.deployedBy(predicted)).toBe(true);
    expect(await factory.deployedBy(other)).toBe(false);
    expect((await factory.MAX_INIT_CODE_SIZE()).toString()).toBe("49152");
    const oversized = "0x" + "00".repeat(49153);
    await expect(factory.callStatic.deployCreate(oversized)).rejects.toThrow();
    await expect(factory.callStatic.deployCreate2(salt, oversized)).rejects.toThrow();
    await expect(factory.callStatic.recoverNative(other, 0)).rejects.toThrow();
    await expect(factory.callStatic.recoverERC20(ethers.constants.AddressZero, other, 1)).rejects.toThrow();
    await expect(factory.callStatic.recoverERC20(other, other, 0)).rejects.toThrow();
  });
  test("CREATE initialization and two-step owner transfer", async () => {
    const data = new ethers.utils.Interface(childArtifact.abi).encodeFunctionData("initialize", [owner]);
    const target = await factory.callStatic.deployCreateAndCall(initCode, 0, data);
    await (await factory.deployCreateAndCall(initCode, 0, data)).wait();
    expect(await new ethers.Contract(target, childArtifact.abi, provider).owner()).toBe(owner);
    await (await factory.transferOwnership(other)).wait();
    expect(await factory.owner()).toBe(owner);
    expect(await factory.pendingOwner()).toBe(other);
    await expect(factory.callStatic.acceptOwnership()).rejects.toThrow();
    await (await factory.connect(provider.getSigner(1)).acceptOwnership()).wait();
    await expect(factory.callStatic.pause()).rejects.toThrow();
    await (await factory.connect(provider.getSigner(1)).transferOwnership(owner)).wait();
    await (await factory.acceptOwnership()).wait();
    expect(await factory.owner()).toBe(owner);
  });
  test("CREATE returns a child with factory sender and forwards constructor value", async () => {
    const predicted = await factory.callStatic.deployCreate(initCode, { value: 123 });
    await (await factory.deployCreate(initCode, { value: 123 })).wait();
    const child = new ethers.Contract(predicted, childArtifact.abi, provider);
    expect(await child.creator()).toBe(factory.address);
    expect((await child.initialValue()).toString()).toBe("123");
    expect(await factory.hasCode(predicted)).toBe(true);
    expect(await factory.getCodeHash(predicted)).toBe(ethers.utils.keccak256(await provider.getCode(predicted)));
  });
  test("CREATE2 prediction, namespacing and collision rejection", async () => {
    const salt = ethers.constants.HashZero;
    const hash = ethers.utils.keccak256(initCode);
    const effective = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address", "bytes32"], [owner, salt]));
    expect(await factory.computeEffectiveSalt(owner, salt)).toBe(effective);
    expect(await factory.computeInitCodeHash(initCode)).toBe(hash);
    const predicted = await factory.predictCreate2Address(owner, salt, hash);
    expect(predicted).toBe(ethers.utils.getCreate2Address(factory.address, effective, hash));
    expect(await factory.predictCreate2Address(other, salt, hash)).not.toBe(predicted);
    await (await factory.deployCreate2(salt, initCode)).wait();
    expect(await factory.hasCode(predicted)).toBe(true);
    await expect(factory.callStatic.deployCreate2(salt, initCode)).rejects.toThrow();
  });
  test("atomic initialization and failed initialization rollback", async () => {
    const iface = new ethers.utils.Interface(childArtifact.abi);
    const salt = ethers.utils.id("initialize");
    const predicted = await factory.predictCreate2Address(owner, salt, ethers.utils.keccak256(initCode));
    await expect(factory.callStatic.deployCreate2AndCall(salt, initCode, 1, iface.encodeFunctionData("initialize", [ethers.constants.AddressZero]), { value: 3 })).rejects.toThrow();
    expect(await provider.getCode(predicted)).toBe("0x");
    await (await factory.deployCreate2AndCall(salt, initCode, 1, iface.encodeFunctionData("initialize", [other]), { value: 3 })).wait();
    const child = new ethers.Contract(predicted, childArtifact.abi, provider);
    expect(await child.owner()).toBe(other);
    expect((await child.initialValue()).toString()).toBe("1");
    expect((await child.callValue()).toString()).toBe("2");
    expect((await provider.getBalance(factory.address)).toString()).toBe("0");
  });
});
