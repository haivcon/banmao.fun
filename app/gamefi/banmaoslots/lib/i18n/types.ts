export type SlotsLanguage = 'en' | 'vi' | 'zh' | 'ko' | 'ru' | 'id';

export interface SlotsTranslations {
    // Header
    back: string;
    balance: string;

    // Jackpot
    jackpot: string;
    progressiveJackpot: string;

    // Game state
    spin: string;
    spinning: string;
    spinningActivity: string;
    spinsRemaining?: string;
    // Rate Limit Tooltip
    rateLimitTitle?: string;
    rateLimitDesc?: string;
    rateLimitResetNote?: string;
    remaining?: string;
    spinsPerMin?: string;
    // Pool Details Modal
    clickForPoolDetails?: string;
    poolBalance?: string;
    // owner, status, active, inactive already defined in Pool Search section
    createdAt?: string;
    unknown?: string;

    approving: string;
    betting: string;
    waiting: string;
    playAgain: string;
    waitSeconds: string; // For cooldown timer: "Wait Xs"

    // Results
    youWin: string;
    jackpotWin: string;
    betterLuck: string;
    youWonAmount: string;

    // Calculator
    calculatorTitle: string;
    selectResult: string;
    potentialWin: string;
    netProfit: string;
    betAmount: string;

    // Bet controls
    betLabel: string;
    minBet: string;
    maxBet: string;

    // Payout table
    payoutTable: string;
    symbol: string;
    match3: string;
    match4: string;
    match5: string;
    jackpotPlus: string;

    // Connect wallet
    connectWallet: string;
    connectDescription: string;

    // Demo mode
    demoMode: string;
    contractPending: string;

    // Stats
    stats: string;
    totalSpins: string;
    totalWins: string;
    biggestWin: string;
    winRate: string;

    // Errors
    insufficientBalance: string;
    transactionFailed: string;
    commitExpired: string;
    rateLimitExceeded: string;
    poolCapacityWarning: string;

    // Loading
    loading: string;
    processing: string;
    approve: string;
    revealing: string;

    // Game Rules Section
    howToPlay: string;
    provablyFairTitle: string;
    provablyFairDesc: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    bettingRulesTitle: string;
    bettingToken: string;
    bettingMin: string;
    bettingMax: string;
    bettingRate: string;
    jackpotRulesTitle: string;
    jackpotCondition: string;
    jackpotPrize: string;
    jackpotAccum: string;
    refundTitle: string;
    refundDesc: string;
    refundBtn: string;
    refundSuccess: string;
    refundError: string;
    lostSeedTitle: string;
    lostSeedDesc: string;
    waitForRefund: string;

    // Contract Info / Donate
    donateToJackpot: string;
    donateDesc: string;
    jackpotProtected: string;
    lowBalanceWarning: string;
    lowBalanceDesc: string;

    // Leaderboard Panels
    topWinners: string;
    noWinnersYet: string;
    jackpotDonors: string;
    noDonorsYet: string;
    beFirstDonor: string;
    thankDonors: string;

    // Result Modal
    breakdown: string;
    multiplier: string;
    matched: string;
    calculation: string;
    bet: string;
    noMatch: string;
    clickForDetails: string;
    lossReason: string;
    symbolCounts: string;
    need3ToWin: string;
    yourBest: string;
    onlyHad: string;
    resultMatch: string;
    resultJackpot: string;
    symbolBanmao: string;
    symbolBanana: string;
    symbolDiamond: string;
    symbolStar: string;
    symbolClover: string;
    symbolSeven: string;

    // Seed Section
    secretSeed: string;
    random: string;
    history: string;
    recentSeeds: string;
    seedAutoSave: string;
    copied: string;
    verify: string;
    enterSeedPlaceholder: string;
    lastSpinVerification: string;
    seedLabel: string;
    useSeed: string;
    noMatchTitle: string;
    youWinTitle: string;
    jackpotTitle: string;
    provablyFair: string;
    generateSeed: string;
    copySeed: string;
    viewExplorer: string;
    payTable: string;
    payoutExplanation: string;

