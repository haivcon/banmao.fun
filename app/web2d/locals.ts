export type Language = "en" | "vi" | "zh" | "ko" | "ru" | "id";

export type Web2DTabKey = "overview" | "gamefi" | "defi" | "collection" | "community" | "token";

export type Web2DFallbackCardStatus = "live" | "soon";

export type Web2DFallbackCard = {
    href: string;
    label: string;
    desc: string;
    icon: string;
    status: string;
    statusType: Web2DFallbackCardStatus;
    meta?: string;
};

export type Web2DQuickAccessKey = "stats" | "price" | "mission" | "settings";

export type Web2DFallbackCopy = {
    eyebrow: string;
    title: string;
    subtitleManual: string;
    subtitleAuto: string;
    reasonPrefix: string;
    statsTitle: string;
    footer: string;
    launchApp: string;
    openTab: string;
    live: string;
    comingSoon: string;
    synced: string;
    lowMotion: string;
    fastLoad: string;
    fullAccess: string;
    logoSubtitle: string;
    primaryNavDesc: Record<"gamefi" | "defi", string>;
    quickAccessLabels: Record<Web2DQuickAccessKey, string>;
    ariaLabels: {
        experience: string;
        home: string;
        settings: string;
        selectLanguage: string;
        hierarchicalNavigation: string;
        quickLinks: string;
        featureTabs: string;
        synchronizedLinks: string;
        informationPanels: string;
        footerLinks: string;
    };
    tabs: Record<Web2DTabKey, string>;
    sectionTitles: Record<Web2DTabKey, string>;
    sectionDesc: Record<Web2DTabKey, string>;
    stats: Array<{ label: string; value: string; tone: string }>;
    cards: Record<Web2DTabKey, Web2DFallbackCard[]>;
    highlights: Array<{ title: string; desc: string; icon: string }>;
};

const makeCopy = (
    base: Omit<Web2DFallbackCopy, "cards" | "stats" | "highlights">,
    status: { live: string; soon: string; synced: string; lowMotion: string; fastLoad: string; fullAccess: string },
    cards: Omit<Record<Web2DTabKey, Web2DFallbackCard[]>, never>,
): Web2DFallbackCopy => ({
    ...base,
    stats: [
        { label: base.tabs.overview, value: "2D", tone: status.lowMotion },
        { label: "FPS", value: "60+", tone: status.fastLoad },
        { label: "Tabs", value: "6", tone: status.synced },
        { label: "Access", value: "100%", tone: status.fullAccess },
    ],
    highlights: [
        { title: status.lowMotion, desc: base.sectionDesc.overview, icon: "bolt" },
        { title: status.synced, desc: base.sectionDesc.token, icon: "compass" },
        { title: status.fullAccess, desc: base.sectionDesc.gamefi, icon: "sparkles" },
    ],
    cards,
});

