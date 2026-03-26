// House Dashboard Localization
// Supported languages: en, vi, zh, ko, ru, id

export type HouseLanguage = 'en' | 'vi' | 'zh' | 'ko' | 'ru' | 'id';

export interface HouseTranslations {
    // Dashboard Header
    title: string;
    subtitle: string;
    createPool: string;
    yourPools: string;
    noPools: string;
    createFirst: string;
    requirements: string;
    minDeposit: string;
    maxPools: string;
    yourBalance: string;
    activePools: string;

    backToGame: string;
    connectWalletDesc: string;

    // Create Pool Modal
    poolName: string;
    initialDeposit: string;
    minBet: string;
    maxBet: string;
    jackpotPercent: string;
    approve: string;
    create: string;
    cancel: string;
    minDepositInfo: string;
    jackpotInfo: string;
    platformFee: string;
    maxBetLimitInfo: string;
    charLimit: string;
    processing: string;
    approveAndCreate: string;
    poolNamePlaceholder: string;
    minimum: string;
    loadingPool: string;
    minBetHint: string;
    maxBetHint: string;
    maxBetLimitError: string;

    // Pool Management Card
    statusActive: string;
    statusPaused: string;
    poolId: string;
    created: string;
    official: string;

    // Tabs
    tabOverview: string;
    tabFunds: string;
    tabSettings: string;
    tabDanger: string;

    // Stats Tooltips
    tooltipBalance: string;
    tooltipJackpot: string;
    tooltipPending: string;
    tooltipWithdrawable: string;
    tooltipSpins: string;
    tooltipVolume: string;
    tooltipProfit: string;
    tooltipRTP: string;

    // Stat Labels
    statBalance: string;
    statJackpotPool: string;
    statPendingBets: string;
    statWithdrawable: string;
    statTotalSpins: string;
    statVolume: string;
    statProfit: string;
    statRTP: string;

    // Funds Tab
    deposit: string;
    withdraw: string;
    available: string;
    amount: string;

    // Settings Tab
    current: string;
    updateSettings: string;

    // Danger Tab
    pausePool: string;
    activatePool: string;
    pauseDesc: string;
    activateDesc: string;
    transferOwnership: string;
    transferAddr: string;
    transferBtn: string;
    closePoolTitle: string;
    closePoolDesc: string;
    closePoolWarn: string;
    confirmClose: string;

    // Settle Stuck Commits
    settleTitle: string;
    settleDesc: string;
    settleBtn: string;

    // Protection Tab
    tabProtection: string;

    // Pool Health
    poolHealth: string;
    healthExcellent: string;
    healthGood: string;
    healthLow: string;
    healthCritical: string;
    effectiveMaxBet: string;
    hourlyPayout: string;
    loadingProtection: string;

    // Dynamic Max Bet
    dynamicMaxBetTitle: string;
    dynamicMaxBetDesc: string;
    enable: string;
    lowBalanceThreshold: string;
    criticalBalanceThreshold: string;
    lowBalanceHint: string;
    criticalBalanceHint: string;

    // Streak Protection
    streakProtectionTitle: string;
    streakProtectionDesc: string;
    hourlyPayoutLimit: string;
    hourlyPayoutHint: string;

    // Emergency Withdraw
    emergencyWithdrawTitle: string;
    emergencyWithdrawDesc: string;
    cooldownDuration: string;
    cooldownHint: string;
    triggerEmergency: string;
    emergencyWarning: string;
    emergencyReady: string;
    cancelEmergency: string;
    executeWithdraw: string;
    saveSettings: string;

    // Protection Notes
    dynamicMaxBetNote: string;
    streakProtectionNote: string;
    emergencyWithdrawNote: string;

    // Funds Tab Notes
    depositNote: string;
    withdrawNote: string;
    half: string;
    third: string;
    quarter: string;
    all: string;

    // Guidebook
    guideBtn: string;
    guideTitle: string;
    guideIntro: string;
    guideOpTitle: string;
    guideOpDesc: string;
    guideRiskTitle: string;
    guideRiskDesc: string;
    guideParamsTitle: string;
    guideParamsDesc: string;
    guideStatsTitle: string;
    guideStatsDesc: string;
    guideEditTitle: string;
    guideEditDesc: string;
    guideTroubleTitle: string;
    guideTroubleDesc: string;

    // New Visual Enhancements
    alertLowBalance: string;
    alertLowBalanceDesc: string;
    smartSettleTitle: string;
    chartTitle: string;
    statPayouts: string;

    // Additional Cleanup Keys
    settleSubtitle: string;
    recoverableLiquidity: string;
    pendingCommits: string;
    noExpiredCommits: string;
    rescan: string;
    fixAndRecover: string;
    processingStatus: string;

    // ============== PROFESSIONAL HANDBOOK ==============
    // Contract Security Section
    handbookContractTitle: string;
    handbookContractAddr: string;
    handbookContractSecurity: string;
    handbookContractOwnerNote: string;
    handbookExplorerLink: string;

    // Profit Analysis Section
    handbookProfitTitle: string;
    handbookProfitIntro: string;
    handbookPlatformFee: string;
    handbookGlobalRTP: string;
    handbookNetProfit: string;
    handbookProfitExample: string;
    handbookProfitBenefits: string;

    // Risk Analysis Section
    handbookRiskTitle: string;
    handbookRiskVariance: string;
    handbookRiskOpportunityCost: string;
    handbookRiskPlatformFee: string;
    handbookRiskTechnical: string;

    // Configuration Recommendations
    handbookConfigTitle: string;
    handbookConfigMaxBet: string;
    handbookConfigJackpot: string;
    handbookConfigStreak: string;
    handbookConfigDynamic: string;

    // Summary
    handbookSummaryTitle: string;
    handbookSummaryProfit: string;
    handbookSummaryRisk: string;
}

