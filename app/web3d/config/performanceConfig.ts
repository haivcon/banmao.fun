export type Web3DQualityMode = "low" | "medium" | "high";

export type Web3DQualityConfig = {
    dpr: [number, number];
    targetFps: number;
    maxTextureSize: number;
    maxInitialAssetMb: number;
    stars: number;
    sparklesPrimary: number;
    sparklesSecondary: number;
    floatingParticles: number;
    glowingOrbs: number;
    tokenCoinSegments: number;
    tokenCoinRidges: number;
    maxDynamicLights: number;
    enableFloatingCubes: boolean;
    enableTokenChart: boolean;
    enableMascot: boolean;
    enableTokenCoin: boolean;
    enableCommunityHub: boolean;
    enableDancingLogo: boolean;
    enableWhale: boolean;
    enableBlackHole: boolean;
    enableOKXLogo: boolean;
    enableScanlines: boolean;
    antialias: boolean;
    powerPreference: WebGLPowerPreference;
    animationSpeed: number;
};

export const WEB3D_PERFORMANCE_CONFIG: Record<Web3DQualityMode, Web3DQualityConfig> = {
    low: {
        dpr: [0.75, 1],
        targetFps: 30,
        maxTextureSize: 1024,
        maxInitialAssetMb: 2,
        stars: 350,
        sparklesPrimary: 0,
        sparklesSecondary: 0,
        floatingParticles: 4,
        glowingOrbs: 2,
        tokenCoinSegments: 32,
        tokenCoinRidges: 24,
        maxDynamicLights: 1,
        enableFloatingCubes: false,
        enableTokenChart: false,
        enableMascot: true,
        enableTokenCoin: false,
        enableCommunityHub: false,
        enableDancingLogo: false,
        enableWhale: false,
        enableBlackHole: false,
        enableOKXLogo: false,
        enableScanlines: false,
        antialias: false,
        powerPreference: "default",
        animationSpeed: 0.35,
    },
    medium: {
        dpr: [1, 1.25],
        targetFps: 45,
        maxTextureSize: 1536,
        maxInitialAssetMb: 4,
        stars: 900,
        sparklesPrimary: 25,
        sparklesSecondary: 15,
        floatingParticles: 12,
        glowingOrbs: 5,
        tokenCoinSegments: 48,
        tokenCoinRidges: 36,
        maxDynamicLights: 2,
        enableFloatingCubes: false,
        enableTokenChart: true,
        enableMascot: true,
        enableTokenCoin: true,
        enableCommunityHub: true,
        enableDancingLogo: true,
        enableWhale: false,
        enableBlackHole: true,
        enableOKXLogo: true,
        enableScanlines: true,
        antialias: false,
        powerPreference: "default",
        animationSpeed: 0.65,
    },
    high: {
        dpr: [1, 1.5],
        targetFps: 60,
        maxTextureSize: 2048,
        maxInitialAssetMb: 8,
        stars: 1800,
        sparklesPrimary: 80,
        sparklesSecondary: 50,
        floatingParticles: 32,
        glowingOrbs: 10,
        tokenCoinSegments: 64,
        tokenCoinRidges: 48,
        maxDynamicLights: 3,
        enableFloatingCubes: true,
        enableTokenChart: true,
        enableMascot: true,
        enableTokenCoin: true,
        enableCommunityHub: true,
        enableDancingLogo: true,
        enableWhale: true,
        enableBlackHole: true,
        enableOKXLogo: true,
        enableScanlines: true,
        antialias: true,
        powerPreference: "high-performance",
        animationSpeed: 1,
    },
};

export const getWeb3DQualityConfig = (quality: Web3DQualityMode): Web3DQualityConfig =>
    WEB3D_PERFORMANCE_CONFIG[quality];