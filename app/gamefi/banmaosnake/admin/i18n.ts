// Snake Admin i18n - English & Vietnamese

export const snakeEn = {
    title: "Snake Admin Panel",
    subtitle: "Manage BanmaoSnake smart contract",
    backToGame: "Back to Game",
    adminHub: "Admin Hub",
    connectWallet: "Connect Wallet Required",
    connectWalletDesc: "Please connect your wallet to access admin functions. Only contract owner can manage this panel.",

    // SnakeTab expects these from parent's t object
    snake: {
        title: "Snake Game Settings",
        desc: "On-chain parameters (requires transaction)",
        minClaim: {
            label: "Min Claim Amount ($BANMAO)",
            hint: "Minimum tokens required to claim. If points × ratio < minClaim, player cannot claim. Default: 100 tokens"
        },
        caps: {
            title: "Rate Limiting Caps",
            desc: "Limit the number of tokens that can be claimed. Contract requires updating both together.",
            dailyPlayer: "Daily Player Cap ($BANMAO)",
            dailyHint: "Max tokens a wallet can claim per day. Default: 5,000",
            hourlySigner: "Hourly Signer Cap ($BANMAO)",
            hourlyHint: "Total tokens the system can sign per hour. Default: 50,000",
            updateBtn: "Update Both Caps"
        },
        signer: {
            title: "Signer Settings",
            desc: "Wallet address used to sign claim rewards. Backend uses this signer's private key.",
            current: "Current Signer",
            newAddress: "New Signer Address",
            updateBtn: "Update Signer",
            hint: "⚠️ After changing, update SIGNER_PRIVATE_KEY in .env"
        },
        danger: {
            title: "Danger Zone",
            desc: "WARNING: These actions are irreversible!",
            currentOwner: "Current Owner",
            transferInput: "Transfer Ownership",
            transferBtn: "Transfer",
            hint: "🔴 AFTER TRANSFER, YOU LOSE CONTROL OF THE CONTRACT!",
            emergencyTitle: "🚨 Emergency Withdraw",
            emergencyTo: "Recipient Address",
            emergencyAmount: "Amount ($BANMAO)",
            emergencyBtn: "🚨 Withdraw",
            emergencyHint: "Sends $BANMAO from contract to specified address"
        },
        maxClaimPerGame: {
            label: "Max Claim Per Game ($BANMAO)",
            hint: "Maximum tokens claimable per single game. Default: 2,000"
        },
        minDonation: {
            label: "Min Donation For Listing ($BANMAO)",
            hint: "Minimum donation to appear in donor leaderboard. Default: 10"
        },
        paused: "Contract PAUSED",
        running: "Contract RUNNING",
        pauseHint: "Pause disables claimReward and donate",
        pauseBtn: "⏸ Pause",
        unpauseBtn: "▶ Unpause",
        backend: {
            title: "Backend Settings",
            desc: "Server-side parameters (no transaction required)",
            ratio: "Points to Token Ratio",
            ratioHint: "1 point = X tokens",
            maxClaims: "Max Claims Per Hour",
            maxClaimsHint: "claims/hour",
            rateLimit: "Rate Limit Window (minutes)",
            rateLimitHint: "minutes"
        }
    },

    update: "Update",
    save: "Save",
    current: "Current",

    // Help documentation
    help: {
        title: "Help & Documentation",
        minClaim: "💰 Minimum Claim Amount",
        minClaimDesc: "Players must earn enough points to reach this minimum before they can claim rewards. Prevents spam and gas waste for tiny amounts.",
        caps: "📊 Rate Limiting Caps",
        dailyCapDesc: "Maximum tokens any single wallet can claim per 24 hours. Prevents abuse.",
        hourlyCapDesc: "Maximum total tokens the system can distribute per hour. Protects contract liquidity.",
        signer: "🔐 Signer Address",
        signerDesc: "The wallet that signs reward claims. Backend server holds this wallet's private key. Update very carefully!",
        danger: "⚠️ Danger Zone",
        dangerDesc: "Transferring ownership gives complete control to new address. Current owner loses all access permanently."
    }
};

