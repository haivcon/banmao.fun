// Locale index file - exports all translations and types

export type Language = "en" | "vi" | "zh" | "ko" | "ru" | "id";

export interface LandingTranslations {
    logoTitle: string;
    tokenStats: string;
    totalSupply: string;
    circulating: string;
    burned: string;
    tokenDistribution: string;
    holders: string;
    globalHolders: string;
    marketCap: string;
    liquidity: string;
    token: string;
    time: string;
    priceFeed: string;
    network: string;
    price: string;
    change24h: string;
    mcap: string;
    buyToken: string;
    joinMission: string;
    gamefi: string;
    collection: string;
    installApp: string;
    installDesc: string;
    installNow: string;
    howToInstall: string;
    language: string;
    selectLang: string;
    settings: string;
    theme: string;
    sound: string;
    minimizedApps: string;
    clickToRestore: string;
    appsMinimized: string;
    volume24h: string;
    transactions24h: string;
    totalTradeVolume: string;
    community: string;
    joinUs: string;
    dataVoid: string;
    dataVoidWarning: string;
    dataVoidConfirm: string;
    dataVoidCancel: string;
    dataVoidCleared: string;
    tokenInfoTitle: string;
    tokenInfoDesc: string;
    totalBurned: string;
    burnHistory: string;
    burnDescription: string;
    burnButton: string;
    // DeFi Burn Card
    defiBurnName: string;
    defiBurnDesc: string;
    defiBurnDetails: string;
    defiBurnCommunityWallet: string;
    // GameFi Hub translations
    gamefiZone: string;
    gamefiSubtitle: string;
    gamefiBack: string;
    gamefiPlayNow: string;
    gamefiLive: string;
    gamefiComingSoon: string;
    gamefiMaintenance: string;
    gamefiRpsName: string;
    gamefiRpsDesc: string;
    gamefiRpsHowToPlay: string;
    gamefiSnakeName: string;
    gamefiSnakeDesc: string;
    gamefiSnakeHowToPlay: string;
    // Slots
    gamefiSlotsName: string;
    gamefiSlotsDesc: string;
    gamefiSlotsHowToPlay: string;
    // Miner
    gamefiMinerName: string;
    gamefiMinerDesc: string;
    gamefiMinerDetails: string;
    gamefiMinerHowToPlay: string;
    // FOMO
    gamefiFomoName: string;
    gamefiFomoDesc: string;
    gamefiFomoDetails: string;
    gamefiFomoHowToPlay: string;
    gamefiFooter: string;
    gamefiMoreGames: string;
    gamefiLoadingGame: string;
    // GameInfoModal sections
    gamefiAbout: string;
    gamefiHowToPlay: string;
    gamefiSmartContract: string;
    gamefiViewExplorer: string;
    // Donor Modal translations
    totalDonated: string;
    donationCount: string;
    times: string;
    loading: string;
    noData: string;
    editProfile: string;
    anonymous: string;
    displayName: string;
    displayNamePlaceholder: string;
    topDonors: string;
    // Browser Notice translations
    browserNoticeTitle: string;
    browserNoticeDesc: string;
    browserNoticeMobile: string;
    browserNoticeDesktop: string;
    browserNoticeDownload: string;
    browserNoticeInstalled: string;
    browserNoticeClose: string;
    // Staking translations
    staking: string;
    stakingTitle: string;
    stakingSubtitle: string;
    stakingLock: string;
    stakingUnlock: string;
    stakingRewards: string;
    stakingAPY: string;
    stakingTotalLocked: string;
    stakingYourStake: string;
    stakingLockPeriod: string;
    stakingDays: string;
    stakingEarned: string;
    stakingPending: string;
    backToHub: string;
    // DeFi Hub translations
    defiHub: string;
    defiExploreTitle: string;
    defiExploreSubtitle: string;
    defiDisabled: string;
    defiDisabledDesc: string;
    defiBackHome: string;
    defiTVL: string;
    defiActiveUsers: string;
    defiBestAPY: string;
    defiServices: string;
    defiLive: string;
    defiComingSoon: string;
    defiEnter: string;
    defiTvlTooltip: string;
    defiStakersTooltip: string;
    defiApyTooltip: string;
    defiBurnTooltip: string;
    // DeFi Service Names
    defiStakingName: string;
    defiStakingDesc: string;
    defiStakingDetails: string;
    defiPoolsName: string;
    defiPoolsDesc: string;
    defiFarmingName: string;
    defiFarmingDesc: string;
    defiLendingName: string;
    defiLendingDesc: string;
    defiAirdropName: string;
    defiAirdropDesc: string;
    defiAirdropDetails: string;
    // Staking Page UI & Status
    stakingAmountToStake: string;
    stakingAvailableBalance: string;
    stakingSelectLockOption: string;
    stakingMultiplier: string;
    stakingBoost: string;
    stakingFlexible: string;
    stakingLockTokens: string;
    stakingUnstakeTokens: string;
    stakingAmountToUnstake: string;
    stakingClaim: string;
    stakingCompound: string;
    stakingEmergencyWithdraw: string;
    stakingRewardPool: string;
    stakingContractHealth: string;
    stakingHealthy: string;
    stakingCheckRequired: string;
    stakingRewardsLeft: string;
    stakingDonateTitle: string;
    stakingDonateDesc: string;
    stakingDonateButton: string;
    stakingApprove: string;
    stakingDonateTip: string;
    stakingDonateAction: string;
    stakingDonateNote: string;
    stakingWaitWallet: string;
    stakingTxPending: string;
    stakingTxSuccess: string;
    stakingAvailableToUnstake: string;
    stakingEstimatedEarnings: string;
    stakingStakeAmount: string;
    stakingEffectiveShares: string;
    stakingCalculatedNote: string;
    stakingTokensToReceive: string;
    stakingPenaltyWarning: string;
    // Panel Titles & Labels
    panelStats: string;
    panelStake: string;
    panelUnstake: string;
    panelClaim: string;
    panelCompound: string;
    panelClose: string;
    // Panel Content
    balanceLabel: string;
    stakedLabel: string;
    amountToStake: string;
    amountToUnstake: string;
    pendingRewards: string;
    noRewardsMessage: string;
    autoCompoundDesc: string;
    confirmStake: string;
    confirmUnstake: string;
    claimRewardsBtn: string;
    compoundBtn: string;
    approveToken: string;
    selectLockDuration: string;
    // Energy Sphere Display
    sphereRewardPool: string;
    sphereTVL: string;
    sphereTotalShares: string;
    sphereRewardRate: string;
    sphereStatus: string;
    sphereHealthy: string;
    sphereUnhealthy: string;
    sphereTapToToggle: string;
    // Stats Panel Extended
    statsTotalShares: string;
    statsTotalSharesDesc: string;
    statsRewardRate: string;
    statsRewardRateDesc: string;
    statsRewardRatePerSec: string;
    statsRewardRatePerSecDesc: string;
    statsDaysLeft: string;
    statsDaysLeftDesc: string;
    statsMinStake: string;
    statsMinStakeDesc: string;
    statsMaxStake: string;
    statsMaxStakeDesc: string;
    statsPenalty: string;
    statsPenaltyDesc: string;
    statsGracePeriod: string;
    statsGracePeriodDesc: string;
    statsVipTier: string;
    statsVipTierDesc: string;
    statsPendingReward: string;
    statsPendingRewardDesc: string;
    statsTotalLockedDesc: string;
    statsRewardPoolDesc: string;
    statsYourStakeDesc: string;
    statsDays: string;
    statsHours: string;
    statsClickForInfo: string;
    tooltipTapToClose: string;
    // Common UI
    closeBtn: string;
    // Stats section headers
    stakingContractStats: string;
    stakingPersonalStats: string;
    // Wallet balance
    walletBalance: string;
    walletBalanceDesc: string;
    // Unstake Annotations
    unstakeEarlyTitle: string;
    unstakeEarlyDesc: string;
    unstakeGraceTitle: string;
    unstakeGraceDesc: string;
    unstakeAfterTitle: string;
    unstakeAfterDesc: string;
    unstakePenaltyWarning: string;
    unstakeNoPenalty: string;
    unstakeLockRemaining: string;
    unstakeGraceRemaining: string;
    unstakeGracePeriodNote: string;
    unstakeGracePeriodNoteFree: string;
    unstakeLockEnded: string;
    unstakeStatus: string;
    // Energy Sphere Refined
    spherePoolStats: string;
    sphereMyStats: string;
    statsRateDaily: string;
    statsRatePerSec: string;
    statsMyStake: string;
    statsPending: string;
    // Orb Labels
    orbStats: string;
    orbStake: string;
    orbUnstake: string;
    orbClaim: string;
    orbCompound: string;
    // Sphere Hint
    tapSphereHint: string;
    // Claim History Panel
    claimHistoryTitle: string;
    claimHistoryContract: string;
    claimHistoryAmount: string;
    claimHistoryTime: string;
    claimHistoryViewTx: string;
    claimHistoryNoRecords: string;
    claimHistoryLoading: string;
    claimHistoryShowingRecords: string;
    claimHistoryLoadError: string;
    claimHistorySearchExplorer: string;
    claimHistoryJustNow: string;
    claimHistoryMinutesAgo: string;
    claimHistoryHoursAgo: string;
    claimHistoryDaysAgo: string;
    claimHistoryExplorerGuide: string;
    claimHistorySearchTip: string;
}

