/**
 * BanMaoFomo i18n Type Definitions - DualTimer v2
 */

export interface LocaleStrings {
    // Page
    title: string;
    backToHub: string;
    connectWallet: string;

    // Game Status
    currentRound: string;
    jackpotPool: string;
    timeRemaining: string;
    currentLeader: string;
    totalAttacks: string;
    totalBanmaoLabel: string;
    attackCost: string;

    // Dual Timer (v2)
    softTimer: string;
    softTimerHint: string;
    hardTimer: string;
    hardTimerHint: string;
    softWin: string;
    softWinDesc: string;
    hardWin: string;
    hardWinDesc: string;
    winTypes: string;
    toWinner: string;

    // Attack Panel
    attack: string;
    attackCount: string;
    selectAttacks: string;
    totalCost: string;
    totalCostLabel: string;
    attackButton: string;
    attacking: string;
    cooldownActive: string;
    cooldownRemaining: (seconds: number) => string;
    needApproval: string;
    approve: string;
    approving: string;
    approved: string;
    attacksRemaining: string;
    maxAttacksReached: string;
    eligibleForReward: string;
    minAttacksHint: string;
    giftsForReward: string;
    perGift: string;

    // Rules Modal Tabs
    rulesTabOverview: string;
    rulesTabTimer: string;
    rulesTabRewards: string;
    rulesTabVip: string;

    // Rules Modal Headings
    rulesWinnerHeading: (pct: number) => string;
    rulesMinGiftsHeading: (min: number) => string;
    rulesTop10Heading: (pct: number) => string;
    rulesNextRoundSeed: string;
    rulesRemainingPct: (pct: number) => string;
    rulesAllPrizesLost: string;
    rulesCooldownReduction: (pct: number, seconds: number) => string;

    // Rules Overview - stat box labels
    rulesCostPerGift: string;
    rulesGiftsPerTx: string;
    rulesMaxPerRound: string;
    rulesBaseCooldown: string;

    // Rules Timer/Win headings
    rulesSoftTimerLabel: string;
    rulesHardTimerLabel: string;
    rulesHardTimerStart: (hours: number) => string;
    rulesHardTimerPerGift: (seconds: number) => string;
    rulesSoftWinLabel: string;
    rulesHardWinLabel: string;
    rulesTimeoutLabel: string;
    rulesTop10Label: string;
    rulesToSeed: string;

    // Game Arena Timer Labels
    softTimerLabel: string;
    hardTimerLabel: string;

    // Claim
    claimTitle: string;
    personalVault: string;
    pendingRewards: string;
    claimableRounds: string;
    claimAll: string;
    claiming: string;
    claimSuccess: string;
    noRewards: string;

    // Round Status
    roundEnded: string;
    roundActive: string;
    gamePaused: string;
    finalize: string;
    finalizing: string;
    newRoundStarting: string;
    claimRewardsHint: string;

    // Manual Claim
    cancel: string;
    lostRewards: string;

    // History
    historyTitle: string;
    recentAttacks: string;
    pastRounds: string;
    winner: string;
    prize: string;
    attacks: string;
    noHistory: string;

    // Explorer Links
    explorerVerifyDesc: string;
    explorerCopyBtn: string;
    explorerCopied: string;

    // Rules
    rulesTitle: string;
    howToPlay: string;
    rulesList: string[];
    distributionTitle: string;
    distributionList: string[];

    // Notifications
    attackSuccess: string;
    attackFailed: string;
    youAreLeader: string;
    roundFinalized: string;
    youWon: (amount: string) => string;

    // Time
    hours: string;
    minutes: string;
    seconds: string;

    // Misc
    loading: string;
    error: string;
    retry: string;
    balance: string;
    wallet: string;
    noWallet: string;
    insufficientBalance: string;

    // Lucky Number
    luckyNumber: string;
    yourLucky: string;
    luckyBonus: string;
    criticalHit: string;
    niceHit: string;

