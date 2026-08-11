import { createPublicClient, http } from "viem";
import { xLayer } from "viem/chains";
import { z } from "zod";
import { loadAIConfig } from "../../../../../lib/ai/server/config";
import { verifySessionToken } from "../../../../../lib/ai/server/auth/session";
import { simulateAction, simulatePreparedAction } from "../../../../../lib/ai/server/transactions";
import { BANMAO_TOKEN_ADDRESS, ERC20_ABI, STAKING_ABI } from "../../../../../app/defi/staking/contracts";
import { draftStore } from "../prepare/route";

export const runtime = "nodejs";
const schema = z.object({
  actionId: z.string().min(1).max(80),
  draftHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
}).strict();
const client = createPublicClient({ chain: xLayer, transport: http(process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech") });

function cookie(request: Request, name: string) {
  return request.headers.get("cookie")?.split(";").map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function POST(request: Request) {
  let config;
  try { config = loadAIConfig(); } catch { return new Response(null, { status: 503 }); }
  if (!config.flags.txCopilot) return new Response(null, { status: 404 });
  const secret = process.env.AI_SESSION_SECRET;
  if (!secret) return Response.json({ status: "unavailable", reason: "Simulation reader is not configured" }, { status: 503 });
  const session = verifySessionToken(cookie(request, "banmao_ai_session"), secret);
  if (!session) return Response.json({ error: "Proof-of-wallet required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid draft" }, { status: 400 });
  try {
    return Response.json(await simulateAction(
      { ...parsed.data, wallet: session.address },
      draftStore,
      (action) => simulatePreparedAction({
        call: (parameters) => client.call(parameters),
        estimateGas: (parameters) => client.estimateGas(parameters),
        getBlockNumber: () => client.getBlockNumber(),
        getBalance: (parameters) => client.getBalance(parameters),
        readContract: (parameters) => client.readContract(parameters as never),
      }, action, { token: BANMAO_TOKEN_ADDRESS, stakingAbi: STAKING_ABI, erc20Abi: ERC20_ABI }),
    ), { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable", reason: "Draft simulation or read-back unavailable" }, { status: 503 });
  }
}
