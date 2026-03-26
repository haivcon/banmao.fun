// RPS Admin i18n - English & Vietnamese

export const rpsEn = {
    title: "RPS Admin Panel",
    subtitle: "Rock Paper Scissors on-chain game management",
    backToGame: "Back to Game",
    adminHub: "Admin Hub",
    connectWallet: "Connect Wallet Required",
    connectWalletDesc: "Please connect your wallet to view RPS game information.",

    // RpsTab content
    rps: {
        title: "RPS Game Settings",
        desc: "Rock Paper Scissors on-chain game",
        controls: "RPS Game Controls",
        info: "RPS is a fully on-chain PvP game. Game parameters are managed through the smart contract.",
        placeholder: "RPS contract is fully decentralized with no owner functions."
    },

    update: "Update",

    // Help documentation
    help: {
        title: "Help & Documentation",

        overview: "📊 About RPS Contract",
        overviewDesc: "BANMAO RPS is a fully decentralized Rock-Paper-Scissors game. The contract has NO owner functions - all game parameters (fee percentage, timeouts) are fixed in the code.",

        gameplay: "🎮 Game Flow",
        gameplayDesc: "1) Creator creates room with stake → 2) Opponent joins → 3) Both commit hashed choices → 4) Both reveal choices → 5) Winner takes pot minus 5% fee.",

        fees: "💰 Fee Structure",
        feesDesc: "The contract takes a fixed 5% fee on winnings. 100% goes to community wallet. There is no configurable fee - it's hardcoded for fairness."
    }
};

export const rpsVi = {
    title: "Bảng Điều Khiển RPS",
    subtitle: "Quản lý trò chơi Kéo Búa Bao on-chain",
    backToGame: "Quay Lại Game",
    adminHub: "Trang Admin Chính",
    connectWallet: "Cần Kết Nối Ví",
    connectWalletDesc: "Vui lòng kết nối ví để xem thông tin game RPS.",

    rps: {
        title: "Cài Đặt Game RPS",
        desc: "Trò chơi Kéo Búa Bao On-chain",
        controls: "Điều Khiển Game RPS",
        info: "RPS là game PvP hoàn toàn on-chain. Tham số game được quản lý qua smart contract.",
        placeholder: "Hợp đồng RPS hoàn toàn phi tập trung, không có chức năng owner."
    },

    update: "Cập Nhật",

    help: {
        title: "Trợ Giúp & Tài Liệu",

        overview: "📊 Về Hợp Đồng RPS",
        overviewDesc: "BANMAO RPS là trò chơi Kéo-Búa-Bao hoàn toàn phi tập trung. Hợp đồng KHÔNG CÓ chức năng owner - tất cả tham số game (% phí, thời gian chờ) được cố định trong code.",

        gameplay: "🎮 Luồng Game",
        gameplayDesc: "1) Người tạo tạo phòng với số cược → 2) Đối thủ tham gia → 3) Cả hai commit lựa chọn đã hash → 4) Cả hai reveal lựa chọn → 5) Người thắng nhận thưởng trừ 5% phí.",

        fees: "💰 Cấu Trúc Phí",
        feesDesc: "Hợp đồng thu phí cố định 5% trên số thắng. 100% phí đi vào ví cộng đồng. Không có phí cấu hình được - được hardcode để đảm bảo công bằng."
    }
};