    // V2 Features - Tiers & Dynamic Cost
    tierBronze: string;
    tierSilver: string;
    tierGold: string;
    tierDiamond: string;
    dynamicCost: string;
    discount: string;
    multiplier: string;

    // Admin Panel
    adminPanel: string;
    updateConfig: string;
    luckyConfig: string;
    tierConfig: string;
    dynamicConfig: string;
    distributeDust: string;
    enabled: string;
    disabled: string;
    threshold: string;
    bonus: string;
    softDeadline: string;
    hardDeadline: string;
    pool: string;
    leader: string;
    gameStatus: string;

    // V11 Rules & Tips
    rulesStep1Title: string;
    rulesStep1Desc: (cost: string) => string;
    rulesStep2Title: string;
    rulesStep2Desc: string;
    rulesStep3Title: string;
    rulesStep3Desc: string;

    distJackpot: string;
    distDividends: string;
    distSeed: string;
    distStaking: string;
    distBurn: string;

    // Detailed distribution explanations
    distJackpotExplain: string;
    distDividendsExplain: string;
    distSeedExplain: string;
    distStakingExplain: string;
    distBurnExplain: string;

    winSoftTitle: string;
    winSoftCondition: string;
    winHardTitle: string;
    winHardCondition: string;
    distRemaining: string;
    winTimeoutTitle: string;
    winTimeoutCondition: (hours: string) => string;

    winRewardWinner: (percent: string) => string;
    winRewardTop10: (percent: string) => string;
    winRewardNextRound: (percent: string) => string;
    winRewardRollover: string;

    topAttackersTitle: string;
    topAttackersDesc: (percent: string) => string;
    topAttackersNote1: string;
    topAttackersNote2: string;
    topAttackersNote3: string;

    strategySniperTitle: string;
    strategySniperDesc: string;
    strategyWhaleTitle: string;
    strategyWhaleDesc: string;
    strategyEarlyBirdTitle: string;
    strategyEarlyBirdDesc: string;



    // Mini Rules Panel
    miniRulesTitle: string;
    miniRulesSoft: string;
    miniRulesHard: string;
    miniRulesDistribution: string;
    miniRulesViewMore: string;

    // V11 Detailed Rules
    allocOnAttackTitle: string;
    allocOnAttackDesc: string;
    allocJackpot: string;
    allocDividends: string;
    allocSeed: string;
    allocStaking: string;
    allocBurn: string;

    jackpotDistTitle: string;
    softWinFull: string;
    softWinTimer: string;
    softWinWinner: string;
    softWinTop10: string;
    softWinExample: string;

    hardWinFull: string;
    hardWinTimer: string;
    hardWinRollover: string;
    hardWinRemaining: string;
    hardWinWinner: string;
    hardWinTop10: string;
    hardWinExample: string;

    timeoutFull: string;
    timeoutDesc: string;
    timeoutRollover: string;

    eligibilityTitle: string;
    eligibilityMinAttacks: string;
    eligibilityPartialPrize: string;
    eligibilityClaimTime: string;

    // V11: UI/UX improvements
    eligibilityWarning: (attacks: number) => string;
    yourRank: (rank: number) => string;
    configChangeNotice: string;
    prizeRolledOver: string;

    // LeaderBoard panel
    leaderboardTopTitle: string;
    leaderboardPotShare: string;
    leaderboardMore: (count: number) => string;
    attacksShort: string;
    youLabel: string;

    // SettlePanel
    timeoutWarning: string;
    timeoutClaimWithin: (time: string) => string;
    potRollover: string;
    finalizeRound: string;
    claimJackpotWin: string;
    smartSettleTooltip: string;
    winnerDistribution: string;
    viewTransactionHistory: string;
    hideTransactionHistory: string;
    jackpotClaimed: string;

    // VIPTierPanel
    tierLabel: string;
    lifetimeAttacksLabel: string;
    cooldownLabel: string;
    tierMore: (count: number) => string;
    dynamicCostActive: string;
    currentCostLabel: string;
    nextRoundSeed: string;
    seedFundTitle: string;
    viewContract: string;
    developedBy: string;

