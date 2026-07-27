"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Info,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { formatEther } from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { ConnectButton } from "../components/wallet/WalletConnection";
import {
  XLAYER_CHAIN_ID,
  xLayerExplorerAddressUrl,
} from "../lib/walletConfig";
import {
  getBrowserLanguage,
  translations,
  type Language,
} from "../web3d/locals";
import {
  AirdropIcon,
  BurnIcon,
  FarmIcon,
  LaunchpadIcon,
  LendingIcon,
  PoolIcon,
  ServiceDetailModal,
  StakingIcon,
  type BulletItem,
} from "./components";
import { MetricInfoPopover } from "./components/MetricInfoPopover";
import "./defi.css";

const COMMUNITY_WALLET = "0x92809f2837f708163d375960063c8a3156fceacb";
const DEAD_WALLET = "0x000000000000000000000000000000000000dead";
const BANMAO_TOKEN_ADDRESS = "0x16d91d1615fc55b76d5f92365bd60c069b46ef78";
const STAKING_CONTRACT_ADDRESS =
  "0xa553f61F2a4fa61f6DDC8bf2b0B66F65c7eAA172";
const AIRDROP_CONTRACT_ADDRESS =
  "0xf2d471711D24646b2C50E1F74a063caA7a6863a0";
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

const DEVELOPMENT_COPY: Record<Language, string> = {
  en: "In development",
  vi: "Đang triển khai",
  zh: "开发中",
  ko: "개발 중",
  ru: "В разработке",
  id: "Dalam pengembangan",
};

