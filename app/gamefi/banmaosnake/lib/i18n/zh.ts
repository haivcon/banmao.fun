import { SnakeStrings } from './types';

export const zh: SnakeStrings = {
    // Menu
    title: 'banmao+Snake',
    subtitle: '🎮 贪吃蛇猎币 • X Layer GameFi',
    startBtn: '开始',
    spaceHint: '(空格)',

    // Legend
    legendCoin: '+10分',
    legendXLayer: '+50 X Layer',
    legendObstacle: '躲避!',

    // HUD
    score: '得分',
    best: '最高',
    gas: '燃料',
    time: '时间',
    pause: '暂停',
    resume: '继续',

    // Pause screen
    pauseTitle: '暂停',
    continueBtn: '继续',
    menuBtn: '菜单',

    // Game over
    gameOverTitle: '游戏结束',
    scoreLabel: '得分',
    claimBtn: '领取',
    playAgainBtn: '再玩一次',
    needMorePoints: '还需 {0} 分 (最低 {1})',

    // Claim states
    processing: '处理中...',
    claimSuccess: '🎉 领取成功!',
    cancelledTx: '交易已取消',

    // Errors
    errGas: '⛽ OKB不足',
    errMinClaim: '📊 未达最低要求 ({0})',
    errDailyLimit: '📅 已达每日限额',
    errSystemLimit: '⏰ 系统繁忙',
    errSignature: '🔐 签名无效',
    errFailed: '❌ 交易失败',

    // Stats panel
    statsTitle: '统计',
    balance: '余额',
    poolBalance: '奖池',
    minClaim: '最低领取',
    systemLimit: '系统限额/时',
    systemLimitDesc: '保护奖池',
    playerLimit: '您的限额/天',
    playerLimitDesc: '防刷机制',
    maxPerGame: '每局上限',
    minDonation: '最低捐赠',

    // Wallet
    connectWallet: '连接钱包',
    connectToPlay: '连接钱包开始游戏',

    // Pool low warning
    poolLowTitle: '⚠️ 奖池即将耗尽!',
    poolLowMsg: '奖池余额已达到上限，需要赞助者支持来维持游戏运行。',
    donateBtn: '捐赠 $BANMAO',

    // Stats tooltips
    balanceTooltip: '您钱包中的 $BANMAO 代币余额',
    poolTooltip: '奖池中的代币总量。领取奖励时，代币将从此池转出。',
    minClaimTooltip: '领取奖励所需的最低分数。低于此门槛无法提取。',
    maxPerGameTooltip: '每局游戏可获得的最大代币数。超出将被限制。',
    minDonationTooltip: '出现在捐赠者排行榜上的最低捐赠额。',
    claimFrequency: '领取频率',
    claimFrequencyTooltip: '每位玩家每小时最大领取次数。',
    claimCooldown: '冷却时间',
    claimCooldownTooltip: '两次连续领取之间的等待时间（秒）。',
    systemLimitTooltip: '所有玩家每小时可领取的最大代币数。保护奖池不被耗尽。',
    playerLimitTooltip: '您每天可领取的最大代币数。防止刷分，确保公平分配。',

    // Community section
    communityTitle: '🌍 社区支持',
    communitySubtitle: '帮助 $BANMAO 传播全球',
    communityDonateMsg: '向奖池发送 $BANMAO 以维持玩家奖励。除非玩游戏获得积分，否则无人可提取。',
    communitySecurityTitle: '安全与透明',
    communityFeature1: 'EIP-712 + Nonce: 防伪造和重放攻击',
    communityFeature2: '每小时/每日上限: 保护奖池免受机器人攻击',
    communityFeature3: '开源: 100% 透明已验证代码',
    // Security Technologies
    secTechTitle: '🛡️ 活跃安全技术',
    secTech1: '🔐 EIP-712签名：每次领取的加密证明',
    secTech2: '🔑 HMAC时间戳：服务器认证的游戏时间',
    secTech3: '🧮 分数校验：SHA-256分数完整性验证',
    secTech4: '⏱️ 会话系统：一次性游戏会话',
    secTech5: '🛡️ 反机器人：移动计时方差分析(CoV)',
    secTech6: '🔒 原子领取：竞态条件防护',
    secTech7: '📊 速率限制：IP+钱包滑动窗口',
    secTech8: '🧬 设备指纹：Sec-CH-UA多钱包检测',
    communityOpenSource: '合约已在 XLayer Explorer 验证',
    communityDeveloper: 'Developed by ＤＯＲＥＭＯＮ',
    communityFeedback: '反馈和错误报告请通过 X',
    communityWhaleIncentive: '💎 $BANMAO 持有者：帮助建设我们的 GameFi 生态！每一笔贡献都将直接奖励玩家。',
    communityBenefit1: '奖池增长 = 吸引更多玩家',
    communityBenefit2: '社区更强 = 代币价值增长',
    communityBenefit3: '100% 透明 - 仅限游戏领取',
    communityContractLabel: '奖池合约地址',
    communityCopyAddress: '复制完整地址',
    communityPoolInstructions: '直接发送 $BANMAO 到奖池:',
    communityClickToView: '🔗 点击在Explorer查看',
    communityAddressCopied: '✅ 奖池地址已复制！发送 $BANMAO 到此地址',
    communityCopyPool: '复制奖池地址',

    // Leaderboard
    leaderboardTitle: '排行榜',
    leaderboardEmpty: '暂无玩家',
    rank: '排名',
    yourRank: '您的排名',

    // Profile
    profileTitle: '👤 编辑资料',
    profileName: '显示名称',
    profileAvatar: '选择头像',
    profileTelegram: 'Telegram',
    profileTwitter: 'X (Twitter)',
    profileSave: '保存',
    profileEdit: '编辑资料',

    // Profile edit limits
    editLimitReached: '编辑次数已用完',
    profileSaved: '资料已保存！',
    editsRemaining: '次剩余',
    profileLocked: '🔒 资料已锁定',
    profileLockWarning: '⚠️ 您只能编辑资料3次。之后，您的资料将被永久锁定。',
    profileEditsUsed: '次已用',
    myProfileTitle: '👤 我的资料',
    viewProfile: '查看',
    editProfileBtn: '编辑',
    rankLabel: '排名',
    needClaimFirst: '先玩游戏并领取奖励以创建资料',
    tooManyRequests: '请求太频繁，请稍候再试。',
    helpBtn: '游戏指南',
    settingsSubtitle: '自定义您的体验',

    // Game stats labels
    statsTime: '时间',
    statsCoins: '金币',
    statsMaxLength: '最大长度',

    // Donor leaderboard
    donorLeaderboard: '捐赠者',
    donateNow: 'Donate $banmao',
    donorBadge: '捐赠者徽章',
    totalDonated: '总捐赠',
    donationCount: '捐赠次数',
    verifyDonation: '验证您的捐赠',

    // Donor profile
    donorProfileTitle: '捐赠者资料',
    donorName: '名称',
    donorNotYet: '您还不是捐赠者。捐赠以获得徽章！',
    donorEditProfile: '编辑资料',
    donorNoName: '未设置名称',
    donorDonor: '捐赠者',
    donorTimes: '次',
    donorScrollMore: '滚动查看更多',
    donorNoDonors: '暂无捐赠者',
    donorBeFirst: '成为第一个！',
    donorVerifying: '验证中...',
    donorVerifyBtn: '验证并获取徽章',
    donorNetworkError: '网络错误',
    verifyYourDonation: '验证您的捐赠',
    donateButton: '捐赠 $banmao',

    // Donate UI (in-game)
    donateToPool: '捐赠 $BANMAO 到游戏池',
    donateBalanceLabel: '余额',
    donateAmountPlaceholder: '数量',
    donateApproving: '⏳ 授权中...',
    donateSigning: '📝 签名中...',
    donatePending: '⏳ 捐赠中...',
    donateDone: '✅ 完成！',
    donateThankYou: '✅ 感谢您的捐赠！🎉',
    donateConnectWallet: '🔗 连接钱包直接捐赠',
    donateHideDonors: '隐藏捐赠排行榜',
    donateTopDonors: '捐赠排行',
    donatePoolLabel: '奖池',
    donateDonatedLabel: '已捐赠',
    donateDonorsLabel: '捐赠者',
    donateOrSendDirectly: '或直接发送 $BANMAO：',

    // Donor edit modal
    donorSaveBtn: '💾 保存',
    donorSaving: '⏳ 保存中...',
    donorCancelBtn: '取消',
    donorNoAtPlaceholder: '用户名 (不带@)',
    gamefiViewExplorer: '在浏览器查看',

    // Badge tier names
    badgeDiamond: '钻石',
    badgeGold: '金牌',
    badgeSilver: '银牌',
    badgeBronze: '铜牌',
    badgeSupporter: '支持者',

    // Help modal
    helpFoodTypes: '食物类型',
    helpCoinTitle: '金币 (Token)',
    helpCoinDesc: '+10 分 | +15 燃料',
    helpPowerTitle: '能量 (闪电)',
    helpPowerDesc: '+50 分 | +40 燃料 | 超级模式',
    helpObstacles: '障碍物',
    helpObstaclesDesc: '红色方块每15秒出现。碰到 = 游戏结束 (超级模式除外)。',
    helpGas: '燃料系统',
    helpGasDesc: '移动时燃料减少。燃料 = 0 → 游戏结束。',
    helpGasRefill: '收集食物补充:',
    helpCombo: '连击奖励',
    helpComboDesc: '快速吃食物获得连击加成!',
    helpComboBonus: '每级连击+10%奖励',
    helpComboReset: '(2秒后重置)。',
    helpSuperMode: '超级模式 (5秒)',
    helpSuperActivate: '吃 ⚡ 能量激活:',
    helpSuperWall: '穿墙 (环绕)',
    helpSuperObstacle: '无视障碍物 (无敌)',
    helpSuperGlow: '蛇身青色发光边框',
    helpControls: '使用方向键 / WASD / 触摸方向盘移动',

    // Milestone notifications
    newHighScore: '新纪录!',
    scoreMilestone: '里程碑达成!',
    comboBonus: '连击奖励!',
    levelUp: '升级!',
    points: '分',

    // Player profile modal
    playerBestScore: '最高分',
    playerTotal: '总分',
    playerClaims: '领取次数',
    playerLastActive: '最后活跃',
    // Claim History Panel
    claimHistoryTitle: '📋 领取历史',
    claimHistoryEmpty: '暂无领取记录',
    claimHistorySearchGuide: '🔍 查找领取历史，请在Explorer搜索',
    claimHistorySearchTip: '💡 提示：输入 "claimReward" 查找所有领取交易',
    claimHistoryCopy: '复制',
    claimHistoryCopied: '已复制！',
    claimHistorySearchExplorer: '🌐 在Explorer搜索',
};