    // RoundHistory
    roundHistoryTitle: string;
    roundsCount: (count: number) => string;
    noRoundsYet: string;
    endedLabel: string;
    activeLabel: string;
    attacksLabel: string;
    winnerLabel: string;
    lastAttackLabel: string;
    showMore: (count: number) => string;
    showLess: string;
    viewTxLabel: string;
    // RoundHistory Expanded Features
    roundHistory: string;
    roundDetails: string;
    topAttackers: string;
    liveActivity: string;
    noActivity: string;
    attackedWith: string;
    prizeDistribution: string;
    softDeadlineLabel: string;
    hardDeadlineLabel: string;
    totalAttacksLabel: string;
    loadingTopAttackers: string;
    softWinLabel: string;
    hardWinLabel: string;
    timeoutWinLabel: string;
    prizeWonAmount: (amount: string) => string;
    rolloverExplanation: (amount: string) => string;
    noWinnerTimeout: string;

    // VaultHistory
    allFilter: string;
    depositsFilter: string;
    withdrawalsFilter: string;
    noTransactionsYet: string;
    vaultHistoryHint: string;
    attackLabel: string;
    claimedLabel: string;
    luckyRewardLabel: string;
    jackpotWinLabel: string;
    roundLabel: (id: number) => string;
    loadMore: (count: number) => string;
    // VaultHistory — Expanded Detail
    vhTotalGifts: string;
    vhGiftsThisRound: string;
    vhVaultBalance: string;
    vhSearchRound: string;
    vhYourContribution: string;
    vhTotalGiftsInRound: string;
    vhTotalSpent: string;
    vhDistNote: string;
    vhHistoryNote: string;
    vhNoWithdrawals: string;
    vhWithdrawalsHint: string;

    // Distribution Animation
    distTitle: string;
    distDividend: string;
    distNextRound: string;
    distAutoClose: string;
    distFirstAttackNote: string;
    distStakingWallet: string;
    distBurnWallet: string;
    // Distribution Animation - Enhanced labels and descriptions
    distJackpotLabel: string;
    distDividendLabel: string;
    distSeedLabel: string;
    distStakingLabel: string;
    distBurnLabel: string;
    distJackpotDesc: string;
    distDividendDesc: string;
    distSeedDesc: string;
    distStakingDesc: string;
    distBurnDesc: string;
    distTotalLabel: string;
    distCollectiveNote: string;

    // Claim Button (when round ends)
    claimAllButton: string;
    claimAllHint: string;

    // Enhanced Mini Rules
    miniRulesRoundEnd: string;
    miniRulesSoftWinFull: string;
    miniRulesHardWinFull: string;
    miniRulesTimeoutFull: string;
    miniRulesTimeoutWarning: string;
    miniRulesDistWinner: string;
    miniRulesDistTop10: string;
    miniRulesClaimDeadline: (hours: number) => string;
    miniRulesTimeoutResult: string;

    // Mini Rules V2 - Dynamic values from contract
    miniRulesViewDetails: string;
    miniRulesLastGifterWins: string;
    miniRulesCost: (cost: number) => string;
    miniRulesMaxPerPlayer: (max: number) => string;
    miniRulesSoftRule: (hours: number) => string;
    miniRulesHardRule: string;
    miniRulesWinnerPct: (pct: number) => string;
    miniRulesTop10Pct: (pct: number) => string;
    miniRulesMinGifts: (min: number) => string;
    miniRulesClaimWarn: (hours: number) => string;

    // Dashboard Sections
    dashboardTitle: string;
    personalSection: string;
    communitySection: string;
    tierSuffix: string;
    attacksPlural: string;

    // Wallet Tooltips
    burnTooltip: string;
    stakingTooltip: string;
    seedFundTooltip: string;

