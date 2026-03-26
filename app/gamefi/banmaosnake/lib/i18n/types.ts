// Snake game localization strings type
export interface SnakeStrings {
    // Menu
    title: string;
    subtitle: string;
    startBtn: string;
    spaceHint: string;

    // Legend
    legendCoin: string;
    legendXLayer: string;
    legendObstacle: string;

    // HUD
    score: string;
    best: string;
    gas: string;
    time?: string;
    pause: string;
    resume: string;

    // Pause screen
    pauseTitle: string;
    continueBtn: string;
    menuBtn: string;

    // Game over
    gameOverTitle: string;
    scoreLabel: string;
    claimBtn: string;
    playAgainBtn: string;
    needMorePoints: string;

    // Claim states
    processing: string;
    claimSuccess: string;
    cancelledTx: string;

    // Errors
    errGas: string;
    errMinClaim: string;
    errDailyLimit: string;
    errSystemLimit: string;
    errSignature: string;
    errFailed: string;

    // Stats panel
    statsTitle: string;
    balance: string;
    poolBalance: string;
    minClaim: string;
    systemLimit: string;
    systemLimitDesc: string;
    playerLimit: string;
    playerLimitDesc: string;
    maxPerGame: string;
    minDonation: string;

    // Stats tooltips
    balanceTooltip: string;
    poolTooltip: string;
    minClaimTooltip: string;
    maxPerGameTooltip: string;
    minDonationTooltip: string;
    claimFrequency: string;
    claimFrequencyTooltip: string;
    claimCooldown: string;
    claimCooldownTooltip: string;
    systemLimitTooltip: string;
    playerLimitTooltip: string;

    // Community section
    communityTitle: string;
    communitySubtitle: string;
    communityDonateMsg: string;
    communitySecurityTitle: string;
    communityFeature1: string;
    communityFeature2: string;
    communityFeature3: string;
    // Security Technologies (detailed)
    secTechTitle?: string;
    secTech1?: string;
    secTech2?: string;
    secTech3?: string;
    secTech4?: string;
    secTech5?: string;
    secTech6?: string;
    secTech7?: string;
    secTech8?: string;
    communityOpenSource: string;
    communityDeveloper: string;
    communityFeedback: string;
    // Whale incentive section (optional with fallbacks)
    communityWhaleIncentive?: string;
    communityBenefit1?: string;
    communityBenefit2?: string;
    communityBenefit3?: string;
    communityContractLabel?: string;
    communityCopyAddress?: string;
    communityPoolInstructions?: string;
    communityClickToView?: string;
    communityAddressCopied?: string;
    communityCopyPool?: string;

    // Wallet
    connectWallet: string;
    connectToPlay: string;

    // Pool low warning
    poolLowTitle: string;
    poolLowMsg: string;
    donateBtn: string;

    // Leaderboard
    leaderboardTitle: string;
    leaderboardEmpty: string;
    rank: string;
    yourRank: string;

    // Profile
    profileTitle: string;
    profileName: string;
    profileAvatar: string;
    profileTelegram: string;
    profileTwitter: string;
    profileSave: string;
    profileEdit: string;

    // Profile edit limits
    editLimitReached?: string;
    profileSaved?: string;
    editsRemaining?: string;
    profileLocked?: string;
    profileLockWarning?: string;
    profileEditsUsed?: string;
    myProfileTitle?: string;
    viewProfile?: string;
    editProfileBtn?: string;
    rankLabel?: string;
    needClaimFirst?: string;
    tooManyRequests?: string;

    // Settings panel
    settingsTitle?: string;
    settingsSubtitle?: string;
    language?: string;
    uiScale?: string;
    scaleLarge?: string;
    scaleMedium?: string;
    scaleSmall?: string;
    scaleXSmall?: string;
    sound?: string;
    helpBtn?: string; // Game Guide button

    // Game stats labels
    statsTime?: string;
    statsCoins?: string;
    statsMaxLength?: string;

    // Donor leaderboard
    donorLeaderboard?: string;
    donateNow?: string;
    donorBadge?: string;
    totalDonated?: string;
    donationCount?: string;
    verifyDonation?: string;

    // Donor profile
    donorProfileTitle?: string;
    donorName?: string;
    donorNotYet?: string;
    donorEditProfile?: string;
    donorNoName?: string;
    donorDonor?: string;
    donorTimes?: string;
    donorScrollMore?: string;
    donorNoDonors?: string;
    donorBeFirst?: string;
    donorVerifying?: string;
    donorVerifyBtn?: string;
    donorNetworkError?: string;
    verifyYourDonation?: string;
    donateButton?: string;

    // Donate UI (in-game)
    donateToPool?: string;
    donateBalanceLabel?: string;
    donateAmountPlaceholder?: string;
    donateApproving?: string;
    donateSigning?: string;
    donatePending?: string;
    donateDone?: string;
    donateThankYou?: string;
    donateConnectWallet?: string;
    donateHideDonors?: string;
    donateTopDonors?: string;
    donatePoolLabel?: string;
    donateDonatedLabel?: string;
    donateDonorsLabel?: string;
    donateOrSendDirectly?: string;

    // Donor edit modal
    donorSaveBtn?: string;
    donorSaving?: string;
    donorCancelBtn?: string;
    donorNoAtPlaceholder?: string;
    gamefiViewExplorer?: string;

    // Badge tier names
    badgeDiamond?: string;
    badgeGold?: string;
    badgeSilver?: string;
    badgeBronze?: string;
    badgeSupporter?: string;

    // Help modal translations
    helpFoodTypes?: string;
    helpCoinTitle?: string;
    helpCoinDesc?: string;
    helpPowerTitle?: string;
    helpPowerDesc?: string;
    helpObstacles?: string;
    helpObstaclesDesc?: string;
    helpGas?: string;
    helpGasDesc?: string;
    helpGasRefill?: string;
    helpCombo?: string;
    helpComboDesc?: string;
    helpComboBonus?: string;
    helpComboReset?: string;
    helpSuperMode?: string;
    helpSuperActivate?: string;
    helpSuperWall?: string;
    helpSuperObstacle?: string;
    helpSuperGlow?: string;
    helpControls?: string;

    // Milestone notifications
    newHighScore?: string;
    scoreMilestone?: string;
    comboBonus?: string;
    levelUp?: string;
    points?: string;

    // Player profile modal
    playerBestScore?: string;
    playerTotal?: string;
    playerClaims?: string;
    playerLastActive?: string;

    // Claim History Panel
    claimHistoryTitle?: string;
    claimHistoryEmpty?: string;
    claimHistorySearchGuide?: string;
    claimHistorySearchTip?: string;
    claimHistoryCopy?: string;
    claimHistoryCopied?: string;
    claimHistorySearchExplorer?: string;
}