const PRODUCT_COUNT_COPY: Record<Language, string> = {
  en: IS_DEVELOPMENT ? "3 live · 1 in development" : "3 apps live",
  vi: IS_DEVELOPMENT ? "3 hoạt động · 1 đang triển khai" : "3 ứng dụng",
  zh: IS_DEVELOPMENT ? "3 个在线 · 1 个开发中" : "3 个应用在线",
  ko: IS_DEVELOPMENT ? "3개 라이브 · 1개 개발 중" : "3개 앱 라이브",
  ru: IS_DEVELOPMENT ? "3 работают · 1 в разработке" : "3 приложения",
  id: IS_DEVELOPMENT ? "3 aktif · 1 dikembangkan" : "3 aplikasi aktif",
};

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const STAKING_STATS_ABI = [
  {
    name: "totalStaked",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getTotalStakers",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type TranslationKey = keyof (typeof translations)["en"];

type OverviewCopy = {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  startStaking: string;
  exploreApps: string;
  portfolio: string;
  portfolioDescription: string;
  connected: string;
  connectTitle: string;
  connectDescription: string;
  walletAddress: string;
  protocolOverview: string;
  updatedNow: string;
  updatedSeconds: (seconds: number) => string;
  loading: string;
  unavailable: string;
  retry: string;
  stakedLabel: string;
  stakersLabel: string;
  burnedLabel: string;
  maxApyLabel: string;
  liveProducts: string;
  liveProductsDescription: string;
  appsLive: string;
  learnMore: string;
  openApp: string;
  sentLabel: string;
  walletsLabel: string;
  launchedLabel: string;
  comingNext: string;
  comingDescription: string;
  trustTitle: string;
  trustDescription: string;
  verifiedOnChain: string;
  tokenContract: string;
  stakingContract: string;
  airdropContract: string;
  communityWallet: string;
  viewExplorer: string;
  smartContract: string;
  poweredBy: string;
  refreshData: string;
  copyAddress: string;
  copied: string;
  liveOnChain: string;
  protocolParameter: string;
  indexedData: string;
  wrongNetworkTitle: string;
  wrongNetworkDescription: string;
  switchNetwork: string;
  maintenanceTitle: string;
  maintenanceDescription: string;
  backHome: string;
  metricHelp: {
    staked: string;
    stakers: string;
    burned: string;
    apy: string;
  };
};

const OVERVIEW_COPY: Record<Language, OverviewCopy> = {
  en: {
    eyebrow: "Live on X Layer",
    titleLead: "Earn, distribute and grow with",
    titleAccent: "BANMAO DeFi.",
    subtitle:
      "Stake BANMAO, reward the community, reduce supply or launch a token through one transparent on-chain ecosystem.",
    startStaking: "Start staking",
    exploreApps: "Explore all apps",
    portfolio: "My portfolio",
    portfolioDescription: "Your wallet snapshot on X Layer.",
    connected: "Connected",
    connectTitle: "Connect your wallet",
    connectDescription:
      "View balances and access every BANMAO DeFi application.",
    walletAddress: "Wallet",
    protocolOverview: "Protocol overview",
    updatedNow: "Updated just now",
    updatedSeconds: (seconds) => `Updated ${seconds}s ago`,
    loading: "Loading on-chain data",
    unavailable: "Data unavailable",
    retry: "Retry",
    stakedLabel: "BANMAO staked",
    stakersLabel: "Stakers",
    burnedLabel: "BANMAO burned",
    maxApyLabel: "Max APY",
    liveProducts: "Products",
    liveProductsDescription: IS_DEVELOPMENT
      ? "Three live applications on X Layer, plus Launchpad in local development."
      : "Three live applications on X Layer.",
    appsLive: IS_DEVELOPMENT ? "3 live · 1 in development" : "3 apps live",
    learnMore: "Learn more",
    openApp: "Open app",
    sentLabel: "Sent",
    walletsLabel: "Wallets",
    launchedLabel: "Launch",
    comingNext: "Coming next",
    comingDescription:
      "Liquidity, farming and lending are being designed for the next protocol phase.",
    trustTitle: "Contracts & transparency",
    trustDescription:
      "Core addresses are published for independent verification. Always verify the contract before signing.",
    verifiedOnChain: "Publicly verifiable on X Layer",
    tokenContract: "BANMAO token",
    stakingContract: "Staking",
    airdropContract: "Airdrop",
    communityWallet: "Community wallet",
    viewExplorer: "View on explorer",
    smartContract: "Smart contract",
    poweredBy: "Powered by X Layer",
    refreshData: "Refresh data",
    copyAddress: "Copy address",
    copied: "Copied",
    liveOnChain: "Live on-chain",
    protocolParameter: "Protocol parameter",
    indexedData: "Indexed API",
    wrongNetworkTitle: "Wrong network",
    wrongNetworkDescription: "Switch to X Layer before using BANMAO apps.",
    switchNetwork: "Switch network",
    maintenanceTitle: "DeFi is under maintenance",
    maintenanceDescription:
      "The public DeFi applications are temporarily unavailable.",
    backHome: "Back to home",
    metricHelp: {
      staked: "Total BANMAO currently locked in the staking contract.",
      stakers: "Total wallets that have participated in staking.",
      burned: "BANMAO permanently held by the dead wallet.",
      apy: "Maximum annual percentage yield available for the longest lock.",
    },
  },
  vi: {
    eyebrow: "Đang hoạt động trên X Layer",
    titleLead: "Kiếm thưởng, phân phối và phát triển cùng",
    titleAccent: "BANMAO DeFi.",
    subtitle:
      "Stake BANMAO, thưởng cộng đồng, giảm nguồn cung hoặc ra mắt token trong một hệ sinh thái on-chain minh bạch.",
    startStaking: "Bắt đầu staking",
    exploreApps: "Khám phá ứng dụng",
    portfolio: "Tài sản của tôi",
    portfolioDescription: "Tổng quan ví của bạn trên X Layer.",
    connected: "Đã kết nối",
    connectTitle: "Kết nối ví",
    connectDescription:
      "Xem số dư và truy cập toàn bộ ứng dụng BANMAO DeFi.",
    walletAddress: "Ví",
    protocolOverview: "Tổng quan giao thức",
    updatedNow: "Vừa cập nhật",
    updatedSeconds: (seconds) => `Cập nhật ${seconds} giây trước`,
    loading: "Đang tải dữ liệu on-chain",
    unavailable: "Không thể tải dữ liệu",
    retry: "Thử lại",
    stakedLabel: "BANMAO đang khóa",
    stakersLabel: "Người staking",
    burnedLabel: "BANMAO đã đốt",
    maxApyLabel: "APY tối đa",
    liveProducts: "Ứng dụng DeFi",
    liveProductsDescription: IS_DEVELOPMENT
      ? "Ba ứng dụng đang hoạt động trên X Layer; Launchpad chỉ đang triển khai ở local."
      : "Ba ứng dụng đang hoạt động trên X Layer.",
    appsLive: IS_DEVELOPMENT ? "3 hoạt động · 1 đang triển khai" : "3 ứng dụng",
    learnMore: "Tìm hiểu",
    openApp: "Mở ứng dụng",
    sentLabel: "Đã gửi",
    walletsLabel: "Số ví",
    launchedLabel: "Ra mắt",
    comingNext: "Sắp ra mắt",
    comingDescription:
      "Pool thanh khoản, farming và lending đang được phát triển cho giai đoạn tiếp theo.",
    trustTitle: "Hợp đồng & minh bạch",
    trustDescription:
      "Các địa chỉ cốt lõi được công khai để kiểm chứng độc lập. Luôn kiểm tra hợp đồng trước khi ký.",
    verifiedOnChain: "Có thể kiểm chứng công khai trên X Layer",
    tokenContract: "Token BANMAO",
    stakingContract: "Staking",
    airdropContract: "Airdrop",
    communityWallet: "Ví cộng đồng",
    viewExplorer: "Xem trên Explorer",
    smartContract: "Hợp đồng thông minh",
    poweredBy: "Vận hành trên X Layer",
    refreshData: "Làm mới dữ liệu",
    copyAddress: "Sao chép địa chỉ",
    copied: "Đã sao chép",
    liveOnChain: "Dữ liệu on-chain",
    protocolParameter: "Tham số giao thức",
    indexedData: "API đã lập chỉ mục",
    wrongNetworkTitle: "Sai mạng",
    wrongNetworkDescription: "Chuyển sang X Layer trước khi dùng ứng dụng BANMAO.",
    switchNetwork: "Chuyển mạng",
    maintenanceTitle: "DeFi đang bảo trì",
    maintenanceDescription:
      "Các ứng dụng DeFi công khai đang tạm thời ngừng hoạt động.",
    backHome: "Về trang chủ",
    metricHelp: {
      staked: "Tổng BANMAO đang được khóa trong hợp đồng staking.",
      stakers: "Tổng số ví đã tham gia staking.",
      burned: "BANMAO được giữ vĩnh viễn tại ví dead.",
      apy: "Lợi suất năm tối đa dành cho kỳ khóa dài nhất.",
    },
  },
  zh: {
    eyebrow: "运行于 X Layer",
    titleLead: "通过 BANMAO DeFi",
    titleAccent: "赚取、分发与成长。",
    subtitle:
      "在透明的链上生态中质押 BANMAO、奖励社区、减少供应或发行代币。",
    startStaking: "开始质押",
    exploreApps: "探索全部应用",
    portfolio: "我的资产",
    portfolioDescription: "您在 X Layer 上的钱包概览。",
    connected: "已连接",
    connectTitle: "连接钱包",
    connectDescription: "查看余额并访问全部 BANMAO DeFi 应用。",
    walletAddress: "钱包",
    protocolOverview: "协议概览",
    updatedNow: "刚刚更新",
    updatedSeconds: (seconds) => `${seconds} 秒前更新`,
    loading: "正在加载链上数据",
    unavailable: "数据不可用",
    retry: "重试",
    stakedLabel: "已质押 BANMAO",
    stakersLabel: "质押用户",
    burnedLabel: "已销毁 BANMAO",
    maxApyLabel: "最高 APY",
    liveProducts: "DeFi 产品",
    liveProductsDescription: IS_DEVELOPMENT
      ? "三个应用已在 X Layer 上线；Launchpad 仅在本地开发。"
      : "三个应用已在 X Layer 上线。",
    appsLive: IS_DEVELOPMENT ? "3 个在线 · 1 个开发中" : "3 个应用在线",
    learnMore: "了解更多",
    openApp: "打开应用",
    sentLabel: "已发送",
    walletsLabel: "钱包",
    launchedLabel: "发行",
    comingNext: "即将推出",
    comingDescription: "流动性、挖矿和借贷正在为下一阶段开发。",
    trustTitle: "合约与透明度",
    trustDescription: "核心地址公开可验证。签名前请始终核对合约。",
    verifiedOnChain: "可在 X Layer 上公开验证",
    tokenContract: "BANMAO 代币",
    stakingContract: "质押",
    airdropContract: "空投",
    communityWallet: "社区钱包",
    viewExplorer: "在浏览器查看",
    smartContract: "智能合约",
    poweredBy: "由 X Layer 提供支持",
    refreshData: "刷新数据",
    copyAddress: "复制地址",
    copied: "已复制",
    liveOnChain: "链上实时数据",
    protocolParameter: "协议参数",
    indexedData: "索引 API",
    wrongNetworkTitle: "网络错误",
    wrongNetworkDescription: "使用 BANMAO 应用前请切换至 X Layer。",
    switchNetwork: "切换网络",
    maintenanceTitle: "DeFi 维护中",
    maintenanceDescription: "公共 DeFi 应用暂时不可用。",
    backHome: "返回首页",
    metricHelp: {
      staked: "当前锁定在质押合约中的 BANMAO 总量。",
      stakers: "参与过质押的钱包总数。",
      burned: "永久存放在销毁地址的 BANMAO。",
      apy: "最长锁定期限可获得的最高年化收益。",
    },
  },
  ko: {
    eyebrow: "X Layer에서 라이브",
    titleLead: "BANMAO DeFi와 함께",
    titleAccent: "수익과 성장을.",
    subtitle:
      "투명한 온체인 생태계에서 BANMAO 스테이킹, 커뮤니티 보상, 소각 및 토큰 출시를 이용하세요.",
    startStaking: "스테이킹 시작",
    exploreApps: "전체 앱 보기",
    portfolio: "내 포트폴리오",
    portfolioDescription: "X Layer 지갑 현황입니다.",
    connected: "연결됨",
    connectTitle: "지갑 연결",
    connectDescription: "잔액을 확인하고 모든 BANMAO DeFi 앱을 이용하세요.",
    walletAddress: "지갑",
    protocolOverview: "프로토콜 개요",
    updatedNow: "방금 업데이트",
    updatedSeconds: (seconds) => `${seconds}초 전 업데이트`,
    loading: "온체인 데이터 로딩 중",
    unavailable: "데이터를 불러올 수 없음",
    retry: "다시 시도",
    stakedLabel: "스테이킹된 BANMAO",
    stakersLabel: "스테이커",
    burnedLabel: "소각된 BANMAO",
    maxApyLabel: "최대 APY",
    liveProducts: "DeFi 제품",
    liveProductsDescription: IS_DEVELOPMENT
      ? "X Layer에서 앱 3개가 운영 중이며 Launchpad는 로컬에서 개발 중입니다."
      : "X Layer에서 앱 3개가 운영 중입니다.",
    appsLive: IS_DEVELOPMENT ? "3개 라이브 · 1개 개발 중" : "3개 앱 라이브",
    learnMore: "자세히",
    openApp: "앱 열기",
    sentLabel: "전송량",
    walletsLabel: "지갑",
    launchedLabel: "출시",
    comingNext: "출시 예정",
    comingDescription: "유동성, 파밍 및 대출 기능을 개발 중입니다.",
    trustTitle: "컨트랙트 및 투명성",
    trustDescription: "핵심 주소는 공개 검증할 수 있습니다. 서명 전 확인하세요.",
    verifiedOnChain: "X Layer에서 공개 검증 가능",
    tokenContract: "BANMAO 토큰",
    stakingContract: "스테이킹",
    airdropContract: "에어드롭",
    communityWallet: "커뮤니티 지갑",
    viewExplorer: "Explorer에서 보기",
    smartContract: "스마트 컨트랙트",
    poweredBy: "X Layer 기반",
    refreshData: "데이터 새로고침",
    copyAddress: "주소 복사",
    copied: "복사됨",
    liveOnChain: "실시간 온체인",
    protocolParameter: "프로토콜 매개변수",
    indexedData: "인덱싱된 API",
    wrongNetworkTitle: "잘못된 네트워크",
    wrongNetworkDescription: "BANMAO 앱 사용 전 X Layer로 전환하세요.",
    switchNetwork: "네트워크 전환",
    maintenanceTitle: "DeFi 점검 중",
    maintenanceDescription: "공개 DeFi 앱을 일시적으로 이용할 수 없습니다.",
    backHome: "홈으로",
    metricHelp: {
      staked: "스테이킹 컨트랙트에 잠긴 BANMAO 총량입니다.",
      stakers: "스테이킹에 참여한 지갑 수입니다.",
      burned: "소각 주소에 영구 보관된 BANMAO입니다.",
      apy: "가장 긴 락업 기간의 최대 연 수익률입니다.",
    },
  },
  ru: {
    eyebrow: "Работает в X Layer",
    titleLead: "Зарабатывайте и развивайтесь с",
    titleAccent: "BANMAO DeFi.",
    subtitle:
      "Стейкинг, награды сообществу, сжигание и запуск токенов в прозрачной ончейн-экосистеме.",
    startStaking: "Начать стейкинг",
    exploreApps: "Все приложения",
    portfolio: "Мой портфель",
    portfolioDescription: "Обзор вашего кошелька в X Layer.",
    connected: "Подключено",
    connectTitle: "Подключить кошелёк",
    connectDescription: "Проверьте баланс и откройте приложения BANMAO DeFi.",
    walletAddress: "Кошелёк",
    protocolOverview: "Обзор протокола",
    updatedNow: "Только что обновлено",
    updatedSeconds: (seconds) => `Обновлено ${seconds} сек. назад`,
    loading: "Загрузка ончейн-данных",
    unavailable: "Данные недоступны",
    retry: "Повторить",
    stakedLabel: "BANMAO в стейкинге",
    stakersLabel: "Стейкеры",
    burnedLabel: "BANMAO сожжено",
    maxApyLabel: "Макс. APY",
    liveProducts: "Продукты DeFi",
    liveProductsDescription: IS_DEVELOPMENT
      ? "Три приложения работают в X Layer; Launchpad доступен только локально."
      : "Три приложения работают в X Layer.",
    appsLive: IS_DEVELOPMENT ? "3 работают · 1 в разработке" : "3 приложения",
    learnMore: "Подробнее",
    openApp: "Открыть",
    sentLabel: "Отправлено",
    walletsLabel: "Кошельки",
    launchedLabel: "Запуск",
    comingNext: "Скоро",
    comingDescription: "Ликвидность, фарминг и кредитование находятся в разработке.",
    trustTitle: "Контракты и прозрачность",
    trustDescription: "Основные адреса опубликованы. Всегда проверяйте контракт.",
    verifiedOnChain: "Публично проверяется в X Layer",
    tokenContract: "Токен BANMAO",
    stakingContract: "Стейкинг",
    airdropContract: "Аирдроп",
    communityWallet: "Кошелёк сообщества",
    viewExplorer: "Открыть Explorer",
    smartContract: "Смарт-контракт",
    poweredBy: "Работает на X Layer",
    refreshData: "Обновить данные",
    copyAddress: "Копировать адрес",
    copied: "Скопировано",
    liveOnChain: "Ончейн-данные",
    protocolParameter: "Параметр протокола",
    indexedData: "Индексированный API",
    wrongNetworkTitle: "Неверная сеть",
    wrongNetworkDescription: "Переключитесь на X Layer для приложений BANMAO.",
    switchNetwork: "Сменить сеть",
    maintenanceTitle: "DeFi на обслуживании",
    maintenanceDescription: "Публичные приложения DeFi временно недоступны.",
    backHome: "На главную",
    metricHelp: {
      staked: "Общий объём BANMAO, заблокированный в контракте стейкинга.",
      stakers: "Общее число кошельков, участвовавших в стейкинге.",
      burned: "BANMAO, навсегда находящиеся на адресе сжигания.",
      apy: "Максимальная годовая доходность для самого долгого срока.",
    },
  },
  id: {
    eyebrow: "Aktif di X Layer",
    titleLead: "Raih hasil dan tumbuh bersama",
    titleAccent: "BANMAO DeFi.",
    subtitle:
      "Stake BANMAO, beri hadiah komunitas, kurangi suplai atau luncurkan token dalam ekosistem on-chain transparan.",
    startStaking: "Mulai staking",
    exploreApps: "Jelajahi semua aplikasi",
    portfolio: "Portofolio saya",
    portfolioDescription: "Ringkasan dompet Anda di X Layer.",
    connected: "Terhubung",
    connectTitle: "Hubungkan dompet",
    connectDescription: "Lihat saldo dan akses seluruh aplikasi BANMAO DeFi.",
    walletAddress: "Dompet",
    protocolOverview: "Ringkasan protokol",
    updatedNow: "Baru diperbarui",
    updatedSeconds: (seconds) => `Diperbarui ${seconds} dtk lalu`,
    loading: "Memuat data on-chain",
    unavailable: "Data tidak tersedia",
    retry: "Coba lagi",
    stakedLabel: "BANMAO di-stake",
    stakersLabel: "Staker",
    burnedLabel: "BANMAO dibakar",
    maxApyLabel: "APY maksimum",
    liveProducts: "Produk DeFi",
    liveProductsDescription: IS_DEVELOPMENT
      ? "Tiga aplikasi aktif di X Layer; Launchpad hanya dikembangkan secara lokal."
      : "Tiga aplikasi aktif di X Layer.",
    appsLive: IS_DEVELOPMENT ? "3 aktif · 1 dikembangkan" : "3 aplikasi aktif",
    learnMore: "Pelajari",
    openApp: "Buka aplikasi",
    sentLabel: "Terkirim",
    walletsLabel: "Dompet",
    launchedLabel: "Luncurkan",
    comingNext: "Segera hadir",
    comingDescription: "Likuiditas, farming, dan lending sedang dikembangkan.",
    trustTitle: "Kontrak & transparansi",
    trustDescription: "Alamat inti dipublikasikan. Selalu verifikasi sebelum tanda tangan.",
    verifiedOnChain: "Dapat diverifikasi di X Layer",
    tokenContract: "Token BANMAO",
    stakingContract: "Staking",
    airdropContract: "Airdrop",
    communityWallet: "Dompet komunitas",
    viewExplorer: "Lihat di Explorer",
    smartContract: "Smart contract",
    poweredBy: "Didukung X Layer",
    refreshData: "Muat ulang data",
    copyAddress: "Salin alamat",
    copied: "Disalin",
    liveOnChain: "Live on-chain",
    protocolParameter: "Parameter protokol",
    indexedData: "API terindeks",
    wrongNetworkTitle: "Jaringan salah",
    wrongNetworkDescription: "Beralih ke X Layer sebelum memakai aplikasi BANMAO.",
    switchNetwork: "Ganti jaringan",
    maintenanceTitle: "DeFi sedang pemeliharaan",
    maintenanceDescription: "Aplikasi DeFi publik sementara tidak tersedia.",
    backHome: "Kembali ke beranda",
    metricHelp: {
      staked: "Total BANMAO yang terkunci di kontrak staking.",
      stakers: "Total dompet yang pernah mengikuti staking.",
      burned: "BANMAO yang tersimpan permanen di alamat burn.",
      apy: "Imbal hasil tahunan maksimum untuk durasi kunci terlama.",
    },
  },
};

type AirdropStats = {
  total_distributed: number;
  total_recipients: number;
};

type ProductConfig = {
  id: "staking" | "airdrop" | "burn" | "launchpad";
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  detailsKey: TranslationKey;
  href: string;
  color: string;
  Icon: ComponentType<{ className?: string }>;
  contractAddress?: string;
  illustration?: string;
  status?: "live" | "coming";
};

type ProductModalService = {
  id: string;
  name: string;
  desc: string;
  contractAddress?: string;
  stats: { label: string; value: string }[];
  color: string;
  Icon: ComponentType<{ className?: string }>;
  status: "live" | "coming";
  href: string;
};

const PRODUCTS: ProductConfig[] = [
  {
    id: "staking",
    nameKey: "defiStakingName",
    descriptionKey: "defiStakingDesc",
    detailsKey: "defiStakingDetails",
    href: "/defi/staking",
    color: "#a855f7",
    Icon: StakingIcon,
    contractAddress: STAKING_CONTRACT_ADDRESS,
    illustration: "/defi/banmao_staking.png",
  },
  {
    id: "airdrop",
    nameKey: "defiAirdropName",
    descriptionKey: "defiAirdropDesc",
    detailsKey: "defiAirdropDetails",
    href: "/defi/airdrop",
    color: "#f97316",
    Icon: AirdropIcon,
    contractAddress: AIRDROP_CONTRACT_ADDRESS,
    illustration: "/defi/banmao_airdrop.png",
  },
  {
    id: "burn",
    nameKey: "defiBurnName",
    descriptionKey: "defiBurnDesc",
    detailsKey: "defiBurnDetails",
    href: "/defi/burn",
    color: "#ef4444",
    Icon: BurnIcon,
    contractAddress: COMMUNITY_WALLET,
    illustration: "/defi/banmao_burn.png",
  },
  ...(IS_DEVELOPMENT
    ? [
        {
          id: "launchpad",
          nameKey: "defiLaunchpadName",
          descriptionKey: "defiLaunchpadDesc",
          detailsKey: "defiLaunchpadDetails",
          href: "/defi/launchpad",
          color: "#f59e0b",
          Icon: LaunchpadIcon,
          status: "coming",
        } as const,
      ]
    : []),
];

function trackDeFiEvent(
  eventName: string,
  payload: Record<string, string | number | boolean> = {},
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("banmao:defi-analytics", {
      detail: { event: eventName, ...payload },
    }),
  );

  const analyticsWindow = window as Window & {
    gtag?: (...args: unknown[]) => void;
  };
  analyticsWindow.gtag?.("event", eventName, payload);
}

function formatCompact(value?: bigint) {
  if (value === undefined) return "—";
  const number = Number(value) / 1e18;
  if (number === 0) return "0";
  if (number >= 1_000_000_000)
    return `${(number / 1_000_000_000).toFixed(2)}B`;
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
  if (number >= 1_000) return `${(number / 1_000).toFixed(1)}K`;
  if (number >= 1)
    return number.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return number.toFixed(2);
}

function formatApiCompact(value?: number) {
  if (value === undefined) return "—";
  if (value === 0) return "0";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatTokenAmount(value?: bigint) {
  if (value === undefined) return "—";
  const number = Number(value) / 1e18;
  if (number === 0) return "0";
  return number.toLocaleString(undefined, {
    maximumFractionDigits: number >= 1 ? 2 : 4,
  });
}

function formatOkb(value?: bigint) {
  if (value === undefined) return "—";
  const number = Number(formatEther(value));
  return number.toLocaleString(undefined, {
    maximumFractionDigits: number >= 1 ? 4 : 6,
  });
}

function shortAddress(address?: string) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function MetricValue({
  value,
  unit,
  isLoading,
  isError,
  copy,
  onRetry,
}: {
  value: string;
  unit?: string;
  isLoading: boolean;
  isError: boolean;
  copy: OverviewCopy;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <span
        className="defi-skeleton defi-skeleton--metric"
        role="status"
        aria-label={copy.loading}
      />
    );
  }

  if (isError) {
    return (
      <span className="defi-metric__error" role="status">
        {copy.unavailable}
        <button type="button" className="defi-metric__retry" onClick={onRetry}>
          {copy.retry}
        </button>
      </span>
    );
  }

  return (
    <strong className="defi-metric__value">
      {value}
      {unit ? <span className="defi-metric__unit">{unit}</span> : null}
    </strong>
  );
}

function CopyAddressButton({
  address,
  copyLabel,
  copiedLabel,
}: {
  address: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      className="defi-contract-copy"
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : copyLabel}
      title={copied ? copiedLabel : copyLabel}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </button>
  );
}