    // ============ COMPREHENSIVE RULES (Chi tiết) ============
    // Overview Section
    rulesComprehensiveTitle: string;
    rulesGameOverview: string;
    rulesGameOverviewDesc: string;

    // Attack Mechanics
    rulesAttackMechanicsTitle: string;
    rulesAttackCostDesc: string;
    rulesAttackCostExample: string;
    rulesAttackLimitDesc: string;
    rulesAttackCooldownDesc: string;

    // Timer System
    rulesTimerSystemTitle: string;
    rulesSoftTimerFullDesc: string;
    rulesSoftTimerExample: string;
    rulesHardTimerFullDesc: string;
    rulesHardTimerExample: string;
    rulesHardTimerCalcExample: string;

    // Win Conditions Detailed
    rulesWinConditionsDetailTitle: string;
    rulesSoftWinFullDesc: string;
    rulesSoftWinExampleScenario: string;
    rulesHardWinFullDesc: string;
    rulesHardWinExampleScenario: string;
    rulesTimeoutFullDesc: string;
    rulesTimeoutExampleScenario: string;

    // Fund Distribution
    rulesFundDistributionTitle: string;
    rulesFundDistOverview: string;
    rulesFundBurnDesc: string;
    rulesFundStakingDesc: string;
    rulesFundSeedDesc: string;
    rulesFundDividendsDesc: string;
    rulesFundJackpotDesc: string;
    rulesFundDistExample: string;

    // Rewards System
    rulesRewardsSystemTitle: string;
    rulesWinnerRewardDesc: string;
    rulesWinnerMinAttacksDesc: string;
    rulesWinnerPartialDesc: string;
    rulesTop10RewardDesc: string;
    rulesTop10CalcExample: string;
    rulesRewardsExampleScenario: string;

    rulesHardWinRewardTitle: string;
    rulesHardWinRewardDesc: string;
    rulesHardWinRewardExample: string;

    // Claim Deadline
    rulesClaimDeadlineTitle: string;
    rulesClaimDeadlineDesc: string;
    rulesClaimTimeoutConsequence: string;
    rulesClaimDeadlineExample: string;

    // VIP Tier System
    rulesTierSystemTitle: string;
    rulesTierOverviewDesc: string;
    rulesTierBronzeDesc: string;
    rulesTierSilverDesc: string;
    rulesTierGoldDesc: string;
    rulesTierDiamondDesc: string;
    rulesTierBenefitDesc: string;

    // Pro Tips
    rulesProTips: string;
    tipClaim: (hours: string) => string;
    tipTier: string;
    tipSettle: string;
    tipMaxAttacks: (max: number) => string;
    rulesMinGiftsForPrize: (min: number) => string;

    // Strategy Tips (parameterized with contract values)
    tipEarlyBird?: (dividendPct: number) => string;
    tipEarlyBirdExample?: string;
    tipSoftStrategy?: string;
    tipHardAwareness?: (decreaseSeconds: number) => string;
    tipClaimUrgent?: (claimHours: string) => string;

    // Example Complete Round
    rulesExampleRoundTitle: string;
    rulesExampleRoundScenario: string;

    // Recent Gifts Detail Panel
    recentGiftPlayer: string;
    recentGiftCount: string;
    recentGiftTime: string;
    recentGiftTx: string;
    attacksTotal: string;

    // Toast Notifications
    toastAttackSuccess: string;
    toastWinnerWon: (winner: string, amount: string) => string;
    toastCountdown: (seconds: number) => string;
    toastNewKingYou: string;
    toastNewKing: (addr: string) => string;
    toastLuckySuper: string;
    toastLucky: string;
    toastLuckyGood: string;
    toastLuckyTryAgain: string;

    // Explorer Search Helper
    explorerSearchTitle: string;
    explorerSearchTip: string;
    searchOnExplorer: string;
    copy: string;
    copied: string;