    // Enhanced Verification Panel (V2)
    howItWorks?: string;
    allResultsVerifiable?: string;
    commitStep?: string;
    revealStep?: string;
    verifyStep?: string;
    fairnessGuarantee?: string;
    verifySpinResult?: string;
    spinNumber?: string;
    forMultiSpin?: string;
    seedTransparency?: string;
    viewOnExplorer?: string;
    paste?: string;
    openExplorer?: string;

    // Advanced Stats
    globalStats: string;
    contract: string;
    pool: string;
    min: string;
    max: string;
    rtp: string;
    advancedStats: string;
    globalSpins: string;
    globalJackpots: string;

    // Donate
    donateTitle: string;
    donatePoolTitle: string;
    donatePoolDesc: string;
    donateJackpotBtn: string;
    donatePoolBtn: string;
    amount: string;
    donateBtn: string;
    donationCount: string;
    verifyDonationTitle: string;
    verifyBtn: string;
    verifying: string;
    txPlaceholder: string;
    amountPlaceholder: string;
    networkError: string;

    // Tutorial
    tutorialTitle: string;
    tutorialWelcome: string;
    tutorialStep1Title: string;
    tutorialStep1Desc: string;
    tutorialStep2Title: string;
    tutorialStep2Desc: string;
    tutorialStep3Title: string;
    tutorialStep3Desc: string;
    tutorialStep4Title: string;
    tutorialStep4Desc: string;
    tutorialStep5Title: string;
    tutorialStep5Desc: string;
    tutorialStep6Title: string;
    tutorialStep6Desc: string;
    tutorialNext: string;
    tutorialPrev: string;
    tutorialClose: string;
    tutorialDontShow: string;
    tutorialHelp: string;

    // Sound
    soundOn: string;
    soundOff: string;

    // Claim/Reveal UI
    claimResult: string;
    readyToReveal: string;
    waitingForBlock: string;
    readyClickClaim: string;

    // Stat Tooltips (for hover explanations)
    tooltipTotalSpins: string;
    tooltipTotalWins: string;
    tooltipBiggestWin: string;
    tooltipWinRate: string;
    tooltipRTP: string;
    tooltipPool: string;
    tooltipJackpot: string;
    tooltipMinBet: string;
    tooltipMaxBet: string;
    tooltipGlobalSpins: string;
    tooltipGlobalJackpots: string;

    // Spin Details Modal
    spinDetails: string;
    result: string;
    betAmountLabel: string;
    payoutLabel: string;
    txHashLabel: string;
    pending: string;

    // House Dashboard
    house: string;
    becomeHouse: string;

    // Panel Titles
    myProfile: string;
    globalHistory: string;
    leaderboardTitle: string;

    // Manual Verification
    manualVerification: string;
    enterSeedOptional: string;
    enterTxHash: string;
    spinIndexOptional: string;
    verifyResultBtn: string;
    verifiedResult: string;
    noWin: string;
    player: string;
    committedSeed: string;
    verifyErrorMissing: string;
    verifyErrorSeed: string;
    verifyErrorHash: string;
    verifyErrorInvalid: string;

    // Profile Edit Modal
    editProfile: string;
    editProfileTitle: string;
    avatarLabel: string;
    nameLabel: string;
    telegramLabel: string;
    twitterLabel: string;
    namePlaceholder: string;
    usernamePlaceholder: string;
    editLimitReached: string;
    editsRemaining: string;
    saveBtn: string;
    savingBtn: string;
    cancelBtn: string;
    // Pool Warning
    pendingCommitWarning: string;

    // Street View
    becomeOwnerButton: string;
    noPoolsAvailable: string;
    beFirstOwner: string;

    // Toast Messages
    enterTxHashError: string;
    seedMismatchError: string;
    seedVerifiedSuccess: string;
    resultVerifiedSuccess: string;
    noSpinEventError: string;
    verificationFailedError: string;
    txHashCopied: string;
    seedCopied: string;

    // Misc Headers & Labels
    loadingWinners: string;
    loadingDonors: string;
    beTheFirst: string;
    bestWinLabel: string;
    fairnessLabel: string;
    refundLabel: string;
    poolLabel: string;
    betLabelShort: string;

    // Page.tsx specific
    revealNow: string;

    poolIdLabel: string;
    timeLabel: string;
    copy: string;
    noMachinesAvailable: string;

