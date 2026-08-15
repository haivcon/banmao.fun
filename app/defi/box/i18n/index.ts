export const BOX_LANGUAGES = ["en", "vi", "zh", "ko", "ru", "id"] as const;

export type BoxLanguage = (typeof BOX_LANGUAGES)[number];

export type BoxCopy = {
  back: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  lockedMetric: string;
  activeMetric: string;
  walletMetric: string;
  createTitle: string;
  createDescription: string;
  amount: string;
  amountPlaceholder: string;
  balance: string;
  useMax: string;
  recipient: string;
  recipientPlaceholder: string;
  recipientHint: string;
  duration: string;
  customDays: string;
  customDaysPlaceholder: string;
  unlockPreview: string;
  createButton: string;
  connectToCreate: string;
  notDeployedTitle: string;
  notDeployedDescription: string;
  wrongNetwork: string;
  boxesTitle: string;
  boxesDescription: string;
  noBoxes: string;
  noBoxesHint: string;
  boxNumber: string;
  locked: string;
  ready: string;
  unlocksAt: string;
  remaining: string;
  open: string;
  transfer: string;
  transferTitle: string;
  transferRecipient: string;
  cancel: string;
  confirmTransfer: string;
  loading: string;
  retry: string;
  howTitle: string;
  howDescription: string;
  stepApprove: string;
  stepApproveText: string;
  stepGift: string;
  stepGiftText: string;
  stepOpen: string;
  stepOpenText: string;
  safetyTitle: string;
  safetyText: string;
  phase: Record<string, string>;
  success: string;
  transactionError: string;
  invalidAmount: string;
  insufficientBalance: string;
  invalidRecipient: string;
  invalidDuration: string;
  sameRecipient: string;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  createdAt: string;
  inspectTitle: string;
  inspectDescription: string;
  inspectPlaceholder: string;
  inspectButton: string;
  owner: string;
  refreshMetadata: string;
  previous: string;
  next: string;
  operations: string;
  basketAssets: string;
  primaryAsset: string;
  releaseAsset: string;
  releaseHint: string;
};