export const snakeVi = {
    title: "Bảng Điều Khiển Snake",
    subtitle: "Quản lý hợp đồng thông minh BanmaoSnake",
    backToGame: "Quay Lại Game",
    adminHub: "Trang Admin Chính",
    connectWallet: "Cần Kết Nối Ví",
    connectWalletDesc: "Vui lòng kết nối ví để truy cập chức năng quản trị. Chỉ chủ sở hữu hợp đồng mới có thể quản lý.",

    snake: {
        title: "Cài Đặt Game Rắn",
        desc: "Tham số On-chain (yêu cầu giao dịch)",
        minClaim: {
            label: "Mức Claim Tối Thiểu ($BANMAO)",
            hint: "Số token tối thiểu để rút. Nếu điểm × tỷ lệ < mức tối thiểu, người chơi không thể rút. Mặc định: 100 token"
        },
        caps: {
            title: "Giới Hạn Tốc Độ (Caps)",
            desc: "Giới hạn số token có thể rút. Hợp đồng yêu cầu cập nhật cả hai cùng lúc.",
            dailyPlayer: "Giới Hạn Người Chơi/Ngày ($BANMAO)",
            dailyHint: "Số token tối đa một ví có thể rút mỗi ngày. Mặc định: 5,000",
            hourlySigner: "Giới Hạn Signer/Giờ ($BANMAO)",
            hourlyHint: "Tổng số token hệ thống có thể ký mỗi giờ. Mặc định: 50,000",
            updateBtn: "Cập Nhật Cả Hai"
        },
        signer: {
            title: "Cài Đặt Signer",
            desc: "Địa chỉ ví dùng để ký giao dịch trả thưởng. Backend sử dụng private key của signer này.",
            current: "Signer Hiện Tại",
            newAddress: "Địa Chỉ Signer Mới",
            updateBtn: "Cập Nhật Signer",
            hint: "⚠️ Sau khi đổi, cần cập nhật SIGNER_PRIVATE_KEY trong .env"
        },
        danger: {
            title: "Vùng Nguy Hiểm",
            desc: "CẢNH BÁO: Các hành động này không thể hoàn tác!",
            currentOwner: "Chủ Sở Hữu Hiện Tại",
            transferInput: "Chuyển Quyền Sở Hữu",
            transferBtn: "Chuyển Giao",
            hint: "🔴 SAU KHI CHUYỂN, BẠN SẼ MẤT QUYỀN KIỂM SOÁT HỢP ĐỒNG!",
            emergencyTitle: "🚨 Rút Khẩn Cấp",
            emergencyTo: "Địa Chỉ Nhận",
            emergencyAmount: "Số Lượng ($BANMAO)",
            emergencyBtn: "🚨 Rút",
            emergencyHint: "Gửi $BANMAO từ hợp đồng đến địa chỉ chỉ định"
        },
        maxClaimPerGame: {
            label: "Tối Đa Mỗi Ván ($BANMAO)",
            hint: "Số token tối đa có thể rút mỗi ván. Mặc định: 2,000"
        },
        minDonation: {
            label: "Donate Tối Thiểu Để Lên Bảng ($BANMAO)",
            hint: "Mức donate tối thiểu để xuất hiện trên bảng xếp hạng. Mặc định: 10"
        },
        paused: "Hợp Đồng ĐÃ TẠM DỮNG",
        running: "Hợp Đồng ĐANG HOẠT ĐỘNG",
        pauseHint: "Tạm dừng sẽ vô hiệu hóa claimReward và donate",
        pauseBtn: "⏸ Tạm Dừng",
        unpauseBtn: "▶ Tiếp Tục",
        backend: {
            title: "Cài Đặt Backend",
            desc: "Tham số phía máy chủ (không cần giao dịch)",
            ratio: "Tỷ Lệ Điểm đổi Token",
            ratioHint: "1 điểm = X token",
            maxClaims: "Số Lượt Claim Tối Đa/Giờ",
            maxClaimsHint: "lượt/giờ",
            rateLimit: "Cửa Sổ Giới Hạn (phút)",
            rateLimitHint: "phút"
        }
    },

    update: "Cập Nhật",
    save: "Lưu",
    current: "Hiện Tại",

    help: {
        title: "Trợ Giúp & Tài Liệu",
        minClaim: "💰 Mức Claim Tối Thiểu",
        minClaimDesc: "Người chơi phải đạt đủ điểm để tới mức tối thiểu này trước khi rút thưởng. Ngăn spam và lãng phí gas cho số lượng nhỏ.",
        caps: "📊 Giới Hạn Tốc Độ",
        dailyCapDesc: "Số token tối đa mà một ví có thể rút trong 24 giờ. Ngăn lạm dụng.",
        hourlyCapDesc: "Tổng số token hệ thống có thể phân phối mỗi giờ. Bảo vệ thanh khoản hợp đồng.",
        signer: "🔐 Địa Chỉ Signer",
        signerDesc: "Ví ký các yêu cầu rút thưởng. Server backend giữ private key của ví này. Cập nhật rất cẩn thận!",
        danger: "⚠️ Vùng Nguy Hiểm",
        dangerDesc: "Chuyển quyền sở hữu sẽ trao toàn quyền kiểm soát cho địa chỉ mới. Chủ hiện tại mất quyền truy cập vĩnh viễn."
    }
};