    // ResultModal
    jackpotBonus: string;
    multiplierLabel: string;
    winTitle: string;
    winMessage: string;
    tryAgainTitle: string;

    analysisReport: string;
    spinAgain: string;

    // Expired Commit Handling
    settleExpired: string;
    forfeitBet: string;
    expiresIn: string;
    blocks: string;
    settling: string;

    // Profile Panel Enhanced
    totalProfit: string;
    tooltipProfit: string;
    winStreak: string;
    tooltipStreak: string;
    dayTrend: string;
    tooltipTrend: string;
    level: string;
    xpLabel: string;
    tooltipLevel: string;
    badgeFirstSpin: string;
    badgeCentury: string;
    badgeHotStreak: string;
    badgeLucky: string;
    badgeHighRoller: string;
    badgeChampion: string;

    // Leaderboard Tabs & Profile Viewer
    topWinnersTab: string;
    mostSpinsTab: string;
    luckyPoolsTab: string;
    toughPoolsTab: string;
    playersLabel: string;
    poolsLabel: string;
    playerWinRate: string;
    playerLossRate: string;
    noPoolsYet: string;
    clickToViewPool: string;
    clickToViewProfile: string;
    playerProfile: string;
    jackpotsWonLabel: string;
    spinHistory: string;

    // Tier System
    tierBronze: string;
    tierSilver: string;
    tierGold: string;
    tierDiamond: string;
    tierLegend: string;

    // New Leaderboard Tabs
    tabProfit: string;
    tabWinRate: string;
    tabHotToday: string;
    tabJackpotKings: string;
    tabHighRollers: string;

    // Time Filters
    timeToday: string;
    timeWeek: string;
    timeMonth: string;
    timeAll: string;

    // Achievement Names
    achievementSharpshooter: string;
    achievementOnFire: string;
    achievementMillionaire: string;
    achievementLuckyCharm: string;
    achievementBigSpender: string;
    achievementJackpotHunter: string;
    achievementCenturion: string;
    achievementVeteran: string;

    // Achievement Descriptions
    achievementSharpshooterDesc: string;
    achievementOnFireDesc: string;
    achievementMillionaireDesc: string;
    achievementLuckyCharmDesc: string;
    achievementBigSpenderDesc: string;
    achievementJackpotHunterDesc: string;
    achievementCenturionDesc: string;
    achievementVeteranDesc: string;

    // Leaderboard UI
    minSpinsRequired: string;
    todayWinnings: string;

    // Pool Search & Details
    searchPoolById: string;
    search: string;
    activePools: string;
    poolDetails: string;
    tier: string;
    betLimits: string;
    owner: string;
    status: string;
    active: string;
    inactive: string;
    playOnThisPool: string;
    poolNotFound: string;
    officialLabel: string;
    selectPool: string;
    createYourPool: string;

    // Multi-Spin Feature
    multiSpin: string;
    spins: string;
    totalBet: string;
    totalPayout?: string;
    multiSpinResults: string;
    totalResults: string;
    winsCount: string;
    lostLabel: string;
    resultLabel: string;

    // Validation & House
    verifyDesc: string;
    houseTitle: string;

    // Onboarding Tour
    tourWalletConnectTitle: string;
    tourWalletConnectDesc: string;
    tourLanguageTitle: string;
    tourLanguageDesc: string;
    tourBalanceTitle: string;
    tourBalanceDesc: string;
    tourSearchTitle: string;
    tourSearchDesc: string;
    tourAreaTitle: string;
    tourAreaDesc: string;
    tourWindowTitle: string;
    tourWindowDesc: string;
    tourPoolInfoTitle: string;
    tourPoolInfoDesc: string;
    tourReelsTitle: string;
    tourReelsDesc: string;
    tourSpinCountTitle: string;
    tourSpinCountDesc: string;
    tourBetTitle: string;
    tourBetDesc: string;
    tourSpinBtnTitle: string;
    tourSpinBtnDesc: string;
    tourSeedTitle: string;
    tourSeedDesc: string;
    tourHistoryTitle: string;
    tourHistoryDesc: string;
    tourDockTitle: string;
    tourDockDesc: string;
    tourDontShowAgain: string;
    tourBack: string;
    tourNext: string;
    tourComplete: string;

