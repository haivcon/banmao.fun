import { NextResponse } from "next/server";
import { getConfig } from "../../../lib/db";

// Default values matching snake-sign/route.ts
const DEFAULTS = {
    SNAKE_MAX_CLAIMS_PER_HOUR: 10,
    SNAKE_RATE_LIMIT_WINDOW: 60, // seconds
};

async function getConfigValue(key: string, defaultValue: number): Promise<number> {
    try {
        const value = await getConfig(key);
        if (value !== null) {
            const parsed = parseFloat(value);
            if (!isNaN(parsed)) return parsed;
        }
    } catch (e) {
        console.error(`Failed to get config ${key}:`, e);
    }
    return defaultValue;
}

// GET /api/snake-config — public endpoint to read backend config for display
// NOTE: Do NOT expose ratio or other sensitive config values
export async function GET() {
    try {
        const [maxClaimsPerHour, rateLimitWindow] = await Promise.all([
            getConfigValue('SNAKE_MAX_CLAIMS_PER_HOUR', DEFAULTS.SNAKE_MAX_CLAIMS_PER_HOUR),
            getConfigValue('SNAKE_RATE_LIMIT_WINDOW', DEFAULTS.SNAKE_RATE_LIMIT_WINDOW),
        ]);

        return NextResponse.json({
            maxClaimsPerHour,
            cooldownSeconds: rateLimitWindow,
        });
    } catch (error) {
        console.error('Failed to read snake config:', error);
        return NextResponse.json({
            maxClaimsPerHour: DEFAULTS.SNAKE_MAX_CLAIMS_PER_HOUR,
            cooldownSeconds: DEFAULTS.SNAKE_RATE_LIMIT_WINDOW,
        });
    }
}
