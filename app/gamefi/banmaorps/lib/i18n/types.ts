"use client";

// Define the shape of our language object (based on English)
// All other languages must match this structure
export interface LocaleStrings {
    // General
    title: string;
    backToHome: string;
    connect: string;
    connectUnsupported: string;
    create: string;
    join: string;
    approve: string;
    approved: string;
    commit: string;
    reveal: string;
    claim: string;
    forfeit: string;
    stake: string;
    infoTitle: string;
    refreshData: string;
    stakeConnectPrompt: string;
    balance: string;
    winLossRatio: string;
    totalWinnings: string;
    totalLosses: string;
    totalWinningsLosses: string;
    rps: string;
    stakePH: string;

    // Telegram
    telegramReminderLabel: string;
    telegramReminderDetail: string;
    telegramReminderConnectButton: string;
    telegramReminderLink: string;
    telegramReminderLoading: string;
    telegramReminderConnecting: string;
    telegramReminderSuccess: string;
    telegramReminderWalletRequired: string;
    telegramReminderServerError: string;
    telegramReminderUnknownError: string;
    telegramReminderPopupBlocked: string;

    // Commit duration
    commitDurationLabel: string;
    commitDurationPH: string;
    commitDurationHint: string;
    commitDurationInvalid: string;
    commitDurationRange: string;
    commitDurationDecrease: string;
    commitDurationIncrease: string;

    // Room list
    room: string;
    roomMissing: string;
    list: string;
    totalBurned: string;
    roomActions: string;
    empty: string;

    // Footer
    footer: string;

    // Game
    rpsTitle: string;
    rock: string;
    paper: string;
    scissors: string;
    salt: string;
    newSalt: string;
    creator: string;
    opponent: string;
    stakeCol: string;
    stateCol: string;
    actionCol: string;
    roomIdSet: string;
    commitNeeded: string;
    waitingReveal: string;
    revealNeeded: string;

    // Table Status
    tableWinTimeoutCommit: string;
    tableWinTimeoutReveal: string;
    tableLoseTimeoutCommit: string;
    tableLoseTimeoutReveal: string;
    tableDrawTimeoutCommit: string;
    tableDrawTimeoutReveal: string;
    tableWinForfeit: string;
    tableLoseForfeit: string;
    tableForfeitSurrendered: string;
    tableReasonMissedCommit: string;
    tableReasonMissedReveal: string;
    tableReasonBothMissedCommit: string;
    tableReasonBothMissedReveal: string;

    // Toasts
    toastApproveOk: string;
    toastCreateOk: string;
    toastJoinOk: string;
    toastCommitOk: string;
    toastRevealOk: string;
    toastClaimOk: string;
    toastForfeitOk: string;
    toastForfeitLose: (winner: string) => string;

    // Forfeit
    forfeitConfirmProceed: string;
    forfeitCancel: string;
    forfeitWarnDefaultTitle: string;
    forfeitWarnDefaultBody: (stake: string) => string;
    forfeitWarnBothUncommittedTitle: string;
    forfeitWarnBothUncommittedBody: (stake: string) => string;
    forfeitWarnSelfCommittedTitle: string;
    forfeitWarnSelfCommittedBody: (stake: string) => string;
    forfeitWarnSelfUncommittedTitle: string;
    forfeitWarnSelfUncommittedBody: (stake: string) => string;
    forfeitWarnBothUnrevealedTitle: string;
    forfeitWarnBothUnrevealedBody: (stake: string) => string;
    forfeitWarnSelfRevealedTitle: string;
    forfeitWarnSelfRevealedBody: (stake: string) => string;
    forfeitWarnSelfUnrevealedTitle: string;
    forfeitWarnSelfUnrevealedBody: (stake: string) => string;
    forfeitWinTitle: string;
    forfeitWinBody: (loser: string, roomId: number | string) => string;
    forfeitWinResultRoom: string;
    forfeitWinResultPayout: (payout: string) => string;
    forfeitWinReminder: string;

    // New / Fixes
    errSalt: string;
    win: string;
    lose: string;
    draw: string;
    vs: string;
    rules: string;
    rulesWarning: string;
    rulesList: string[];
    yourTurn: string;
    timeout: string;
    committing: string;
    revealing: string;
    finished: string;
    canceled: string;
    timeoutTitle: string;
    timeoutBothFail: string;
    joinable: string;
    expired: string;
    live: string;

    // Errors
    errRevealMismatch: string;
    errRoomStatusLoad: string;
    errRoomStatusCommitting: string;
    errRoomStatusNotRevealing: string;

    // UI Fixes
    hiddenChoice: string;
    saltUsed: string;
    revealReminder: (id: string, revealLabel: string) => string;

    // Leaderboard
    leaderboardTitle: string;
    leaderboardReset: string;
    winCol: string;
    lossCol: string;
    drawCol: string;
    netPayoutCol: string;
    addressCol: string;
    copyAddress: string;

    // Notifications
    joinedNotificationTitle: (roomId: number) => string;
    joinedNotificationBody: (address: string) => string;
    copyWallet: string;
    focusRoom: string;
    dismiss: string;

    // Share
    shareScreenshot: string;
    sharePreparing: string;
    shareStakeLabel: (stake: string) => string;
    shareSuccess: string;
    shareUnavailable: string;

