import { NextRequest, NextResponse } from "next/server";

const TARGET_RPC_URL = "https://rpc.xlayer.tech";
const BACKUP_RPC_URL = "https://xlayerrpc.okx.com";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Try primary
        let response = await fetch(TARGET_RPC_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.warn(`[RPC Proxy] Primary failed (${response.status}), trying backup...`);
            // Try backup if primary fails
            response = await fetch(BACKUP_RPC_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("RPC Proxy Error:", error);
        return NextResponse.json({ error: "RPC Proxy Failed", details: String(error) }, { status: 500 });
    }
}
