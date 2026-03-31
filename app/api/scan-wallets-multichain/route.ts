import { NextRequest, NextResponse } from "next/server";

// Chain configurations
const CHAINS: Record<string, { name: string; rpc: string; blockTime: number; batchSize: number; lookback: number; tokens: { address: string; symbol: string }[] }> = {
    xlayer: {
        name: "XLayer",
        rpc: "https://rpc.xlayer.tech",
        blockTime: 3,
        batchSize: 100,
        lookback: 5000,
        tokens: [
            { address: "0x1e4a5963abfd975d8c9021ce480b42188849d41d", symbol: "USDT" },
            { address: "0xe538905cf8410324e03a5a23c1c177a474d59b2b", symbol: "WOKB" },
        ],
    },
    ethereum: {
        name: "Ethereum",
        rpc: "https://eth.drpc.org",
        blockTime: 12,
        batchSize: 200,
        lookback: 1000,
        tokens: [
            { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT" },
            { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC" },
        ],
    },
    bsc: {
        name: "BSC",
        rpc: "https://bsc-rpc.publicnode.com",
        blockTime: 3,
        batchSize: 200,
        lookback: 2000,
        tokens: [
            { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT" },
            { address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", symbol: "USDC" },
        ],
    },
    polygon: {
        name: "Polygon",
        rpc: "https://rpc-mainnet.matic.quiknode.pro",
        blockTime: 2,
        batchSize: 200,
        lookback: 2000,
        tokens: [
            { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", symbol: "USDT" },
            { address: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", symbol: "USDC" },
        ],
    },
    arbitrum: {
        name: "Arbitrum",
        rpc: "https://arb1.arbitrum.io/rpc",
        blockTime: 0.3,
        batchSize: 500,
        lookback: 5000,
        tokens: [
            { address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", symbol: "USDT" },
            { address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", symbol: "USDC" },
        ],
    },
    optimism: {
        name: "Optimism",
        rpc: "https://mainnet.optimism.io",
        blockTime: 2,
        batchSize: 500,
        lookback: 5000,
        tokens: [
            { address: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58", symbol: "USDT" },
            { address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", symbol: "USDC" },
        ],
    },
    base: {
        name: "Base",
        rpc: "https://mainnet.base.org",
        blockTime: 2,
        batchSize: 500,
        lookback: 3000,
        tokens: [
            { address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", symbol: "USDC" },
        ],
    },
    avalanche: {
        name: "Avalanche",
        rpc: "https://api.avax.network/ext/bc/C/rpc",
        blockTime: 2,
        batchSize: 500,
        lookback: 5000,
        tokens: [
            { address: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7", symbol: "USDT" },
            { address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", symbol: "USDC" },
        ],
    },
};

const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";
const XLAYER_RPC = "https://rpc.xlayer.tech";

// Cache per chain (3 min TTL)
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 3 * 60 * 1000;

async function rpcCall(rpcUrl: string, method: string, params: any[]) {
    const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || "RPC failed");
    return data.result;
}

async function isContract(rpcUrl: string, address: string): Promise<boolean> {
    try {
        const code = await rpcCall(rpcUrl, "eth_getCode", [address, "latest"]);
        return code !== "0x" && code !== "0x0" && code !== null;
    } catch { return false; }
}

async function getBanmaoBalance(address: string): Promise<bigint> {
    try {
        const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, "0")}`;
        const result = await rpcCall(XLAYER_RPC, "eth_call", [{ to: BANMAO_TOKEN, data }, "latest"]);
        return BigInt(result || "0x0");
    } catch { return BigInt(0); }
}

async function fetchActiveAddresses(chainKey: string): Promise<string[]> {
    const chain = CHAINS[chainKey];
    if (!chain) throw new Error(`Unknown chain: ${chainKey}`);

    const addresses = new Set<string>();
    const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

    try {
        const latestBlock = await rpcCall(chain.rpc, "eth_blockNumber", []);
        const latestBlockNum = parseInt(latestBlock, 16);
        console.log(`[multi-scan] ${chain.name} latest block: ${latestBlockNum}`);

        for (const token of chain.tokens) {
            const PARALLEL = 3;
            const totalBatches = Math.ceil(chain.lookback / chain.batchSize);

            for (let batchStart = 0; batchStart < totalBatches; batchStart += PARALLEL) {
                const promises = [];
                for (let i = batchStart; i < Math.min(batchStart + PARALLEL, totalBatches); i++) {
                    const endBlock = latestBlockNum - (i * chain.batchSize);
                    const startBlock = Math.max(0, endBlock - chain.batchSize + 1);
                    if (startBlock >= endBlock) continue;

                    promises.push(
                        rpcCall(chain.rpc, "eth_getLogs", [{
                            fromBlock: `0x${startBlock.toString(16)}`,
                            toBlock: `0x${endBlock.toString(16)}`,
                            address: token.address,
                            topics: [transferTopic],
                        }]).catch((err) => { console.error(`[multi-scan] ${chain.name} getLogs err:`, err?.message?.slice(0, 80)); return null; })
                    );
                }

                const results = await Promise.all(promises);
                for (const logs of results) {
                    if (!Array.isArray(logs)) continue;
                    for (const log of logs) {
                        if (log.topics?.[1]) {
                            const from = `0x${log.topics[1].slice(26)}`;
                            if (from !== "0x0000000000000000000000000000000000000000") addresses.add(from.toLowerCase());
                        }
                        if (log.topics?.[2]) {
                            const to = `0x${log.topics[2].slice(26)}`;
                            if (to !== "0x0000000000000000000000000000000000000000") addresses.add(to.toLowerCase());
                        }
                    }
                }
                if (addresses.size >= 200) break;
            }
            if (addresses.size >= 200) break;
        }
        console.log(`[multi-scan] ${chain.name}: ${addresses.size} addresses found`);
    } catch (err) {
        console.error(`[multi-scan] ${chain.name} error:`, err);
    }

    return Array.from(addresses);
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const chainKey = searchParams.get("chain") || "xlayer";
        const forceRefresh = searchParams.get("refresh") === "true";

        if (!CHAINS[chainKey]) {
            return NextResponse.json({ success: false, error: `Unknown chain: ${chainKey}` }, { status: 400 });
        }

        // Cache check
        const cacheKey = `multichain_${chainKey}`;
        if (!forceRefresh && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
            return NextResponse.json(cache[cacheKey].data);
        }

        const rawAddresses = await fetchActiveAddresses(chainKey);
        if (!rawAddresses.length) {
            return NextResponse.json({ success: true, wallets: [], chain: CHAINS[chainKey].name, totalFound: 0 });
        }

        // For non-XLayer chains, we skip contract check on source chain (expensive cross-chain)
        // Instead, just check BANMAO balance on XLayer and filter
        const addressesToCheck = rawAddresses.slice(0, 80);

        // If scanning XLayer, also check if contract
        let eoaAddresses = addressesToCheck;
        if (chainKey === "xlayer") {
            const contractChecks = await Promise.all(
                addressesToCheck.map(async (addr) => ({
                    address: addr,
                    isContract: await isContract(CHAINS.xlayer.rpc, addr),
                }))
            );
            eoaAddresses = contractChecks.filter(c => !c.isContract).map(c => c.address);
        }

        // Check BANMAO balance on XLayer for ALL addresses
        const walletsToCheck = eoaAddresses.slice(0, 50);
        const checked = await Promise.all(
            walletsToCheck.map(async (addr) => {
                const banmaoBal = await getBanmaoBalance(addr);
                return {
                    address: addr,
                    shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    sourceChain: chainKey,
                    sourceChainName: CHAINS[chainKey].name,
                    hasBanmao: banmaoBal > BigInt(0),
                    balances: { OKB: "0", USDT: "0", BANMAO: "0" },
                    hasBalance: true,
                };
            })
        );

        const activeWallets = checked.filter(w => !w.hasBanmao);
        const skippedBanmao = checked.filter(w => w.hasBanmao).length;
        console.log(`[multi-scan] ${CHAINS[chainKey].name}: ${activeWallets.length} eligible (${skippedBanmao} already hold BANMAO)`);

        const result = {
            success: true,
            wallets: activeWallets,
            chain: CHAINS[chainKey].name,
            chainKey,
            totalFound: activeWallets.length,
            totalScanned: rawAddresses.length,
            skippedBanmaoHolders: skippedBanmao,
            scanTimestamp: Date.now(),
        };

        cache[cacheKey] = { data: result, timestamp: Date.now() };
        return NextResponse.json(result);
    } catch (err) {
        console.error("[multi-scan] Error:", err);
        return NextResponse.json({ success: false, error: "Failed to scan chain" }, { status: 500 });
    }
}