    // Kill Zone Warning
    killZoneWarning: string;
    killZoneDesc: string;
    killZoneGiftsCanEnd: (count: number, seconds: number) => string;
    killZoneFinalBlow: string;
    killZoneTimeLeft: (minutes: number, seconds: number) => string;

    // Winner Modal
    winnerTitle: string;
    winnerSoftWin: string;
    winnerHardWin: string;
    winnerTimeout: string;
    winnerTimeoutDesc: string;
    winnerRollover: string;
    winnerAddress: string;
    winnerPrize: string;
    winnerContinue: string;
    winnerClickToClose: string;

    // Jackpot prize distribution
    jackpotWinnerShare: string;
    jackpotTop10Share: string;

    // Prize distribution detail keys
    jackpotPoolTotal: string;
    winnerSharePct: string;
    seedToNextRound: string;
    minGiftsWarning: string;
    giftAllocationTitle: string;
    inheritedPoolLabel: string;
    giftContribLabel: string;
    totalJackpotLabel: string;
    perGiftBreakdown: string;
    distribPoolLabel: string;
    top10PoolInfo: (amount: string) => string;

    // RoundHistory — Round status / rollover labels
    noParticipants: string;
    rolledOverLabel: string;
    noWinnerRollover: string;
    claimExpiredTitle: string;
    jackpotRolledToNextRound: (amount: string) => string;
    prizesRolledOver: string;
    amountLabel: string;
    statusLabel: string;
    noAttacksInRound: string;
    unclaimedTimeout: string;
    jackpotPreservedNextRound: string;
    amountAddedToNextRound: string;

    // Toasts — timeout/rollover
    toastClaimExpired: string;
    toastClaimTimeoutExpired: string;
    notifPrizeRolledOver: string;
    notifPrizeRolledOverBody: (amount: string) => string;
    notQualified: string;
    // Top 10 Reward Calculation Detail
    top10CalcTitle: string;
    top10CalcPool: (amount: string) => string;
    top10CalcMinAttacks: (min: number) => string;
    top10CalcQualified: (count: number, total: number) => string;
    top10CalcTotalQualified: (attacks: string) => string;
    top10CalcFormula: string;
    top10CalcYourShare: (attacks: string, total: string, share: string) => string;
    top10CalcNotQualifiedNote: (attacks: number, min: number) => string;
    softWinPrediction: string;
    hardWinPrediction: string;
    softWinFooter: string;
    hardWinFooter: string;
    simTitle: string;
    simNumGifts: string;
    simTotalCost: string;
    simAddedToPool: string;
    simAttackShare: string;
    simHardTimerImpact: string;
    simReduction: string;
    simRemaining: string;
    simSoftWin: string;
    simHardWin: string;
    simWinner: string;
    simDisclaimer: string;
    simSoftPoolLabel: string;
    simHardPoolLabel: string;
    simSplitByAttacks: string;
    simSeedLabel: string;
    bsRoundInfo: string;
    bsSwipeUp: string;
    bsSwipeDown: string;
    // Settings Panel
    settingsTitle: string;
    settingsSoundSection: string;
    settingsSoundToggle: string;
    settingsSoundDesc: string;
    settingsMusicToggle?: string;
    settingsMusicDesc?: string;
    settingsVisualSection: string;
    settingsParticleToggle: string;
    settingsParticleDesc: string;
    settingsReduceMotion: string;
    settingsReduceMotionDesc: string;
    settingsNotifSection: string;
    settingsNotifToggle: string;
    settingsNotifDesc: string;
    settingsNotifTimerAlert: string;
    settingsNotifJackpotAlert: string;
    settingsNotifBlocked: string;
    settingsNotifEnable: string;
    settingsProfileSection: string;
    settingsAttacks: string;
    settingsWins: string;
    settingsBestLucky: string;
    settingsBadges: string;
    settingsAchievementsUnlocked: string;
    settingsAutoSave: string;

    // Winner Modal — translated labels (no English prefix)
    winnerSoftWinLabel: string;
    winnerHardWinLabel: string;
    winnerTimeoutLabel: string;
    winnerTxHash: string;
    winnerViewTx: string;

