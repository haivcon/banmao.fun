import { SnakeStrings } from './types';

export const vi: SnakeStrings = {
    // Menu
    title: 'banmao+Snake',
    subtitle: '🎮 Rắn Săn Token • X Layer GameFi',
    startBtn: 'BẮT ĐẦU',
    spaceHint: '(Space)',

    // Legend
    legendCoin: '+10 điểm',
    legendXLayer: '+50 X Layer',
    legendObstacle: 'Tránh!',

    // HUD
    score: 'ĐIỂM',
    best: 'KỶ LỤC',
    gas: 'NĂNG LƯỢNG',
    time: 'THỜI GIAN',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',

    // Pause screen
    pauseTitle: 'TẠM DỪNG',
    continueBtn: 'Tiếp tục',
    menuBtn: 'Menu',

    // Game over
    gameOverTitle: 'GAME OVER',
    scoreLabel: 'ĐIỂM SỐ',
    claimBtn: 'NHẬN',
    playAgainBtn: 'Chơi lại',
    needMorePoints: 'Cần thêm {0} điểm (tối thiểu {1})',

    // Claim states
    processing: 'Đang xử lý...',
    claimSuccess: '🎉 Nhận thưởng thành công!',
    cancelledTx: 'Bạn đã hủy giao dịch',

    // Errors
    errGas: '⛽ Không đủ OKB để trả phí gas',
    errMinClaim: '📊 Chưa đủ điểm tối thiểu ({0})',
    errDailyLimit: '📅 Đã đạt giới hạn rút trong ngày',
    errSystemLimit: '⏰ Hệ thống đang quá tải',
    errSignature: '🔐 Chữ ký không hợp lệ',
    errFailed: '❌ Giao dịch thất bại',

    // Stats panel
    statsTitle: 'THỐNG KÊ',
    balance: 'Số dư',
    poolBalance: 'Quỹ thưởng',
    minClaim: 'Tối thiểu rút',
    systemLimit: 'Hạn mức hệ thống/giờ',
    systemLimitDesc: 'Bảo vệ bể thưởng',
    playerLimit: 'Hạn mức của bạn/ngày',
    playerLimitDesc: 'Chống cày cuốc',
    maxPerGame: 'Tối đa/lượt',
    minDonation: 'Tối thiểu donate',

    // Wallet
    connectWallet: 'Kết nối Ví',
    connectToPlay: 'Kết nối Ví để chơi',

    // Pool low warning
    poolLowTitle: '⚠️ Quỹ thưởng sắp hết!',
    poolLowMsg: 'Số tiền trong pool đã đến giới hạn. Cần có người ủng hộ để trò chơi được duy trì.',
    donateBtn: 'Gửi $BANMAO ủng hộ',

    // Stats tooltips
    balanceTooltip: 'Số dư token $BANMAO trong ví của bạn',
    poolTooltip: 'Tổng số token trong quỹ thưởng. Khi bạn claim điểm, token sẽ được chuyển từ pool này.',
    minClaimTooltip: 'Số điểm tối thiểu cần đạt để có thể claim thưởng. Dưới mức này bạn không thể rút.',
    maxPerGameTooltip: 'Số token tối đa bạn có thể nhận từ 1 lần chơi. Vượt quá sẽ bị giới hạn.',
    minDonationTooltip: 'Số token tối thiểu để xuất hiện trên bảng xếp hạng nhà tài trợ.',
    claimFrequency: 'Tần suất claim',
    claimFrequencyTooltip: 'Số lần claim tối đa mỗi người chơi mỗi giờ.',
    claimCooldown: 'Thời gian chờ',
    claimCooldownTooltip: 'Thời gian chờ (giây) giữa 2 lần claim liên tiếp.',
    systemLimitTooltip: 'Giới hạn tổng số token mà TẤT CẢ người chơi có thể claim trong 1 giờ. Bảo vệ pool khỏi bị rút hết.',
    playerLimitTooltip: 'Giới hạn số token BẠN có thể claim trong 1 ngày. Chống cày cuốc và đảm bảo công bằng.',

    // Community section
    communityTitle: '🌍 Cộng đồng Ủng hộ',
    communitySubtitle: 'Giúp $BANMAO lan tỏa ra khắp thế giới',
    communityDonateMsg: 'Gửi $BANMAO đến pool để duy trì phần thưởng cho người chơi. Không ai có thể rút token trừ khi chơi và có điểm.',
    communitySecurityTitle: 'Bảo mật & Minh bạch',
    communityFeature1: 'EIP-712 + Nonce: Chống giả mạo & replay attack',
    communityFeature2: 'Hourly/Daily Cap: Bảo vệ pool khỏi bot & hack',
    communityFeature3: 'Open Source: Mã nguồn công khai, minh bạch 100%',
    // Security Technologies
    secTechTitle: '🛡️ Công nghệ Bảo mật Đang hoạt động',
    secTech1: '🔐 Chữ ký EIP-712: Bằng chứng mật mã cho mỗi lần claim',
    secTech2: '🔑 HMAC Timestamp: Thời gian game xác thực bởi server',
    secTech3: '🧮 Score Checksum: Xác minh tính toàn vẹn điểm SHA-256',
    secTech4: '⏱️ Hệ thống Session: Phiên game dùng một lần',
    secTech5: '🛡️ Chống Bot: Phân tích phương sai thời gian di chuyển',
    secTech6: '🔒 Atomic Claims: Bảo vệ chống double-claim',
    secTech7: '📊 Rate Limiting: Giới hạn trượt theo IP + ví',
    secTech8: '🧬 Device Fingerprint: Phát hiện đa ví Sec-CH-UA',
    communityOpenSource: 'Hợp đồng đã verify trên XLayer Explorer',
    communityDeveloper: 'Developed by ＤＯＲＥＭＯＮ',
    communityFeedback: 'Góp ý & Báo lỗi qua X',
    communityWhaleIncentive: '💎 $BANMAO Holders: Hãy cùng xây dựng hệ sinh thái GameFi! Mọi đóng góp đều là phần thưởng trực tiếp cho người chơi.',
    communityBenefit1: 'Pool lớn hơn = Thu hút nhiều người chơi',
    communityBenefit2: 'Cộng đồng mạnh = Giá trị token tăng',
    communityBenefit3: '100% minh bạch - Chỉ claim từ game',
    communityContractLabel: 'Địa chỉ Hợp đồng Pool',
    communityCopyAddress: 'Sao chép địa chỉ đầy đủ',
    communityPoolInstructions: 'Gửi $BANMAO trực tiếp vào Pool:',
    communityClickToView: '🔗 Nhấn để xem trên Explorer',
    communityAddressCopied: '✅ Đã copy địa chỉ Pool! Hãy gửi $BANMAO vào đây',
    communityCopyPool: 'Copy địa chỉ Pool',

    // Leaderboard
    leaderboardTitle: 'Bảng xếp hạng',
    leaderboardEmpty: 'Chưa có người chơi',
    rank: 'Hạng',
    yourRank: 'Hạng của bạn',

    // Profile
    profileTitle: '👤 Chỉnh sửa hồ sơ',
    profileName: 'Tên hiển thị',
    profileAvatar: 'Chọn Avatar',
    profileTelegram: 'Telegram',
    profileTwitter: 'X (Twitter)',
    profileSave: 'Lưu',
    profileEdit: 'Sửa hồ sơ',

    // Profile edit limits
    editLimitReached: 'Đã hết lượt chỉnh sửa',
    profileSaved: 'Đã lưu hồ sơ!',
    editsRemaining: 'lượt còn lại',
    profileLocked: '🔒 Hồ sơ đã bị khóa',
    profileLockWarning: '⚠️ Bạn chỉ có thể chỉnh sửa hồ sơ 3 lần. Sau đó, hồ sơ sẽ bị khóa vĩnh viễn.',
    profileEditsUsed: 'lượt đã dùng',
    myProfileTitle: '👤 Hồ sơ cá nhân',
    viewProfile: 'Xem',
    editProfileBtn: 'Sửa',
    rankLabel: 'Hạng',
    needClaimFirst: 'Chơi và nhận thưởng trước để tạo hồ sơ',
    tooManyRequests: 'Quá nhiều yêu cầu. Vui lòng đợi một lát.',
    helpBtn: 'Hướng dẫn',
    settingsSubtitle: 'Tùy chỉnh trải nghiệm của bạn',

    // Game stats labels
    statsTime: 'Thời gian',
    statsCoins: 'Xu',
    statsMaxLength: 'Độ dài tối đa',

    // Donor leaderboard
    donorLeaderboard: 'Nhà Tài Trợ',
    donateNow: 'Donate $banmao',
    donorBadge: 'Huy hiệu Tài Trợ',
    totalDonated: 'Tổng đã Donate',
    donationCount: 'Số lần Donate',
    verifyDonation: 'Xác minh Donation của bạn',

    // Donor profile
    donorProfileTitle: 'Hồ sơ Nhà Tài Trợ',
    donorName: 'Tên',
    donorNotYet: 'Bạn chưa phải là nhà tài trợ. Donate để nhận badge!',
    donorEditProfile: 'Chỉnh sửa Hồ sơ',
    donorNoName: 'Chưa đặt tên',
    donorDonor: 'Nhà Tài Trợ',
    donorTimes: 'lần',
    donorScrollMore: 'Cuộn để xem thêm',
    donorNoDonors: 'Chưa có nhà tài trợ',
    donorBeFirst: 'Hãy là người đầu tiên!',
    donorVerifying: 'Đang xác minh...',
    donorVerifyBtn: 'Xác minh & Nhận Badge',
    donorNetworkError: 'Lỗi mạng',
    verifyYourDonation: 'Xác minh Donation của bạn',
    donateButton: 'Donate $banmao',

    // Donate UI (in-game)
    donateToPool: 'Donate $BANMAO vào Pool',
    donateBalanceLabel: 'Số dư',
    donateAmountPlaceholder: 'Số lượng',
    donateApproving: '⏳ Đang phê duyệt...',
    donateSigning: '📝 Ký xác nhận...',
    donatePending: '⏳ Đang donate...',
    donateDone: '✅ Hoàn tất!',
    donateThankYou: '✅ Cảm ơn bạn đã ủng hộ! 🎉',
    donateConnectWallet: '🔗 Kết nối ví để donate trực tiếp',
    donateHideDonors: 'Ẩn BXH Nhà Tài Trợ',
    donateTopDonors: 'Top Nhà Tài Trợ',
    donatePoolLabel: 'Pool',
    donateDonatedLabel: 'Đã Donate',
    donateDonorsLabel: 'Nhà Tài Trợ',
    donateOrSendDirectly: 'Hoặc gửi $BANMAO trực tiếp:',

    // Donor edit modal
    donorSaveBtn: '💾 Lưu',
    donorSaving: '⏳ Đang lưu...',
    donorCancelBtn: 'Hủy',
    donorNoAtPlaceholder: 'username (không có @)',
    gamefiViewExplorer: 'Xem trên Explorer',

    // Badge tier names
    badgeDiamond: 'Kim Cương',
    badgeGold: 'Vàng',
    badgeSilver: 'Bạc',
    badgeBronze: 'Đồng',
    badgeSupporter: 'Ủng Hộ',

    // Help modal
    helpFoodTypes: 'Loại Thức Ăn',
    helpCoinTitle: 'Xu (Token)',
    helpCoinDesc: '+10 điểm | +15 gas',
    helpPowerTitle: 'Năng lượng (Sét)',
    helpPowerDesc: '+50 điểm | +40 gas | Super Mode',
    helpObstacles: 'Chướng Ngại Vật',
    helpObstaclesDesc: 'Ô đỏ xuất hiện mỗi 15 giây. Chạm = Thua (trừ khi Super Mode).',
    helpGas: 'Hệ Thống Gas',
    helpGasDesc: 'Gas giảm khi di chuyển. Gas = 0 → Thua.',
    helpGasRefill: 'Thu thập thức ăn để nạp:',
    helpCombo: 'Combo Bonus',
    helpComboDesc: 'Ăn nhanh để nhân combo!',
    helpComboBonus: '+10% bonus mỗi cấp combo',
    helpComboReset: '(reset sau 2 giây).',
    helpSuperMode: 'Super Mode (5 giây)',
    helpSuperActivate: 'Kích hoạt bằng cách ăn ⚡:',
    helpSuperWall: 'Đi xuyên tường (bọc quanh)',
    helpSuperObstacle: 'Bỏ qua chướng ngại vật (bất tử)',
    helpSuperGlow: 'Viền phát sáng cyan trên rắn',
    helpControls: 'Dùng phím mũi tên / WASD / D-pad cảm ứng',

    // Milestone notifications
    newHighScore: 'KỶ LỤC MỚI!',
    scoreMilestone: 'CỘT MỐC ĐIỂM!',
    comboBonus: 'COMBO BONUS!',
    levelUp: 'LÊN CẤP!',
    points: 'điểm',

    // Player profile modal
    playerBestScore: 'Điểm cao nhất',
    playerTotal: 'Tổng điểm',
    playerClaims: 'Lần nhận',
    playerLastActive: 'Hoạt động cuối',
    // Claim History Panel
    claimHistoryTitle: '📋 Lịch sử claim',
    claimHistoryEmpty: 'Chưa có lịch sử claim',
    claimHistorySearchGuide: '🔍 Để tìm lịch sử claim, tìm kiếm trên Explorer',
    claimHistorySearchTip: '💡 Mẹo: Nhập "claimReward" để tìm tất cả giao dịch claim',
    claimHistoryCopy: 'Copy',
    claimHistoryCopied: 'Đã copy!',
    claimHistorySearchExplorer: '🌐 Tìm kiếm trên Explorer',
};
