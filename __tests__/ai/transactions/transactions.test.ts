import { decodeFunctionData } from "viem";
import { STAKING_ABI } from "../../../app/defi/staking/contracts";
import { createDraftStore,prepareAction,simulateAction } from "../../../lib/ai/server/transactions";
const address="0x0000000000000000000000000000000000000001" as const;
test("prepare is deterministic for an allowlisted configured action",()=>{const store=createDraftStore();const policy={chainId:196,contracts:{stake:address},ttlMs:60000};const a=prepareAction({intent:"stake",amount:"1",chainId:196,wallet:address},policy,store,0);const b=prepareAction({intent:"stake",amount:"1",chainId:196,wallet:address},policy,createDraftStore(),0);expect(a.draftHash).toBe(b.draftHash);expect(a.data).toMatch(/^0x/);expect(a.requiresUserReviewAndSignature).toBe(true);expect(a.humanSummary).toContain("0.000000000000000001 BANMAO");});
test("simulate rejects changed draft and uses read-only adapter",async()=>{const store=createDraftStore();const action=prepareAction({intent:"stake",amount:"1",chainId:196,wallet:address},{chainId:196,contracts:{stake:address},ttlMs:60000},store,0);const reader=jest.fn(async()=>({success:true,simulationBlock:"10",preflightSnapshot:[],warnings:[]}));expect((await simulateAction({actionId:action.actionId,draftHash:action.draftHash,wallet:address},store,reader,1)).success).toBe(true);expect(reader).toHaveBeenCalledTimes(1);await expect(simulateAction({actionId:action.actionId,draftHash:"0x00",wallet:address},store,reader,1)).rejects.toThrow("hash");});

test("stake draft encodes the canonical two-argument staking call",()=>{
  const action=prepareAction({intent:"stake",amount:"25",lockOptionId:2,chainId:196,wallet:address},{chainId:196,contracts:{stake:address},ttlMs:60000},createDraftStore(),0);
  expect(decodeFunctionData({abi:STAKING_ABI,data:action.data})).toMatchObject({functionName:"stake",args:[25n,2n]});
});

test("simulate binds a draft to its wallet and expiry",async()=>{
  const store=createDraftStore();
  const action=prepareAction({intent:"stake",amount:"1",lockOptionId:0,chainId:196,wallet:address},{chainId:196,contracts:{stake:address},ttlMs:10},store,0);
  const reader=jest.fn();
  await expect(simulateAction({actionId:action.actionId,draftHash:action.draftHash,wallet:"0x0000000000000000000000000000000000000002"},store,reader,1)).rejects.toThrow("Wallet");
  await expect(simulateAction({actionId:action.actionId,draftHash:action.draftHash,wallet:address},store,reader,10)).rejects.toThrow("expired");
  expect(reader).not.toHaveBeenCalled();
});

test("simulate consumes the draft so replay cannot repeat the simulation",async()=>{
  const store=createDraftStore();
  const action=prepareAction({intent:"stake",amount:"1",lockOptionId:0,chainId:196,wallet:address},{chainId:196,contracts:{stake:address},ttlMs:100},store,0);
  const reader=jest.fn(async()=>({success:true,simulationBlock:"10",preflightSnapshot:[],warnings:[]}));
  await expect(simulateAction({actionId:action.actionId,draftHash:action.draftHash,wallet:address},store,reader,1)).resolves.toMatchObject({success:true});
  await expect(simulateAction({actionId:action.actionId,draftHash:action.draftHash,wallet:address},store,reader,2)).rejects.toThrow("Draft");
  expect(reader).toHaveBeenCalledTimes(1);
});

test("an invalid simulation attempt cannot consume another wallet's valid draft",async()=>{
  const store=createDraftStore();
  const action=prepareAction({intent:"stake",amount:"1",lockOptionId:0,chainId:196,wallet:address},{chainId:196,contracts:{stake:address},ttlMs:100},store,0);
  const reader=jest.fn(async()=>({success:true,simulationBlock:"10",preflightSnapshot:[],warnings:[]}));
  await expect(simulateAction({actionId:action.actionId,draftHash:"0x00",wallet:address},store,reader,1)).rejects.toThrow("hash");
  await expect(simulateAction({actionId:action.actionId,draftHash:action.draftHash,wallet:address},store,reader,2)).resolves.toMatchObject({success:true});
});

test("public simulation performs only eth_call, estimateGas, block and balance reads",async()=>{
  const client={
    call:jest.fn(async()=>({data:"0x"})),
    estimateGas:jest.fn(async()=>21000n),
    getBlockNumber:jest.fn(async()=>99n),
    getBalance:jest.fn(async()=>5n),
  };
  const { simulatePreparedAction }=await import("../../../lib/ai/server/transactions");
  const action=prepareAction({intent:"stake",amount:"1",lockOptionId:0,chainId:196,wallet:address},{chainId:196,contracts:{stake:address},ttlMs:100},createDraftStore(),0);
  await expect(simulatePreparedAction(client,action)).resolves.toMatchObject({success:true,gasEstimate:"21000",simulationBlock:"99",preflightSnapshot:[{field:"nativeBalance",value:"5"}]});
  expect(client.call).toHaveBeenCalledWith(expect.objectContaining({account:address,to:address,data:action.data}));
});
