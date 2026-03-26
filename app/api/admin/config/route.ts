// app/api/admin/config/route.ts
// Admin configuration API - requires wallet signature + admin whitelist OR Contract Owner
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import {
    getAllConfig,
    setConfig,
    isAdminWallet,
    getAllAdminWallets,
    addAdminWallet,
    removeAdminWallet,
    logActivity,
    getActivityLogs,
    getClaimStats,
    getRecentClaims
} from "../../../../lib/db";
import { SNAKE_CONTRACT_ADDRESS } from "../../../gamefi/banmaosnake/lib/constants";
import { SNAKE_ABI } from "../../../gamefi/banmaosnake/lib/abis";

// Helper to check if address is contract owner
async function isContractOwner(address: string): Promise<boolean> {
    try {
        const client = createPublicClient({
            transport: http("https://rpc.xlayer.tech")
        });

        const owner = await client.readContract({
            address: SNAKE_CONTRACT_ADDRESS,
            abi: SNAKE_ABI,
            functionName: "owner",
        } as any);

        return (owner as string).toLowerCase() === address.toLowerCase();
    } catch (error) {
        console.error("Failed to check contract owner:", error);
        return false;
    }
}

// Verify wallet signature
async function verifyAdminSignature(
    address: string,
    message: string,
    signature: string
): Promise<boolean> {
    try {
        // 1. Check if address is in admin whitelist
        let isAuthorized = await isAdminWallet(address);

        // 2. If not in whitelist, check if it's the Contract Owner
        if (!isAuthorized) {
            console.log(`Address ${address} not in whitelist, checking contract owner...`);
            isAuthorized = await isContractOwner(address);
            if (isAuthorized) {
                console.log(`Address ${address} verified as Contract Owner.`);
                // Optional: Auto-add to whitelist to save RPC calls next time?
                // await addAdminWallet(address, "Contract Owner (Auto)");
            }
        }

        if (!isAuthorized) {
            console.log(`Address ${address} is not an admin or owner`);
            return false;
        }

        // Verify the message is recent (within 5 minutes)
        const messageData = JSON.parse(message);
        const timestamp = messageData.timestamp;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (!timestamp || Math.abs(now - timestamp) > fiveMinutes) {
            console.log('Signature expired');
            return false;
        }

        // Verify signature using viem
        const { verifyMessage } = await import('viem');
        const isValid = await verifyMessage({
            address: address as `0x${string}`,
            message: message,
            signature: signature as `0x${string}`
        });

        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

// GET - Fetch config, stats, or logs (public read, no auth required)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeStats = searchParams.get('stats') === 'true';
        const includeLogs = searchParams.get('logs') === 'true';
        const includeAdmins = searchParams.get('admins') === 'true';
        const includeClaims = searchParams.get('claims') === 'true';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response: any = { success: true };

        // Always include config
        const config = await getAllConfig();
        response.config = config.reduce((acc, item) => {
            acc[item.key] = {
                value: item.value,
                updatedAt: item.updated_at,
                updatedBy: item.updated_by
            };
            return acc;
        }, {} as Record<string, { value: string; updatedAt: number; updatedBy: string | null }>);

        // Stats for dashboard
        if (includeStats) {
            response.stats = await getClaimStats();
        }

        // Activity logs
        if (includeLogs) {
            const limit = parseInt(searchParams.get('limit') || '50');
            const offset = parseInt(searchParams.get('offset') || '0');
            response.logs = await getActivityLogs(limit, offset);
        }

        // Admin list
        if (includeAdmins) {
            response.admins = await getAllAdminWallets();
        }

        // Recent claims
        if (includeClaims) {
            const limit = parseInt(searchParams.get('claimLimit') || '20');
            response.recentClaims = await getRecentClaims(limit);
        }

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching config:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
    }
}

// POST - Update config (requires admin signature)
export async function POST(request: NextRequest) {
    try {
        const { address, signature, message, updates } = await request.json();

        // Validate inputs
        if (!address || !signature || !message) {
            return NextResponse.json({
                success: false,
                error: 'Admin signature required'
            }, { status: 401 });
        }

        if (!updates || typeof updates !== 'object') {
            return NextResponse.json({
                success: false,
                error: 'Updates object required'
            }, { status: 400 });
        }

        // Verify admin signature
        const isValid = await verifyAdminSignature(address, message, signature);
        if (!isValid) {
            return NextResponse.json({
                success: false,
                error: 'Invalid admin signature or not authorized'
            }, { status: 403 });
        }

        // Apply updates
        const updated: string[] = [];
        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'string' || typeof value === 'number') {
                await setConfig(key, String(value), address);
                updated.push(key);
            }
        }

        // Log activity
        if (updated.length > 0) {
            await logActivity('config_update', address, updated.join(', '), { updates });
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updated.length} config values`,
            updated
        });
    } catch (error) {
        console.error('Error updating config:', error);
        return NextResponse.json({ success: false, error: 'Failed to update config' }, { status: 500 });
    }
}

// PATCH - Manage admin wallets (requires existing admin signature)
export async function PATCH(request: NextRequest) {
    try {
        const { address, signature, message, action, targetAddress, targetName } = await request.json();

        // Validate inputs
        if (!address || !signature || !message) {
            return NextResponse.json({
                success: false,
                error: 'Admin signature required'
            }, { status: 401 });
        }

        // Verify admin signature
        const isValid = await verifyAdminSignature(address, message, signature);
        if (!isValid) {
            return NextResponse.json({
                success: false,
                error: 'Invalid admin signature or not authorized'
            }, { status: 403 });
        }

        if (action === 'add' && targetAddress) {
            await addAdminWallet(targetAddress, targetName);
            await logActivity('admin_add', address, targetAddress, { name: targetName });
            return NextResponse.json({
                success: true,
                message: `Added admin: ${targetAddress}`
            });
        } else if (action === 'remove' && targetAddress) {
            // Don't allow removing yourself
            if (targetAddress.toLowerCase() === address.toLowerCase()) {
                return NextResponse.json({
                    success: false,
                    error: 'Cannot remove yourself'
                }, { status: 400 });
            }
            await removeAdminWallet(targetAddress);
            await logActivity('admin_remove', address, targetAddress);
            return NextResponse.json({
                success: true,
                message: `Removed admin: ${targetAddress}`
            });
        } else if (action === 'list') {
            const admins = await getAllAdminWallets();
            return NextResponse.json({
                success: true,
                admins
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Invalid action. Use: add, remove, or list'
        }, { status: 400 });
    } catch (error) {
        console.error('Error managing admins:', error);
        return NextResponse.json({ success: false, error: 'Failed to manage admins' }, { status: 500 });
    }
}
