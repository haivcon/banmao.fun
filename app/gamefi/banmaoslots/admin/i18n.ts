// Slots Admin i18n - English & Vietnamese
// Complete translations for SlotsTab component

export const slotsEn = {
    title: "Slots Admin Panel",
    subtitle: "Manage BanmaoSlots smart contract",
    backToGame: "Back to Game",
    adminHub: "Admin Hub",
    connectWallet: "Connect Wallet Required",
    connectWalletDesc: "Please connect your wallet to access admin functions. Only contract owner can manage this panel.",

    // Balance Overview
    balance: {
        title: "Balance Overview",
        contract: "Contract Balance",
        contractHint: "Total tokens in contract",
        withdrawable: "Withdrawable",
        withdrawableHint: "= Contract - Pending - Jackpot",
        jackpot: "Jackpot Pool",
        jackpotHint: "Prize for 5 cats match",
        pending: "Pending Bets",
        pendingHint: "Tokens waiting for reveal"
    },

    // House Statistics
    stats: {
        title: "House Statistics",
        totalBets: "Total Bets",
        totalPayouts: "Total Payouts",
        spins: "Total Spins",
        houseEdge: "House Edge"
    },

    // Configuration
    config: {
        title: "Game Configuration",
        minBet: "Min Bet",
        minBetHint: "Minimum tokens per spin",
        maxBet: "Max Bet",
        maxBetHint: "Maximum exposure per game",
        maxSpins: "Spins/Min",
        maxSpinsHint: "Rate limit to prevent spam",
        jackpotPct: "Jackpot %",
        jackpotPctHint: "% of each bet goes to jackpot pool",
        expiryBlocks: "Expiry Blocks",
        expiryBlocksHint: "Blocks before commit can be refunded"
    },

    // Treasury
    treasury: {
        title: "Treasury Management",
        withdraw: "Withdraw Tokens",
        withdrawHint: "Withdraw to owner wallet (cannot withdraw pending/jackpot)",
        deposit: "Deposit to Jackpot",
        depositHint: "Approve first → then Deposit"
    },

    // Emergency Controls
    emergency: {
        title: "Emergency Controls",
        pause: "Pause",
        pauseHint: "Block all game transactions",
        unpause: "Unpause",
        clearCommit: "Clear Commit",
        clearCommitHint: "Refund player with stuck commit"
    },

    // Buttons
    buttons: {
        set: "Set",
        approve: "Approve",
        deposit: "Deposit",
        withdraw: "Withdraw",
        clear: "Clear"
    },

    // Status
    status: {
        active: "ACTIVE",
        paused: "PAUSED",
        accessDenied: "Access Denied",
        ownerOnly: "Only contract owner can access"
    },

    // Help (for standalone page)
    help: {
        title: "Help & Documentation"
    },

    // Multi-Pool Admin (new)
    platform: {
        title: "Platform Overview",
        contract: "Contract",
        status: "Status",
        active: "ACTIVE",
        paused: "PAUSED",
        platformFees: "Platform Fees",
        activePools: "Active Pools",
        platformPool: "Platform Pool",
        notCreated: "Not Created"
    },

    fees: {
        title: "Platform Fee Withdrawal",
        description: "Platform earns 2% of every bet. Current balance:",
        withdraw: "Withdraw Fees"
    },

    configMulti: {
        title: "Configuration Settings",
        minPoolDeposit: "Min Pool Deposit",
        maxPoolsPerUser: "Max Pools Per User",
        maxSpinsPerMin: "Max Spins Per Minute",
        commitExpiry: "Commit Expiry Blocks",
        update: "Update",
        updateRateLimit: "Update Rate Limit",
        updateExpiry: "Update Expiry"
    },

    emergencyMulti: {
        pauseContract: "Emergency Pause",
        unpauseContract: "Unpause Contract",
        pauseDescription: "Pausing will stop all new spins. Existing commits can still be revealed or refunded.",
        unpauseDescription: "Contract is currently paused. All spins are blocked. Click to resume operations."
    },

    platformPool: {
        title: "Create Platform Pool",
        description: "The official platform pool has not been created yet. Create it to start collecting platform fees.",
        poolName: "Pool Name",
        initialDeposit: "Initial Deposit",
        minBet: "Min Bet",
        maxBet: "Max Bet",
        jackpotPercent: "Jackpot %",
        create: "Create Platform Pool"
    },

    yourBalance: "Your Balance",
    processing: "Processing..."
};