export interface LanguageInfo {
    code: Language;
    name: string;
    flag: string;
}

// Import all translations
import { en } from './en';
import { vi } from './vi';
import { zh } from './zh';
import { ko } from './ko';
import { ru } from './ru';
import { id } from './id';

// Language list
export const LANGUAGES: LanguageInfo[] = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "id", name: "Indonesia", flag: "🇮🇩" },
];

// All translations map
export const translations: Record<Language, LandingTranslations> = {
    en,
    vi,
    zh,
    ko,
    ru,
    id,
};

/**
 * Get browser language and map to supported language
 */
export function getBrowserLanguage(): Language {
    if (typeof window === "undefined") return "en";
    const browserLang = navigator.language.split("-")[0].toLowerCase();
    const supported: Language[] = ["en", "vi", "zh", "ko", "ru", "id"];
    return supported.includes(browserLang as Language) ? (browserLang as Language) : "en";
}

/**
 * Get translation function for a given language
 */
export function getTranslation(lang: Language): (key: keyof LandingTranslations) => string {
    return (key: keyof LandingTranslations): string => {
        return translations[lang][key] || translations.en[key] || key;
    };
}

/**
 * Get available languages for selection (returns all languages)
 */
export function getAvailableLanguages(currentLang: Language): LanguageInfo[] {
    // Return all languages so users can switch freely between any language
    return LANGUAGES;
}