export const web2dFallbackCopies: Record<Language, Web2DFallbackCopy> = {
    en: makeCopy({
        eyebrow: "2D COMMAND CENTER",
        title: "Banmao Nebula Lite",
        subtitleManual: "Professional 2D mode is active. Every core 3D feature is mirrored as a faster, cleaner dashboard.",
        subtitleAuto: "Your device is using the lightweight 2D experience for smoother performance while keeping full navigation.",
        reasonPrefix: "System note:",
        statsTitle: "Live access",
        footer: "2D mode keeps every main function available with lower motion, faster loading and better mobile readability.",
        launchApp: "Open",
        openTab: "Open section",
        live: "Live",
        comingSoon: "Soon",
        synced: "Synced",
        lowMotion: "Low motion",
        fastLoad: "Fast load",
        fullAccess: "Full access",
        logoSubtitle: "2D Command",
        primaryNavDesc: {
            gamefi: "RPS · Snake · Slots · FOMO",
            defi: "Staking · Burn · Airdrop · Pools",
        },
        quickAccessLabels: {
            stats: "Stats",
            price: "Price",
            mission: "Mission",
            settings: "Settings",
        },
        ariaLabels: {
            experience: "Banmao 2D experience",
            home: "Banmao home",
            settings: "Settings",
            selectLanguage: "Select language",
            hierarchicalNavigation: "Hierarchical navigation",
            quickLinks: "Small quick links",
            featureTabs: "2D feature tabs",
            synchronizedLinks: "Banmao synchronized 2D links",
            informationPanels: "2D information panels",
            footerLinks: "Banmao footer links",
        },
        tabs: { overview: "Overview", gamefi: "GameFi", defi: "DeFi", collection: "Collection", community: "Community", token: "Token" },
        sectionTitles: { overview: "Synchronized 2D dashboard", gamefi: "GameFi modules", defi: "DeFi utilities", collection: "Collection portal", community: "Community links", token: "Token intelligence" },
        sectionDesc: {
            overview: "All important 3D destinations are arranged as readable 2D cards.",
            gamefi: "Play hub, RPS, Snake, Slots and FOMO.",
            defi: "Staking, burn, airdrop, launchpad, pools, farming and lending panels.",
            collection: "NFT gallery, mascot assets and collection navigation.",
            community: "Social links, missions and app install actions.",
            token: "Token stats, price feed, burn tracker, distribution and contract information.",
        },
    }, { live: "Live", soon: "Soon", synced: "Synced", lowMotion: "Low motion", fastLoad: "Fast load", fullAccess: "Full access" }, {
        overview: [
            { href: "/gamefi", label: "GameFi Hub", desc: "Play hub, RPS, Snake, Slots and FOMO.", icon: "gamepad", status: "Live", statusType: "live", meta: "RPS · Snake · Slots" },
            { href: "/defi", label: "DeFi Hub", desc: "Staking, burn, airdrop, launchpad, pools, farming and lending panels.", icon: "diamond", status: "Live", statusType: "live", meta: "Stake · Burn · Airdrop" },
            { href: "/collection", label: "Collection", desc: "NFT gallery, mascot assets and collection navigation.", icon: "gallery", status: "Live", statusType: "live", meta: "NFT Portal" },
            { href: "/defi/staking", label: "Staking", desc: "Stake, unstake, claim and compound rewards.", icon: "seedling", status: "Live", statusType: "live", meta: "Rewards" },
        ],
        gamefi: [
            { href: "/gamefi", label: "Rock Paper Scissors", desc: "On-chain PvP battle with fast entry.", icon: "fist", status: "Live", statusType: "live", meta: "RPS" },
            { href: "/gamefi/snake", label: "BanMao Snake", desc: "Arcade score chase and leaderboard.", icon: "snake", status: "Live", statusType: "live", meta: "Arcade" },
            { href: "/gamefi/slots", label: "Slots Multi Pool", desc: "Spin, jackpot pools and reward rounds.", icon: "slots", status: "Live", statusType: "live", meta: "Jackpot" },
            { href: "/gamefi/fomo", label: "BanMao FOMO", desc: "Timer-based community game.", icon: "flame", status: "Live", statusType: "live", meta: "FOMO" },
        ],
        defi: [
            { href: "/defi/staking", label: "Staking", desc: "Lock BANMAO, claim and compound rewards.", icon: "seedling", status: "Live", statusType: "live", meta: "APY" },
            { href: "/defi", label: "Burn Tracker", desc: "Community burn utility and history.", icon: "flame", status: "Live", statusType: "live", meta: "Deflation" },
            { href: "/defi", label: "Airdrop", desc: "Eligibility, missions and reward distribution.", icon: "parachute", status: "Live", statusType: "live", meta: "Missions" },
            { href: "/defi/launchpad", label: "Launchpad", desc: "Future Banmao launch utilities.", icon: "rocket", status: "Soon", statusType: "soon", meta: "Roadmap" },
            { href: "/defi", label: "Pools", desc: "Liquidity pool gateway in 2D format.", icon: "droplet", status: "Soon", statusType: "soon", meta: "LP" },
            { href: "/defi", label: "Farming", desc: "Yield farm cards mirrored from 3D.", icon: "wheat", status: "Soon", statusType: "soon", meta: "Farm" },
            { href: "/defi", label: "Lending", desc: "Future lending module placeholder.", icon: "bank", status: "Soon", statusType: "soon", meta: "Credit" },
        ],
        collection: [
            { href: "/collection", label: "Banmao Gallery", desc: "Open the NFT collection portal.", icon: "gallery", status: "Live", statusType: "live", meta: "Gallery" },
            { href: "/collection", label: "Mascot Assets", desc: "Brand and mascot collection access.", icon: "cat", status: "Live", statusType: "live", meta: "Assets" },
            { href: "/collection", label: "Community Collectibles", desc: "Holder-focused 2D collection cards.", icon: "sparkles", status: "Live", statusType: "live", meta: "Collect" },
        ],
        community: [
            { href: "https://x.com/banmao_x", label: "X / Twitter", desc: "Follow Banmao announcements.", icon: "x", status: "Live", statusType: "live", meta: "Social" },
            { href: "https://t.me/banmaofun", label: "Telegram", desc: "Join real-time community chat.", icon: "chat", status: "Live", statusType: "live", meta: "Chat" },
            { href: "https://x.com/banmao_x", label: "Mission Board", desc: "Follow community quests and campaign posts on X.", icon: "target", status: "Live", statusType: "live", meta: "Missions" },
            { href: "/", label: "Open App", desc: "Return to the PWA-ready lightweight web app.", icon: "download", status: "Live", statusType: "live", meta: "PWA" },
        ],
        token: [
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Token Stats", desc: "Verified BANMAO supply, holders and transfers on the X Layer explorer.", icon: "chart-bar", status: "Live", statusType: "live", meta: "Stats" },
            { href: "https://app.uniswap.org/swap?outputCurrency=0x16d91d1615fc55b76d5f92365bd60c069b46ef78&chain=xlayer", label: "Buy BANMAO", desc: "Open the BANMAO swap route on X Layer.", icon: "trending-up", status: "Live", statusType: "live", meta: "Swap" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Holder Distribution", desc: "Review holders, transfers and distribution from explorer data.", icon: "pie", status: "Live", statusType: "live", meta: "Holders" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Contract Info", desc: "Open the verified BANMAO token contract on OKX Explorer.", icon: "search", status: "Live", statusType: "live", meta: "Contract" },
        ],
    }),
    vi: makeCopy({
        eyebrow: "TRUNG TÂM ĐIỀU KHIỂN 2D",
        title: "Banmao Nebula Lite",
        subtitleManual: "Chế độ 2D chuyên nghiệp đang bật. Mọi chức năng cốt lõi của website 3D được đồng bộ thành dashboard nhanh và gọn hơn.",
        subtitleAuto: "Thiết bị của bạn đang dùng trải nghiệm 2D nhẹ để chạy mượt hơn nhưng vẫn giữ đầy đủ điều hướng.",
        reasonPrefix: "Ghi chú hệ thống:",
        statsTitle: "Truy cập nhanh",
        footer: "Chế độ 2D giữ đầy đủ chức năng chính, giảm chuyển động, tải nhanh hơn và dễ đọc hơn trên di động.",
        launchApp: "Mở",
        openTab: "Mở mục",
        live: "Hoạt động",
        comingSoon: "Sắp có",
        synced: "Đồng bộ",
        lowMotion: "Ít chuyển động",
        fastLoad: "Tải nhanh",
        fullAccess: "Đủ truy cập",
        logoSubtitle: "Điều khiển 2D",
        primaryNavDesc: {
            gamefi: "RPS · Snake · Slots · FOMO",
            defi: "Staking · Burn · Airdrop · Pools",
        },
        quickAccessLabels: {
            stats: "Thống kê",
            price: "Giá",
            mission: "Nhiệm vụ",
            settings: "Cài đặt",
        },
        ariaLabels: {
            experience: "Trải nghiệm Banmao 2D",
            home: "Trang chủ Banmao",
            settings: "Cài đặt",
            selectLanguage: "Chọn ngôn ngữ",
            hierarchicalNavigation: "Điều hướng phân cấp",
            quickLinks: "Liên kết nhanh nhỏ",
            featureTabs: "Tab tính năng 2D",
            synchronizedLinks: "Liên kết 2D đã đồng bộ của Banmao",
            informationPanels: "Bảng thông tin 2D",
            footerLinks: "Liên kết chân trang Banmao",
        },
        tabs: { overview: "Tổng quan", gamefi: "GameFi", defi: "DeFi", collection: "Bộ sưu tập", community: "Cộng đồng", token: "Token" },
        sectionTitles: { overview: "Dashboard 2D đã đồng bộ", gamefi: "Module GameFi", defi: "Tiện ích DeFi", collection: "Cổng bộ sưu tập", community: "Liên kết cộng đồng", token: "Thông tin token" },
        sectionDesc: {
            overview: "Toàn bộ điểm đến quan trọng của 3D được sắp xếp thành thẻ 2D dễ đọc.",
            gamefi: "Hub trò chơi, RPS, Snake, Slots và FOMO.",
            defi: "Các bảng staking, burn, airdrop, launchpad, pools, farming và lending.",
            collection: "Thư viện NFT, mascot assets và điều hướng bộ sưu tập.",
            community: "Liên kết mạng xã hội, nhiệm vụ và hành động cài app.",
            token: "Thống kê token, giá, burn tracker, phân bổ và thông tin hợp đồng.",
        },
    }, { live: "Hoạt động", soon: "Sắp có", synced: "Đồng bộ", lowMotion: "Ít chuyển động", fastLoad: "Tải nhanh", fullAccess: "Đủ truy cập" }, {
        overview: [
            { href: "/gamefi", label: "Trung tâm GameFi", desc: "Hub trò chơi, RPS, Snake, Slots và FOMO.", icon: "gamepad", status: "Hoạt động", statusType: "live", meta: "RPS · Snake · Slots" },
            { href: "/defi", label: "Trung tâm DeFi", desc: "Các bảng staking, burn, airdrop, launchpad, pools, farming và lending.", icon: "diamond", status: "Hoạt động", statusType: "live", meta: "Stake · Burn · Airdrop" },
            { href: "/collection", label: "Bộ sưu tập", desc: "Thư viện NFT, mascot assets và điều hướng bộ sưu tập.", icon: "gallery", status: "Hoạt động", statusType: "live", meta: "Cổng NFT" },
            { href: "/defi/staking", label: "Staking", desc: "Stake, unstake, nhận thưởng và cộng dồn phần thưởng.", icon: "seedling", status: "Hoạt động", statusType: "live", meta: "Phần thưởng" },
        ],
        gamefi: [
            { href: "/gamefi", label: "Oẳn tù tì", desc: "Trận PvP on-chain với vào game nhanh.", icon: "fist", status: "Hoạt động", statusType: "live", meta: "RPS" },
            { href: "/gamefi/snake", label: "BanMao Snake", desc: "Arcade săn điểm và bảng xếp hạng.", icon: "snake", status: "Hoạt động", statusType: "live", meta: "Arcade" },
            { href: "/gamefi/slots", label: "Slots đa pool", desc: "Quay slot, jackpot pool và vòng thưởng.", icon: "slots", status: "Hoạt động", statusType: "live", meta: "Jackpot" },
            { href: "/gamefi/fomo", label: "BanMao FOMO", desc: "Game cộng đồng dựa trên bộ đếm giờ.", icon: "flame", status: "Hoạt động", statusType: "live", meta: "FOMO" },
        ],
        defi: [
            { href: "/defi/staking", label: "Staking", desc: "Khóa BANMAO, nhận và cộng dồn phần thưởng.", icon: "seedling", status: "Hoạt động", statusType: "live", meta: "APY" },
            { href: "/defi", label: "Theo dõi burn", desc: "Tiện ích burn cộng đồng và lịch sử.", icon: "flame", status: "Hoạt động", statusType: "live", meta: "Giảm phát" },
            { href: "/defi", label: "Airdrop", desc: "Điều kiện, nhiệm vụ và phân phối thưởng.", icon: "parachute", status: "Hoạt động", statusType: "live", meta: "Nhiệm vụ" },
            { href: "/defi/launchpad", label: "Launchpad", desc: "Tiện ích launch tương lai của Banmao.", icon: "rocket", status: "Sắp có", statusType: "soon", meta: "Lộ trình" },
            { href: "/defi", label: "Pools", desc: "Cổng liquidity pool ở định dạng 2D.", icon: "droplet", status: "Sắp có", statusType: "soon", meta: "LP" },
            { href: "/defi", label: "Farming", desc: "Thẻ yield farm được đồng bộ từ 3D.", icon: "wheat", status: "Sắp có", statusType: "soon", meta: "Farm" },
            { href: "/defi", label: "Lending", desc: "Module cho vay tương lai.", icon: "bank", status: "Sắp có", statusType: "soon", meta: "Tín dụng" },
        ],
        collection: [
            { href: "/collection", label: "Thư viện Banmao", desc: "Mở cổng bộ sưu tập NFT.", icon: "gallery", status: "Hoạt động", statusType: "live", meta: "Thư viện" },
            { href: "/collection", label: "Tài sản mascot", desc: "Truy cập bộ sưu tập thương hiệu và mascot.", icon: "cat", status: "Hoạt động", statusType: "live", meta: "Tài sản" },
            { href: "/collection", label: "Collectible cộng đồng", desc: "Thẻ bộ sưu tập 2D dành cho holder.", icon: "sparkles", status: "Hoạt động", statusType: "live", meta: "Sưu tầm" },
        ],
        community: [
            { href: "https://x.com/banmao_x", label: "X / Twitter", desc: "Theo dõi thông báo Banmao.", icon: "x", status: "Hoạt động", statusType: "live", meta: "Mạng xã hội" },
            { href: "https://t.me/banmaofun", label: "Telegram", desc: "Tham gia chat cộng đồng thời gian thực.", icon: "chat", status: "Hoạt động", statusType: "live", meta: "Chat" },
            { href: "https://x.com/banmao_x", label: "Bảng nhiệm vụ", desc: "Theo dõi nhiệm vụ cộng đồng và chiến dịch trên X.", icon: "target", status: "Hoạt động", statusType: "live", meta: "Nhiệm vụ" },
            { href: "/", label: "Mở ứng dụng", desc: "Quay về web app nhẹ hỗ trợ PWA.", icon: "download", status: "Hoạt động", statusType: "live", meta: "PWA" },
        ],
        token: [
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Thống kê token", desc: "Nguồn cung, holder và giao dịch BANMAO đã xác minh trên explorer X Layer.", icon: "chart-bar", status: "Hoạt động", statusType: "live", meta: "Thống kê" },
            { href: "https://app.uniswap.org/swap?outputCurrency=0x16d91d1615fc55b76d5f92365bd60c069b46ef78&chain=xlayer", label: "Mua BANMAO", desc: "Mở tuyến swap BANMAO trên X Layer.", icon: "trending-up", status: "Hoạt động", statusType: "live", meta: "Swap" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Phân bổ holder", desc: "Xem holder, giao dịch và phân bổ từ dữ liệu explorer.", icon: "pie", status: "Hoạt động", statusType: "live", meta: "Holder" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Thông tin hợp đồng", desc: "Mở contract token BANMAO đã xác minh trên OKX Explorer.", icon: "search", status: "Hoạt động", statusType: "live", meta: "Contract" },
        ],
    }),
    zh: makeCopy({
        eyebrow: "2D 控制中心",
        title: "Banmao Nebula Lite",
        subtitleManual: "专业 2D 模式已启用。3D 网站核心功能已同步为更快、更清晰的仪表盘。",
        subtitleAuto: "设备正在使用轻量 2D 体验以获得更流畅性能，同时保留完整导航。",
        reasonPrefix: "系统提示：",
        statsTitle: "快速访问",
        footer: "2D 模式保留主要功能，减少动效、加快加载，并提升移动端可读性。",
        launchApp: "打开",
        openTab: "打开分区",
        live: "运行中",
        comingSoon: "即将推出",
        synced: "已同步",
        lowMotion: "低动效",
        fastLoad: "快速加载",
        fullAccess: "完整访问",
        logoSubtitle: "2D 控制台",
        primaryNavDesc: {
            gamefi: "RPS · Snake · Slots · FOMO",
            defi: "质押 · 销毁 · 空投 · 资金池",
        },
        quickAccessLabels: {
            stats: "统计",
            price: "价格",
            mission: "任务",
            settings: "设置",
        },
        ariaLabels: {
            experience: "Banmao 2D 体验",
            home: "Banmao 首页",
            settings: "设置",
            selectLanguage: "选择语言",
            hierarchicalNavigation: "分层导航",
            quickLinks: "快速链接",
            featureTabs: "2D 功能标签",
            synchronizedLinks: "Banmao 已同步 2D 链接",
            informationPanels: "2D 信息面板",
            footerLinks: "Banmao 页脚链接",
        },
        tabs: { overview: "总览", gamefi: "GameFi", defi: "DeFi", collection: "收藏", community: "社区", token: "Token" },
        sectionTitles: { overview: "同步 2D 仪表盘", gamefi: "GameFi 模块", defi: "DeFi 工具", collection: "收藏门户", community: "社区链接", token: "Token 数据" },
        sectionDesc: {
            overview: "所有重要 3D 入口都整理为易读的 2D 卡片。",
            gamefi: "游戏中心、RPS、Snake、Slots 与 FOMO。",
            defi: "质押、销毁、空投、Launchpad、资金池、农场与借贷面板。",
            collection: "NFT 画廊、吉祥物资源与收藏导航。",
            community: "社交链接、任务与应用安装入口。",
            token: "Token 统计、价格、销毁追踪、分布和合约信息。",
        },
    }, { live: "运行中", soon: "即将", synced: "同步", lowMotion: "低动效", fastLoad: "快加载", fullAccess: "全访问" }, {
        overview: [
            { href: "/gamefi", label: "GameFi 中心", desc: "游戏中心、RPS、Snake、Slots 与 FOMO。", icon: "gamepad", status: "运行中", statusType: "live", meta: "RPS · Snake · Slots" },
            { href: "/defi", label: "DeFi 中心", desc: "质押、销毁、空投、Launchpad、资金池、农场与借贷面板。", icon: "diamond", status: "运行中", statusType: "live", meta: "质押 · 销毁 · 空投" },
            { href: "/collection", label: "收藏", desc: "NFT 画廊、吉祥物资源与收藏导航。", icon: "gallery", status: "运行中", statusType: "live", meta: "NFT 门户" },
            { href: "/defi/staking", label: "质押", desc: "质押、解除质押、领取并复投奖励。", icon: "seedling", status: "运行中", statusType: "live", meta: "奖励" },
        ],
        gamefi: [
            { href: "/gamefi", label: "石头剪刀布", desc: "快速进入的链上 PvP 对战。", icon: "fist", status: "运行中", statusType: "live", meta: "RPS" },
            { href: "/gamefi/snake", label: "BanMao Snake", desc: "街机分数挑战与排行榜。", icon: "snake", status: "运行中", statusType: "live", meta: "街机" },
            { href: "/gamefi/slots", label: "多奖池 Slots", desc: "旋转、奖池 jackpot 与奖励回合。", icon: "slots", status: "运行中", statusType: "live", meta: "Jackpot" },
            { href: "/gamefi/fomo", label: "BanMao FOMO", desc: "基于计时器的社区游戏。", icon: "flame", status: "运行中", statusType: "live", meta: "FOMO" },
        ],
        defi: [
            { href: "/defi/staking", label: "质押", desc: "锁定 BANMAO，领取并复投奖励。", icon: "seedling", status: "运行中", statusType: "live", meta: "APY" },
            { href: "/defi", label: "销毁追踪", desc: "社区销毁工具与历史记录。", icon: "flame", status: "运行中", statusType: "live", meta: "通缩" },
            { href: "/defi", label: "空投", desc: "资格、任务与奖励分发。", icon: "parachute", status: "运行中", statusType: "live", meta: "任务" },
            { href: "/defi/launchpad", label: "Launchpad", desc: "未来 Banmao 发行工具。", icon: "rocket", status: "即将", statusType: "soon", meta: "路线图" },
            { href: "/defi", label: "资金池", desc: "2D 格式的流动性池入口。", icon: "droplet", status: "即将", statusType: "soon", meta: "LP" },
            { href: "/defi", label: "农场", desc: "从 3D 同步的收益农场卡片。", icon: "wheat", status: "即将", statusType: "soon", meta: "Farm" },
            { href: "/defi", label: "借贷", desc: "未来借贷模块占位。", icon: "bank", status: "即将", statusType: "soon", meta: "信用" },
        ],
        collection: [
            { href: "/collection", label: "Banmao 画廊", desc: "打开 NFT 收藏门户。", icon: "gallery", status: "运行中", statusType: "live", meta: "画廊" },
            { href: "/collection", label: "吉祥物资源", desc: "访问品牌与吉祥物收藏。", icon: "cat", status: "运行中", statusType: "live", meta: "资源" },
            { href: "/collection", label: "社区藏品", desc: "面向持有者的 2D 收藏卡片。", icon: "sparkles", status: "运行中", statusType: "live", meta: "收藏" },
        ],
        community: [
            { href: "https://x.com/banmao_x", label: "X / Twitter", desc: "关注 Banmao 公告。", icon: "x", status: "运行中", statusType: "live", meta: "社交" },
            { href: "https://t.me/banmaofun", label: "Telegram", desc: "加入实时社区聊天。", icon: "chat", status: "运行中", statusType: "live", meta: "聊天" },
            { href: "https://x.com/banmao_x", label: "任务板", desc: "在 X 上跟踪社区任务和活动。", icon: "target", status: "运行中", statusType: "live", meta: "任务" },
            { href: "/", label: "打开应用", desc: "返回支持 PWA 的轻量 web app。", icon: "download", status: "运行中", statusType: "live", meta: "PWA" },
        ],
        token: [
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Token 统计", desc: "在 X Layer explorer 查看已验证的 BANMAO 供应量、持有人和转账。", icon: "chart-bar", status: "运行中", statusType: "live", meta: "统计" },
            { href: "https://app.uniswap.org/swap?outputCurrency=0x16d91d1615fc55b76d5f92365bd60c069b46ef78&chain=xlayer", label: "购买 BANMAO", desc: "打开 X Layer 上的 BANMAO swap 路由。", icon: "trending-up", status: "运行中", statusType: "live", meta: "Swap" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "持有人分布", desc: "通过 explorer 数据查看持有人、转账和分布。", icon: "pie", status: "运行中", statusType: "live", meta: "持有人" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "合约信息", desc: "在 OKX Explorer 打开已验证的 BANMAO token 合约。", icon: "search", status: "运行中", statusType: "live", meta: "合约" },
        ],
    }),
    ko: makeCopy({
        eyebrow: "2D 커맨드 센터",
        title: "Banmao Nebula Lite",
        subtitleManual: "전문 2D 모드가 활성화되었습니다. 3D 핵심 기능을 더 빠르고 정돈된 대시보드로 동기화했습니다.",
        subtitleAuto: "기기가 가벼운 2D 경험을 사용하며 전체 내비게이션은 유지됩니다.",
        reasonPrefix: "시스템 안내:",
        statsTitle: "빠른 접근",
        footer: "2D 모드는 주요 기능을 유지하면서 모션을 줄이고 로딩과 모바일 가독성을 개선합니다.",
        launchApp: "열기",
        openTab: "섹션 열기",
        live: "라이브",
        comingSoon: "예정",
        synced: "동기화",
        lowMotion: "저모션",
        fastLoad: "빠른 로드",
        fullAccess: "전체 접근",
        logoSubtitle: "2D 커맨드",
        primaryNavDesc: {
            gamefi: "RPS · Snake · Slots · FOMO",
            defi: "스테이킹 · 소각 · 에어드롭 · 풀",
        },
        quickAccessLabels: {
            stats: "통계",
            price: "가격",
            mission: "미션",
            settings: "설정",
        },
        ariaLabels: {
            experience: "Banmao 2D 경험",
            home: "Banmao 홈",
            settings: "설정",
            selectLanguage: "언어 선택",
            hierarchicalNavigation: "계층형 내비게이션",
            quickLinks: "작은 빠른 링크",
            featureTabs: "2D 기능 탭",
            synchronizedLinks: "Banmao 동기화 2D 링크",
            informationPanels: "2D 정보 패널",
            footerLinks: "Banmao 푸터 링크",
        },
        tabs: { overview: "개요", gamefi: "GameFi", defi: "DeFi", collection: "컬렉션", community: "커뮤니티", token: "Token" },
        sectionTitles: { overview: "동기화된 2D 대시보드", gamefi: "GameFi 모듈", defi: "DeFi 유틸리티", collection: "컬렉션 포털", community: "커뮤니티 링크", token: "Token 정보" },
        sectionDesc: {
            overview: "중요한 3D 목적지를 읽기 쉬운 2D 카드로 정리했습니다.",
            gamefi: "게임 허브, RPS, Snake, Slots 및 FOMO.",
            defi: "스테이킹, 소각, 에어드롭, 런치패드, 풀, 파밍, 렌딩 패널.",
            collection: "NFT 갤러리, 마스코트 자산과 컬렉션 내비게이션.",
            community: "소셜 링크, 미션 및 앱 설치 액션.",
            token: "Token 통계, 가격 피드, 소각 추적, 분배 및 컨트랙트 정보.",
        },
    }, { live: "라이브", soon: "예정", synced: "동기화", lowMotion: "저모션", fastLoad: "빠름", fullAccess: "전체" }, {
        overview: [
            { href: "/gamefi", label: "GameFi 허브", desc: "게임 허브, RPS, Snake, Slots 및 FOMO.", icon: "gamepad", status: "라이브", statusType: "live", meta: "RPS · Snake · Slots" },
            { href: "/defi", label: "DeFi 허브", desc: "스테이킹, 소각, 에어드롭, 런치패드, 풀, 파밍, 렌딩 패널.", icon: "diamond", status: "라이브", statusType: "live", meta: "스테이킹 · 소각 · 에어드롭" },
            { href: "/collection", label: "컬렉션", desc: "NFT 갤러리, 마스코트 자산과 컬렉션 내비게이션.", icon: "gallery", status: "라이브", statusType: "live", meta: "NFT 포털" },
            { href: "/defi/staking", label: "스테이킹", desc: "스테이킹, 언스테이킹, 보상 수령 및 복리.", icon: "seedling", status: "라이브", statusType: "live", meta: "보상" },
        ],
        gamefi: [
            { href: "/gamefi", label: "가위바위보", desc: "빠르게 진입하는 온체인 PvP 배틀.", icon: "fist", status: "라이브", statusType: "live", meta: "RPS" },
            { href: "/gamefi/snake", label: "BanMao Snake", desc: "아케이드 점수 경쟁과 리더보드.", icon: "snake", status: "라이브", statusType: "live", meta: "아케이드" },
            { href: "/gamefi/slots", label: "멀티 풀 슬롯", desc: "스핀, jackpot 풀과 보상 라운드.", icon: "slots", status: "라이브", statusType: "live", meta: "Jackpot" },
            { href: "/gamefi/fomo", label: "BanMao FOMO", desc: "타이머 기반 커뮤니티 게임.", icon: "flame", status: "라이브", statusType: "live", meta: "FOMO" },
        ],
        defi: [
            { href: "/defi/staking", label: "스테이킹", desc: "BANMAO를 잠그고 보상을 수령 및 복리화합니다.", icon: "seedling", status: "라이브", statusType: "live", meta: "APY" },
            { href: "/defi", label: "소각 추적기", desc: "커뮤니티 소각 유틸리티와 기록.", icon: "flame", status: "라이브", statusType: "live", meta: "디플레이션" },
            { href: "/defi", label: "에어드롭", desc: "자격, 미션 및 보상 분배.", icon: "parachute", status: "라이브", statusType: "live", meta: "미션" },
            { href: "/defi/launchpad", label: "런치패드", desc: "향후 Banmao 런치 유틸리티.", icon: "rocket", status: "예정", statusType: "soon", meta: "로드맵" },
            { href: "/defi", label: "풀", desc: "2D 형식의 유동성 풀 게이트웨이.", icon: "droplet", status: "예정", statusType: "soon", meta: "LP" },
            { href: "/defi", label: "파밍", desc: "3D에서 미러링된 yield farm 카드.", icon: "wheat", status: "예정", statusType: "soon", meta: "Farm" },
            { href: "/defi", label: "렌딩", desc: "향후 렌딩 모듈 자리표시자.", icon: "bank", status: "예정", statusType: "soon", meta: "신용" },
        ],
        collection: [
            { href: "/collection", label: "Banmao 갤러리", desc: "NFT 컬렉션 포털을 엽니다.", icon: "gallery", status: "라이브", statusType: "live", meta: "갤러리" },
            { href: "/collection", label: "마스코트 자산", desc: "브랜드와 마스코트 컬렉션 접근.", icon: "cat", status: "라이브", statusType: "live", meta: "자산" },
            { href: "/collection", label: "커뮤니티 컬렉터블", desc: "홀더 중심의 2D 컬렉션 카드.", icon: "sparkles", status: "라이브", statusType: "live", meta: "수집" },
        ],
        community: [
            { href: "https://x.com/banmao_x", label: "X / Twitter", desc: "Banmao 공지를 팔로우하세요.", icon: "x", status: "라이브", statusType: "live", meta: "소셜" },
            { href: "https://t.me/banmaofun", label: "Telegram", desc: "실시간 커뮤니티 채팅에 참여하세요.", icon: "chat", status: "라이브", statusType: "live", meta: "채팅" },
            { href: "https://x.com/banmao_x", label: "미션 보드", desc: "X에서 커뮤니티 미션과 캠페인을 확인합니다.", icon: "target", status: "라이브", statusType: "live", meta: "미션" },
            { href: "/", label: "앱 열기", desc: "PWA 친화적인 가벼운 web app으로 돌아갑니다.", icon: "download", status: "라이브", statusType: "live", meta: "PWA" },
        ],
        token: [
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Token 통계", desc: "X Layer explorer에서 검증된 BANMAO 공급량, holder 및 전송을 확인합니다.", icon: "chart-bar", status: "라이브", statusType: "live", meta: "통계" },
            { href: "https://app.uniswap.org/swap?outputCurrency=0x16d91d1615fc55b76d5f92365bd60c069b46ef78&chain=xlayer", label: "BANMAO 구매", desc: "X Layer에서 BANMAO swap route를 엽니다.", icon: "trending-up", status: "라이브", statusType: "live", meta: "Swap" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Holder 분배", desc: "Explorer 데이터로 holder, 전송 및 분배를 확인합니다.", icon: "pie", status: "라이브", statusType: "live", meta: "Holder" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "컨트랙트 정보", desc: "OKX Explorer에서 검증된 BANMAO token contract를 엽니다.", icon: "search", status: "라이브", statusType: "live", meta: "Contract" },
        ],
    }),
    ru: makeCopy({
        eyebrow: "2D ЦЕНТР УПРАВЛЕНИЯ",
        title: "Banmao Nebula Lite",
        subtitleManual: "Профессиональный 2D-режим активен. Все ключевые функции 3D-сайта перенесены в быстрый dashboard.",
        subtitleAuto: "Устройство использует облегчённый 2D-режим для плавной работы с полной навигацией.",
        reasonPrefix: "Системная заметка:",
        statsTitle: "Быстрый доступ",
        footer: "2D-режим сохраняет главные функции, снижает анимации, ускоряет загрузку и улучшает чтение на мобильных.",
        launchApp: "Открыть",
        openTab: "Открыть раздел",
        live: "Активно",
        comingSoon: "Скоро",
        synced: "Синхр.",
        lowMotion: "Меньше движения",
        fastLoad: "Быстрая загрузка",
        fullAccess: "Полный доступ",
        logoSubtitle: "2D команда",
        primaryNavDesc: {
            gamefi: "RPS · Snake · Slots · FOMO",
            defi: "Стейкинг · Сжигание · Airdrop · Пулы",
        },
        quickAccessLabels: {
            stats: "Статистика",
            price: "Цена",
            mission: "Миссия",
            settings: "Настройки",
        },
        ariaLabels: {
            experience: "2D-режим Banmao",
            home: "Главная Banmao",
            settings: "Настройки",
            selectLanguage: "Выбрать язык",
            hierarchicalNavigation: "Иерархическая навигация",
            quickLinks: "Быстрые ссылки",
            featureTabs: "Вкладки функций 2D",
            synchronizedLinks: "Синхронизированные 2D-ссылки Banmao",
            informationPanels: "Информационные 2D-панели",
            footerLinks: "Ссылки футера Banmao",
        },
        tabs: { overview: "Обзор", gamefi: "GameFi", defi: "DeFi", collection: "Коллекция", community: "Сообщество", token: "Token" },
        sectionTitles: { overview: "Синхронная 2D-панель", gamefi: "GameFi модули", defi: "DeFi утилиты", collection: "Портал коллекции", community: "Ссылки сообщества", token: "Token аналитика" },
        sectionDesc: {
            overview: "Все важные 3D-разделы оформлены как удобные 2D-карточки.",
            gamefi: "Игровой хаб, RPS, Snake, Slots и FOMO.",
            defi: "Панели staking, burn, airdrop, launchpad, pools, farming и lending.",
            collection: "NFT-галерея, mascot assets и навигация коллекции.",
            community: "Социальные ссылки, миссии и установка приложения.",
            token: "Статистика token, цена, burn tracker, распределение и контракт.",
        },
    }, { live: "Активно", soon: "Скоро", synced: "Синхр.", lowMotion: "Меньше движения", fastLoad: "Быстро", fullAccess: "Полный доступ" }, {
        overview: [
            { href: "/gamefi", label: "GameFi хаб", desc: "Игровой хаб, RPS, Snake, Slots и FOMO.", icon: "gamepad", status: "Активно", statusType: "live", meta: "RPS · Snake · Slots" },
            { href: "/defi", label: "DeFi хаб", desc: "Панели staking, burn, airdrop, launchpad, pools, farming и lending.", icon: "diamond", status: "Активно", statusType: "live", meta: "Стейкинг · Burn · Airdrop" },
            { href: "/collection", label: "Коллекция", desc: "NFT-галерея, mascot assets и навигация коллекции.", icon: "gallery", status: "Активно", statusType: "live", meta: "NFT портал" },
            { href: "/defi/staking", label: "Стейкинг", desc: "Стейкинг, вывод, получение и компаунд наград.", icon: "seedling", status: "Активно", statusType: "live", meta: "Награды" },
        ],
        gamefi: [
            { href: "/gamefi", label: "Камень, ножницы, бумага", desc: "Ончейн PvP-битва с быстрым входом.", icon: "fist", status: "Активно", statusType: "live", meta: "RPS" },
            { href: "/gamefi/snake", label: "BanMao Snake", desc: "Аркадная гонка очков и таблица лидеров.", icon: "snake", status: "Активно", statusType: "live", meta: "Аркада" },
            { href: "/gamefi/slots", label: "Slots Multi Pool", desc: "Спины, jackpot-пулы и бонусные раунды.", icon: "slots", status: "Активно", statusType: "live", meta: "Jackpot" },
            { href: "/gamefi/fomo", label: "BanMao FOMO", desc: "Сообщественная игра на таймере.", icon: "flame", status: "Активно", statusType: "live", meta: "FOMO" },
        ],
        defi: [
            { href: "/defi/staking", label: "Стейкинг", desc: "Заблокируйте BANMAO, получайте и компаундьте награды.", icon: "seedling", status: "Активно", statusType: "live", meta: "APY" },
            { href: "/defi", label: "Трекер сжиганий", desc: "Утилита и история сжиганий сообщества.", icon: "flame", status: "Активно", statusType: "live", meta: "Дефляция" },
            { href: "/defi", label: "Airdrop", desc: "Право участия, миссии и распределение наград.", icon: "parachute", status: "Активно", statusType: "live", meta: "Миссии" },
            { href: "/defi/launchpad", label: "Launchpad", desc: "Будущие launch-утилиты Banmao.", icon: "rocket", status: "Скоро", statusType: "soon", meta: "Roadmap" },
            { href: "/defi", label: "Пулы", desc: "Шлюз пулов ликвидности в 2D-формате.", icon: "droplet", status: "Скоро", statusType: "soon", meta: "LP" },
            { href: "/defi", label: "Фарминг", desc: "Карточки yield farm, отражённые из 3D.", icon: "wheat", status: "Скоро", statusType: "soon", meta: "Farm" },
            { href: "/defi", label: "Кредитование", desc: "Заготовка будущего модуля lending.", icon: "bank", status: "Скоро", statusType: "soon", meta: "Кредит" },
        ],
        collection: [
            { href: "/collection", label: "Галерея Banmao", desc: "Открыть портал NFT-коллекции.", icon: "gallery", status: "Активно", statusType: "live", meta: "Галерея" },
            { href: "/collection", label: "Mascot assets", desc: "Доступ к брендовым и mascot коллекциям.", icon: "cat", status: "Активно", statusType: "live", meta: "Активы" },
            { href: "/collection", label: "Коллективные предметы", desc: "2D-карточки коллекции для холдеров.", icon: "sparkles", status: "Активно", statusType: "live", meta: "Коллекция" },
        ],
        community: [
            { href: "https://x.com/banmao_x", label: "X / Twitter", desc: "Следите за объявлениями Banmao.", icon: "x", status: "Активно", statusType: "live", meta: "Соцсети" },
            { href: "https://t.me/banmaofun", label: "Telegram", desc: "Присоединяйтесь к чату сообщества.", icon: "chat", status: "Активно", statusType: "live", meta: "Чат" },
            { href: "https://x.com/banmao_x", label: "Доска миссий", desc: "Следите за миссиями сообщества и кампаниями в X.", icon: "target", status: "Активно", statusType: "live", meta: "Миссии" },
            { href: "/", label: "Открыть приложение", desc: "Вернуться в лёгкое PWA-ready web app.", icon: "download", status: "Активно", statusType: "live", meta: "PWA" },
        ],
        token: [
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Статистика token", desc: "Проверенные supply, holders и transfers BANMAO в X Layer explorer.", icon: "chart-bar", status: "Активно", statusType: "live", meta: "Статистика" },
            { href: "https://app.uniswap.org/swap?outputCurrency=0x16d91d1615fc55b76d5f92365bd60c069b46ef78&chain=xlayer", label: "Купить BANMAO", desc: "Открыть swap route BANMAO на X Layer.", icon: "trending-up", status: "Активно", statusType: "live", meta: "Swap" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Распределение holders", desc: "Проверьте holders, transfers и распределение по данным explorer.", icon: "pie", status: "Активно", statusType: "live", meta: "Holders" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Информация о контракте", desc: "Открыть verified token contract BANMAO в OKX Explorer.", icon: "search", status: "Активно", statusType: "live", meta: "Контракт" },
        ],
    }),
    id: makeCopy({
        eyebrow: "PUSAT KONTROL 2D",
        title: "Banmao Nebula Lite",
        subtitleManual: "Mode 2D profesional aktif. Semua fungsi inti situs 3D dicerminkan sebagai dashboard yang lebih cepat dan rapi.",
        subtitleAuto: "Perangkat Anda memakai pengalaman 2D ringan agar lebih mulus dengan navigasi penuh.",
        reasonPrefix: "Catatan sistem:",
        statsTitle: "Akses cepat",
        footer: "Mode 2D menjaga fungsi utama tetap tersedia dengan gerakan lebih rendah, pemuatan lebih cepat, dan keterbacaan mobile lebih baik.",
        launchApp: "Buka",
        openTab: "Buka bagian",
        live: "Live",
        comingSoon: "Segera",
        synced: "Sinkron",
        lowMotion: "Gerak rendah",
        fastLoad: "Muat cepat",
        fullAccess: "Akses penuh",
        logoSubtitle: "Perintah 2D",
        primaryNavDesc: {
            gamefi: "RPS · Snake · Slots · FOMO",
            defi: "Staking · Burn · Airdrop · Pools",
        },
        quickAccessLabels: {
            stats: "Statistik",
            price: "Harga",
            mission: "Misi",
            settings: "Pengaturan",
        },
        ariaLabels: {
            experience: "Pengalaman Banmao 2D",
            home: "Beranda Banmao",
            settings: "Pengaturan",
            selectLanguage: "Pilih bahasa",
            hierarchicalNavigation: "Navigasi hierarkis",
            quickLinks: "Tautan cepat kecil",
            featureTabs: "Tab fitur 2D",
            synchronizedLinks: "Tautan 2D Banmao tersinkron",
            informationPanels: "Panel informasi 2D",
            footerLinks: "Tautan footer Banmao",
        },
        tabs: { overview: "Ikhtisar", gamefi: "GameFi", defi: "DeFi", collection: "Koleksi", community: "Komunitas", token: "Token" },
        sectionTitles: { overview: "Dashboard 2D tersinkron", gamefi: "Modul GameFi", defi: "Utilitas DeFi", collection: "Portal koleksi", community: "Link komunitas", token: "Intelijen token" },
        sectionDesc: {
            overview: "Semua tujuan 3D penting disusun sebagai kartu 2D yang mudah dibaca.",
            gamefi: "Hub game, RPS, Snake, Slots dan FOMO.",
            defi: "Panel staking, burn, airdrop, launchpad, pools, farming dan lending.",
            collection: "Galeri NFT, aset maskot dan navigasi koleksi.",
            community: "Link sosial, misi dan aksi instal aplikasi.",
            token: "Statistik token, harga, burn tracker, distribusi dan info kontrak.",
        },
    }, { live: "Live", soon: "Segera", synced: "Sinkron", lowMotion: "Gerak rendah", fastLoad: "Cepat", fullAccess: "Akses penuh" }, {
        overview: [
            { href: "/gamefi", label: "Hub GameFi", desc: "Hub game, RPS, Snake, Slots dan FOMO.", icon: "gamepad", status: "Live", statusType: "live", meta: "RPS · Snake · Slots" },
            { href: "/defi", label: "Hub DeFi", desc: "Panel staking, burn, airdrop, launchpad, pools, farming dan lending.", icon: "diamond", status: "Live", statusType: "live", meta: "Stake · Burn · Airdrop" },
            { href: "/collection", label: "Koleksi", desc: "Galeri NFT, aset maskot dan navigasi koleksi.", icon: "gallery", status: "Live", statusType: "live", meta: "Portal NFT" },
            { href: "/defi/staking", label: "Staking", desc: "Stake, unstake, klaim dan compound reward.", icon: "seedling", status: "Live", statusType: "live", meta: "Reward" },
        ],
        gamefi: [
            { href: "/gamefi", label: "Batu Gunting Kertas", desc: "Pertarungan PvP on-chain dengan masuk cepat.", icon: "fist", status: "Live", statusType: "live", meta: "RPS" },
            { href: "/gamefi/snake", label: "BanMao Snake", desc: "Kejar skor arcade dan leaderboard.", icon: "snake", status: "Live", statusType: "live", meta: "Arcade" },
            { href: "/gamefi/slots", label: "Slots Multi Pool", desc: "Spin, pool jackpot dan ronde reward.", icon: "slots", status: "Live", statusType: "live", meta: "Jackpot" },
            { href: "/gamefi/fomo", label: "BanMao FOMO", desc: "Game komunitas berbasis timer.", icon: "flame", status: "Live", statusType: "live", meta: "FOMO" },
        ],
        defi: [
            { href: "/defi/staking", label: "Staking", desc: "Kunci BANMAO, klaim dan compound reward.", icon: "seedling", status: "Live", statusType: "live", meta: "APY" },
            { href: "/defi", label: "Pelacak burn", desc: "Utilitas burn komunitas dan riwayat.", icon: "flame", status: "Live", statusType: "live", meta: "Deflasi" },
            { href: "/defi", label: "Airdrop", desc: "Kelayakan, misi dan distribusi reward.", icon: "parachute", status: "Live", statusType: "live", meta: "Misi" },
            { href: "/defi/launchpad", label: "Launchpad", desc: "Utilitas launch Banmao di masa depan.", icon: "rocket", status: "Segera", statusType: "soon", meta: "Roadmap" },
            { href: "/defi", label: "Pools", desc: "Gateway liquidity pool dalam format 2D.", icon: "droplet", status: "Segera", statusType: "soon", meta: "LP" },
            { href: "/defi", label: "Farming", desc: "Kartu yield farm yang dicerminkan dari 3D.", icon: "wheat", status: "Segera", statusType: "soon", meta: "Farm" },
            { href: "/defi", label: "Lending", desc: "Placeholder modul lending masa depan.", icon: "bank", status: "Segera", statusType: "soon", meta: "Kredit" },
        ],
        collection: [
            { href: "/collection", label: "Galeri Banmao", desc: "Buka portal koleksi NFT.", icon: "gallery", status: "Live", statusType: "live", meta: "Galeri" },
            { href: "/collection", label: "Aset maskot", desc: "Akses koleksi brand dan maskot.", icon: "cat", status: "Live", statusType: "live", meta: "Aset" },
            { href: "/collection", label: "Koleksi komunitas", desc: "Kartu koleksi 2D untuk holder.", icon: "sparkles", status: "Live", statusType: "live", meta: "Koleksi" },
        ],
        community: [
            { href: "https://x.com/banmao_x", label: "X / Twitter", desc: "Ikuti pengumuman Banmao.", icon: "x", status: "Live", statusType: "live", meta: "Sosial" },
            { href: "https://t.me/banmaofun", label: "Telegram", desc: "Gabung chat komunitas real-time.", icon: "chat", status: "Live", statusType: "live", meta: "Chat" },
            { href: "https://x.com/banmao_x", label: "Papan misi", desc: "Pantau misi komunitas dan kampanye di X.", icon: "target", status: "Live", statusType: "live", meta: "Misi" },
            { href: "/", label: "Buka aplikasi", desc: "Kembali ke web app ringan yang ramah PWA.", icon: "download", status: "Live", statusType: "live", meta: "PWA" },
        ],
        token: [
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Statistik token", desc: "Supply, holder dan transfer BANMAO terverifikasi di explorer X Layer.", icon: "chart-bar", status: "Live", statusType: "live", meta: "Statistik" },
            { href: "https://app.uniswap.org/swap?outputCurrency=0x16d91d1615fc55b76d5f92365bd60c069b46ef78&chain=xlayer", label: "Beli BANMAO", desc: "Buka rute swap BANMAO di X Layer.", icon: "trending-up", status: "Live", statusType: "live", meta: "Swap" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Distribusi holder", desc: "Tinjau holder, transfer dan distribusi dari data explorer.", icon: "pie", status: "Live", statusType: "live", meta: "Holder" },
            { href: "https://www.okx.com/web3/explorer/xlayer/token/0x16d91d1615fc55b76d5f92365bd60c069b46ef78", label: "Info kontrak", desc: "Buka contract token BANMAO terverifikasi di OKX Explorer.", icon: "search", status: "Live", statusType: "live", meta: "Contract" },
        ],
    }),
};