export const houseTranslations: Record<HouseLanguage, HouseTranslations> = {
    en: {
        title: 'House Dashboard',
        subtitle: 'Manage your betting pools',
        createPool: 'Create New Pool',
        yourPools: 'Your Pools',
        noPools: "You don't own any pools yet",
        createFirst: 'Create your first pool and start earning!',
        requirements: 'Requirements',
        minDeposit: 'Minimum deposit',
        maxPools: 'Max pools per user',
        yourBalance: 'Your balance',
        activePools: 'Active pools total',
        backToGame: 'Back to Game',
        connectWalletDesc: 'Connect wallet to manage pools',

        poolName: 'Pool Name',
        initialDeposit: 'Initial Deposit',
        minBet: 'Min Bet',
        maxBet: 'Max Bet',
        jackpotPercent: 'Jackpot %',
        approve: 'Approve',
        create: 'Create',
        cancel: 'Cancel',
        minDepositInfo: 'Minimum deposit',
        jackpotInfo: 'Percentage of each bet added to jackpot pool',
        platformFee: 'Platform fee: 2% of each bet (fixed)',
        maxBetLimitInfo: 'Max bet must be ≤ 10% of deposit',
        charLimit: 'characters',
        processing: 'Processing...',
        approveAndCreate: 'Approve & Create',
        poolNamePlaceholder: 'My Casino',
        minimum: 'Minimum',
        loadingPool: 'Loading pool',
        minBetHint: 'Minimum tokens per spin. Auto-suggested = MaxBet/100',
        maxBetHint: 'Max Bet ≤ Deposit ÷ 500. This ensures pool can cover the highest 450x payout. Example: 1M deposit → Max bet 2,000',
        maxBetLimitError: 'Max Bet cannot exceed',

        statusActive: 'ACTIVE',
        statusPaused: 'PAUSED',
        poolId: 'Pool',
        created: 'Created',
        official: 'OFFICIAL',

        tabOverview: 'Overview',
        tabFunds: 'Funds',
        tabSettings: 'Settings',
        tabDanger: 'Danger',

        tooltipBalance: 'Total funds in pool available to cover player winnings',
        tooltipJackpot: 'Accumulated jackpot from % of each bet. Won by 5x symbol match.',
        tooltipPending: 'Bets waiting for reveal. Cannot be withdrawn until revealed.',
        tooltipWithdrawable: 'Pool Balance - Pending Bets - Jackpot Pool = Safe to withdraw',
        tooltipSpins: 'Total number of spins played on this pool',
        tooltipVolume: 'Total amount of bets placed on this pool',
        tooltipProfit: 'Pool income: Total Bets - Total Payouts - Jackpots Won',
        tooltipRTP: 'Return To Player: % of bets returned as winnings (lower = more profit)',

        statBalance: 'Balance',
        statJackpotPool: 'Jackpot Pool',
        statPendingBets: 'Pending Bets',
        statWithdrawable: 'Withdrawable',
        statTotalSpins: 'Total Spins',
        statVolume: 'Volume',
        statProfit: 'Profit',
        statRTP: 'RTP',

        deposit: 'Deposit',
        withdraw: 'Withdraw',
        available: 'Available',
        amount: 'Amount',

        current: 'current',
        updateSettings: 'Update Settings',

        pausePool: 'Pause Pool',
        activatePool: 'Activate Pool',
        pauseDesc: 'Pausing stops new spins but allows reveals and refunds.',
        activateDesc: 'Reactivating allows players to spin again.',
        transferOwnership: 'Transfer Ownership',
        transferAddr: 'New owner address (0x...)',
        transferBtn: 'Transfer',
        closePoolTitle: 'Close Pool Permanently',
        closePoolDesc: 'This action is IRREVERSIBLE. All funds (including jackpot) will be returned to you.',
        closePoolWarn: 'Cannot close if there are pending bets.',
        confirmClose: 'Confirm Close',
        settleTitle: 'Settle Stuck Commits',
        settleDesc: 'Clear expired commits for players who left their game stuck. Funds go back to pool.',
        settleBtn: 'Settle & Release Funds',

        // Protection Tab
        tabProtection: 'Protection',
        poolHealth: 'Pool Health',
        healthExcellent: 'Excellent',
        healthGood: 'Good',
        healthLow: 'Low',
        healthCritical: 'Critical',
        effectiveMaxBet: 'Effective Max Bet',
        hourlyPayout: 'Hourly Payout',
        loadingProtection: 'Loading protection settings...',
        dynamicMaxBetTitle: 'Dynamic Max Bet',
        dynamicMaxBetDesc: 'Automatically reduce max bet when pool balance is low to protect your funds.',
        enable: 'Enable',
        lowBalanceThreshold: 'Low Balance Threshold',
        criticalBalanceThreshold: 'Critical Balance Threshold',
        lowBalanceHint: 'At this level, max bet reduces to 50%',
        criticalBalanceHint: 'At this level, max bet reduces to 20%',
        streakProtectionTitle: 'Streak Protection',
        streakProtectionDesc: 'Auto-pause pool if hourly payouts exceed limit. Prevents rapid fund depletion.',
        hourlyPayoutLimit: 'Hourly Payout Limit',
        hourlyPayoutHint: 'Pool pauses if payouts exceed this % per hour',
        emergencyWithdrawTitle: 'Emergency Withdraw',
        emergencyWithdrawDesc: 'Trigger emergency mode to withdraw funds after a cooldown period.',
        cooldownDuration: 'Cooldown Duration',
        cooldownHint: 'Waiting time before you can withdraw',
        triggerEmergency: 'Trigger Emergency Mode',
        emergencyWarning: 'This will immediately pause your pool and start the cooldown timer.',
        emergencyReady: '✅ Ready to withdraw!',
        cancelEmergency: 'Cancel',
        executeWithdraw: 'Withdraw Now',
        saveSettings: 'Save Protection Settings',

        dynamicMaxBetNote: 'If Pool Balance drops below Low Threshold, Max Bet is reduced to 50%. Below Critical Threshold, it drops to 20%. This automatically limits exposure during drawdowns.',
        streakProtectionNote: 'If total payouts in the last hour exceed the % limit of your pool balance, the pool effectively PAUSES automatically to prevent further losses. You must manually reactivate it.',
        emergencyWithdrawNote: 'Activates Emergency Mode. Pool is PAUSED immediately. You must wait for the Cooldown period to expire before withdrawing. Useful if you lose access to keys or suspect a hack.',

        depositNote: 'Deposit funds into the smart contract pool. These funds back player bets. Only the Pool Owner can withdraw.',
        withdrawNote: 'Withdraw unused liquidity. You cannot withdraw funds currently locked in pending bets or the Jackpot pool.',
        half: '1/2',
        third: '1/3',
        quarter: '1/4',
        all: 'Max',

        guideBtn: 'Operator Guide',
        guideTitle: 'House Operator Manual',
        guideIntro: 'Welcome. As a pool owner, you earn from the house edge. You are the bank.',
        guideOpTitle: 'Operations',
        guideOpDesc: 'Create pools, set deposit limits, and approve tokens. You can pause pools anytime to stop new bets.',
        guideRiskTitle: 'Risk Management',
        guideRiskDesc: "Use 'Dynamic Max Bet' to auto-lower limits when funds are low. Set 'Streak Protection' to pause on high loss.",
        guideTroubleTitle: 'Troubleshooting',
        guideTroubleDesc: "If a player disconnects, their bet might stick. Use 'Quick Settle' to clear it and return funds to pool.",
        guideParamsTitle: 'Parameters',
        guideParamsDesc: 'Min Bet must be >= 1. Max Bet must be <= 10% of total deposit. Jackpot typically 1-5%.',
        guideStatsTitle: 'Key Metrics',
        guideStatsDesc: 'RTP (Return to Player) usually 95-99%. Volume = total bets. Profit = bets - wins.',
        guideEditTitle: 'Editable Settings',
        guideEditDesc: 'You can change Min/Max Bet and Jackpot % anytime. Name cannot be changed.',

        // New Visual Enhancements
        alertLowBalance: 'Low Balance Warning!',
        alertLowBalanceDesc: 'Pool funds are low. Deposit more to ensure payouts continue.',
        smartSettleTitle: 'Pending Bets Found',
        chartTitle: 'Pool Performance',
        statPayouts: 'Payouts',
        // statVolume, statProfit already exist

        settleSubtitle: 'Automated cleanup tool',
        recoverableLiquidity: 'Total Recoverable Liquidity',
        pendingCommits: 'Pending Commits',
        noExpiredCommits: 'No expired commits found.',
        rescan: 'Rescan',
        fixAndRecover: 'Fix & Recover',
        processingStatus: 'Processing...',

        // ============== PROFESSIONAL HANDBOOK ==============
        // Contract Security
        handbookContractTitle: '🔐 Contract Security',
        handbookContractAddr: 'Contract Address: 0x9c64c18d792eab435d1d921efac978f6a62da2d2',
        handbookContractSecurity: '⚠️ IMPORTANT: Only Pool Owners can withdraw funds from their own pools. The Contract Owner has NO access to withdraw any pool funds.',
        handbookContractOwnerNote: 'When you deposit $BANMAO to the contract, only YOU (the pool creator) have the authority to withdraw. This is enforced by the smart contract.',
        handbookExplorerLink: '🔗 Verify on OKX X Layer Explorer',

        // Profit Analysis
        handbookProfitTitle: '📈 Profit Analysis',
        handbookProfitIntro: 'As a Pool Owner, you earn from the house edge. Your expected profit margin is 3% of total volume.',
        handbookPlatformFee: '• Platform Fee: 2% (paid to contract owner)',
        handbookGlobalRTP: '• Global RTP: 95% (returned to players long-term)',
        handbookNetProfit: '• Net Profit = 100% - 95% - 2% = 3%',
        handbookProfitExample: 'Example: If total bets through your Pool = 100M tokens → You earn ~3M tokens',
        handbookProfitBenefits: 'Additional Benefits: Control over minBet/maxBet, jackpotPercent, Protection Settings, and full ownership rights.',

        // Risk Analysis
        handbookRiskTitle: '⚠️ Risk Analysis',
        handbookRiskVariance: '1. Short-term Variance: 95% RTP only holds over millions of spins. A lucky player could drain your pool before reaching expected profit.',
        handbookRiskOpportunityCost: '2. Opportunity Cost: Minimum 1M token deposit required. These funds are locked and cannot be used elsewhere.',
        handbookRiskPlatformFee: '3. Fixed Platform Fee: 2% is charged on volume, not profit. If players win >98%, you lose money AND pay fees.',
        handbookRiskTechnical: '4. Technical Risk: Players may commit but not reveal. Use settleExpiredCommit to recover stuck bets (requires gas).',

        // Configuration Recommendations
        handbookConfigTitle: '⚙️ Recommended Settings',
        handbookConfigMaxBet: 'Max Bet: <1-2% of Pool Balance — Prevents single lucky spin from draining 10-20% of your pool',
        handbookConfigJackpot: 'Jackpot %: 1-3% — Builds jackpot fund from player bets',
        handbookConfigStreak: 'Streak Protection: ENABLE — Auto-pauses pool if losses spike (protects against exploits)',
        handbookConfigDynamic: 'Dynamic Max Bet: ENABLE — Auto-reduces bet limits when pool balance drops',

        // Summary
        handbookSummaryTitle: '📋 Summary',
        handbookSummaryProfit: 'Profit: Stable ~3% of volume with sufficient players. Being a house is like providing liquidity for gaming.',
        handbookSummaryRisk: 'Risk: Lies in Bankroll Management. If Max Bet is too high relative to your pool, you are gambling WITH players, not AS the house.',
    },
    vi: {
        title: 'Bảng Điều Khiển Nhà Cái',
        subtitle: 'Quản lý các pool cược của bạn',
        createPool: 'Tạo Pool Mới',
        yourPools: 'Pool Của Bạn',
        noPools: 'Bạn chưa sở hữu pool nào',
        createFirst: 'Tạo pool đầu tiên và bắt đầu kiếm tiền!',
        requirements: 'Yêu Cầu',
        minDeposit: 'Tiền nạp tối thiểu',
        maxPools: 'Số pool tối đa mỗi người',
        yourBalance: 'Số dư của bạn',
        activePools: 'Tổng pool hoạt động',
        backToGame: 'Quay Lại Game',
        connectWalletDesc: 'Kết nối ví để quản lý pool',

        poolName: 'Tên Pool',
        initialDeposit: 'Tiền Nạp Ban Đầu',
        minBet: 'Cược Tối Thiểu',
        maxBet: 'Cược Tối Đa',
        jackpotPercent: '% Jackpot',
        approve: 'Phê Duyệt',
        create: 'Tạo',
        cancel: 'Hủy',
        minDepositInfo: 'Tiền nạp tối thiểu',
        jackpotInfo: 'Phần trăm mỗi cược được thêm vào jackpot',
        platformFee: 'Phí platform: 2% mỗi cược (cố định)',
        maxBetLimitInfo: 'Cược tối đa phải ≤ 10% tiền nạp',
        charLimit: 'ký tự',
        processing: 'Đang xử lý...',
        approveAndCreate: 'Duyệt & Tạo',
        poolNamePlaceholder: 'Sòng Bài Của Tôi',
        minimum: 'Tối thiểu',
        loadingPool: 'Đang tải pool',
        minBetHint: 'Số token tối thiểu mỗi lượt quay. Gợi ý = Cược Tối Đa ÷ 100',
        maxBetHint: 'Cược Tối Đa ≤ Tiền nạp ÷ 500. Đảm bảo pool đủ trả thưởng cao nhất (450x). VD: Nạp 1 triệu → Max bet 2,000',
        maxBetLimitError: 'Cược Tối Đa không được vượt quá',

        statusActive: 'HOẠT ĐỘNG',
        statusPaused: 'TẠM DỪNG',
        poolId: 'Pool',
        created: 'Đã tạo',
        official: 'CHÍNH THỨC',

        tabOverview: 'Tổng quan',
        tabFunds: 'Tiền vốn',
        tabSettings: 'Cài đặt',
        tabDanger: 'Nguy hiểm',

        tooltipBalance: 'Tổng tiền trong pool để trả thưởng cho người chơi',
        tooltipJackpot: 'Hũ tích lũy từ % mỗi cược. Trúng khi ra 5 biểu tượng giống.',
        tooltipPending: 'Cược đang chờ reveal. Không thể rút cho đến khi hoàn tất.',
        tooltipWithdrawable: 'Balance - Pending - Jackpot = Số tiền có thể rút an toàn',
        tooltipSpins: 'Tổng số lượt quay đã chơi trên pool này',
        tooltipVolume: 'Tổng số tiền cược đã đặt trên pool',
        tooltipProfit: 'Lợi nhuận: Tổng Cược - Tổng Thưởng - Jackpot đã trả',
        tooltipRTP: 'Tỷ lệ hoàn trả: % cược trả lại người chơi (thấp hơn = lãi nhiều hơn)',

        statBalance: 'Số dư',
        statJackpotPool: 'Hũ Jackpot',
        statPendingBets: 'Cược treo',
        statWithdrawable: 'Có thể rút',
        statTotalSpins: 'Tổng lượt quay',
        statVolume: 'Khối lượng',
        statProfit: 'Lợi nhuận',
        statRTP: 'RTP',

        deposit: 'Nạp tiền',
        withdraw: 'Rút tiền',
        available: 'Có sẵn',
        amount: 'Số tiền',

        current: 'hiện tại',
        updateSettings: 'Cập nhật cài đặt',

        pausePool: 'Tạm dừng Pool',
        activatePool: 'Kích hoạt Pool',
        pauseDesc: 'Tạm dừng sẽ chặn các lượt quay mới nhưng vẫn cho phép reveal và hoàn tiền.',
        activateDesc: 'Kích hoạt lại cho phép người chơi tiếp tục quay.',
        transferOwnership: 'Chuyển quyền sở hữu',
        transferAddr: 'Địa chỉ chủ mới (0x...)',
        transferBtn: 'Chuyển nhượng',
        closePoolTitle: 'Đóng Pool Vĩnh Viễn',
        closePoolDesc: 'Hành động này KHÔNG THỂ đảo ngược. Toàn bộ tiền (bao gồm jackpot) sẽ được hoàn trả cho bạn.',
        closePoolWarn: 'Không thể đóng nếu còn cược treo.',
        confirmClose: 'Xác nhận đóng',
        settleTitle: 'Xử Lý Cược Treo',
        settleDesc: 'Giải quyết các commit hết hạn của người chơi bị kẹt. Tiền quay về pool.',
        settleBtn: 'Xử lý & Giải phóng tiền',

        // Protection Tab
        tabProtection: 'Bảo Vệ',
        poolHealth: 'Sức Khỏe Pool',
        healthExcellent: 'Xuất sắc',
        healthGood: 'Tốt',
        healthLow: 'Thấp',
        healthCritical: 'Nguy hiểm',
        effectiveMaxBet: 'Max Bet Hiệu Lực',
        hourlyPayout: 'Payout/Giờ',
        loadingProtection: 'Đang tải cài đặt bảo vệ...',
        dynamicMaxBetTitle: 'Max Bet Động',
        dynamicMaxBetDesc: 'Tự động giảm max bet khi số dư pool thấp để bảo vệ vốn.',
        enable: 'Bật',
        lowBalanceThreshold: 'Ngưỡng Số Dư Thấp',
        criticalBalanceThreshold: 'Ngưỡng Số Dư Nguy Hiểm',
        lowBalanceHint: 'Ở mức này, max bet giảm còn 50%',
        criticalBalanceHint: 'Ở mức này, max bet giảm còn 20%',
        streakProtectionTitle: 'Bảo Vệ Chuỗi Thua',
        streakProtectionDesc: 'Tự động tạm dừng pool nếu payout/giờ vượt giới hạn. Ngăn mất vốn nhanh.',
        hourlyPayoutLimit: 'Giới Hạn Payout/Giờ',
        hourlyPayoutHint: 'Pool tạm dừng nếu payout vượt % này/giờ',
        emergencyWithdrawTitle: 'Rút Khẩn Cấp',
        emergencyWithdrawDesc: 'Kích hoạt chế độ khẩn cấp để rút tiền sau thời gian chờ.',
        cooldownDuration: 'Thời Gian Chờ',
        cooldownHint: 'Thời gian đợi trước khi có thể rút',
        triggerEmergency: 'Kích Hoạt Khẩn Cấp',
        emergencyWarning: 'Hành động này sẽ tạm dừng pool và bắt đầu đếm ngược.',
        emergencyReady: '✅ Sẵn sàng rút tiền!',
        cancelEmergency: 'Hủy',
        executeWithdraw: 'Rút Ngay',
        saveSettings: 'Lưu Cài Đặt',

        dynamicMaxBetNote: 'Nếu Số dư Pool giảm xuống dưới Ngưỡng Thấp, Max Bet giảm còn 50%. Dưới Ngưỡng Nguy Hiểm, giảm còn 20%. Giúp tự động hạn chế rủi ro khi vốn thấp.',
        streakProtectionNote: 'Nếu tổng tiền trả thưởng trong 1 giờ qua vượt quá giới hạn % số dư, Pool sẽ TỰ ĐỘNG TẠM DỪNG để ngăn lỗ thêm. Bạn phải kích hoạt lại thủ công.',
        emergencyWithdrawNote: 'Kích hoạt Chế độ Khẩn cấp. Pool sẽ bị TẠM DỪNG ngay lập tức. Bạn phải đợi hết thời gian chờ (Cooldown) mới có thể rút tiền. Dùng khi nghi ngờ bị hack.',

        depositNote: 'Nạp tiền vào smart contract của pool. Tiền này dùng để chung chi cho người chơi. Chỉ chủ Pool mới được quyền rút.',
        withdrawNote: 'Rút thanh khoản nhàn rỗi. Bạn không thể rút phần tiền đang nằm trong các cược treo hoặc quỹ Jackpot.',
        half: '1/2',
        third: '1/3',
        quarter: '1/4',
        all: 'Tất cả',

        guideBtn: 'Sổ Tay Nhà Cái',
        guideTitle: 'Hướng Dẫn Vận Hành',
        guideIntro: 'Chào mừng. Là chủ pool, bạn nhận lợi nhuận từ lợi thế nhà cái. Bạn chính là ngân hàng.',
        guideOpTitle: 'Vận Hành',
        guideOpDesc: 'Tạo pool, nạp tiền và duyệt token. Bạn có thể Tạm Dừng pool bất cứ lúc nào để chặn cược mới.',
        guideRiskTitle: 'Quản Lý Rủi Ro',
        guideRiskDesc: "Bật 'Max Bet Động' để giảm giới hạn cược khi vốn thấp. Dùng 'Bảo Vệ Chuỗi' để auto-pause khi thua nhiều.",
        guideTroubleTitle: 'Sự cố',
        guideTroubleDesc: "Nếu người chơi mất kết nối, cược có thể bị treo. Dùng 'Quyết toán' để hoàn tiền về pool.",
        guideParamsTitle: 'Tham Số',
        guideParamsDesc: 'Cược Tối Thiểu >= 1. Cược Tối Đa <= 10% tổng nạp. Jackpot thường 1-5%.',
        guideStatsTitle: 'Chỉ Số',
        guideStatsDesc: 'RTP (Hoàn trả) thường 95-99%. Volume = tổng cược. Lợi nhuận = cược - thắng.',
        guideEditTitle: 'Cài Đặt',
        guideEditDesc: 'Bạn có thể chỉnh sửa Min/Max Bet và % Jackpot bất cứ lúc nào. Tên Pool không thể sửa.',

        // New Visual Enhancements
        alertLowBalance: 'Cảnh Báo Số Dư Thấp!',
        alertLowBalanceDesc: 'Tiền trong pool đang thấp. Hãy nạp thêm để đảm bảo trả thưởng.',
        smartSettleTitle: 'Phát Hiện Cược Treo',
        chartTitle: 'Hiệu Suất Pool',
        statPayouts: 'Trả Thưởng',

        settleSubtitle: 'Công cụ dọn dẹp tự động',
        recoverableLiquidity: 'Tổng thanh khoản có thể thu hồi',
        pendingCommits: 'Cược đang chờ',
        noExpiredCommits: 'Không tìm thấy cược hết hạn.',
        rescan: 'Quét lại',
        fixAndRecover: 'Sửa & Thu hồi',
        processingStatus: 'Đang xử lý...',

        // ============== SỔ TAY NHÀ CÁI CHUYÊN NGHIỆP ==============
        // Bảo mật hợp đồng
        handbookContractTitle: '🔐 Bảo Mật Hợp Đồng',
        handbookContractAddr: 'Địa chỉ hợp đồng: 0x9c64c18d792eab435d1d921efac978f6a62da2d2',
        handbookContractSecurity: '⚠️ QUAN TRỌNG: Chỉ Chủ Pool mới có thể rút tiền từ pool của mình. Chủ sở hữu hợp đồng KHÔNG có quyền rút tiền pool.',
        handbookContractOwnerNote: 'Khi bạn nạp $BANMAO vào hợp đồng, chỉ BẠN (người tạo pool) có quyền rút tiền. Điều này được đảm bảo bởi smart contract.',
        handbookExplorerLink: '🔗 Xác minh trên OKX X Layer Explorer',

        // Phân tích lợi nhuận
        handbookProfitTitle: '📈 Phân Tích Lợi Nhuận',
        handbookProfitIntro: 'Là Chủ Pool, bạn kiếm tiền từ lợi thế nhà cái. Tỷ lệ lợi nhuận kỳ vọng là 3% trên tổng doanh thu.',
        handbookPlatformFee: '• Phí nền tảng: 2% (trả cho chủ hợp đồng)',
        handbookGlobalRTP: '• RTP toàn cầu: 95% (hoàn trả cho người chơi dài hạn)',
        handbookNetProfit: '• Lợi nhuận ròng = 100% - 95% - 2% = 3%',
        handbookProfitExample: 'Ví dụ: Nếu tổng cược qua Pool = 100M token → Bạn kiếm ~3M token',
        handbookProfitBenefits: 'Lợi ích khác: Kiểm soát minBet/maxBet, jackpotPercent, Cài đặt bảo vệ, và toàn quyền sở hữu.',

        // Phân tích rủi ro
        handbookRiskTitle: '⚠️ Phân Tích Rủi Ro',
        handbookRiskVariance: '1. Biến động ngắn hạn: 95% RTP chỉ đúng sau hàng triệu lượt quay. Người chơi may mắn có thể rút sạch pool trước khi đạt lợi nhuận kỳ vọng.',
        handbookRiskOpportunityCost: '2. Chi phí cơ hội: Yêu cầu nạp tối thiểu 1M token. Số tiền này bị khóa và không thể dùng cho việc khác.',
        handbookRiskPlatformFee: '3. Phí nền tảng cố định: 2% tính trên doanh thu, không phải lợi nhuận. Nếu người chơi thắng >98%, bạn lỗ kép.',
        handbookRiskTechnical: '4. Rủi ro kỹ thuật: Người chơi có thể commit nhưng không reveal. Dùng settleExpiredCommit để thu hồi cược treo (tốn gas).',

        // Khuyến nghị cấu hình
        handbookConfigTitle: '⚙️ Cài Đặt Khuyến Nghị',
        handbookConfigMaxBet: 'Max Bet: <1-2% số dư Pool — Tránh 1 lượt quay may mắn làm bay 10-20% vốn pool',
        handbookConfigJackpot: 'Jackpot %: 1-3% — Tích lũy quỹ jackpot từ tiền cược người chơi',
        handbookConfigStreak: 'Streak Protection: BẬT — Tự động pause pool nếu thua lỗ đột ngột (chống khai thác)',
        handbookConfigDynamic: 'Dynamic Max Bet: BẬT — Tự động giảm giới hạn cược khi số dư pool giảm',

        // Tổng kết
        handbookSummaryTitle: '📋 Tổng Kết',
        handbookSummaryProfit: 'Lợi nhuận: Ổn định ~3% volume với đủ người chơi. Làm nhà cái giống như cung cấp thanh khoản cho game.',
        handbookSummaryRisk: 'Rủi ro: Nằm ở quản lý vốn. Nếu Max Bet quá cao so với pool, bạn đang đánh bạc VỚI người chơi, không phải LÀM nhà cái.',
    },
    zh: {
        title: '庄家控制台',
        subtitle: '管理您的投注池',
        createPool: '创建新池',
        yourPools: '您的资金池',
        noPools: '您还没有任何资金池',
        createFirst: '创建您的第一个资金池并开始盈利！',
        requirements: '要求',
        minDeposit: '最低存款',
        maxPools: '每用户最高池数',
        yourBalance: '您的余额',
        activePools: '活跃池总数',
        backToGame: '回到游戏',
        connectWalletDesc: '连接钱包以管理资金池',

        poolName: '资金池名称',
        initialDeposit: '初始存款',
        minBet: '最低投注',
        maxBet: '最高投注',
        jackpotPercent: '累积奖池 %',
        approve: '授权',
        create: '创建',
        cancel: '取消',
        minDepositInfo: '最低存款',
        jackpotInfo: '每笔下注增加到累积奖池的百分比',
        platformFee: '平台费用：每笔投注的 2%（固定）',
        maxBetLimitInfo: '最高投注额必须 ≤ 存款的 10%',
        charLimit: '个字符',
        processing: '处理中...',
        approveAndCreate: '授权并创建',
        poolNamePlaceholder: '我的赌场',
        minimum: '最低',
        loadingPool: '正在加载资金池',
        minBetHint: '每次旋转的最低代币数。建议值 = 最大投注 ÷ 100',
        maxBetHint: '最大投注 ≤ 存款 ÷ 500。确保资金池能支付最高500倍奖励。例如：存款100万 → 最大投注2,000',
        maxBetLimitError: '最大投注不能超过',

        statusActive: '活跃',
        statusPaused: '已暂停',
        poolId: '池',
        created: '创建时间',
        official: '官方',

        tabOverview: '概览',
        tabFunds: '资金',
        tabSettings: '设置',
        tabDanger: '危险区域',

        tooltipBalance: '池中可用于支付玩家奖金的总资金',
        tooltipJackpot: '每笔投注累积的奖池。匹配 5 个图标即可获得。',
        tooltipPending: '等待揭晓的投注。在揭晓前无法取回。',
        tooltipWithdrawable: '池余额 - 待定投注 - 累积奖池 = 安全可取金额',
        tooltipSpins: '在此池中进行的转动总次数',
        tooltipVolume: '在此池中投放的投注总额',
        tooltipProfit: '资金池收入：总投注 - 总支出 - 已赢取的奖池',
        tooltipRTP: '玩家回报率：% 的投注作为奖金返还（越低 = 利润越多）',

        statBalance: '余额',
        statJackpotPool: '累积奖池',
        statPendingBets: '待定投注',
        statWithdrawable: '可取金额',
        statTotalSpins: '总转动次数',
        statVolume: '成交量',
        statProfit: '利润',
        statRTP: 'RTP',

        deposit: '存款',
        withdraw: '取款',
        available: '可用',
        amount: '金额',

        current: '当前',
        updateSettings: '更新设置',

        pausePool: '暂停池',
        activatePool: '激活池',
        pauseDesc: '暂停会停止新的转动，但允许揭晓和退款。',
        activateDesc: '重新激活允许玩家再次转动。',
        transferOwnership: '转让所有权',
        transferAddr: '新所有者地址 (0x...)',
        transferBtn: '转让',
        closePoolTitle: '永久关闭池',
        closePoolDesc: '此操作不可逆。所有资金（包括奖池）将退还给您。',
        closePoolWarn: '如果有待定投注，则无法关闭。',
        confirmClose: '确认关闭',
        settleTitle: '处理滞留投注',
        settleDesc: '清理玩家遗留的过期投注。资金返回池中。',
        settleBtn: '处理并释放资金',

        // Protection Tab
        tabProtection: '保护',
        poolHealth: '资金池健康',
        healthExcellent: '优秀',
        healthGood: '良好',
        healthLow: '低',
        healthCritical: '危险',
        effectiveMaxBet: '有效最大投注',
        hourlyPayout: '每小时支付',
        loadingProtection: '加载保护设置中...',
        dynamicMaxBetTitle: '动态最大投注',
        dynamicMaxBetDesc: '当资金池余额较低时自动降低最大投注以保护您的资金。',
        enable: '启用',
        lowBalanceThreshold: '低余额阈值',
        criticalBalanceThreshold: '危险余额阈值',
        lowBalanceHint: '在此级别，最大投注降至50%',
        criticalBalanceHint: '在此级别，最大投注降至20%',
        streakProtectionTitle: '连续保护',
        streakProtectionDesc: '如果每小时支付超过限制，自动暂停资金池。防止资金快速流失。',
        hourlyPayoutLimit: '每小时支付限制',
        hourlyPayoutHint: '如果支付超过此百分比/小时，资金池暂停',
        emergencyWithdrawTitle: '紧急提款',
        emergencyWithdrawDesc: '触发紧急模式，在冷却期后提款。',
        cooldownDuration: '冷却时间',
        cooldownHint: '可以提款前的等待时间',
        triggerEmergency: '触发紧急模式',
        emergencyWarning: '这将立即暂停您的资金池并开始冷却计时。',
        emergencyReady: '✅ 准备提款！',
        cancelEmergency: '取消',
        executeWithdraw: '立即提现',
        saveSettings: '保存保护设置',

        dynamicMaxBetNote: '若资金池余额低于低阈值，最大投注降至50%。低于危险阈值，降至20%。',
        streakProtectionNote: '若过去1小时总赔付超过资金池余额的%，资金池将自动暂停以防止进一步损失。需手动重新激活。',
        emergencyWithdrawNote: '激活紧急模式。资金池立即暂停。必须等待冷却期结束后才能提现。',

        depositNote: '将资金存入智能合约资金池。这些资金用于支持玩家的投注。只有资金池所有者可以提取。',
        withdrawNote: '提取未使用的流动资金。您无法提取当前锁定在待定投注或累积奖池中的资金。',
        half: '1/2',
        third: '1/3',
        quarter: '1/4',
        all: '全部',

        guideBtn: '运营商指南',
        guideTitle: '庄家操作手册',
        guideIntro: '作为资金池所有者，您从庄家优势中获利。您就是银行。',
        guideOpTitle: '运营',
        guideOpDesc: '创建资金池，设定存款限额。您可以随时暂停资金池以停止新投注。',
        guideRiskTitle: '风险管理',
        guideRiskDesc: '使用“动态最大投注”在资金不足时自动通过降低限额来保护资金。',
        guideTroubleTitle: '故障排除',
        guideTroubleDesc: "若玩家断开，投注可能卡住。使用'快速结算'清除并退回资金。",
        guideParamsTitle: '参数',
        guideParamsDesc: '最小投注 >= 1。最大投注 <= 总存款的10%。头奖通常1-5%。',
        guideStatsTitle: '关键指标',
        guideStatsDesc: 'RTP（玩家回报率）通常95-99%。交易量=总投注。利润=投注-获胜。',
        guideEditTitle: '可编辑设置',
        guideEditDesc: '您可以随时更改最小/最大投注和头奖%。名称不可更改。',

        // New Visual Enhancements
        alertLowBalance: '余额不足警告！',
        alertLowBalanceDesc: '资金池资金不足。请充值以确保继续支付奖金。',
        smartSettleTitle: '发现待定投注',
        chartTitle: '资金池表现',
        statPayouts: '总支出',

        settleSubtitle: '自动清理工具',
        recoverableLiquidity: '总可收回流动性',
        pendingCommits: '待定投注',
        noExpiredCommits: '未发现过期投注。',
        rescan: '重新扫描',
        fixAndRecover: '修复并收回',
        processingStatus: '处理中...',

        // ============== 专业庄家手册 ==============
        // 合约安全
        handbookContractTitle: '🔐 合约安全',
        handbookContractAddr: '合约地址: 0x9c64c18d792eab435d1d921efac978f6a62da2d2',
        handbookContractSecurity: '⚠️ 重要: 只有资金池所有者可以从自己的资金池中提款。合约所有者无权提取任何资金池资金。',
        handbookContractOwnerNote: '当您向合约存入$BANMAO时，只有您（资金池创建者）有权提款。这是由智能合约强制执行的。',
        handbookExplorerLink: '🔗 在OKX X Layer浏览器上验证',

        // 利润分析
        handbookProfitTitle: '📈 利润分析',
        handbookProfitIntro: '作为资金池所有者，您从庄家优势中获利。预期利润率为总交易量的3%。',
        handbookPlatformFee: '• 平台费用: 2%（支付给合约所有者）',
        handbookGlobalRTP: '• 全局RTP: 95%（长期返还给玩家）',
        handbookNetProfit: '• 净利润 = 100% - 95% - 2% = 3%',
        handbookProfitExample: '示例: 如果通过您的资金池的总投注 = 1亿代币 → 您赚取约300万代币',
        handbookProfitBenefits: '额外优势: 控制minBet/maxBet、jackpotPercent、保护设置和完全所有权。',

        // 风险分析
        handbookRiskTitle: '⚠️ 风险分析',
        handbookRiskVariance: '1. 短期波动: 95% RTP仅在数百万次旋转后有效。幸运玩家可能在达到预期利润前耗尽您的资金池。',
        handbookRiskOpportunityCost: '2. 机会成本: 需要最低100万代币存款。这些资金被锁定，无法用于其他用途。',
        handbookRiskPlatformFee: '3. 固定平台费用: 2%按交易量计算，不是按利润。如果玩家赢得>98%，您会亏损并且还要付费。',
        handbookRiskTechnical: '4. 技术风险: 玩家可能提交但不揭示。使用settleExpiredCommit收回卡住的投注（需要gas）。',

        // 配置建议
        handbookConfigTitle: '⚙️ 推荐设置',
        handbookConfigMaxBet: 'Max Bet: <资金池余额的1-2% — 防止单次幸运旋转消耗10-20%的资金池',
        handbookConfigJackpot: 'Jackpot %: 1-3% — 从玩家投注中累积奖池资金',
        handbookConfigStreak: 'Streak Protection: 启用 — 如果损失激增自动暂停资金池（防止攻击）',
        handbookConfigDynamic: 'Dynamic Max Bet: 启用 — 当资金池余额下降时自动降低投注限额',

        // 总结
        handbookSummaryTitle: '📋 总结',
        handbookSummaryProfit: '利润: 在有足够玩家的情况下稳定在交易量的~3%。做庄家就像为游戏提供流动性。',
        handbookSummaryRisk: '风险: 在于资金管理。如果Max Bet相对于您的资金池太高，您是在与玩家赌博，而不是做庄家。',
    },
    ko: {
        title: '하우스 대시보드',
        subtitle: '베팅 풀 관리',
        createPool: '새 풀 생성',
        yourPools: '내 풀',
        noPools: '아직 소유한 풀이 없습니다',
        createFirst: '첫 번째 풀을 생성하고 수익을 벌어보세요!',
        requirements: '요구 사항',
        minDeposit: '최소 예치금',
        maxPools: '사용자당 최대 풀 수',
        yourBalance: '내 잔액',
        activePools: '활성 풀 총합',
        backToGame: '게임으로 돌아가기',
        connectWalletDesc: '풀을 관리하려면 지갑을 연결하세요',

        poolName: '풀 이름',
        initialDeposit: '초기 예치금',
        minBet: '최소 베팅',
        maxBet: '최대 베팅',
        jackpotPercent: '잭팟 %',
        approve: '승인',
        create: '생성',
        cancel: '취소',
        minDepositInfo: '최소 예치금',
        jackpotInfo: '각 베팅의 일정 비율이 잭팟 풀에 추가됩니다',
        platformFee: '플랫폼 수수료: 각 베팅의 2% (고정)',
        maxBetLimitInfo: '최대 베팅은 예치금의 10% 이하여야 합니다',
        charLimit: '자',
        processing: '처리 중...',
        approveAndCreate: '승인 및 생성',
        poolNamePlaceholder: '내 카지노',
        minimum: '최소',
        loadingPool: '풀 로딩 중',
        minBetHint: '스핀당 최소 토큰 수. 추천값 = 최대 베팅 ÷ 100',
        maxBetHint: '최대 베팅 ≤ 예치금 ÷ 500. 풀이 최고 500배 보상을 지급할 수 있도록 보장합니다. 예: 예치금 100만 → 최대 베팅 2,000',
        maxBetLimitError: '최대 베팅은 다음을 초과할 수 없습니다',

        statusActive: '활성',
        statusPaused: '일시 중지',
        poolId: '풀',
        created: '생성일',
        official: '공식',

        tabOverview: '개요',
        tabFunds: '자금',
        tabSettings: '설정',
        tabDanger: '위험 지역',

        tooltipBalance: '플레이어 당첨금을 지급하기 위해 사용 가능한 풀의 총 자금',
        tooltipJackpot: '각 베팅에서 누적된 잭팟. 5개 심볼 일치 시 획득.',
        tooltipPending: '결과 공개를 대기 중인 베팅. 공개 전까지 출금 불가.',
        tooltipWithdrawable: '풀 잔액 - 대기 중인 베팅 - 잭팟 풀 = 안전 출금 가능 금액',
        tooltipSpins: '이 풀에서 진행된 총 스핀 횟수',
        tooltipVolume: '이 풀에서 발생한 총 베팅 금액',
        tooltipProfit: '풀 수익: 총 베팅 - 총 지급 - 당첨된 잭팟',
        tooltipRTP: '플레이어 환수율(RTP): 베팅 중 상금으로 반환된 율 (낮을수록 이익 증가)',

        statBalance: '잔액',
        statJackpotPool: '잭팟 풀',
        statPendingBets: '대기 중인 베팅',
        statWithdrawable: '출금 가능',
        statTotalSpins: '총 스핀',
        statVolume: '거래량',
        statProfit: '수익',
        statRTP: 'RTP',

        deposit: '입금',
        withdraw: '출금',
        available: '가능',
        amount: '금액',

        current: '현재',
        updateSettings: '설정 업데이트',

        pausePool: '풀 일시 중지',
        activatePool: '풀 활성화',
        pauseDesc: '일시 중지하면 새로운 스핀은 중지되지만 결과 공개 및 환불은 가능합니다.',
        activateDesc: '재활성화하면 플레이어가 다시 스핀할 수 있습니다.',
        transferOwnership: '소유권 이전',
        transferAddr: '새 소유자 주소 (0x...)',
        transferBtn: '이전',
        closePoolTitle: '풀 영구 폐쇄',
        closePoolDesc: '이 작업은 되돌릴 수 없습니다. 모든 자금(잭팟 포함)이 귀하에게 반환됩니다.',
        closePoolWarn: '대기 중인 베팅이 있으면 폐쇄할 수 없습니다.',
        confirmClose: '폐쇄 확인',
        settleTitle: '중단된 베팅 처리',
        settleDesc: '게임을 떠난 플레이어의 만료된 베팅을 처리합니다. 자금은 풀로 돌아갑니다.',
        settleBtn: '처리 및 자금 해제',

        // Protection Tab
        tabProtection: '보호',
        poolHealth: '풀 상태',
        healthExcellent: '우수',
        healthGood: '양호',
        healthLow: '낮음',
        healthCritical: '위험',
        effectiveMaxBet: '유효 최대 베팅',
        hourlyPayout: '시간당 지급',
        loadingProtection: '보호 설정 로딩 중...',
        dynamicMaxBetTitle: '동적 최대 베팅',
        dynamicMaxBetDesc: '풀 잔액이 낮을 때 자동으로 최대 베팅을 줄여 자금을 보호합니다.',
        enable: '활성화',
        lowBalanceThreshold: '저잔액 임계값',
        criticalBalanceThreshold: '위험 잔액 임계값',
        lowBalanceHint: '이 수준에서 최대 베팅이 50%로 감소',
        criticalBalanceHint: '이 수준에서 최대 베팅이 20%로 감소',
        streakProtectionTitle: '연속 보호',
        streakProtectionDesc: '시간당 지급이 한도를 초과하면 풀을 자동 일시정지합니다.',
        hourlyPayoutLimit: '시간당 지급 한도',
        hourlyPayoutHint: '시간당 이 %를 초과하면 풀 일시정지',
        emergencyWithdrawTitle: '긴급 출금',
        emergencyWithdrawDesc: '대기 기간 후 자금을 인출하려면 긴급 모드를 트리거하세요.',
        cooldownDuration: '대기 시간',
        cooldownHint: '출금 가능 전 대기 시간',
        triggerEmergency: '긴급 모드 트리거',
        emergencyWarning: '이렇게 하면 풀이 즉시 일시정지되고 대기 타이머가 시작됩니다.',
        emergencyReady: '✅ 출금 준비 완료!',
        cancelEmergency: '취소',
        executeWithdraw: '인출하기',
        saveSettings: '보호 설정 저장',

        dynamicMaxBetNote: '풀 잔액이 낮은 임계값 아래로 떨어지면 최대 배팅이 50%로 감소하고, 위험 임계값 아래면 20%로 감소합니다.',
        streakProtectionNote: '지난 1시간 동안의 총 지급액이 풀 잔액의 % 한도를 초과하면, 추가 손실을 방지하기 위해 풀이 자동으로 일시 중지됩니다.',
        emergencyWithdrawNote: '비상 모드를 활성화합니다. 풀이 즉시 일시 중지됩니다. 인출하기 전에 쿨다운 기간이 만료될 때까지 기다려야 합니다.',

        depositNote: '스마트 계약 풀에 자금을 입금합니다. 이 자금은 플레이어 베팅을 지원합니다. 풀 소유자만 인출할 수 있습니다.',
        withdrawNote: '사용하지 않는 유동성을 인출합니다. 현재 대기 중인 베팅이나 잭팟 풀에 잠겨 있는 자금은 인출할 수 없습니다.',
        half: '1/2',
        third: '1/3',
        quarter: '1/4',
        all: '최대',

        guideBtn: '운영자 가이드',
        guideTitle: '하우스 운영 매뉴얼',
        guideIntro: '풀 소유자로서 하우스 엣지에서 수익을 얻습니다. 당신이 바로 은행입니다.',
        guideOpTitle: '운영',
        guideOpDesc: '풀을 생성하고 한도를 설정하세요. 언제든지 풀을 일시 중지할 수 있습니다.',
        guideRiskTitle: '위험 관리',
        guideRiskDesc: "'동적 최대 베팅'을 사용하여 자금이 부족할 때 자동으로 한도를 낮추세요.",
        guideTroubleTitle: '문제 해결',
        guideTroubleDesc: "플레이어 연결이 끊기면 베팅이 멈출 수 있습니다. '빠른 정산'을 사용하여 자금을 풀로 반환하세요.",
        guideParamsTitle: '매개변수',
        guideParamsDesc: '최소 베팅 >= 1. 최대 베팅 <= 총 입금액의 10%. 잭팟은 보통 1-5%.',
        guideStatsTitle: '주요 지표',
        guideStatsDesc: 'RTP(플레이어 환수율)는 보통 95-99%입니다. 거래량 = 총 베팅. 수익 = 베팅 - 당첨금.',
        guideEditTitle: '편집 가능 설정',
        guideEditDesc: '최소/최대 베팅 및 잭팟 %는 언제든지 변경할 수 있습니다. 이름은 변경할 수 없습니다.',

        // New Visual Enhancements
        alertLowBalance: '잔액 부족 경고!',
        alertLowBalanceDesc: '풀 자금이 부족합니다. 지급을 계속하려면 입금하세요.',
        smartSettleTitle: '대기 중인 베팅 발견',
        chartTitle: '풀 성과',
        statPayouts: '지급액',

        settleSubtitle: '자동 정리 도구',
        recoverableLiquidity: '총 회수 가능 유동성',
        pendingCommits: '대기 중인 베팅',
        noExpiredCommits: '만료된 베팅이 없습니다.',
        rescan: '재검색',
        fixAndRecover: '수정 및 회수',
        processingStatus: '처리 중...',

        // ============== 전문 하우스 핸드북 ==============
        // 계약 보안
        handbookContractTitle: '🔐 계약 보안',
        handbookContractAddr: '계약 주소: 0x9c64c18d792eab435d1d921efac978f6a62da2d2',
        handbookContractSecurity: '⚠️ 중요: 풀 소유자만 자신의 풀에서 자금을 인출할 수 있습니다. 계약 소유자는 풀 자금을 인출할 권한이 없습니다.',
        handbookContractOwnerNote: '$BANMAO를 계약에 입금하면, 오직 귀하(풀 생성자)만 인출 권한을 갖습니다. 이는 스마트 계약에 의해 강제됩니다.',
        handbookExplorerLink: '🔗 OKX X Layer Explorer에서 확인',

        // 수익 분석
        handbookProfitTitle: '📈 수익 분석',
        handbookProfitIntro: '풀 소유자로서 하우스 엣지에서 수익을 얻습니다. 예상 수익 마진은 총 거래량의 3%입니다.',
        handbookPlatformFee: '• 플랫폼 수수료: 2% (계약 소유자에게 지불)',
        handbookGlobalRTP: '• 글로벌 RTP: 95% (장기적으로 플레이어에게 반환)',
        handbookNetProfit: '• 순수익 = 100% - 95% - 2% = 3%',
        handbookProfitExample: '예시: 풀을 통한 총 베팅 = 1억 토큰 → 약 300만 토큰 수익',
        handbookProfitBenefits: '추가 혜택: minBet/maxBet, jackpotPercent, 보호 설정 및 완전한 소유권 제어.',

        // 위험 분석
        handbookRiskTitle: '⚠️ 위험 분석',
        handbookRiskVariance: '1. 단기 변동성: 95% RTP는 수백만 번의 스핀에서만 유효합니다. 운이 좋은 플레이어가 예상 수익 달성 전에 풀을 고갈시킬 수 있습니다.',
        handbookRiskOpportunityCost: '2. 기회 비용: 최소 100만 토큰 입금 필요. 이 자금은 잠기며 다른 곳에 사용할 수 없습니다.',
        handbookRiskPlatformFee: '3. 고정 플랫폼 수수료: 2%는 이익이 아닌 거래량에 부과됩니다. 플레이어가 98% 이상 이기면 손실과 수수료를 모두 부담합니다.',
        handbookRiskTechnical: '4. 기술적 위험: 플레이어가 커밋하고 공개하지 않을 수 있습니다. settleExpiredCommit을 사용하여 막힌 베팅을 회수하세요 (가스 필요).',

        // 구성 권장 사항
        handbookConfigTitle: '⚙️ 권장 설정',
        handbookConfigMaxBet: 'Max Bet: 풀 잔액의 <1-2% — 단일 행운의 스핀이 풀의 10-20%를 소진하는 것을 방지',
        handbookConfigJackpot: 'Jackpot %: 1-3% — 플레이어 베팅에서 잭팟 자금 축적',
        handbookConfigStreak: 'Streak Protection: 활성화 — 손실이 급증하면 풀 자동 일시 정지 (악용 방지)',
        handbookConfigDynamic: 'Dynamic Max Bet: 활성화 — 풀 잔액 감소 시 자동으로 베팅 한도 감소',

        // 요약
        handbookSummaryTitle: '📋 요약',
        handbookSummaryProfit: '수익: 충분한 플레이어가 있으면 거래량의 ~3%로 안정. 하우스가 되는 것은 게임에 유동성을 제공하는 것과 같습니다.',
        handbookSummaryRisk: '위험: 자금 관리에 있습니다. Max Bet이 풀에 비해 너무 높으면, 하우스가 아니라 플레이어와 도박하는 것입니다.',
    },
    ru: {
        title: 'Панель Управления House',
        subtitle: 'Управляйте вашими пулами ставок',
        createPool: 'Создать Новый Пул',
        yourPools: 'Ваши Пулы',
        noPools: 'У вас пока нет пулов',
        createFirst: 'Создайте свой первый пул и начните зарабатывать!',
        requirements: 'Требования',
        minDeposit: 'Мин. депозит',
        maxPools: 'Макс. пулов на юзера',
        yourBalance: 'Ваш баланс',
        activePools: 'Всего активных пулов',
        backToGame: 'Назад в Игру',
        connectWalletDesc: 'Подключите кошелек для управления пулами',

        poolName: 'Название Пула',
        initialDeposit: 'Начальный Депозит',
        minBet: 'Мин. Ставка',
        maxBet: 'Макс. Ставка',
        jackpotPercent: '% Джекпота',
        approve: 'Одобрить',
        create: 'Создать',
        cancel: 'Отмена',
        minDepositInfo: 'Минимальный депозит',
        jackpotInfo: 'Процент от каждой ставки, идущий в джекпот',
        platformFee: 'Комиссия платформы: 2% от каждой ставки (фикс.)',
        maxBetLimitInfo: 'Макс. ставка должна быть ≤ 10% от депозита',
        charLimit: 'символов',
        processing: 'Обработка...',
        approveAndCreate: 'Одобрить и Создать',
        poolNamePlaceholder: 'Моё Казино',
        minimum: 'Минимум',
        loadingPool: 'Загрузка пула',
        minBetHint: 'Минимум токенов за спин. Рекомендация = Макс ставка ÷ 100',
        maxBetHint: 'Макс ставка ≤ Депозит ÷ 500. Гарантирует, что пул сможет выплатить максимальную награду 450x. Пример: депозит 1М → макс ставка 2,000',
        maxBetLimitError: 'Максимальная ставка не может превышать',

        statusActive: 'АКТИВЕН',
        statusPaused: 'ПАУЗА',
        poolId: 'Пул',
        created: 'Создан',
        official: 'ОФИЦИАЛЬНЫЙ',

        tabOverview: 'Обзор',
        tabFunds: 'Средства',
        tabSettings: 'Настройки',
        tabDanger: 'Опасная зона',

        tooltipBalance: 'Общая сумма средств в пуле для выплаты выигрышей',
        tooltipJackpot: 'Накопленный джекпот из % ставок. Выигрывается при 5 совпадениях.',
        tooltipPending: 'Ставки, ожидающие раскрытия. Нельзя вывести до раскрытия.',
        tooltipWithdrawable: 'Баланс пула - Ожидающие ставки - Джекпот = Доступно к выводу',
        tooltipSpins: 'Общее количество спинов в этом пуле',
        tooltipVolume: 'Общая сумма ставок в этом пуле',
        tooltipProfit: 'Доход пула: Ставки - Выплаты - Выигранные Джекпоты',
        tooltipRTP: 'Возврат игроку: % ставок, выплаченных как выигрыш (ниже = выше профит)',

        statBalance: 'Баланс',
        statJackpotPool: 'Джекпот Пул',
        statPendingBets: 'Ожидающие',
        statWithdrawable: 'Доступно',
        statTotalSpins: 'Всего спинов',
        statVolume: 'Объем',
        statProfit: 'Профит',
        statRTP: 'RTP',

        deposit: 'Депозит',
        withdraw: 'Вывод',
        available: 'Доступно',
        amount: 'Сумма',

        current: 'текущий',
        updateSettings: 'Обновить настройки',

        pausePool: 'Приостановить Пул',
        activatePool: 'Активировать Пул',
        pauseDesc: 'Пауза останавливает новые спины, но позволяет раскрытия и возвраты.',
        activateDesc: 'Активация позволяет игрокам снова крутить.',
        transferOwnership: 'Передать Право Собственности',
        transferAddr: 'Адрес нового владельца (0x...)',
        transferBtn: 'Передать',
        closePoolTitle: 'Закрыть Пул Навсегда',
        closePoolDesc: 'Это действие НЕОБРАТИМО. Все средства (включая джекпот) будут возвращены вам.',
        closePoolWarn: 'Нельзя закрыть при наличии ожидающих ставок.',
        confirmClose: 'Подтвердить закрытие',
        settleTitle: 'Обработать зависшие ставки',
        settleDesc: 'Очистить просроченные коммиты игроков, которые покинули игру. Средства возвращаются в пул.',
        settleBtn: 'Обработать и освободить средства',

        // Protection Tab
        tabProtection: 'Защита',
        poolHealth: 'Состояние пула',
        healthExcellent: 'Отлично',
        healthGood: 'Хорошо',
        healthLow: 'Низкий',
        healthCritical: 'Критический',
        effectiveMaxBet: 'Эффективная макс. ставка',
        hourlyPayout: 'Выплата за час',
        loadingProtection: 'Загрузка настроек защиты...',
        dynamicMaxBetTitle: 'Динамическая макс. ставка',
        dynamicMaxBetDesc: 'Автоматически уменьшать макс. ставку при низком балансе для защиты средств.',
        enable: 'Включить',
        lowBalanceThreshold: 'Порог низкого баланса',
        criticalBalanceThreshold: 'Критический порог баланса',
        lowBalanceHint: 'На этом уровне макс. ставка снижается до 50%',
        criticalBalanceHint: 'На этом уровне макс. ставка снижается до 20%',
        streakProtectionTitle: 'Защита от серии',
        streakProtectionDesc: 'Автопауза пула при превышении лимита выплат в час.',
        hourlyPayoutLimit: 'Лимит выплат в час',
        hourlyPayoutHint: 'Пуль приостанавливается при превышении % в час',
        emergencyWithdrawTitle: 'Экстренный вывод',
        emergencyWithdrawDesc: 'Активируйте режим экстренного вывода средств после периода ожидания.',
        cooldownDuration: 'Период ожидания',
        cooldownHint: 'Время ожидания перед выводом',
        triggerEmergency: 'Активировать экстренный режим',
        emergencyWarning: 'Это немедленно приостановит ваш пул и запустит таймер ожидания.',
        emergencyReady: '✅ Готово к выводу!',
        cancelEmergency: 'Отмена',
        executeWithdraw: 'Вывести сейчас',
        saveSettings: 'Сохранить настройки защиты',

        dynamicMaxBetNote: 'Если баланс пула ниже низкого порога, макс. ставка снижается до 50%. Ниже критического - до 20%.',
        streakProtectionNote: 'Если выплаты за последний час превысят лимит %, пул автоматически ПРИОСТАНОВИТСЯ.',
        emergencyWithdrawNote: 'Активирует аварийный режим. Пул немедленно ПРИОСТАНАВЛИВАЕТСЯ. Вы должны ждать окончания периода ожидания.',

        depositNote: 'Внесите средства в смарт-контракт пула. Эти средства обеспечивают ставки игроков. Только владелец пула может их вывести.',
        withdrawNote: 'Вывести неиспользуемую ликвидность. Вы не можете вывести средства, заблокированные в ожидающих ставках или джекпоте.',
        half: '1/2',
        third: '1/3',
        quarter: '1/4',
        all: 'Все',

        guideBtn: 'Гид Оператора',
        guideTitle: 'Руководство Владельца',
        guideIntro: 'Как владелец пула, вы зарабатываете на преимуществе казино. Вы — банк.',
        guideOpTitle: 'Операции',
        guideOpDesc: 'Создавайте пулы, настраивайте лимиты. Вы можете приостановить пул в любое время.',
        guideRiskTitle: 'Управление Рисками',
        guideRiskDesc: "Используйте 'Динамическую Макс. Ставку' для защиты средств при низком балансе.",
        guideTroubleTitle: 'Устранение неполадок',
        guideTroubleDesc: "Если игрок отключается, ставка может зависнуть. Используйте 'Быстрый расчет', чтобы вернуть средства.",
        guideParamsTitle: 'Параметры',
        guideParamsDesc: 'Мин. ставка >= 1. Макс. ставка <= 10% от депозита. Джекпот обычно 1-5%.',
        guideStatsTitle: 'Ключевые метрики',
        guideStatsDesc: 'RTP (Возврат игроку) обычно 95-99%. Объем = общие ставки. Прибыль = ставки - выигрыши.',
        guideEditTitle: 'Настройки',
        guideEditDesc: 'Вы можете изменить мин./макс. ставку и % джекпота в любое время. Имя изменить нельзя.',

        // New Visual Enhancements
        alertLowBalance: 'Низкий Баланс!',
        alertLowBalanceDesc: 'Средств в пуле мало. Пополните счет для продолжения выплат.',
        smartSettleTitle: 'Найдены Зависшие Ставки',
        chartTitle: 'Эффективность Пула',
        statPayouts: 'Выплаты',

        settleSubtitle: 'Автоматический инструмент очистки',
        recoverableLiquidity: 'Общая ликвидность к возврату',
        pendingCommits: 'Ожидающие ставки',
        noExpiredCommits: 'Просроченных ставок не найдено.',
        rescan: 'Пересканировать',
        fixAndRecover: 'Исправить и Вернуть',
        processingStatus: 'Обработка...',

        // ============== ПРОФЕССИОНАЛЬНЫЙ СПРАВОЧНИК ==============
        // Безопасность контракта
        handbookContractTitle: '🔐 Безопасность Контракта',
        handbookContractAddr: 'Адрес контракта: 0x9c64c18d792eab435d1d921efac978f6a62da2d2',
        handbookContractSecurity: '⚠️ ВАЖНО: Только владельцы пулов могут выводить средства из своих пулов. Владелец контракта НЕ имеет доступа к средствам пулов.',
        handbookContractOwnerNote: 'Когда вы вносите $BANMAO в контракт, только ВЫ (создатель пула) имеете право на вывод. Это обеспечивается смарт-контрактом.',
        handbookExplorerLink: '🔗 Проверить на OKX X Layer Explorer',

        // Анализ прибыли
        handbookProfitTitle: '📈 Анализ Прибыли',
        handbookProfitIntro: 'Как владелец пула, вы зарабатываете на преимуществе казино. Ожидаемая маржа прибыли — 3% от общего объёма.',
        handbookPlatformFee: '• Комиссия платформы: 2% (оплачивается владельцу контракта)',
        handbookGlobalRTP: '• Глобальный RTP: 95% (возвращается игрокам в долгосрочной перспективе)',
        handbookNetProfit: '• Чистая прибыль = 100% - 95% - 2% = 3%',
        handbookProfitExample: 'Пример: Если общий объём ставок через пул = 100М токенов → Вы зарабатываете ~3М токенов',
        handbookProfitBenefits: 'Дополнительные преимущества: Контроль над minBet/maxBet, jackpotPercent, настройками защиты и полные права собственности.',

        // Анализ рисков
        handbookRiskTitle: '⚠️ Анализ Рисков',
        handbookRiskVariance: '1. Краткосрочная волатильность: 95% RTP действует только после миллионов спинов. Удачливый игрок может истощить ваш пул до достижения ожидаемой прибыли.',
        handbookRiskOpportunityCost: '2. Альтернативные издержки: Требуется минимальный депозит 1М токенов. Эти средства заблокированы и не могут использоваться для других целей.',
        handbookRiskPlatformFee: '3. Фиксированная комиссия: 2% взимается с объёма, а не с прибыли. Если игроки выигрывают >98%, вы теряете деньги И платите комиссию.',
        handbookRiskTechnical: '4. Технический риск: Игроки могут сделать commit, но не reveal. Используйте settleExpiredCommit для возврата застрявших ставок (требует газ).',

        // Рекомендации по настройке
        handbookConfigTitle: '⚙️ Рекомендуемые Настройки',
        handbookConfigMaxBet: 'Max Bet: <1-2% от баланса пула — Предотвращает истощение 10-20% пула одним удачным спином',
        handbookConfigJackpot: 'Jackpot %: 1-3% — Накапливает джекпот из ставок игроков',
        handbookConfigStreak: 'Streak Protection: ВКЛЮЧИТЬ — Автоматическая пауза пула при резком росте потерь (защита от эксплойтов)',
        handbookConfigDynamic: 'Dynamic Max Bet: ВКЛЮЧИТЬ — Автоматическое снижение лимитов ставок при падении баланса пула',

        // Итог
        handbookSummaryTitle: '📋 Итог',
        handbookSummaryProfit: 'Прибыль: Стабильные ~3% от объёма при достаточном количестве игроков. Быть казино — это как предоставлять ликвидность для игры.',
        handbookSummaryRisk: 'Риск: В управлении банкроллом. Если Max Bet слишком высок относительно вашего пула, вы играете С игроками, а не ПРОТИВ них.',
    },
    id: {
        title: 'Dashboard House',
        subtitle: 'Kelola pool taruhan Anda',
        createPool: 'Buat Pool Baru',
        yourPools: 'Pool Anda',
        noPools: 'Anda belum memiliki pool',
        createFirst: 'Buat pool pertama Anda dan mulai dapatkan keuntungan!',
        requirements: 'Persyaratan',
        minDeposit: 'Minimum deposit',
        maxPools: 'Maks pool per pengguna',
        yourBalance: 'Saldo Anda',
        activePools: 'Total pool aktif',
        backToGame: 'Kembali ke Game',
        connectWalletDesc: 'Hubungkan dompet untuk mengelola pool',

        poolName: 'Nama Pool',
        initialDeposit: 'Deposit Awal',
        minBet: 'Bet Min',
        maxBet: 'Bet Maks',
        jackpotPercent: '% Jackpot',
        approve: 'Setujui',
        create: 'Buat',
        cancel: 'Batal',
        minDepositInfo: 'Minimum deposit',
        jackpotInfo: 'Persentase dari setiap taruhan yang ditambahkan ke pool jackpot',
        platformFee: 'Biaya platform: 2% dari setiap taruhan (tetap)',
        maxBetLimitInfo: 'Maks bet harus ≤ 10% dari deposit',
        charLimit: 'karakter',
        processing: 'Memproses...',
        approveAndCreate: 'Setujui & Buat',
        poolNamePlaceholder: 'Kasino Saya',
        minimum: 'Minimum',
        loadingPool: 'Memuat pool',
        minBetHint: 'Token minimum per putaran. Saran = Max Bet ÷ 100',
        maxBetHint: 'Max Bet ≤ Deposit ÷ 500. Menjamin pool dapat membayar hadiah tertinggi 450x. Contoh: Deposit 1 juta → Max bet 2.000',
        maxBetLimitError: 'Max Bet tidak boleh melebihi',

        statusActive: 'AKTIF',
        statusPaused: 'DITANGGUHKAN',
        poolId: 'Pool',
        created: 'Dibuat',
        official: 'RESMI',

        tabOverview: 'Ikhtisar',
        tabFunds: 'Dana',
        tabSettings: 'Pengaturan',
        tabDanger: 'Area Bahaya',

        tooltipBalance: 'Total dana dalam pool yang tersedia untuk membayar kemenangan pemain',
        tooltipJackpot: 'Jackpot yang terkumpul dari % taruhan. Menang dengan 5 simbol yang sama.',
        tooltipPending: 'Taruhan menunggu pengungkapan. Tidak dapat ditarik sebelum diungkapkan.',
        tooltipWithdrawable: 'Saldo Pool - Taruhan Tertunda - Pool Jackpot = Aman untuk ditarik',
        tooltipSpins: 'Total jumlah putaran di pool ini',
        tooltipVolume: 'Total jumlah taruhan di pool ini',
        tooltipProfit: 'Pendapatan pool: Total Taruhan - Total Pembayaran - Jackpot Menang',
        tooltipRTP: 'Return To Player: % taruhan yang dikembalikan sebagai kemenangan (lebih rendah = lebih untung)',

        statBalance: 'Saldo',
        statJackpotPool: 'Pool Jackpot',
        statPendingBets: 'Taruhan Tertunda',
        statWithdrawable: 'Dapat Ditarik',
        statTotalSpins: 'Total Putaran',
        statVolume: 'Volume',
        statProfit: 'Profit',
        statRTP: 'RTP',

        deposit: 'Deposit',
        withdraw: 'Tarik',
        available: 'Tersedia',
        amount: 'Jumlah',

        current: 'saat ini',
        updateSettings: 'Perbarui Pengaturan',

        pausePool: 'Tangguhkan Pool',
        activatePool: 'Aktifkan Pool',
        pauseDesc: 'Menangguhkan akan menghentikan putaran baru tetapi tetap mengizinkan pengungkapan dan pengembalian dana.',
        activateDesc: 'Mengaktifkan kembali akan memungkinkan pemain untuk memutar lagi.',
        transferOwnership: 'Transfer Kepemilikan',
        transferAddr: 'Alamat pemilik baru (0x...)',
        transferBtn: 'Transfer',
        closePoolTitle: 'Tutup Pool Permanen',
        closePoolDesc: 'Tindakan ini TIDAK DAPAT DIBATALKAN. Semua dana (termasuk jackpot) akan dikembalikan kepada Anda.',
        closePoolWarn: 'Tidak dapat ditutup jika ada taruhan yang tertunda.',
        confirmClose: 'Konfirmasi Tutup',
        settleTitle: 'Proses Taruhan Macet',
        settleDesc: 'Bersihkan commit kedaluwarsa pemain yang meninggalkan permainan. Dana kembali ke pool.',
        settleBtn: 'Proses & Lepaskan Dana',

        // Protection Tab
        tabProtection: 'Perlindungan',
        poolHealth: 'Kesehatan Pool',
        healthExcellent: 'Sangat Baik',
        healthGood: 'Baik',
        healthLow: 'Rendah',
        healthCritical: 'Kritis',
        effectiveMaxBet: 'Taruhan Maks Efektif',
        hourlyPayout: 'Pembayaran/Jam',
        loadingProtection: 'Memuat pengaturan perlindungan...',
        dynamicMaxBetTitle: 'Taruhan Maks Dinamis',
        dynamicMaxBetDesc: 'Secara otomatis mengurangi taruhan maks saat saldo pool rendah untuk melindungi dana.',
        enable: 'Aktifkan',
        lowBalanceThreshold: 'Ambang Saldo Rendah',
        criticalBalanceThreshold: 'Ambang Saldo Kritis',
        lowBalanceHint: 'Di level ini, taruhan maks berkurang menjadi 50%',
        criticalBalanceHint: 'Di level ini, taruhan maks berkurang menjadi 20%',
        streakProtectionTitle: 'Perlindungan Streak',
        streakProtectionDesc: 'Jeda otomatis pool jika pembayaran/jam melebihi batas.',
        hourlyPayoutLimit: 'Batas Pembayaran/Jam',
        hourlyPayoutHint: 'Pool dijeda jika pembayaran melebihi % ini per jam',
        emergencyWithdrawTitle: 'Penarikan Darurat',
        emergencyWithdrawDesc: 'Aktifkan mode darurat untuk menarik dana setelah periode pendinginan.',
        cooldownDuration: 'Durasi Pendinginan',
        cooldownHint: 'Waktu tunggu sebelum dapat menarik',
        triggerEmergency: 'Aktifkan Mode Darurat',
        emergencyWarning: 'Ini akan segera menjeda pool dan memulai timer pendinginan.',
        emergencyReady: '✅ Siap untuk menarik!',
        cancelEmergency: 'Batal',
        executeWithdraw: 'Tarik Sekarang',
        saveSettings: 'Simpan Pengaturan Perlindungan',

        dynamicMaxBetNote: 'Jika Saldo Pool turun di bawah Ambang Batas Rendah, Taruhan Maks berkurang menjadi 50%. Di bawah Kritis menjadi 20%.',
        streakProtectionNote: 'Jika total pembayaran dalam satu jam terakhir melebihi batas %, pool otomatis DIJEDA.',
        emergencyWithdrawNote: 'Mengaktifkan Mode Darurat. Pool segera DIJEDA. Anda harus menunggu periode cooldown berakhir sebelum menarik.',

        depositNote: 'Setor dana ke dalam pool kontrak pintar. Dana ini mendukung taruhan pemain. Hanya Pemilik Pool yang dapat menarik.',
        withdrawNote: 'Tarik likuiditas yang tidak terpakai. Anda tidak dapat menarik dana yang saat ini terkunci dalam taruhan tertunda atau pool Jackpot.',
        half: '1/2',
        third: '1/3',
        quarter: '1/4',
        all: 'Semua',

        guideBtn: 'Panduan Operator',
        guideTitle: 'Manual Pemilik House',
        guideIntro: 'Sebagai pemilik pool, Anda mendapat untung dari house edge. Anda adalah banknya.',
        guideOpTitle: 'Operasi',
        guideOpDesc: 'Buat pool, atur limit. Anda dapat menunda pool kapan saja.',
        guideRiskTitle: 'Manajemen Risiko',
        guideRiskDesc: "Gunakan 'Max Bet Dinamis' untuk menurunkan limit saat dana rendah.",
        guideTroubleTitle: 'Penyelesaian Masalah',
        guideTroubleDesc: "Jika pemain terputus, taruhan mungkin macet. Gunakan 'Penyelesaian Cepat' untuk mengembalikan dana.",
        guideParamsTitle: 'Parameter',
        guideParamsDesc: 'Taruhan Min >= 1. Taruhan Maks <= 10% dari deposit. Jackpot biasanya 1-5%.',
        guideStatsTitle: 'Metrik Utama',
        guideStatsDesc: 'RTP (Pengembalian ke Pemain) biasanya 95-99%. Volume = total taruhan. Keuntungan = taruhan - kemenangan.',
        guideEditTitle: 'Pengaturan',
        guideEditDesc: 'Anda dapat mengubah Taruhan Min/Maks dan % Jackpot kapan saja. Nama tidak dapat diubah.',

        // New Visual Enhancements
        alertLowBalance: 'Peringatan Saldo Rendah!',
        alertLowBalanceDesc: 'Dana pool rendah. Setor lagi untuk memastikan pembayaran berlanjut.',
        smartSettleTitle: 'Taruhan Tertunda Ditemukan',
        chartTitle: 'Kinerja Pool',
        statPayouts: 'Pembayaran',

        settleSubtitle: 'Alat pembersihan otomatis',
        recoverableLiquidity: 'Total Likuiditas Dapat Dipulihkan',
        pendingCommits: 'Commit Tertunda',
        noExpiredCommits: 'Tidak ada commit kedaluwarsa.',
        rescan: 'Pindai Ulang',
        fixAndRecover: 'Perbaiki & Pulihkan',
        processingStatus: 'Memproses...',

        // ============== BUKU PANDUAN PROFESIONAL ==============
        // Keamanan Kontrak
        handbookContractTitle: '🔐 Keamanan Kontrak',
        handbookContractAddr: 'Alamat Kontrak: 0x9c64c18d792eab435d1d921efac978f6a62da2d2',
        handbookContractSecurity: '⚠️ PENTING: Hanya Pemilik Pool yang dapat menarik dana dari pool mereka. Pemilik Kontrak TIDAK memiliki akses untuk menarik dana pool manapun.',
        handbookContractOwnerNote: 'Ketika Anda menyetor $BANMAO ke kontrak, hanya ANDA (pembuat pool) yang memiliki wewenang untuk menarik. Ini dijamin oleh smart contract.',
        handbookExplorerLink: '🔗 Verifikasi di OKX X Layer Explorer',

        // Analisis Keuntungan
        handbookProfitTitle: '📈 Analisis Keuntungan',
        handbookProfitIntro: 'Sebagai Pemilik Pool, Anda mendapatkan keuntungan dari house edge. Margin keuntungan yang diharapkan adalah 3% dari total volume.',
        handbookPlatformFee: '• Biaya Platform: 2% (dibayar ke pemilik kontrak)',
        handbookGlobalRTP: '• RTP Global: 95% (dikembalikan ke pemain jangka panjang)',
        handbookNetProfit: '• Keuntungan Bersih = 100% - 95% - 2% = 3%',
        handbookProfitExample: 'Contoh: Jika total taruhan melalui Pool = 100M token → Anda mendapatkan ~3M token',
        handbookProfitBenefits: 'Manfaat Tambahan: Kontrol atas minBet/maxBet, jackpotPercent, Pengaturan Perlindungan, dan hak kepemilikan penuh.',

        // Analisis Risiko
        handbookRiskTitle: '⚠️ Analisis Risiko',
        handbookRiskVariance: '1. Volatilitas Jangka Pendek: 95% RTP hanya berlaku setelah jutaan putaran. Pemain beruntung dapat menguras pool Anda sebelum mencapai keuntungan yang diharapkan.',
        handbookRiskOpportunityCost: '2. Biaya Kesempatan: Diperlukan setoran minimum 1M token. Dana ini terkunci dan tidak dapat digunakan untuk hal lain.',
        handbookRiskPlatformFee: '3. Biaya Platform Tetap: 2% dikenakan pada volume, bukan keuntungan. Jika pemain menang >98%, Anda rugi dan masih bayar biaya.',
        handbookRiskTechnical: '4. Risiko Teknis: Pemain mungkin commit tetapi tidak reveal. Gunakan settleExpiredCommit untuk memulihkan taruhan macet (memerlukan gas).',

        // Rekomendasi Konfigurasi
        handbookConfigTitle: '⚙️ Pengaturan yang Disarankan',
        handbookConfigMaxBet: 'Max Bet: <1-2% dari Saldo Pool — Mencegah satu putaran beruntung menguras 10-20% pool Anda',
        handbookConfigJackpot: 'Jackpot %: 1-3% — Membangun dana jackpot dari taruhan pemain',
        handbookConfigStreak: 'Streak Protection: AKTIFKAN — Auto-pause pool jika kerugian melonjak (perlindungan dari eksploitasi)',
        handbookConfigDynamic: 'Dynamic Max Bet: AKTIFKAN — Otomatis menurunkan batas taruhan saat saldo pool menurun',

        // Ringkasan
        handbookSummaryTitle: '📋 Ringkasan',
        handbookSummaryProfit: 'Keuntungan: Stabil ~3% dari volume dengan pemain yang cukup. Menjadi house seperti menyediakan likuiditas untuk game.',
        handbookSummaryRisk: 'Risiko: Terletak pada Manajemen Bankroll. Jika Max Bet terlalu tinggi relatif terhadap pool Anda, Anda berjudi DENGAN pemain, bukan MENJADI house.',
    }
};
