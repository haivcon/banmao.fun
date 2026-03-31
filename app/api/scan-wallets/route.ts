import { NextRequest, NextResponse } from "next/server";

// XLayer RPC endpoint
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.xlayer.tech";

// Known token contracts on XLayer
const KNOWN_TOKENS: Record<string, { address: string; decimals: number; symbol: string }> = {
    OKB: { address: "native", decimals: 18, symbol: "OKB" },
    USDT: { address: "0x1e4a5963abfd975d8c9021ce480b42188849d41d", decimals: 6, symbol: "USDT" },
    USDG: { address: "0x3c00c7073cd690e0e06e3f8ab7c3e1c3e45f0f9c", decimals: 18, symbol: "USDG" },
    WOKB: { address: "0xe538905cf8410324e03a5a23c1c177a474d59b2b", decimals: 18, symbol: "WOKB" },
};

// BANMAO token address
const BANMAO_TOKEN = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";

// Cache for scanned wallets (5-minute TTL)
let cachedResult: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Simple RPC call helper — handles JSON-RPC errors
async function rpcCall(method: string, params: any[]) {
    const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const data = await res.json();
    if (data.error) {
        console.error(`[RPC Error] ${method}:`, data.error.message || data.error);
        throw new Error(data.error.message || "RPC call failed");
    }
    return data.result;
}

// Check if address is a contract (not EOA)
async function isContract(address: string): Promise<boolean> {
    try {
        const code = await rpcCall("eth_getCode", [address, "latest"]);
        return code !== "0x" && code !== "0x0" && code !== null;
    } catch {
        return false;
    }
}

// Get native OKB balance
async function getOKBBalance(address: string): Promise<string> {
    try {
        const balance = await rpcCall("eth_getBalance", [address, "latest"]);
        return balance || "0x0";
    } catch {
        return "0x0";
    }
}

// Get ERC20 token balance
async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
        // balanceOf(address) function selector = 0x70a08231
        const data = `0x70a08231000000000000000000000000${walletAddress.slice(2).toLowerCase()}`;
        const result = await rpcCall("eth_call", [
            { to: tokenAddress, data },
            "latest",
        ]);
        return result || "0x0";
    } catch {
        return "0x0";
    }
}

// Fetch recent active addresses from Transfer events of known tokens
// XLayer RPC limits eth_getLogs to 100 blocks per query, so we batch
async function fetchRecentActiveAddresses(): Promise<string[]> {
    const addresses = new Set<string>();

    try {
        // Transfer(address,address,uint256) topic
        const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

        // Get latest block number
        const latestBlock = await rpcCall("eth_blockNumber", []);
        const latestBlockNum = parseInt(latestBlock, 16);
        console.log(`[scan-wallets] Latest block: ${latestBlockNum}`);

        // Tokens to scan for Transfer events
        const tokensToScan = [
            BANMAO_TOKEN,
            KNOWN_TOKENS.USDT.address,
            KNOWN_TOKENS.WOKB.address,
        ].filter(addr => addr !== "native");

        // XLayer RPC limits to 100 blocks per getLogs call
        // Scan last 5000 blocks in batches of 100
        const BATCH_SIZE = 100;
        const TOTAL_LOOKBACK = 15000;
        const totalBatches = Math.ceil(TOTAL_LOOKBACK / BATCH_SIZE);

        for (const tokenAddr of tokensToScan) {
            // Process batches in parallel (5 at a time to avoid rate limit)
            const PARALLEL = 5;
            for (let batchStart = 0; batchStart < totalBatches; batchStart += PARALLEL) {
                const batchPromises = [];

                for (let i = batchStart; i < Math.min(batchStart + PARALLEL, totalBatches); i++) {
                    const endBlock = latestBlockNum - (i * BATCH_SIZE);
                    const startBlock = Math.max(0, endBlock - BATCH_SIZE + 1);

                    if (startBlock >= endBlock) continue;

                    const fromHex = `0x${startBlock.toString(16)}`;
                    const toHex = `0x${endBlock.toString(16)}`;

                    batchPromises.push(
                        rpcCall("eth_getLogs", [{
                            fromBlock: fromHex,
                            toBlock: toHex,
                            address: tokenAddr,
                            topics: [transferTopic],
                        }]).catch(() => null)
                    );
                }

                const batchResults = await Promise.all(batchPromises);

                for (const logs of batchResults) {
                    if (!Array.isArray(logs)) continue;

                    for (const log of logs) {
                        // from address (topic[1])
                        if (log.topics?.[1]) {
                            const from = `0x${log.topics[1].slice(26)}`;
                            if (from !== "0x0000000000000000000000000000000000000000") {
                                addresses.add(from.toLowerCase());
                            }
                        }
                        // to address (topic[2])
                        if (log.topics?.[2]) {
                            const to = `0x${log.topics[2].slice(26)}`;
                            if (to !== "0x0000000000000000000000000000000000000000") {
                                addresses.add(to.toLowerCase());
                            }
                        }
                    }
                }

                // Stop scanning this token if we already have enough addresses
                if (addresses.size >= 500) break;
            }

            if (addresses.size >= 500) break;
        }

        console.log(`[scan-wallets] Found ${addresses.size} unique addresses from Transfer events`);
    } catch (err) {
        console.error("Failed to fetch recent active addresses:", err);
    }

    return Array.from(addresses);
}