    // Vault Deposit History
    vhVaultTab: string;
    vhVaultDeposit: string;
    vhReasonDividend: string;
    vhReasonJackpot: string;
    vhReasonTopAttacker: string;
    vhNoVaultDeposits: string;
    vhVaultDepositsHint: string;

    // VaultHistory Detail Panel & UX
    vhTimeLabel: string;
    vhRoundLabel: string;
    vhAmountLabel: string;
    vhGiftCountLabel: string;
    vhTypeLabel: string;
    vhTxHashLabel: string;
    vhViewExplorer: string;
    vhYouLabel: string;
    vhGifts: string;
    vhVaultReceived: string;
    vhOtherTransactions: string;
    vhAccumulatedDividends: string;
    vhTotalDividendRound: string;

    // VaultHistory Pro
    vhTotalReceived: string;
    vhNetPnL: string;
    vhRoi: string;
    vhProfit: string;
    vhLoss: string;
    vhDateToday: string;
    vhDate7d: string;
    vhDate30d: string;
    vhDateAll: string;
    vhSortNewest: string;
    vhSortOldest: string;
    vhExportCSV: string;

    // Settle / Round End
    settleWinnerLabel: string;
    settleWinType: (type: string) => string;
    settleWarningNonWinner: string;
    settleButtonLabel: string;
    settleClaimTimeout: string;
    settleTimeoutDanger: string;
    settleThankYouHelper: string;
    settleTimeoutExpiredWinner: string;
    settleExpiredButton: string;

    // Gas Warning
    claimGasWarningTitle: string;
    claimGasWarningBody: string;

    // Onboarding Tour
    tourWelcomeTitle: string;
    tourWelcomeDesc: string;
    tourWalletTitle: string;
    tourWalletDesc: string;
    tourLangTitle: string;
    tourLangDesc: string;
    tourJackpotTitle: string;
    tourJackpotDesc: string;
    tourTimersTitle: string;
    tourTimersDesc: string;
    tourAttackTitle: string;
    tourAttackDesc: string;
    tourClaimTitle: string;
    tourClaimDesc: string;
    tourDashboardTitle: string;
    tourDashboardDesc: string;
    tourRoundsTitle: string;
    tourRoundsDesc: string;
    tourRulesTitle: string;
    tourRulesDesc: string;
    tourDontShow: string;
    tourBack: string;
    tourNext: string;
    tourComplete: string;
    tourHelp: string;

    // Timer Prize Detail Panel
    timerDetailTitle: string;
    timerDetailSoftTitle: string;
    timerDetailHardTitle: string;
    timerDetailCurrentLeader: string;
    timerDetailWinnerPrize: string;
    timerDetailTop10Prize: string;
    timerDetailSeedNext: string;
    timerDetailDistribution: string;
    timerDetailNoAttacks: string;
    timerDetailDisclaimer: string;
    timerDetailClose: string;
    timerDetailQualified: string;
    timerDetailNotQualified: string;
    timerDetailTotalPool: string;

    // Next Round Config Panel
    nrTitle: string;
    nrSubtitle: string;
    nrNoChanges: string;
    nrParam: string;
    nrCurrent: string;
    nrNext: string;
    nrFooter: string;
    nrAttackCost: string;
    nrSoftDuration: string;
    nrHardDuration: string;
    nrTimeStep: string;
    nrMaxAttacks: string;
    nrMinAttacks: string;
    nrWinnerPct: string;
    nrTopPct: string;
    nrClaimExp: string;
    nrBtnLabel: string;

    // Battle Narrative (RPG log merged into attack history)
    battleSuperCombo: (name: string, count: number) => string;
    battleCombo: (name: string, count: number) => string;
    battleTriple: (name: string, count: number) => string;
    battleDouble: (name: string) => string;
    battleSingle: (name: string, variant: number) => string;
    battleYou: string;
}