    // Game Hook Toast Messages
    toastConnectWalletFirst: string;
    toastProcessingPreviousResult: string;
    toastCannotReadNonce: string;
    toastLostSeedData: string;
    toastExpiredCommitSettled: string;

    // Page Toast Messages
    toastCopied: string;
    toastEnterTxHash: string;
    toastNoSpinEvent: string;
    toastSpinVerified: string;
    toastResultVerified: string;
    toastSeedMismatch: string;
    toastSeedVerified: string;
    toastVerificationFailed: string;

    // House Dashboard Toast Messages
    toastApproving: string;
    toastApprovalGranted: string;
    toastApprovalFailed: string;
    toastCreatingPool: string;
    toastPoolCreated: string;
    toastPoolCreateFailed: string;
    toastDepositing: string;
    toastDepositSuccess: string;
    toastDepositFailed: string;
    toastWithdrawing: string;
    toastWithdrawSuccess: string;
    toastWithdrawFailed: string;
    toastUpdatingSettings: string;
    toastSettingsUpdated: string;
    toastUpdateFailed: string;
    toastDeactivatingPool: string;
    toastPoolDeactivated: string;
    toastReactivatingPool: string;
    toastPoolReactivated: string;
    toastClosingPool: string;
    toastPoolClosed: string;
    toastTransferringOwnership: string;
    toastOwnershipTransferred: string;
    toastSettlingCommit: string;
    toastCommitSettled: string;
    toastSettleFailed: string;
    toastBatchSettling: string;
    toastBatchSettleComplete: string;
    toastUpdatingProtection: string;
    toastProtectionUpdated: string;
    toastOperationFailed: string;

    // RPC Delay Warning
    rpcDelayTitle: string;
    rpcDelayMessage: string;
    rpcDelayTip: string;
    rpcDelayReason: string;

    // Panel Descriptions
    myProfileDesc: string;
    leaderboardDesc: string;
    historyDesc: string;
    payoutDesc: string;
    houseDesc: string;
    rankLabel: string;
    banmaoBalanceLabel: string;
    banmaoBalanceDesc: string;
    okbBalanceLabel: string;
    okbBalanceDesc: string;
    matchCountLabel: string;
    jackpotBonusNote: string;
    rulesLabel: string;
    jackpotPoolBonus: string;

    // Additional Actions
    revealingActivity: string;
    minDepositInfo: string;
    yourBalance: string;
    poolName: string;
    poolNamePlaceholder: string;
    charLimit: string;
    initialDeposit: string;
    minimum: string;
    betsAdjustedInfo: string;
    minBetHint: string;
    maxBetHint: string;
    maxBetLimitError: string;
    probabilityLabel: string;
    matchLabel: string;
    probabilityNote: string;
    symbolAppearRate: string;
    jackpotInfo: string;
    platformFee: string;
    cancel: string;
    approveAndCreate: string;
    create: string;

    // Mechanism Report
    mechanismTitle: string;
    mechanismBtn: string;
    mechanismRandomSource: string;
    mechanismRandomDesc: string;
    mechanismEntropy1: string;
    mechanismEntropy2: string;
    mechanismEntropy3: string;
    mechanismEntropy4: string;
    mechanismEntropy5: string;
    mechanismSymbolGen: string;
    mechanismSymbolGenDesc: string;
    mechanismCommitReveal: string;
    mechanismCommitDesc: string;
    mechanismRevealDesc: string;

    // Security Analysis
    securityTitle: string;
    securityBtn: string;
    securityNoCheat: string;
    securityHouseCantCheat: string;
    securityPlayerCantCheat: string;
    securityMinerCantCheat: string;
    securityHackerCantCheat?: string;
    securityProtections: string;
    securityCommitReveal: string;
    securityBlockhash: string;
    securityNonce: string;
    securityProtectedFunds: string;
    securityConclusion: string;

    // Multi-Spin
    multiSpinTitle: string;
    multiSpinBtn: string;
    multiSpinHow: string;
    multiSpinHowDesc: string;
    multiSpinIndependent: string;
    multiSpinOdds: string;
    multiSpinFormula: string;
    multiSpin1: string;
    multiSpin3: string;
    multiSpin5: string;
    multiSpin10: string;
    multiSpinNote: string;
    multiSpinNoteDesc: string;