export const BOX_COPY: Record<BoxLanguage, BoxCopy> = {
  en: {
    back: "DeFi home",
    eyebrow: "A gift that waits",
    title: "Pack BANMAO into a time-locked NFT.",
    subtitle:
      "Create a transferable BanmaoBox, gift it to any wallet, and let its current owner open it when the timer ends.",
    lockedMetric: "BANMAO locked",
    activeMetric: "Active boxes",
    walletMetric: "Your balance",
    createTitle: "Create a BanmaoBox",
    createDescription: "Choose the gift, recipient and opening date.",
    amount: "BANMAO amount",
    amountPlaceholder: "0.00",
    balance: "Balance",
    useMax: "Max",
    recipient: "Initial recipient",
    recipientPlaceholder: "0x…",
    recipientHint:
      "Use your wallet to keep it, or enter another wallet to gift it now.",
    duration: "Lock duration",
    customDays: "Custom",
    customDaysPlaceholder: "Number of days",
    unlockPreview: "Estimated opening date",
    createButton: "Create box",
    connectToCreate: "Connect wallet to create",
    notDeployedTitle: "BanmaoBox is ready for deployment",
    notDeployedDescription:
      "Add a verified per-chain deployment manifest to enable on-chain actions.",
    wrongNetwork: "Your wallet will be switched to X Layer before signing.",
    boxesTitle: "My BanmaoBoxes",
    boxesDescription: "Boxes currently owned by your connected wallet.",
    noBoxes: "No BanmaoBoxes yet",
    noBoxesHint: "Create one above or receive one from another wallet.",
    boxNumber: "Box",
    locked: "Locked",
    ready: "Ready to open",
    unlocksAt: "Opens",
    remaining: "Time remaining",
    open: "Open box",
    transfer: "Gift / transfer",
    transferTitle: "Transfer BanmaoBox",
    transferRecipient: "Recipient wallet",
    cancel: "Cancel",
    confirmTransfer: "Confirm transfer",
    loading: "Loading boxes…",
    retry: "Refresh",
    howTitle: "How BanmaoBox works",
    howDescription: "One NFT, one protected BANMAO balance, one opening date.",
    stepApprove: "Pack",
    stepApproveText:
      "Approve the exact amount and lock BANMAO in a newly minted ERC-721.",
    stepGift: "Gift",
    stepGiftText:
      "Keep, gift or trade the NFT. The locked BANMAO follows its current owner.",
    stepOpen: "Open",
    stepOpenText:
      "After the timestamp, the NFT owner claims all BANMAO and the box is burned.",
    safetyTitle: "Trust-minimized by design",
    safetyText:
      "No admin withdrawal and no early unlock. Always verify the deployed contract address before signing.",
    phase: {
      "switching-chain": "Switching to X Layer…",
      approving: "Approve BANMAO in your wallet…",
      creating: "Create the box in your wallet…",
      opening: "Open the box in your wallet…",
      "refreshing-metadata": "Confirm the metadata refresh…",
      transferring: "Confirm the NFT transfer…",
      confirming: "Waiting for on-chain confirmation…",
    },
    success: "Transaction confirmed on X Layer.",
    transactionError: "The transaction could not be completed.",
    invalidAmount: "Enter a valid amount greater than zero.",
    insufficientBalance: "Your BANMAO balance is too low.",
    invalidRecipient: "Enter a valid recipient wallet.",
    invalidDuration: "Choose a lock duration from 1 to 36,500 days (100 years).",
    sameRecipient: "Recipient already owns this box.",
    days: "d",
    hours: "h",
    minutes: "m",
    seconds: "s",
    createdAt: "Created",
    inspectTitle: "Explore any BanmaoBox",
    inspectDescription:
      "Enter a live token ID to verify its owner, backing, dates and on-chain artwork.",
    inspectPlaceholder: "Token ID, e.g. 1",
    inspectButton: "Inspect box",
    owner: "Current owner",
    refreshMetadata: "Refresh metadata",
    previous: "Previous",
    next: "Next",
    operations: "Operations",
    basketAssets: "Assets in this box",
    primaryAsset: "Primary",
    releaseAsset: "Release asset",
    releaseHint: "Assets are reloaded after every release because their indexes may change.",
  },
  vi: {
    back: "Trang DeFi",
    eyebrow: "Món quà biết chờ đợi",
    title: "Gói BANMAO vào NFT khóa theo thời gian.",
    subtitle:
      "Tạo BanmaoBox có thể chuyển nhượng, tặng cho bất kỳ ví nào và để chủ sở hữu hiện tại mở khi hết thời gian.",
    lockedMetric: "BANMAO đang khóa",
    activeMetric: "Box đang hoạt động",
    walletMetric: "Số dư của bạn",
    createTitle: "Tạo BanmaoBox",
    createDescription: "Chọn số token, người nhận và ngày mở hộp.",
    amount: "Số lượng BANMAO",
    amountPlaceholder: "0.00",
    balance: "Số dư",
    useMax: "Tối đa",
    recipient: "Người nhận ban đầu",
    recipientPlaceholder: "0x…",
    recipientHint: "Dùng ví của bạn để giữ hoặc nhập ví khác để tặng ngay.",
    duration: "Thời gian khóa",
    customDays: "Tùy chỉnh",
    customDaysPlaceholder: "Số ngày",
    unlockPreview: "Ngày mở dự kiến",
    createButton: "Tạo box",
    connectToCreate: "Kết nối ví để tạo",
    notDeployedTitle: "BanmaoBox đã sẵn sàng để deploy",
    notDeployedDescription:
      "Deploy hợp đồng rồi đặt NEXT_PUBLIC_BANMAO_BOX_ADDRESS để bật chức năng on-chain.",
    wrongNetwork: "Ví sẽ chuyển sang X Layer trước khi ký.",
    boxesTitle: "BanmaoBox của tôi",
    boxesDescription: "Các box hiện thuộc quyền sở hữu của ví đang kết nối.",
    noBoxes: "Bạn chưa có BanmaoBox",
    noBoxesHint: "Tạo box ở trên hoặc nhận box từ một ví khác.",
    boxNumber: "Box",
    locked: "Đang khóa",
    ready: "Đã có thể mở",
    unlocksAt: "Mở lúc",
    remaining: "Thời gian còn lại",
    open: "Mở box",
    transfer: "Tặng / chuyển",
    transferTitle: "Chuyển BanmaoBox",
    transferRecipient: "Ví người nhận",
    cancel: "Hủy",
    confirmTransfer: "Xác nhận chuyển",
    loading: "Đang tải box…",
    retry: "Làm mới",
    howTitle: "BanmaoBox hoạt động thế nào",
    howDescription: "Một NFT, một khoản BANMAO bảo chứng và một ngày mở.",
    stepApprove: "Đóng gói",
    stepApproveText:
      "Approve đúng số lượng và khóa BANMAO trong một NFT ERC-721 mới.",
    stepGift: "Trao tặng",
    stepGiftText:
      "Giữ, tặng hoặc giao dịch NFT. BANMAO bị khóa luôn đi cùng chủ NFT hiện tại.",
    stepOpen: "Mở hộp",
    stepOpenText:
      "Sau thời hạn, chủ NFT nhận toàn bộ BANMAO và NFT sẽ được đốt.",
    safetyTitle: "Giảm thiểu niềm tin ngay từ thiết kế",
    safetyText:
      "Không có quyền admin rút token và không thể mở sớm. Luôn kiểm tra địa chỉ hợp đồng trước khi ký.",
    phase: {
      "switching-chain": "Đang chuyển sang X Layer…",
      approving: "Xác nhận approve BANMAO trong ví…",
      creating: "Xác nhận tạo box trong ví…",
      opening: "Xác nhận mở box trong ví…",
      "refreshing-metadata": "Xác nhận làm mới metadata…",
      transferring: "Xác nhận chuyển NFT…",
      confirming: "Đang chờ xác nhận on-chain…",
    },
    success: "Giao dịch đã được xác nhận trên X Layer.",
    transactionError: "Không thể hoàn tất giao dịch.",
    invalidAmount: "Nhập số lượng hợp lệ lớn hơn 0.",
    insufficientBalance: "Số dư BANMAO không đủ.",
    invalidRecipient: "Nhập địa chỉ ví người nhận hợp lệ.",
    invalidDuration: "Chọn thời gian khóa từ 1 đến 36.500 ngày (100 năm).",
    sameRecipient: "Người nhận hiện đã sở hữu box này.",
    days: "ng",
    hours: "g",
    minutes: "p",
    seconds: "s",
    createdAt: "Ngày tạo",
    inspectTitle: "Khám phá BanmaoBox bất kỳ",
    inspectDescription:
      "Nhập token ID đang tồn tại để kiểm tra chủ sở hữu, tài sản bảo chứng, thời gian và artwork on-chain.",
    inspectPlaceholder: "Token ID, ví dụ 1",
    inspectButton: "Kiểm tra box",
    owner: "Chủ sở hữu hiện tại",
    refreshMetadata: "Làm mới metadata",
    previous: "Trước",
    next: "Tiếp",
    operations: "Vận hành",
    basketAssets: "Tài sản trong Box",
    primaryAsset: "Tài sản chính",
    releaseAsset: "Giải phóng tài sản",
    releaseHint: "Danh sách tài sản sẽ được tải lại sau mỗi lần giải phóng vì chỉ số có thể thay đổi.",
  },
  zh: {
    back: "DeFi 首页",
    eyebrow: "一份会等待的礼物",
    title: "将 BANMAO 封装进定时 NFT。",
    subtitle:
      "创建可转让的 BanmaoBox，赠送给任意钱包，到期后由当前持有人开启。",
    lockedMetric: "已锁定 BANMAO",
    activeMetric: "有效礼盒",
    walletMetric: "您的余额",
    createTitle: "创建 BanmaoBox",
    createDescription: "选择代币数量、接收者和开启日期。",
    amount: "BANMAO 数量",
    amountPlaceholder: "0.00",
    balance: "余额",
    useMax: "最大",
    recipient: "初始接收者",
    recipientPlaceholder: "0x…",
    recipientHint: "填入自己的钱包保留，或填入其他钱包立即赠送。",
    duration: "锁定时间",
    customDays: "自定义",
    customDaysPlaceholder: "天数",
    unlockPreview: "预计开启日期",
    createButton: "创建礼盒",
    connectToCreate: "连接钱包以创建",
    notDeployedTitle: "BanmaoBox 已准备部署",
    notDeployedDescription:
      "部署合约并设置 NEXT_PUBLIC_BANMAO_BOX_ADDRESS 以启用链上操作。",
    wrongNetwork: "签名前钱包将切换至 X Layer。",
    boxesTitle: "我的 BanmaoBox",
    boxesDescription: "当前连接钱包持有的礼盒。",
    noBoxes: "暂无 BanmaoBox",
    noBoxesHint: "在上方创建，或从其他钱包接收。",
    boxNumber: "礼盒",
    locked: "已锁定",
    ready: "可以开启",
    unlocksAt: "开启时间",
    remaining: "剩余时间",
    open: "开启礼盒",
    transfer: "赠送 / 转让",
    transferTitle: "转让 BanmaoBox",
    transferRecipient: "接收钱包",
    cancel: "取消",
    confirmTransfer: "确认转让",
    loading: "正在加载礼盒…",
    retry: "刷新",
    howTitle: "BanmaoBox 如何运作",
    howDescription: "一个 NFT、一份受保护的 BANMAO 和一个开启日期。",
    stepApprove: "封装",
    stepApproveText: "授权准确数量并将 BANMAO 锁入新铸造的 ERC-721。",
    stepGift: "赠送",
    stepGiftText: "持有、赠送或交易 NFT；锁定资产始终跟随当前持有人。",
    stepOpen: "开启",
    stepOpenText: "到期后，NFT 持有人领取全部 BANMAO，礼盒 NFT 被销毁。",
    safetyTitle: "最小信任设计",
    safetyText: "无管理员提款、不可提前开启。签名前请核对已部署合约地址。",
    phase: {
      "switching-chain": "正在切换至 X Layer…",
      approving: "请在钱包授权 BANMAO…",
      creating: "请在钱包创建礼盒…",
      opening: "请在钱包开启礼盒…",
      "refreshing-metadata": "请确认刷新元数据…",
      transferring: "请确认 NFT 转让…",
      confirming: "等待链上确认…",
    },
    success: "交易已在 X Layer 确认。",
    transactionError: "交易无法完成。",
    invalidAmount: "请输入大于零的有效数量。",
    insufficientBalance: "BANMAO 余额不足。",
    invalidRecipient: "请输入有效接收钱包。",
    invalidDuration: "锁定时间须为 1 至 36,500 天（100 年）。",
    sameRecipient: "接收者已持有此礼盒。",
    days: "天",
    hours: "时",
    minutes: "分",
    seconds: "秒",
    createdAt: "创建时间",
    inspectTitle: "查询任意 BanmaoBox",
    inspectDescription: "输入有效 token ID，验证所有者、资产、日期和链上图像。",
    inspectPlaceholder: "Token ID，例如 1",
    inspectButton: "查询礼盒",
    owner: "当前所有者",
    refreshMetadata: "刷新元数据",
    previous: "上一页",
    next: "下一页",
    operations: "运营",
    basketAssets: "礼盒中的资产",
    primaryAsset: "主要资产",
    releaseAsset: "释放资产",
    releaseHint: "每次释放后都会重新加载资产，因为资产索引可能变化。",
  },
  ko: {
    back: "DeFi 홈",
    eyebrow: "기다리는 선물",
    title: "BANMAO를 타임락 NFT에 담으세요.",
    subtitle:
      "전송 가능한 BanmaoBox를 만들어 선물하고, 만료 후 현재 소유자가 열 수 있습니다.",
    lockedMetric: "잠긴 BANMAO",
    activeMetric: "활성 박스",
    walletMetric: "내 잔액",
    createTitle: "BanmaoBox 만들기",
    createDescription: "수량, 수령인, 개봉 날짜를 선택하세요.",
    amount: "BANMAO 수량",
    amountPlaceholder: "0.00",
    balance: "잔액",
    useMax: "최대",
    recipient: "최초 수령인",
    recipientPlaceholder: "0x…",
    recipientHint:
      "보관하려면 내 지갑, 바로 선물하려면 다른 지갑을 입력하세요.",
    duration: "잠금 기간",
    customDays: "사용자 지정",
    customDaysPlaceholder: "일수",
    unlockPreview: "예상 개봉일",
    createButton: "박스 만들기",
    connectToCreate: "지갑 연결",
    notDeployedTitle: "BanmaoBox 배포 준비 완료",
    notDeployedDescription:
      "계약 배포 후 NEXT_PUBLIC_BANMAO_BOX_ADDRESS를 설정하세요.",
    wrongNetwork: "서명 전에 X Layer로 전환합니다.",
    boxesTitle: "내 BanmaoBox",
    boxesDescription: "연결된 지갑이 현재 보유한 박스입니다.",
    noBoxes: "BanmaoBox가 없습니다",
    noBoxesHint: "위에서 만들거나 다른 지갑에서 받아보세요.",
    boxNumber: "박스",
    locked: "잠김",
    ready: "개봉 가능",
    unlocksAt: "개봉 시간",
    remaining: "남은 시간",
    open: "박스 열기",
    transfer: "선물 / 전송",
    transferTitle: "BanmaoBox 전송",
    transferRecipient: "수령 지갑",
    cancel: "취소",
    confirmTransfer: "전송 확인",
    loading: "박스 로딩 중…",
    retry: "새로고침",
    howTitle: "BanmaoBox 작동 방식",
    howDescription: "하나의 NFT, 보호된 BANMAO 잔액, 하나의 개봉일.",
    stepApprove: "포장",
    stepApproveText: "정확한 수량을 승인하고 새 ERC-721에 BANMAO를 잠급니다.",
    stepGift: "선물",
    stepGiftText:
      "NFT를 보관, 선물 또는 거래하면 잠긴 BANMAO도 함께 이동합니다.",
    stepOpen: "개봉",
    stepOpenText: "기한 후 NFT 소유자가 BANMAO 전량을 받고 NFT는 소각됩니다.",
    safetyTitle: "신뢰 최소화 설계",
    safetyText:
      "관리자 출금과 조기 개봉이 없습니다. 서명 전 계약 주소를 확인하세요.",
    phase: {
      "switching-chain": "X Layer로 전환 중…",
      approving: "지갑에서 BANMAO 승인…",
      creating: "지갑에서 박스 생성…",
      opening: "지갑에서 박스 개봉…",
      "refreshing-metadata": "메타데이터 새로고침 확인…",
      transferring: "NFT 전송 확인…",
      confirming: "온체인 확인 대기 중…",
    },
    success: "X Layer에서 거래가 확인되었습니다.",
    transactionError: "거래를 완료할 수 없습니다.",
    invalidAmount: "0보다 큰 유효한 수량을 입력하세요.",
    insufficientBalance: "BANMAO 잔액이 부족합니다.",
    invalidRecipient: "유효한 수령 지갑을 입력하세요.",
    invalidDuration: "잠금 기간은 1일에서 36,500일(100년) 사이여야 합니다.",
    sameRecipient: "수령인이 이미 이 박스를 보유하고 있습니다.",
    days: "일",
    hours: "시",
    minutes: "분",
    seconds: "초",
    createdAt: "생성일",
    inspectTitle: "BanmaoBox 조회",
    inspectDescription:
      "유효한 token ID로 소유자, 자산, 날짜와 온체인 아트를 확인하세요.",
    inspectPlaceholder: "Token ID (예: 1)",
    inspectButton: "박스 조회",
    owner: "현재 소유자",
    refreshMetadata: "메타데이터 새로고침",
    previous: "이전",
    next: "다음",
    operations: "운영",
    basketAssets: "박스의 자산",
    primaryAsset: "기본 자산",
    releaseAsset: "자산 해제",
    releaseHint: "자산 인덱스가 바뀔 수 있으므로 해제 후 목록을 다시 불러옵니다.",
  },
  ru: {
    back: "Главная DeFi",
    eyebrow: "Подарок, который ждёт",
    title: "Упакуйте BANMAO в NFT с таймлоком.",
    subtitle:
      "Создайте передаваемый BanmaoBox, подарите его, а владелец откроет после таймера.",
    lockedMetric: "BANMAO заблокировано",
    activeMetric: "Активные боксы",
    walletMetric: "Ваш баланс",
    createTitle: "Создать BanmaoBox",
    createDescription: "Выберите сумму, получателя и дату открытия.",
    amount: "Сумма BANMAO",
    amountPlaceholder: "0.00",
    balance: "Баланс",
    useMax: "Макс.",
    recipient: "Первый получатель",
    recipientPlaceholder: "0x…",
    recipientHint: "Укажите свой кошелёк или адрес получателя подарка.",
    duration: "Срок блокировки",
    customDays: "Свой срок",
    customDaysPlaceholder: "Количество дней",
    unlockPreview: "Расчётная дата открытия",
    createButton: "Создать бокс",
    connectToCreate: "Подключить кошелёк",
    notDeployedTitle: "BanmaoBox готов к развёртыванию",
    notDeployedDescription:
      "Разверните контракт и задайте NEXT_PUBLIC_BANMAO_BOX_ADDRESS.",
    wrongNetwork: "Перед подписью кошелёк переключится на X Layer.",
    boxesTitle: "Мои BanmaoBox",
    boxesDescription: "Боксы, принадлежащие подключённому кошельку.",
    noBoxes: "BanmaoBox пока нет",
    noBoxesHint: "Создайте выше или получите от другого кошелька.",
    boxNumber: "Бокс",
    locked: "Заблокирован",
    ready: "Готов к открытию",
    unlocksAt: "Откроется",
    remaining: "Осталось",
    open: "Открыть",
    transfer: "Подарить / передать",
    transferTitle: "Передать BanmaoBox",
    transferRecipient: "Кошелёк получателя",
    cancel: "Отмена",
    confirmTransfer: "Подтвердить",
    loading: "Загрузка боксов…",
    retry: "Обновить",
    howTitle: "Как работает BanmaoBox",
    howDescription: "Один NFT, защищённый баланс BANMAO и дата открытия.",
    stepApprove: "Упаковать",
    stepApproveText:
      "Одобрите точную сумму и заблокируйте BANMAO в новом ERC-721.",
    stepGift: "Подарить",
    stepGiftText:
      "Храните или передавайте NFT — BANMAO следует за его владельцем.",
    stepOpen: "Открыть",
    stepOpenText: "После срока владелец получает BANMAO, а NFT сжигается.",
    safetyTitle: "Минимум доверия",
    safetyText:
      "Нет вывода администратором и раннего открытия. Проверяйте адрес контракта.",
    phase: {
      "switching-chain": "Переключение на X Layer…",
      approving: "Одобрите BANMAO в кошельке…",
      creating: "Создайте бокс в кошельке…",
      opening: "Откройте бокс в кошельке…",
      "refreshing-metadata": "Подтвердите обновление метаданных…",
      transferring: "Подтвердите передачу NFT…",
      confirming: "Ожидание подтверждения…",
    },
    success: "Транзакция подтверждена в X Layer.",
    transactionError: "Не удалось выполнить транзакцию.",
    invalidAmount: "Введите сумму больше нуля.",
    insufficientBalance: "Недостаточно BANMAO.",
    invalidRecipient: "Введите корректный кошелёк.",
    invalidDuration: "Выберите срок от 1 до 36 500 дней (100 лет).",
    sameRecipient: "Получатель уже владеет этим боксом.",
    days: "д",
    hours: "ч",
    minutes: "м",
    seconds: "с",
    createdAt: "Создан",
    inspectTitle: "Проверить BanmaoBox",
    inspectDescription:
      "Введите token ID, чтобы проверить владельца, обеспечение, даты и изображение on-chain.",
    inspectPlaceholder: "Token ID, например 1",
    inspectButton: "Проверить",
    owner: "Текущий владелец",
    refreshMetadata: "Обновить метаданные",
    previous: "Назад",
    next: "Далее",
    operations: "Операции",
    basketAssets: "Активы в боксе",
    primaryAsset: "Основной актив",
    releaseAsset: "Освободить актив",
    releaseHint: "После каждого освобождения список обновляется, поскольку индексы могут измениться.",
  },
  id: {
    back: "Beranda DeFi",
    eyebrow: "Hadiah yang menunggu",
    title: "Bungkus BANMAO dalam NFT berkunci waktu.",
    subtitle:
      "Buat BanmaoBox yang dapat dipindahtangankan, hadiahkan, lalu pemilik membukanya saat waktunya tiba.",
    lockedMetric: "BANMAO terkunci",
    activeMetric: "Box aktif",
    walletMetric: "Saldo Anda",
    createTitle: "Buat BanmaoBox",
    createDescription: "Pilih jumlah, penerima, dan tanggal buka.",
    amount: "Jumlah BANMAO",
    amountPlaceholder: "0.00",
    balance: "Saldo",
    useMax: "Maks",
    recipient: "Penerima awal",
    recipientPlaceholder: "0x…",
    recipientHint:
      "Gunakan dompet Anda atau masukkan dompet lain untuk langsung memberi hadiah.",
    duration: "Durasi kunci",
    customDays: "Kustom",
    customDaysPlaceholder: "Jumlah hari",
    unlockPreview: "Perkiraan tanggal buka",
    createButton: "Buat box",
    connectToCreate: "Hubungkan dompet",
    notDeployedTitle: "BanmaoBox siap di-deploy",
    notDeployedDescription:
      "Deploy kontrak lalu atur NEXT_PUBLIC_BANMAO_BOX_ADDRESS.",
    wrongNetwork: "Dompet akan beralih ke X Layer sebelum tanda tangan.",
    boxesTitle: "BanmaoBox saya",
    boxesDescription: "Box yang dimiliki dompet terhubung.",
    noBoxes: "Belum ada BanmaoBox",
    noBoxesHint: "Buat di atas atau terima dari dompet lain.",
    boxNumber: "Box",
    locked: "Terkunci",
    ready: "Siap dibuka",
    unlocksAt: "Dibuka",
    remaining: "Waktu tersisa",
    open: "Buka box",
    transfer: "Hadiah / transfer",
    transferTitle: "Transfer BanmaoBox",
    transferRecipient: "Dompet penerima",
    cancel: "Batal",
    confirmTransfer: "Konfirmasi transfer",
    loading: "Memuat box…",
    retry: "Muat ulang",
    howTitle: "Cara kerja BanmaoBox",
    howDescription:
      "Satu NFT, saldo BANMAO terlindungi, dan satu tanggal buka.",
    stepApprove: "Bungkus",
    stepApproveText:
      "Setujui jumlah tepat dan kunci BANMAO dalam ERC-721 baru.",
    stepGift: "Hadiahkan",
    stepGiftText:
      "Simpan atau transfer NFT; BANMAO terkunci mengikuti pemiliknya.",
    stepOpen: "Buka",
    stepOpenText:
      "Setelah waktunya, pemilik menerima semua BANMAO dan NFT dibakar.",
    safetyTitle: "Desain minim kepercayaan",
    safetyText:
      "Tanpa penarikan admin dan tanpa buka awal. Verifikasi alamat kontrak sebelum menandatangani.",
    phase: {
      "switching-chain": "Beralih ke X Layer…",
      approving: "Setujui BANMAO di dompet…",
      creating: "Buat box di dompet…",
      opening: "Buka box di dompet…",
      "refreshing-metadata": "Konfirmasi penyegaran metadata…",
      transferring: "Konfirmasi transfer NFT…",
      confirming: "Menunggu konfirmasi on-chain…",
    },
    success: "Transaksi dikonfirmasi di X Layer.",
    transactionError: "Transaksi tidak dapat diselesaikan.",
    invalidAmount: "Masukkan jumlah valid di atas nol.",
    insufficientBalance: "Saldo BANMAO tidak cukup.",
    invalidRecipient: "Masukkan dompet penerima yang valid.",
    invalidDuration: "Pilih durasi 1 hingga 36.500 hari (100 tahun).",
    sameRecipient: "Penerima sudah memiliki box ini.",
    days: "h",
    hours: "j",
    minutes: "m",
    seconds: "d",
    createdAt: "Dibuat",
    inspectTitle: "Periksa BanmaoBox",
    inspectDescription:
      "Masukkan token ID aktif untuk memverifikasi pemilik, jaminan, tanggal, dan karya on-chain.",
    inspectPlaceholder: "Token ID, misalnya 1",
    inspectButton: "Periksa box",
    owner: "Pemilik saat ini",
    refreshMetadata: "Segarkan metadata",
    previous: "Sebelumnya",
    next: "Berikutnya",
    operations: "Operasi",
    basketAssets: "Aset di dalam box",
    primaryAsset: "Aset utama",
    releaseAsset: "Lepaskan aset",
    releaseHint: "Aset dimuat ulang setelah setiap pelepasan karena indeks dapat berubah.",
  },
};

export function getInitialBoxLanguage(): BoxLanguage {
  if (typeof window === "undefined") return "en";

  const saved = window.localStorage.getItem("banmao_language");
  if (saved && BOX_LANGUAGES.includes(saved as BoxLanguage)) {
    return saved as BoxLanguage;
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("vi")) return "vi";
  if (browserLanguage.startsWith("zh")) return "zh";
  if (browserLanguage.startsWith("ko")) return "ko";
  if (browserLanguage.startsWith("ru")) return "ru";
  if (browserLanguage.startsWith("id")) return "id";
  return "en";
}