    // Settings
    settingsTitle: string;
    notificationToggle: string;
    vibrationLabel: string;
    notificationSnoozeLabel: string;
    notificationSnoozeValue: (minutes: number) => string;
    languageLabel: string;
    displaySizeLabel: string;
    displaySizeOptions: {
        xsmall: string;
        small: string;
        normal: string;
        large: string;
        desktop: string;
    };
    displaySizeButton: (label: string) => string;
    themeLabel: string;
    themeOptions: {
        gold: string;
        white: string;
        crimson: string;
        emerald: string;
        pink: string;
        orange: string;
        purple: string;
    };
    socialTitle: string;
    telegram: string;
    x: string;
    resetSiteData: string;
    resetSiteDataConfirm: string;
    resetSiteDataSuccess: string;

    // History Lookup
    historyLookupTitle: string;
    historyLookupPlaceholder: string;
    historyLookupButton: string;
    historyLookupLoading: string;
    historyLookupEmpty: string;
    historyLookupCreatorLabel: string;
    historyLookupOpponentLabel: string;
    historyLookupStakeLabel: string;
    historyLookupStateLabel: string;
    historyLookupResultLabel: string;
    historyLookupCopy: string;
    historyLookupNoOpponent: string;
    historyLookupPending: (state: string) => string;
    historyLookupInvalid: string;
    historyLookupNotFound: string;
    historyLookupError: string;
    historyLookupResultSummary: (winner: string, via: string) => string;
    historyLookupResultDraw: (via: string) => string;
    historyLookupResultForfeit: (via: string) => string;
    historyLookupViaReveal: string;
    historyLookupViaCommitTimeout: string;
    historyLookupViaRevealTimeout: string;
    historyLookupViaBothCommit: string;
    historyLookupViaBothReveal: string;
    historyLookupViaForfeit: string;
    historyLookupViaUnknown: string;
    historyLookupOpponentPending: string;
    historyLookupNoteRefund: (refund: string) => string;
    historyLookupNoteForfeit: (winnerShare: string, communityShare: string, burnShare: string) => string;
    historyLookupCanceledSummary: (reason: string) => string;
    historyLookupCopied: string;

    // Alerts
    notifyCommit: (roomId: number) => string;
    notifyReveal: (roomId: number) => string;
    notifyClaim: (roomId: number) => string;
    commitUrgentTitle: (roomId: number) => string;
    commitUrgentBody: (timeLeft: string, seconds: number) => string;
    joinDeadlineWarning: (timeLeft: string, seconds: number, stake: string) => string;
    joinConfirmTitle: string;
    joinConfirmDescription: string;
    joinConfirmTimeLabel: string;
    joinConfirmTimeHint: (seconds: number) => string;
    joinConfirmStakeLabel: string;
    joinConfirmProceed: string;
    joinConfirmCancel: string;
    joinStakeUnknown: string;
    joinRoomInactive: (status: string) => string;
    joinRoomOpponentPresent: string;
    joinRoomLoadFailed: string;
    resultNotificationTitle: (roomId: number) => string;
    resultNotificationBody: (choice: string, outcome: string) => string;
    takeAction: string;
    rememberLater: string;

    // Personal Board
    personalBoardTitle: string;
    personalBoardSubtitle: string;
    personalBoardEmpty: string;
    personalBoardCollapse: string;
    personalBoardExpand: string;
    personalBoardShowAll: string;
    personalBoardNoAction: string;
    personalOpponentUnknown: string;
    personalActionShare: string;
    personalStatusWaitingJoin: string;
    personalStatusNeedCommit: (timeLeft: string) => string;
    personalStatusWaitingOpponentCommit: (timeLeft: string) => string;
    personalStatusNeedReveal: (timeLeft: string) => string;
    personalStatusWaitingOpponentReveal: (timeLeft: string) => string;
    personalStatusClaim: (phase: string) => string;
    personalStatusFinished: (choice: string, outcome: string) => string;
    personalStatusRevealSuccessWin: string;
    personalStatusRevealSuccessLose: string;
    personalStatusRevealSuccessDraw: string;
    personalStatusWinTimeoutCommit: string;
    personalStatusWinTimeoutReveal: string;
    personalStatusLoseTimeoutCommit: string;
    personalStatusLoseTimeoutReveal: string;
    personalStatusLoseTimeout: string;
    personalStatusDrawTimeoutCommit: string;
    personalStatusDrawTimeoutReveal: string;
    personalStatusForfeitWin: string;
    personalStatusForfeitLose: string;
    personalStatusForfeitSpectate: string;
    personalStatusCanceled: string;
    personalUnknownChoice: string;
    personalCopyOpponent: string;
    personalCopySalt: string;
    personalCopySaltSuccess: string;
    personalCopySaltError: string;
    personalAutoPlay: string;
    personalAutoPlayRunning: string;
    personalAutoPlayStop: string;
    personalAutoPlayNoAction: string;
    personalAutoPlayMissingCommit: string;
    personalAutoPlayPending: string;
    personalAutoPlayStopped: string;
    canceledReasonCommit: string;
    canceledReasonReveal: string;
    canceledReasonUnknown: string;
    canceledReasonNoJoin: string;
    canceledRefundBothFull: string;
    canceledRefundBothPartial: string;
    canceledRefundCreatorOnly: string;
    canceledRefundUnknown: string;
    personalChoiceLabel: string;
    personalChoiceSaved: (choice: string) => string;

    // Community
    communityLinksTitle: string;
    communityLinkTelegramLabel: string;
    communityLinkTelegramDesc: string;
    communityLinkXLabel: string;
    communityLinkXDesc: string;
    communityLinkDocsLabel: string;
    communityLinkDocsDesc: string;
    communityLinkDocsUrl: string;

    // PWA
    pwaInstallTitle: string;
    pwaInstallDesc: string;
    pwaInstallButton: string;
    pwaInstallDismiss: string;
}