    // Extended Multi-Spin
    multiSpinTableHeader: string;
    multiSpinCol3Match: string;
    multiSpinCol4Match: string;
    multiSpinCol5Match: string;
    multiSpinColJackpot: string;
    multiSpin1_4M: string;
    multiSpin3_4M: string;
    multiSpin5_4M: string;
    multiSpin10_4M: string;
    multiSpin1_5M: string;
    multiSpin3_5M: string;
    multiSpin5_5M: string;
    multiSpin10_5M: string;
    multiSpin1JP: string;
    multiSpin3JP: string;
    multiSpin5JP: string;
    multiSpin10JP: string;
    multiSpinNote1: string;
    multiSpinNote2: string;
    multiSpinNote3: string;
    multiSpinNote4: string;
    multiSpinExample: string;
    multiSpinExampleDesc: string;
    multiSpinExampleTotal: string;
    multiSpinExample3Match: string;
    multiSpinExampleLose: string;
    multiSpinExampleResults: string;
    multiSpinResult0: string;
    multiSpinResult1: string;
    multiSpinResult2: string;
    multiSpinResultJP: string;

    // Detailed Rules Panel (V2)
    rulesHowToWin?: string;
    rulesWinCondition?: string;
    rulesHigherPays?: string;
    rulesSymbolProb?: string;
    rulesEntryLimits?: string;
    rulesMinEntry?: string;
    rulesMaxEntry?: string;
    rulesRateLimit?: string;
    rulesJackpotTitle?: string;
    rulesJackpotCondition?: string;
    rulesJackpotPrize?: string;
    rulesJackpotPool?: string;
    rulesJackpotContrib?: string;
    rulesFairnessTitle?: string;
    rulesCommitReveal?: string;
    rulesBlockDelay?: string;
    rulesVerifiable?: string;
    rulesPlatformFee?: string;
    rulesFeeAmount?: string;
    rulesRTP?: string;
    rulesRefundTitle?: string;
    rulesRefundTimeout?: string;
    rulesRefundAction?: string;
    rulesRefundNote?: string;

    // Detailed Mechanism Keys (V2)
    mechanismPayoutTitle?: string;
    mechanismPayoutDesc?: string;
    mechanismPayoutStep1?: string;
    mechanismPayoutStep2?: string;
    mechanismPayoutStep3?: string;
    mechanismPayoutStep4?: string;
    mechanismPayoutJackpot?: string;
    mechanismFeeTitle?: string;
    mechanismFeeDesc?: string;
    mechanismFee1?: string;
    mechanismFee2?: string;
    mechanismFee3?: string;
    mechanismFeeNote?: string;
    mechanismMultiSpinTitle?: string;
    mechanismMultiSpinDesc?: string;
    mechanismMultiSpin1?: string;
    mechanismMultiSpin2?: string;
    mechanismMultiSpin3?: string;
    mechanismMultiSpin4?: string;
    mechanismMultiSpin5?: string;
    mechanismExpiredTitle?: string;
    mechanismExpiredDesc?: string;
    mechanismExpired1?: string;
    mechanismExpired2?: string;
    mechanismExpired3?: string;
    mechanismExpired4?: string;
    mechanismExpiredNote?: string;

    // Detailed Security Keys (V2)
    securityHouseProof1?: string;
    securityHouseProof2?: string;
    securityHouseProof3?: string;
    securityPlayerProof1?: string;
    securityPlayerProof2?: string;
    securityPlayerProof3?: string;
    securityMinerProof1?: string;
    securityMinerProof2?: string;
    securityMinerProof3?: string;
    securityOpenZeppelin?: string;
    securityOZ1?: string;
    securityOZ2?: string;
    securityOZ3?: string;
    securityOZ4?: string;
    securityRateLimit?: string;
    securityConstants?: string;
    securityConstant1?: string;
    securityConstant2?: string;
    securityConstant3?: string;
    // Calculator Keys (V2)
    winOdds?: string;
    formula?: string;
    spinCountLabel?: string;
    totalCost?: string;
    symbolHeader?: string;
    independentResults?: string;
    totalWinChance?: string;
    feeNote?: string;
}