export default function DeFiPage() {
  const [lang, setLang] = useState<Language>("en");
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [defiEnabled, setDefiEnabled] = useState(true);
  const [airdropStats, setAirdropStats] = useState<AirdropStats | null>(null);
  const [airdropLoading, setAirdropLoading] = useState(true);
  const [airdropError, setAirdropError] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [selectedService, setSelectedService] =
    useState<ProductModalService | null>(null);
  const connectedTracked = useRef(false);

  const { address, isConnected } = useAccount();
  const copy = OVERVIEW_COPY[lang];

  const t = useCallback(
    (key: TranslationKey) =>
      translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(
      "banmao_language",
    ) as Language | null;
    setLang(
      saved && Object.prototype.hasOwnProperty.call(OVERVIEW_COPY, saved)
        ? saved
        : getBrowserLanguage(),
    );
    const enabled = window.localStorage.getItem("DEFI_ENABLED") !== "false";
    setDefiEnabled(enabled);
    setCheckingAccess(false);

    const syncLanguage = (event: Event) => {
      const nextLanguage = (event as CustomEvent<Language>).detail;
      if (
        nextLanguage &&
        Object.prototype.hasOwnProperty.call(OVERVIEW_COPY, nextLanguage)
      ) {
        setLang(nextLanguage);
      }
    };

    window.addEventListener("banmao:language-change", syncLanguage);
    return () =>
      window.removeEventListener("banmao:language-change", syncLanguage);
  }, []);

  useEffect(() => {
    if (isConnected && !connectedTracked.current) {
      connectedTracked.current = true;
      trackDeFiEvent("defi_wallet_connected");
    }
    if (!isConnected) connectedTracked.current = false;
  }, [isConnected]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const okbBalanceQuery = useBalance({
    address,
    query: {
      enabled: Boolean(address),
      refetchInterval: 10_000,
    },
  });

  const banmaoBalanceQuery = useReadContract({
    address: BANMAO_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 10_000,
    },
  });

  const totalStakedQuery = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_STATS_ABI,
    functionName: "totalStaked",
    query: { refetchInterval: 15_000 },
  });

  const totalStakersQuery = useReadContract({
    address: STAKING_CONTRACT_ADDRESS,
    abi: STAKING_STATS_ABI,
    functionName: "getTotalStakers",
    query: { refetchInterval: 15_000 },
  });

  const burnedBalanceQuery = useReadContract({
    address: BANMAO_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [DEAD_WALLET],
    query: { refetchInterval: 15_000 },
  });

  const fetchAirdropStats = useCallback(async () => {
    setAirdropLoading(true);
    setAirdropError(false);
    try {
      const response = await fetch("/api/airdrop-records?type=stats", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as {
        success: boolean;
        data?: AirdropStats;
      };
      if (!payload.success || !payload.data) throw new Error("Invalid data");
      setAirdropStats(payload.data);
      setLastUpdatedAt(Date.now());
    } catch {
      setAirdropError(true);
    } finally {
      setAirdropLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAirdropStats();
    const timer = window.setInterval(() => {
      void fetchAirdropStats();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [fetchAirdropStats]);

  useEffect(() => {
    if (
      totalStakedQuery.data !== undefined ||
      totalStakersQuery.data !== undefined ||
      burnedBalanceQuery.data !== undefined
    ) {
      setLastUpdatedAt(Date.now());
    }
  }, [
    burnedBalanceQuery.data,
    totalStakedQuery.data,
    totalStakersQuery.data,
  ]);

  const retryProtocolData = useCallback(() => {
    void totalStakedQuery.refetch();
    void totalStakersQuery.refetch();
    void burnedBalanceQuery.refetch();
    void fetchAirdropStats();
    setNow(Date.now());
    trackDeFiEvent("defi_data_retry");
  }, [
    burnedBalanceQuery,
    fetchAirdropStats,
    totalStakedQuery,
    totalStakersQuery,
  ]);

  const tvlDisplay = formatCompact(totalStakedQuery.data);
  const stakersDisplay =
    totalStakersQuery.data === undefined
      ? "—"
      : Number(totalStakersQuery.data).toLocaleString();
  const burnedDisplay = formatCompact(burnedBalanceQuery.data);
  const airdropSentDisplay = formatApiCompact(
    airdropStats?.total_distributed,
  );
  const airdropRecipientsDisplay =
    airdropStats?.total_recipients === undefined
      ? "—"
      : airdropStats.total_recipients.toLocaleString();

  const freshnessSeconds = lastUpdatedAt
    ? Math.max(0, Math.floor((now - lastUpdatedAt) / 1000))
    : 0;

  const productStats = useMemo(
    () => ({
      staking: [
        { label: copy.maxApyLabel, value: "75%" },
        { label: copy.stakedLabel, value: tvlDisplay },
      ],
      airdrop: [
        {
          label: copy.sentLabel,
          value: airdropLoading ? "…" : airdropError ? "—" : airdropSentDisplay,
        },
        {
          label: copy.walletsLabel,
          value: airdropLoading
            ? "…"
            : airdropError
              ? "—"
              : airdropRecipientsDisplay,
        },
      ],
      burn: [
        { label: copy.burnedLabel, value: burnedDisplay },
        { label: copy.poweredBy, value: "X Layer" },
      ],
      launchpad: [
        { label: copy.launchedLabel, value: "Permissionless" },
        { label: "AMM", value: "Uniswap V4" },
      ],
    }),
    [
      airdropError,
      airdropLoading,
      airdropRecipientsDisplay,
      airdropSentDisplay,
      burnedDisplay,
      copy,
      tvlDisplay,
    ],
  );

  const getBullets = useCallback(
    (serviceId: ProductConfig["id"]): BulletItem[] | undefined => {
      if (serviceId === "staking") {
        return [
          {
            icon: "📅",
            title: t("defiStakingBullet1Title"),
            desc: t("defiStakingBullet1Desc"),
          },
          {
            icon: "📈",
            title: t("defiStakingBullet2Title"),
            desc: t("defiStakingBullet2Desc"),
          },
          {
            icon: "🔒",
            title: t("defiStakingBullet3Title"),
            desc: t("defiStakingBullet3Desc"),
          },
          {
            icon: "🎁",
            title: t("defiStakingBullet4Title"),
            desc: t("defiStakingBullet4Desc"),
          },
        ];
      }

      if (serviceId === "burn") {
        return [
          {
            icon: "🔥",
            title: t("defiBurnBullet1Title"),
            desc: t("defiBurnBullet1Desc"),
          },
          {
            icon: "🏆",
            title: t("defiBurnBullet2Title"),
            desc: t("defiBurnBullet2Desc"),
          },
          {
            icon: "💰",
            title: t("defiBurnBullet3Title"),
            desc: t("defiBurnBullet3Desc"),
          },
        ];
      }

      if (serviceId === "airdrop") {
        return [
          {
            icon: "🔍",
            title: t("defiAirdropBullet1Title"),
            desc: t("defiAirdropBullet1Desc"),
          },
          {
            icon: "📦",
            title: t("defiAirdropBullet2Title"),
            desc: t("defiAirdropBullet2Desc"),
          },
          {
            icon: "📥",
            title: t("defiAirdropBullet3Title"),
            desc: t("defiAirdropBullet3Desc"),
          },
        ];
      }

      return undefined;
    },
    [t],
  );

  const selectedConfig = selectedService
    ? PRODUCTS.find((product) => product.id === selectedService.id)
    : undefined;

  const selectedIntro =
    selectedConfig?.id === "staking"
      ? t("defiStakingIntro")
      : selectedConfig?.id === "burn"
        ? t("defiBurnIntro")
        : selectedConfig?.id === "airdrop"
          ? t("defiAirdropIntro")
          : undefined;

  const selectedOutro =
    selectedConfig?.id === "staking"
      ? t("defiStakingOutro")
      : selectedConfig?.id === "burn"
        ? t("defiBurnOutro")
        : selectedConfig?.id === "airdrop"
          ? t("defiAirdropOutro")
          : undefined;

  const openProductInfo = (product: ProductConfig) => {
    setSelectedService({
      id: product.id,
      name: t(product.nameKey),
      desc: t(product.detailsKey),
      contractAddress: product.contractAddress,
      stats: productStats[product.id],
      color: product.color,
      Icon: product.Icon,
      status: product.status ?? "live",
      href: product.href,
    });
    trackDeFiEvent("defi_product_info_open", { product: product.id });
  };

  if (checkingAccess) {
    return (
      <div className="defi-overview-state" aria-busy="true">
        <div className="defi-overview-state__card">
          <span
            className="defi-skeleton defi-skeleton--metric"
            aria-label={copy.loading}
          />
        </div>
      </div>
    );
  }

  if (!defiEnabled) {
    return (
      <div className="defi-overview-state">
        <div className="defi-overview-state__card">
          <div className="defi-overview-state__icon" aria-hidden="true">
            🚧
          </div>
          <h1>{copy.maintenanceTitle}</h1>
          <p>{copy.maintenanceDescription}</p>
          <Link href="/" className="defi-button defi-button--primary">
            {copy.backHome}
          </Link>
        </div>
      </div>
    );
  }

  const protocolLoading =
    totalStakedQuery.isPending ||
    totalStakersQuery.isPending ||
    burnedBalanceQuery.isPending;

  return (
    <div className="defi-overview">
      <div className="defi-overview__container">
        <section className="defi-overview__hero" aria-labelledby="defi-title">
          <div className="defi-overview__hero-copy">
            <div className="defi-overview__hero-mascot" aria-hidden="true">
              <Image
                src="/branding/banmao_logo.png"
                alt=""
                width={400}
                height={400}
                priority
              />
            </div>
            <div className="defi-overview__hero-content">
              <div className="defi-overview__eyebrow">
                <span
                  className="defi-overview__eyebrow-dot"
                  aria-hidden="true"
                />
                {copy.eyebrow}
              </div>
              <h1 id="defi-title" className="defi-overview__title">
                {copy.titleLead}{" "}
                <span className="defi-overview__title-accent">
                  {copy.titleAccent}
                </span>
              </h1>
              <p className="defi-overview__subtitle">{copy.subtitle}</p>
              <div className="defi-overview__hero-actions">
                <Link
                  href="/defi/staking"
                  className="defi-button defi-button--primary"
                  onClick={() =>
                    trackDeFiEvent("defi_primary_cta_click", {
                      destination: "staking",
                    })
                  }
                >
                  {copy.startStaking}
                </Link>
                <a
                  href="#live-products"
                  className="defi-button defi-button--secondary"
                >
                  {copy.exploreApps}
                </a>
              </div>
            </div>
          </div>

          <aside className="defi-wallet-card" aria-labelledby="portfolio-title">
            <div className="defi-wallet-card__header">
              <div>
                <h2 id="portfolio-title" className="defi-wallet-card__title">
                  {copy.portfolio}
                </h2>
                <p>{copy.portfolioDescription}</p>
              </div>
              {isConnected && (
                <div className="defi-wallet-card__status-group">
                  <span className="defi-wallet-card__status">
                    {copy.connected}
                  </span>
                </div>
              )}
            </div>

            {!isConnected ? (
              <div className="defi-wallet-card__empty">
                <div>
                  <div className="defi-wallet-card__empty-icon">
                    <Wallet size={25} aria-hidden="true" />
                  </div>
                  <strong>{copy.connectTitle}</strong>
                  <p>{copy.connectDescription}</p>
                  <ConnectButton showBalance={false} accountStatus="address" />
                </div>
              </div>
            ) : (
              <>
                <div className="defi-wallet-card__balances">
                  <div className="defi-balance-tile">
                    <span>BANMAO</span>
                    {banmaoBalanceQuery.isPending ? (
                      <span className="defi-skeleton defi-skeleton--balance" />
                    ) : (
                      <strong>
                        {formatTokenAmount(banmaoBalanceQuery.data)}
                      </strong>
                    )}
                  </div>
                  <div className="defi-balance-tile">
                    <span>OKB</span>
                    {okbBalanceQuery.isPending ? (
                      <span className="defi-skeleton defi-skeleton--balance" />
                    ) : (
                      <strong>{formatOkb(okbBalanceQuery.data?.value)}</strong>
                    )}
                  </div>
                </div>
                <div className="defi-wallet-card__address">
                  <span>{copy.walletAddress}</span>
                  <code>{shortAddress(address)}</code>
                </div>
              </>
            )}
          </aside>
        </section>

        <section
          className="defi-metrics"
          aria-labelledby="protocol-overview-title"
          aria-busy={protocolLoading}
        >
          <div className="defi-metrics__header">
            <h2 id="protocol-overview-title">{copy.protocolOverview}</h2>
            <div className="defi-metrics__controls">
              <span className="defi-metrics__freshness" aria-live="polite">
                <span
                  className="defi-metrics__freshness-dot"
                  aria-hidden="true"
                />
                {lastUpdatedAt
                  ? freshnessSeconds < 2
                    ? copy.updatedNow
                    : copy.updatedSeconds(freshnessSeconds)
                  : copy.loading}
              </span>
              <button
                type="button"
                className="defi-metrics__refresh"
                onClick={retryProtocolData}
                aria-label={copy.refreshData}
                title={copy.refreshData}
                disabled={protocolLoading || airdropLoading}
              >
                <RefreshCw aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="defi-metrics__grid">
            <div className="defi-metric">
              <div className="defi-metric__label-row">
                <span className="defi-metric__label">{copy.stakedLabel}</span>
                <MetricInfoPopover
                  label={copy.metricHelp.staked}
                  description={copy.metricHelp.staked}
                />
              </div>
              <MetricValue
                value={tvlDisplay}
                unit="BANMAO"
                isLoading={totalStakedQuery.isPending}
                isError={totalStakedQuery.isError}
                copy={copy}
                onRetry={retryProtocolData}
              />
            </div>

            <div className="defi-metric">
              <div className="defi-metric__label-row">
                <span className="defi-metric__label">
                  {copy.stakersLabel}
                </span>
                <MetricInfoPopover
                  label={copy.metricHelp.stakers}
                  description={copy.metricHelp.stakers}
                />
              </div>
              <MetricValue
                value={stakersDisplay}
                isLoading={totalStakersQuery.isPending}
                isError={totalStakersQuery.isError}
                copy={copy}
                onRetry={retryProtocolData}
              />
            </div>

            <div className="defi-metric">
              <div className="defi-metric__label-row">
                <span className="defi-metric__label">{copy.burnedLabel}</span>
                <MetricInfoPopover
                  label={copy.metricHelp.burned}
                  description={copy.metricHelp.burned}
                />
              </div>
              <MetricValue
                value={burnedDisplay}
                unit="BANMAO"
                isLoading={burnedBalanceQuery.isPending}
                isError={burnedBalanceQuery.isError}
                copy={copy}
                onRetry={retryProtocolData}
              />
            </div>

            <div className="defi-metric">
              <div className="defi-metric__label-row">
                <span className="defi-metric__label">{copy.maxApyLabel}</span>
                <MetricInfoPopover
                  label={copy.metricHelp.apy}
                  description={copy.metricHelp.apy}
                />
              </div>
              <MetricValue
                value="75%"
                isLoading={false}
                isError={false}
                copy={copy}
                onRetry={retryProtocolData}
              />
            </div>
          </div>
        </section>

        <section
          id="live-products"
          className="defi-section"
          aria-labelledby="live-products-title"
        >
          <div className="defi-section-heading">
            <div>
              <h2 id="live-products-title">{copy.liveProducts}</h2>
              <p>{copy.liveProductsDescription}</p>
            </div>
            <span className="defi-section-heading__count">
              {PRODUCT_COUNT_COPY[lang]}
            </span>
          </div>

          <div className="defi-products-grid">
            {PRODUCTS.map((product) => {
              const Icon = product.Icon;
              const stats = productStats[product.id];
              return (
                <article
                  key={product.id}
                  className="defi-product-card"
                  style={
                    {
                      "--product-color": product.color,
                    } as CSSProperties
                  }
                >
                  {product.illustration ? (
                    <div
                      className="defi-product-card__illustration"
                      aria-hidden="true"
                    >
                      <Image
                        src={product.illustration}
                        alt=""
                        width={360}
                        height={280}
                      />
                    </div>
                  ) : null}

                  <div className="defi-product-card__top">
                    <div className="defi-product-card__identity">
                      <span className="defi-product-card__icon">
                        <Icon />
                      </span>
                      <h3 className="defi-product-card__name" title={t(product.nameKey)}>
                        {t(product.nameKey)}
                      </h3>
                    </div>
                    <span
                      className={`defi-live-badge ${
                        product.status === "coming"
                          ? "defi-live-badge--development"
                          : ""
                      }`}
                    >
                      {product.status === "coming"
                        ? DEVELOPMENT_COPY[lang]
                        : t("defiLive")}
                    </span>
                  </div>

                  <p className="defi-product-card__description">
                    {t(product.descriptionKey)}
                  </p>

                  <div className="defi-product-card__stats">
                    {stats.map((stat) => (
                      <div className="defi-product-stat" key={stat.label}>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="defi-product-card__footer">
                    {product.status === "coming" ? (
                      <button
                        type="button"
                        className="defi-product-card__cta defi-product-card__cta--disabled"
                        disabled
                      >
                        {DEVELOPMENT_COPY[lang]}
                      </button>
                    ) : (
                      <Link
                        href={product.href}
                        className="defi-product-card__cta"
                        onClick={() =>
                          trackDeFiEvent("defi_product_enter", {
                            product: product.id,
                          })
                        }
                      >
                        {copy.openApp}
                      </Link>
                    )}
                    <button
                      type="button"
                      className="defi-info-button"
                      onClick={() => openProductInfo(product)}
                      aria-label={`${copy.learnMore}: ${t(product.nameKey)}`}
                      title={`${copy.learnMore}: ${t(product.nameKey)}`}
                    >
                      <Info size={14} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="defi-section" aria-labelledby="coming-next-title">
          <div className="defi-upcoming">
            <div className="defi-upcoming__copy">
              <h3 id="coming-next-title">{copy.comingNext}</h3>
              <p>{copy.comingDescription}</p>
            </div>
            <div className="defi-upcoming__items" aria-label={copy.comingNext}>
              <span className="defi-upcoming__item">
                <PoolIcon />
                {t("defiPoolsName")}
              </span>
              <span className="defi-upcoming__item">
                <FarmIcon />
                {t("defiFarmingName")}
              </span>
              <span className="defi-upcoming__item">
                <LendingIcon />
                {t("defiLendingName")}
              </span>
            </div>
          </div>
        </section>

        <section
          className="defi-section defi-trust-panel"
          aria-labelledby="trust-title"
        >
          <div className="defi-trust-panel__intro">
            <h2 id="trust-title">{copy.trustTitle}</h2>
            <p>{copy.trustDescription}</p>
            <span className="defi-trust-panel__status">
              <ShieldCheck aria-hidden="true" />
              {copy.verifiedOnChain}
            </span>
          </div>

          <dl className="defi-contract-list">
            {[
              {
                label: copy.tokenContract,
                address: BANMAO_TOKEN_ADDRESS,
              },
              {
                label: copy.stakingContract,
                address: STAKING_CONTRACT_ADDRESS,
              },
              {
                label: copy.airdropContract,
                address: AIRDROP_CONTRACT_ADDRESS,
              },
              {
                label: copy.communityWallet,
                address: COMMUNITY_WALLET,
              },
            ].map((contract) => (
              <div className="defi-contract-row" key={contract.address}>
                <dt>{contract.label}</dt>
                <dd>
                  <code title={contract.address}>{contract.address}</code>
                </dd>
                <div className="defi-contract-actions">
                  <CopyAddressButton
                    address={contract.address}
                    copyLabel={copy.copyAddress}
                    copiedLabel={copy.copied}
                  />
                  <a
                  href={xLayerExplorerAddressUrl(contract.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${copy.viewExplorer}: ${contract.label}`}
                  title={`${copy.viewExplorer}: ${contract.label}`}
                  onClick={() =>
                    trackDeFiEvent("defi_contract_explorer_open", {
                      contract: contract.label,
                    })
                  }
                  >
                    <ExternalLink aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <footer className="defi-overview__footer">
          <span>© 2026 BANMAO · {copy.poweredBy}</span>
          <div className="defi-overview__footer-links">
            <a
              href="https://t.me/banmao_X"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </a>
            <a
              href="https://x.com/banmao_X"
              target="_blank"
              rel="noopener noreferrer"
            >
              X / Twitter
            </a>
            <a
              href={xLayerExplorerAddressUrl(BANMAO_TOKEN_ADDRESS)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Explorer
            </a>
          </div>
        </footer>
      </div>

      <ServiceDetailModal
        isOpen={Boolean(selectedService)}
        onClose={() => setSelectedService(null)}
        service={selectedService}
        bullets={
          selectedConfig ? getBullets(selectedConfig.id) : undefined
        }
        introText={selectedIntro}
        outroText={selectedOutro}
        mascotSrc={
          selectedConfig?.illustration ?? "/branding/banmao_logo.png"
        }
        enterAppLabel={copy.openApp}
        comingSoonLabel={t("defiComingSoon")}
        liveLabel={t("defiLive")}
        contractAddressLabel={copy.smartContract}
        viewExplorerLabel={copy.viewExplorer}
      />
    </div>
  );
}