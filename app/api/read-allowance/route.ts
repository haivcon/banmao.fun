import { NextRequest, NextResponse } from "next/server";

const RPC_URL = "https://rpc.xlayer.tech";

export async function GET(req: NextRequest) {
    const owner = req.nextUrl.searchParams.get("owner");
    const spender = req.nextUrl.searchParams.get("spender");
    const token = req.nextUrl.searchParams.get("token");

    if (!owner || !spender || !token) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    try {
        // allowance(address,address) selector = 0xdd62ed3e
        const data = "0xdd62ed3e" +
            owner.slice(2).padStart(64, "0") +
            spender.slice(2).padStart(64, "0");

        const res = await fetch(RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_call",
                params: [{ to: token, data }, "latest"],
                id: 1,
            }),
        });

        const json = await res.json();
        const allowance = json.result ? BigInt(json.result).toString() : "0";
        return NextResponse.json({ allowance });
    } catch (e: any) {
        return NextResponse.json({ allowance: "0", error: e.message });
    }
}
