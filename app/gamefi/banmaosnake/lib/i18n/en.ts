import { SnakeStrings } from './types';

export const en: SnakeStrings = {
    // Menu
    title: 'banmao+Snake',
    subtitle: '🎮 Token Hunter Snake • X Layer GameFi',
    startBtn: 'START',
    spaceHint: '(Space)',

    // Legend
    legendCoin: '+10 pts',
    legendXLayer: '+50 X Layer',
    legendObstacle: 'Avoid!',

    // HUD
    score: 'SCORE',
    best: 'BEST',
    gas: 'GAS',
    time: 'TIME',
    pause: 'Pause',
    resume: 'Resume',

    // Pause screen
    pauseTitle: 'PAUSED',
    continueBtn: 'Continue',
    menuBtn: 'Menu',

    // Game over
    gameOverTitle: 'GAME OVER',
    scoreLabel: 'SCORE',
    claimBtn: 'CLAIM',
    playAgainBtn: 'Play Again',
    needMorePoints: 'Need {0} more pts (min {1})',

    // Claim states
    processing: 'Processing...',
    claimSuccess: '🎉 Reward claimed successfully!',
    cancelledTx: 'Transaction cancelled',

    // Errors
    errGas: '⛽ Insufficient OKB for gas',
    errMinClaim: '📊 Below minimum ({0})',
    errDailyLimit: '📅 Daily limit reached',
    errSystemLimit: '⏰ System overloaded',
    errSignature: '🔐 Invalid signature',
    errFailed: '❌ Transaction failed',

    // Stats panel
    statsTitle: 'STATS',
    balance: 'Balance',
    poolBalance: 'Pool',
    minClaim: 'Min claim',
    systemLimit: 'System limit/hr',
    systemLimitDesc: 'Pool protection',
    playerLimit: 'Your limit/day',
    playerLimitDesc: 'Anti-farm',
    maxPerGame: 'Max/game',
    minDonation: 'Min donate',

    // Wallet
    connectWallet: 'Connect Wallet',
    connectToPlay: 'Connect to play',

    // Pool low warning
    poolLowTitle: '⚠️ Pool Running Low!',
    poolLowMsg: 'The reward pool has reached its limit. We need supporters to keep the game running.',
    donateBtn: 'Donate $BANMAO',

    // Stats tooltips
    balanceTooltip: 'Your $BANMAO token balance in your wallet',
    poolTooltip: 'Total tokens in the reward pool. When you claim, tokens are transferred from this pool.',
    minClaimTooltip: 'Minimum score required to claim rewards. Below this threshold, you cannot withdraw.',
    maxPerGameTooltip: 'Maximum tokens you can receive per game. Exceeding this will be capped.',
    minDonationTooltip: 'Minimum donation to appear on the donor leaderboard.',
    claimFrequency: 'Claim freq',
    claimFrequencyTooltip: 'Maximum claims per player per hour.',
    claimCooldown: 'Cooldown',
    claimCooldownTooltip: 'Wait time (seconds) between two consecutive claims.',
    systemLimitTooltip: 'Maximum tokens ALL players can claim per hour. Protects the pool from being drained.',
    playerLimitTooltip: 'Maximum tokens YOU can claim per day. Prevents farming and ensures fair distribution.',

    // Community section
    communityTitle: '🌍 Community Support',
    communitySubtitle: 'Help $BANMAO spread worldwide',
    communityDonateMsg: 'Send $BANMAO to pool to maintain player rewards. No one can withdraw except by playing and earning points.',
    communitySecurityTitle: 'Security & Transparency',
    communityFeature1: 'EIP-712 + Nonce: Anti-forge & replay attack protection',
    communityFeature2: 'Hourly/Daily Cap: Pool protection from bots & hacks',
    communityFeature3: 'Open Source: 100% transparent verified code',
    // Security Technologies
    secTechTitle: '🛡️ Active Security Technologies',
    secTech1: '🔐 EIP-712 Signature: Cryptographic proof for every claim',
    secTech2: '🔑 HMAC Timestamp: Server-authenticated game timing',
    secTech3: '🧮 Score Checksum: SHA-256 score integrity verification',
    secTech4: '⏱️ Session System: One-time use game sessions',
    secTech5: '🛡️ Anti-Bot: Move timing variance analysis (CoV)',
    secTech6: '🔒 Atomic Claims: Race condition protection',
    secTech7: '📊 Rate Limiting: Sliding window per IP + per wallet',
    secTech8: '🧬 Device Fingerprint: Sec-CH-UA multi-wallet detection',
    communityOpenSource: 'Contract verified on XLayer Explorer',
    communityDeveloper: 'Developed by ＤＯＲＥＭＯＮ',
    communityFeedback: 'Feedback & Bug Reports via X',
    communityWhaleIncentive: '💎 $BANMAO Holders: Help grow our GameFi ecosystem! Every contribution directly rewards players.',
    communityBenefit1: 'Pool grows = More players attracted',
    communityBenefit2: 'Stronger community = Token value growth',
    communityBenefit3: '100% transparent - only game claims',
    communityContractLabel: 'Pool Contract Address',
    communityCopyAddress: 'Copy Full Address',
    communityPoolInstructions: 'Send $BANMAO directly to Pool:',
    communityClickToView: '🔗 Click to view on Explorer',
    communityAddressCopied: '✅ Pool address copied! Send $BANMAO here',
    communityCopyPool: 'Copy Pool Address',

    // Leaderboard
    leaderboardTitle: 'Leaderboard',
    leaderboardEmpty: 'No players yet',
    rank: 'Rank',
    yourRank: 'Your Rank',

    // Profile
    profileTitle: '👤 Edit Profile',
    profileName: 'Display Name',
    profileAvatar: 'Select Avatar',
    profileTelegram: 'Telegram',
    profileTwitter: 'X (Twitter)',
    profileSave: 'Save',
    profileEdit: 'Edit Profile',

    // Profile edit limits
    editLimitReached: 'Edit limit reached',
    profileSaved: 'Profile saved!',
    editsRemaining: 'edits remaining',
    profileLocked: '🔒 Profile Locked',
    profileLockWarning: '⚠️ You can only edit your profile 3 times. After that, your profile will be permanently locked.',
    profileEditsUsed: 'edits used',
    myProfileTitle: '👤 My Profile',
    viewProfile: 'View',
    editProfileBtn: 'Edit',
    rankLabel: 'Rank',
    needClaimFirst: 'Play and claim first to create profile',
    tooManyRequests: 'Too many requests. Please wait a moment.',

    // Settings
    settingsTitle: 'Settings',
    settingsSubtitle: 'Customize your experience',
    language: 'Language',
    uiScale: 'UI Scale',
    scaleLarge: 'Large',
    scaleMedium: 'Medium',
    scaleSmall: 'Small',
    scaleXSmall: 'X-Small',
    sound: 'Sound',
    helpBtn: 'Game Guide',

    // Game stats labels
    statsTime: 'Time',
    statsCoins: 'Coins',
    statsMaxLength: 'Max Length',

    // Donor leaderboard
    donorLeaderboard: 'Donors',
    donateNow: 'Donate $banmao',
    donorBadge: 'Donor Badge',
    totalDonated: 'Total Donated',
    donationCount: 'Donations',
    verifyDonation: 'Verify Your Donation',

    // Donor profile
    donorProfileTitle: 'Donor Profile',
    donorName: 'Name',
    donorNotYet: 'You are not a donor yet. Donate to earn a badge!',
    donorEditProfile: 'Edit Profile',
    donorNoName: 'No name set',
    donorDonor: 'Donor',
    donorTimes: 'times',
    donorScrollMore: 'Scroll to see more',
    donorNoDonors: 'No donors yet',
    donorBeFirst: 'Be the first one!',
    donorVerifying: 'Verifying...',
    donorVerifyBtn: 'Verify & Get Badge',
    donorNetworkError: 'Network error',
    verifyYourDonation: 'Verify your Donation',
    donateButton: 'Donate $banmao',

    // Donate UI (in-game)
    donateToPool: 'Donate $BANMAO to Game Pool',
    donateBalanceLabel: 'Balance',
    donateAmountPlaceholder: 'Amount',
    donateApproving: '⏳ Approving...',
    donateSigning: '📝 Sign...',
    donatePending: '⏳ Donating...',
    donateDone: '✅ Done!',
    donateThankYou: '✅ Thank you for your donation! 🎉',
    donateConnectWallet: '🔗 Connect wallet to donate directly',
    donateHideDonors: 'Hide Donor Leaderboard',
    donateTopDonors: 'Top Donors',
    donatePoolLabel: 'Pool',
    donateDonatedLabel: 'Donated',
    donateDonorsLabel: 'Donors',
    donateOrSendDirectly: 'Or send $BANMAO directly:',

    // Donor edit modal
    donorSaveBtn: '💾 Save',
    donorSaving: '⏳ Saving...',
    donorCancelBtn: 'Cancel',
    donorNoAtPlaceholder: 'username (no @)',
    gamefiViewExplorer: 'View on Explorer',

    // Badge tier names
    badgeDiamond: 'Diamond',
    badgeGold: 'Gold',
    badgeSilver: 'Silver',
    badgeBronze: 'Bronze',
    badgeSupporter: 'Supporter',

    // Help modal
    helpFoodTypes: 'Food Types',
    helpCoinTitle: 'Coin (Token)',
    helpCoinDesc: '+10 points | +15 gas',
    helpPowerTitle: 'Power-up (Lightning)',
    helpPowerDesc: '+50 points | +40 gas | Super Mode',
    helpObstacles: 'Obstacles',
    helpObstaclesDesc: 'Red squares spawn every 15 seconds. Touch = Game Over (unless Super Mode active).',
    helpGas: 'Gas System',
    helpGasDesc: 'Gas decreases as you move. Gas = 0 → Game Over.',
    helpGasRefill: 'Collect food to refill:',
    helpCombo: 'Combo Bonus',
    helpComboDesc: 'Eat food quickly for combo multiplier!',
    helpComboBonus: '+10% bonus per combo level',
    helpComboReset: '(resets after 2s).',
    helpSuperMode: 'Super Mode (5 seconds)',
    helpSuperActivate: 'Activated by eating ⚡ Power-up:',
    helpSuperWall: 'Walk through walls (wrap around)',
    helpSuperObstacle: 'Ignore obstacles (no death)',
    helpSuperGlow: 'Cyan glow border on snake',
    helpControls: 'Use Arrow Keys / WASD / Touch D-pad to move',

    // Milestone notifications
    newHighScore: 'NEW HIGH SCORE!',
    scoreMilestone: 'SCORE MILESTONE!',
    comboBonus: 'COMBO BONUS!',
    levelUp: 'LEVEL UP!',
    points: 'pts',

    // Player profile modal
    playerBestScore: 'Best Score',
    playerTotal: 'Total',
    playerClaims: 'Claims',
    playerLastActive: 'Last Active',
    // Claim History Panel
    claimHistoryTitle: '📋 Claim History',
    claimHistoryEmpty: 'No claim history yet',
    claimHistorySearchGuide: '🔍 To find claim history, search on Explorer',
    claimHistorySearchTip: '💡 Tip: Type "claimReward" to find all claim transactions',
    claimHistoryCopy: 'Copy',
    claimHistoryCopied: 'Copied!',
    claimHistorySearchExplorer: '🌐 Search on Explorer',
};