export const slotsVi = {
    title: "Bảng Điều Khiển Slots",
    subtitle: "Quản lý hợp đồng thông minh BanmaoSlots",
    backToGame: "Quay Lại Game",
    adminHub: "Trang Admin Chính",
    connectWallet: "Cần Kết Nối Ví",
    connectWalletDesc: "Vui lòng kết nối ví để truy cập chức năng quản trị. Chỉ chủ sở hữu hợp đồng mới có thể quản lý.",

    // Tổng quan số dư
    balance: {
        title: "Tổng Quan Số Dư",
        contract: "Số Dư Contract",
        contractHint: "Tổng token trong contract",
        withdrawable: "Có Thể Rút",
        withdrawableHint: "= Contract - Pending - Jackpot",
        jackpot: "Pool Jackpot",
        jackpotHint: "Thưởng khi trúng 5 mèo",
        pending: "Cược Đang Chờ",
        pendingHint: "Token đang chờ reveal"
    },

    // Thống kê nhà cái
    stats: {
        title: "Thống Kê Nhà Cái",
        totalBets: "Tổng Cược",
        totalPayouts: "Tổng Trả",
        spins: "Lượt Quay",
        houseEdge: "Lợi Nhuận"
    },

    // Cấu hình
    config: {
        title: "Cấu Hình Game",
        minBet: "Cược Tối Thiểu",
        minBetHint: "Số token tối thiểu mỗi lượt quay",
        maxBet: "Cược Tối Đa",
        maxBetHint: "Giới hạn rủi ro mỗi ván",
        maxSpins: "Quay/Phút",
        maxSpinsHint: "Rate limit ngăn spam",
        jackpotPct: "% Jackpot",
        jackpotPctHint: "% mỗi cược vào pool jackpot",
        expiryBlocks: "Blocks Hết Hạn",
        expiryBlocksHint: "Số blocks trước khi có thể refund"
    },

    // Ngân quỹ
    treasury: {
        title: "Quản Lý Ngân Quỹ",
        withdraw: "Rút Token",
        withdrawHint: "Rút về ví owner (không rút được pending/jackpot)",
        deposit: "Nạp Jackpot",
        depositHint: "Approve trước → Deposit sau"
    },

    // Khẩn cấp
    emergency: {
        title: "Điều Khiển Khẩn Cấp",
        pause: "Tạm Dừng",
        pauseHint: "Chặn tất cả giao dịch game",
        unpause: "Mở Lại",
        clearCommit: "Xóa Commit",
        clearCommitHint: "Refund người chơi bị kẹt commit"
    },

    // Nút
    buttons: {
        set: "Đặt",
        approve: "Duyệt",
        deposit: "Nạp",
        withdraw: "Rút",
        clear: "Xóa"
    },

    // Trạng thái
    status: {
        active: "HOẠT ĐỘNG",
        paused: "TẠM DỪNG",
        accessDenied: "Truy Cập Bị Từ Chối",
        ownerOnly: "Chỉ owner contract mới có quyền"
    },

    // Trợ giúp
    help: {
        title: "Trợ Giúp & Tài Liệu"
    },

    // Multi-Pool Admin (mới)
    platform: {
        title: "Tổng Quan Platform",
        contract: "Contract",
        status: "Trạng Thái",
        active: "HOẠT ĐỘNG",
        paused: "TẠM DỪNG",
        platformFees: "Phí Platform",
        activePools: "Pool Hoạt Động",
        platformPool: "Pool Platform",
        notCreated: "Chưa Tạo"
    },

    fees: {
        title: "Rút Phí Platform",
        description: "Platform thu 2% mỗi cược. Số dư hiện tại:",
        withdraw: "Rút Phí"
    },

    configMulti: {
        title: "Cài Đặt Cấu Hình",
        minPoolDeposit: "Nạp Pool Tối Thiểu",
        maxPoolsPerUser: "Số Pool Tối Đa/User",
        maxSpinsPerMin: "Quay Tối Đa/Phút",
        commitExpiry: "Blocks Hết Hạn Commit",
        update: "Cập Nhật",
        updateRateLimit: "Cập Nhật Rate Limit",
        updateExpiry: "Cập Nhật Hết Hạn"
    },

    emergencyMulti: {
        pauseContract: "Tạm Dừng Khẩn Cấp",
        unpauseContract: "Mở Lại Contract",
        pauseDescription: "Tạm dừng sẽ chặn tất cả spin mới. Commit hiện có vẫn có thể reveal hoặc refund.",
        unpauseDescription: "Contract đang bị tạm dừng. Tất cả spin bị chặn. Click để mở lại."
    },

    platformPool: {
        title: "Tạo Pool Platform",
        description: "Pool platform chính thức chưa được tạo. Tạo để bắt đầu thu phí platform.",
        poolName: "Tên Pool",
        initialDeposit: "Nạp Ban Đầu",
        minBet: "Cược Tối Thiểu",
        maxBet: "Cược Tối Đa",
        jackpotPercent: "% Jackpot",
        create: "Tạo Pool Platform"
    },

    yourBalance: "Số Dư Của Bạn",
    processing: "Đang xử lý..."
};