// Format balance from hex
function formatBalance(hexBalance: string, decimals: number): string {
    const bigValue = BigInt(hexBalance || "0x0");
    const divisor = BigInt(10 ** decimals);
    const whole = bigValue / divisor;
    const frac = bigValue % divisor;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fracStr}`;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const forceRefresh = searchParams.get("refresh") === "true";

        // Check cache
        if (!forceRefresh && cachedResult && Date.now() - cachedResult.timestamp < CACHE_TTL) {
            return NextResponse.json(cachedResult.data);
        }

        // Fetch recent active addresses from on-chain data
        const rawAddresses = await fetchRecentActiveAddresses();

        if (rawAddresses.length === 0) {
            return NextResponse.json({
                success: true,
                wallets: [],
                totalFound: 0,
                message: "No recent active wallets found",
            });
        }

        // Filter out contract addresses (batch check, limit to first 100 for performance)
        const addressesToCheck = rawAddresses.slice(0, 100);
        const contractChecks = await Promise.all(
            addressesToCheck.map(async (addr) => ({
                address: addr,
                isContract: await isContract(addr),
            }))
        );

        const eoaAddresses = contractChecks
            .filter((c) => !c.isContract)
            .map((c) => c.address);

        // Get balances for EOA wallets (batch, limit to 50 for performance)
        const walletsToEnrich = eoaAddresses.slice(0, 50);
        const enrichedWallets = await Promise.all(
            walletsToEnrich.map(async (addr) => {
                const [okbHex, usdtHex, banmaoHex] = await Promise.all([
                    getOKBBalance(addr),
                    getTokenBalance(KNOWN_TOKENS.USDT.address, addr),
                    getTokenBalance(BANMAO_TOKEN, addr),
                ]);

                const okbBalance = formatBalance(okbHex, 18);
                const usdtBalance = formatBalance(usdtHex, 6);
                const banmaoBalance = formatBalance(banmaoHex, 18);

                return {
                    address: addr,
                    shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    balances: {
                        OKB: okbBalance,
                        USDT: usdtBalance,
                        BANMAO: banmaoBalance,
                    },
                    hasBalance: parseFloat(okbBalance) > 0.001 || parseFloat(usdtBalance) > 0.01,
                    hasBanmao: BigInt(banmaoHex || "0x0") > BigInt(0),
                };
            })
        );

        // Filter to only wallets with meaningful balance AND no existing BANMAO tokens
        const activeWallets = enrichedWallets.filter((w) => w.hasBalance && !w.hasBanmao);
        const skippedBanmao = enrichedWallets.filter((w) => w.hasBanmao).length;
        console.log(`[scan-wallets] Filtered: ${activeWallets.length} active (${skippedBanmao} skipped — already hold $BANMAO)`);

        const result = {
            success: true,
            wallets: activeWallets,
            totalFound: activeWallets.length,
            totalScanned: rawAddresses.length,
            scanTimestamp: Date.now(),
        };

        // Cache result
        cachedResult = { data: result, timestamp: Date.now() };

        return NextResponse.json(result);
    } catch (err) {
        console.error("Scan wallets error:", err);
        return NextResponse.json(
            { success: false, error: "Failed to scan wallets" },
            { status: 500 }
        );
    }
}
