"use client";

import { useEffect, useState } from "react";

export const WALLET_LANGUAGE_STORAGE_KEY = "banmao_language";
export const WALLET_LANGUAGE_CHANGE_EVENT = "banmao:language-change";

export const WALLET_LANGUAGE_CODES = [
  "en",
  "vi",
  "zh",
  "ko",
  "ru",
  "id",
] as const;

export type WalletLanguage = (typeof WALLET_LANGUAGE_CODES)[number];

export interface WalletTranslations {
  connectWallet: string;
  wrongNetwork: string;
  closeWalletDialog: string;
  connectTitle: string;
  selectNetworkTitle: string;
  walletTitle: string;
  connectDescription: string;
  walletConnectDescription: string;
  walletConnectTitle: string;
  scanQrCode: string;
  openWalletApp: string;
  copyConnectionLink: string;
  qrCodeAriaLabel: string;
  browserWallet: string;
  browserWalletDescription: string;
  walletConnectUnavailable: string;
  chainId: string;
  required: string;
  switching: string;
  switchToXLayer: string;
  connectedWallet: string;
  connected: string;
  copied: string;
  copyAddress: string;
  explorer: string;
  disconnecting: string;
  disconnectWallet: string;
  securityNotice: string;
  connectionRejected: string;
  requestPending: string;
  walletNotFound: string;
  requestTimedOut: string;
  unableConnect: string;
  unableSwitchNetwork: string;
  unableDisconnect: string;
  unableCopyAddress: string;
  unableCopyLink: string;
  unableGenerateQr: string;
  walletAriaLabel: string;
  chainFallback: string;
}

export const walletTranslations: Record<
  WalletLanguage,
  WalletTranslations
> = {
  en: {
    connectWallet: "Connect Wallet",
    wrongNetwork: "Wrong network",
    closeWalletDialog: "Close wallet dialog",
    connectTitle: "Connect wallet",
    selectNetworkTitle: "Select network",
    walletTitle: "Wallet",
    connectDescription:
      "Connect once and use the same session across GameFi, DeFi and Collection.",
    walletConnectDescription:
      "Open a wallet app on mobile or scan a QR code",
    walletConnectTitle: "Connect with WalletConnect",
    scanQrCode: "Scan this QR code with your wallet app",
    openWalletApp: "Open wallet app",
    copyConnectionLink: "Copy connection link",
    qrCodeAriaLabel: "WalletConnect connection QR code",
    browserWallet: "Browser wallet",
    browserWalletDescription: "Use a wallet installed in this browser",
    walletConnectUnavailable:
      "WalletConnect QR is unavailable because NEXT_PUBLIC_WC_PROJECT_ID is not configured. Browser wallets remain available.",
    chainId: "Chain ID",
    required: "Required",
    switching: "Switching…",
    switchToXLayer: "Switch to X Layer",
    connectedWallet: "Connected wallet",
    connected: "Connected",
    copied: "Copied",
    copyAddress: "Copy address",
    explorer: "Explorer",
    disconnecting: "Disconnecting…",
    disconnectWallet: "Disconnect wallet",
    securityNotice:
      "By connecting, you allow this site to request wallet signatures. A transaction is never sent without your confirmation.",
    connectionRejected: "The connection request was rejected.",
    requestPending:
      "A wallet request is already pending. Please open your wallet to continue.",
    walletNotFound:
      "No compatible wallet was found. Install a wallet or use WalletConnect.",
    requestTimedOut: "The wallet request timed out. Please try again.",
    unableConnect: "Unable to connect the wallet.",
    unableSwitchNetwork: "Unable to switch the wallet network.",
    unableDisconnect: "Unable to disconnect the wallet.",
    unableCopyAddress: "Unable to copy the wallet address.",
    unableCopyLink: "Unable to copy the connection link.",
    unableGenerateQr: "Unable to generate the connection QR code.",
    walletAriaLabel: "Wallet",
    chainFallback: "Chain",
  },
  vi: {
    connectWallet: "Kết nối ví",
    wrongNetwork: "Sai mạng",
    closeWalletDialog: "Đóng hộp thoại ví",
    connectTitle: "Kết nối ví",
    selectNetworkTitle: "Chọn mạng",
    walletTitle: "Ví",
    connectDescription:
      "Chỉ cần kết nối một lần để sử dụng cùng phiên trên GameFi, DeFi và Bộ sưu tập.",
    walletConnectDescription:
      "Mở ứng dụng ví trên điện thoại hoặc quét mã QR",
    walletConnectTitle: "Kết nối bằng WalletConnect",
    scanQrCode: "Quét mã QR này bằng ứng dụng ví của bạn",
    openWalletApp: "Mở ứng dụng ví",
    copyConnectionLink: "Sao chép liên kết kết nối",
    qrCodeAriaLabel: "Mã QR kết nối WalletConnect",
    browserWallet: "Ví trình duyệt",
    browserWalletDescription: "Sử dụng ví đã cài đặt trong trình duyệt này",
    walletConnectUnavailable:
      "Không thể sử dụng mã QR WalletConnect vì NEXT_PUBLIC_WC_PROJECT_ID chưa được cấu hình. Bạn vẫn có thể sử dụng ví trình duyệt.",
    chainId: "ID chuỗi",
    required: "Bắt buộc",
    switching: "Đang chuyển mạng…",
    switchToXLayer: "Chuyển sang X Layer",
    connectedWallet: "Ví đã kết nối",
    connected: "Đã kết nối",
    copied: "Đã sao chép",
    copyAddress: "Sao chép địa chỉ",
    explorer: "Trình khám phá",
    disconnecting: "Đang ngắt kết nối…",
    disconnectWallet: "Ngắt kết nối ví",
    securityNotice:
      "Khi kết nối, bạn cho phép trang web này yêu cầu chữ ký từ ví. Không giao dịch nào được gửi nếu chưa có xác nhận của bạn.",
    connectionRejected: "Yêu cầu kết nối đã bị từ chối.",
    requestPending:
      "Một yêu cầu ví đang chờ xử lý. Vui lòng mở ví để tiếp tục.",
    walletNotFound:
      "Không tìm thấy ví tương thích. Hãy cài đặt ví hoặc sử dụng WalletConnect.",
    requestTimedOut: "Yêu cầu ví đã hết thời gian chờ. Vui lòng thử lại.",
    unableConnect: "Không thể kết nối ví.",
    unableSwitchNetwork: "Không thể chuyển mạng của ví.",
    unableDisconnect: "Không thể ngắt kết nối ví.",
    unableCopyAddress: "Không thể sao chép địa chỉ ví.",
    unableCopyLink: "Không thể sao chép liên kết kết nối.",
    unableGenerateQr: "Không thể tạo mã QR kết nối.",
    walletAriaLabel: "Ví",
    chainFallback: "Chuỗi",
  },
  zh: {
    connectWallet: "连接钱包",
    wrongNetwork: "网络错误",
    closeWalletDialog: "关闭钱包对话框",
    connectTitle: "连接钱包",
    selectNetworkTitle: "选择网络",
    walletTitle: "钱包",
    connectDescription:
      "只需连接一次，即可在 GameFi、DeFi 和收藏平台中使用同一会话。",
    walletConnectDescription: "在手机上打开钱包应用或扫描二维码",
    walletConnectTitle: "使用 WalletConnect 连接",
    scanQrCode: "使用您的钱包应用扫描此二维码",
    openWalletApp: "打开钱包应用",
    copyConnectionLink: "复制连接链接",
    qrCodeAriaLabel: "WalletConnect 连接二维码",
    browserWallet: "浏览器钱包",
    browserWalletDescription: "使用此浏览器中安装的钱包",
    walletConnectUnavailable:
      "由于尚未配置 NEXT_PUBLIC_WC_PROJECT_ID，WalletConnect 二维码当前不可用。您仍可使用浏览器钱包。",
    chainId: "链 ID",
    required: "必需",
    switching: "正在切换…",
    switchToXLayer: "切换到 X Layer",
    connectedWallet: "已连接的钱包",
    connected: "已连接",
    copied: "已复制",
    copyAddress: "复制地址",
    explorer: "区块浏览器",
    disconnecting: "正在断开连接…",
    disconnectWallet: "断开钱包连接",
    securityNotice:
      "连接后，您允许本站向钱包请求签名。未经您的确认，任何交易都不会被发送。",
    connectionRejected: "连接请求已被拒绝。",
    requestPending: "已有钱包请求正在等待处理。请打开钱包以继续。",
    walletNotFound:
      "未找到兼容的钱包。请安装钱包或使用 WalletConnect。",
    requestTimedOut: "钱包请求已超时，请重试。",
    unableConnect: "无法连接钱包。",
    unableSwitchNetwork: "无法切换钱包网络。",
    unableDisconnect: "无法断开钱包连接。",
    unableCopyAddress: "无法复制钱包地址。",
    unableCopyLink: "无法复制连接链接。",
    unableGenerateQr: "无法生成连接二维码。",
    walletAriaLabel: "钱包",
    chainFallback: "链",
  },
  ko: {
    connectWallet: "지갑 연결",
    wrongNetwork: "잘못된 네트워크",
    closeWalletDialog: "지갑 대화상자 닫기",
    connectTitle: "지갑 연결",
    selectNetworkTitle: "네트워크 선택",
    walletTitle: "지갑",
    connectDescription:
      "한 번 연결하면 GameFi, DeFi 및 컬렉션에서 동일한 세션을 사용할 수 있습니다.",
    walletConnectDescription:
      "모바일에서 지갑 앱을 열거나 QR 코드를 스캔하세요",
    walletConnectTitle: "WalletConnect로 연결",
    scanQrCode: "지갑 앱으로 이 QR 코드를 스캔하세요",
    openWalletApp: "지갑 앱 열기",
    copyConnectionLink: "연결 링크 복사",
    qrCodeAriaLabel: "WalletConnect 연결 QR 코드",
    browserWallet: "브라우저 지갑",
    browserWalletDescription: "이 브라우저에 설치된 지갑을 사용하세요",
    walletConnectUnavailable:
      "NEXT_PUBLIC_WC_PROJECT_ID가 설정되지 않아 WalletConnect QR을 사용할 수 없습니다. 브라우저 지갑은 계속 사용할 수 있습니다.",
    chainId: "체인 ID",
    required: "필수",
    switching: "전환 중…",
    switchToXLayer: "X Layer로 전환",
    connectedWallet: "연결된 지갑",
    connected: "연결됨",
    copied: "복사됨",
    copyAddress: "주소 복사",
    explorer: "블록 탐색기",
    disconnecting: "연결 해제 중…",
    disconnectWallet: "지갑 연결 해제",
    securityNotice:
      "연결하면 이 사이트가 지갑 서명을 요청할 수 있습니다. 사용자의 확인 없이는 어떠한 트랜잭션도 전송되지 않습니다.",
    connectionRejected: "연결 요청이 거부되었습니다.",
    requestPending:
      "처리 대기 중인 지갑 요청이 있습니다. 계속하려면 지갑을 여세요.",
    walletNotFound:
      "호환되는 지갑을 찾을 수 없습니다. 지갑을 설치하거나 WalletConnect를 사용하세요.",
    requestTimedOut: "지갑 요청 시간이 초과되었습니다. 다시 시도하세요.",
    unableConnect: "지갑을 연결할 수 없습니다.",
    unableSwitchNetwork: "지갑 네트워크를 전환할 수 없습니다.",
    unableDisconnect: "지갑 연결을 해제할 수 없습니다.",
    unableCopyAddress: "지갑 주소를 복사할 수 없습니다.",
    unableCopyLink: "연결 링크를 복사할 수 없습니다.",
    unableGenerateQr: "연결 QR 코드를 생성할 수 없습니다.",
    walletAriaLabel: "지갑",
    chainFallback: "체인",
  },
  ru: {
    connectWallet: "Подключить кошелёк",
    wrongNetwork: "Неверная сеть",
    closeWalletDialog: "Закрыть окно кошелька",
    connectTitle: "Подключение кошелька",
    selectNetworkTitle: "Выбор сети",
    walletTitle: "Кошелёк",
    connectDescription:
      "Подключитесь один раз и используйте одну сессию в GameFi, DeFi и Коллекции.",
    walletConnectDescription:
      "Откройте приложение кошелька на телефоне или отсканируйте QR-код",
    walletConnectTitle: "Подключение через WalletConnect",
    scanQrCode: "Отсканируйте этот QR-код в приложении кошелька",
    openWalletApp: "Открыть приложение кошелька",
    copyConnectionLink: "Копировать ссылку подключения",
    qrCodeAriaLabel: "QR-код подключения WalletConnect",
    browserWallet: "Браузерный кошелёк",
    browserWalletDescription:
      "Используйте кошелёк, установленный в этом браузере",
    walletConnectUnavailable:
      "QR-код WalletConnect недоступен, поскольку NEXT_PUBLIC_WC_PROJECT_ID не настроен. Браузерные кошельки по-прежнему доступны.",
    chainId: "ID сети",
    required: "Обязательно",
    switching: "Переключение…",
    switchToXLayer: "Переключиться на X Layer",
    connectedWallet: "Подключённый кошелёк",
    connected: "Подключено",
    copied: "Скопировано",
    copyAddress: "Копировать адрес",
    explorer: "Обозреватель",
    disconnecting: "Отключение…",
    disconnectWallet: "Отключить кошелёк",
    securityNotice:
      "Подключаясь, вы разрешаете сайту запрашивать подписи кошелька. Транзакции никогда не отправляются без вашего подтверждения.",
    connectionRejected: "Запрос на подключение был отклонён.",
    requestPending:
      "Запрос кошелька уже ожидает обработки. Откройте кошелёк, чтобы продолжить.",
    walletNotFound:
      "Совместимый кошелёк не найден. Установите кошелёк или используйте WalletConnect.",
    requestTimedOut: "Время ожидания запроса истекло. Повторите попытку.",
    unableConnect: "Не удалось подключить кошелёк.",
    unableSwitchNetwork: "Не удалось переключить сеть кошелька.",
    unableDisconnect: "Не удалось отключить кошелёк.",
    unableCopyAddress: "Не удалось скопировать адрес кошелька.",
    unableCopyLink: "Не удалось скопировать ссылку подключения.",
    unableGenerateQr: "Не удалось создать QR-код подключения.",
    walletAriaLabel: "Кошелёк",
    chainFallback: "Сеть",
  },
  id: {
    connectWallet: "Hubungkan Dompet",
    wrongNetwork: "Jaringan salah",
    closeWalletDialog: "Tutup dialog dompet",
    connectTitle: "Hubungkan dompet",
    selectNetworkTitle: "Pilih jaringan",
    walletTitle: "Dompet",
    connectDescription:
      "Hubungkan sekali dan gunakan sesi yang sama di GameFi, DeFi, dan Koleksi.",
    walletConnectDescription:
      "Buka aplikasi dompet di ponsel atau pindai kode QR",
    walletConnectTitle: "Hubungkan dengan WalletConnect",
    scanQrCode: "Pindai kode QR ini dengan aplikasi dompet Anda",
    openWalletApp: "Buka aplikasi dompet",
    copyConnectionLink: "Salin tautan koneksi",
    qrCodeAriaLabel: "Kode QR koneksi WalletConnect",
    browserWallet: "Dompet browser",
    browserWalletDescription:
      "Gunakan dompet yang terpasang di browser ini",
    walletConnectUnavailable:
      "QR WalletConnect tidak tersedia karena NEXT_PUBLIC_WC_PROJECT_ID belum dikonfigurasi. Dompet browser tetap dapat digunakan.",
    chainId: "ID rantai",
    required: "Wajib",
    switching: "Mengalihkan…",
    switchToXLayer: "Beralih ke X Layer",
    connectedWallet: "Dompet terhubung",
    connected: "Terhubung",
    copied: "Disalin",
    copyAddress: "Salin alamat",
    explorer: "Penjelajah",
    disconnecting: "Memutuskan…",
    disconnectWallet: "Putuskan dompet",
    securityNotice:
      "Dengan menghubungkan dompet, Anda mengizinkan situs ini meminta tanda tangan dompet. Transaksi tidak pernah dikirim tanpa konfirmasi Anda.",
    connectionRejected: "Permintaan koneksi ditolak.",
    requestPending:
      "Permintaan dompet sedang menunggu. Buka dompet Anda untuk melanjutkan.",
    walletNotFound:
      "Dompet yang kompatibel tidak ditemukan. Pasang dompet atau gunakan WalletConnect.",
    requestTimedOut: "Waktu permintaan dompet habis. Silakan coba lagi.",
    unableConnect: "Tidak dapat menghubungkan dompet.",
    unableSwitchNetwork: "Tidak dapat mengalihkan jaringan dompet.",
    unableDisconnect: "Tidak dapat memutuskan dompet.",
    unableCopyAddress: "Tidak dapat menyalin alamat dompet.",
    unableCopyLink: "Tidak dapat menyalin tautan koneksi.",
    unableGenerateQr: "Tidak dapat membuat kode QR koneksi.",
    walletAriaLabel: "Dompet",
    chainFallback: "Rantai",
  },
};

export function normalizeWalletLanguage(
  language?: string | null,
): WalletLanguage | null {
  if (!language) return null;

  const normalized = language.trim().toLowerCase().replace("_", "-");
  const prefix = normalized.split("-")[0];

  return WALLET_LANGUAGE_CODES.includes(prefix as WalletLanguage)
    ? (prefix as WalletLanguage)
    : null;
}

export function getWalletLanguage(): WalletLanguage {
  if (typeof window === "undefined") return "en";

  return (
    normalizeWalletLanguage(
      window.localStorage.getItem(WALLET_LANGUAGE_STORAGE_KEY),
    ) ||
    normalizeWalletLanguage(window.navigator.language) ||
    "en"
  );
}

/**
 * Keeps the global wallet UI in sync with the language selected by each
 * application section. Most existing selectors write directly to localStorage,
 * so a small poll also covers same-tab changes (the native storage event only
 * fires in other tabs).
 */
export function useWalletTranslations(): {
  language: WalletLanguage;
  t: WalletTranslations;
} {
  const [language, setLanguage] = useState<WalletLanguage>("en");

  useEffect(() => {
    const syncLanguage = () => {
      const nextLanguage = getWalletLanguage();
      setLanguage((current) =>
        current === nextLanguage ? current : nextLanguage,
      );
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") syncLanguage();
    };

    syncLanguage();

    window.addEventListener("storage", syncLanguage);
    window.addEventListener("focus", syncLanguage);
    window.addEventListener(
      WALLET_LANGUAGE_CHANGE_EVENT,
      syncLanguage as EventListener,
    );
    document.addEventListener("visibilitychange", onVisibilityChange);

    const intervalId = window.setInterval(syncLanguage, 250);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("focus", syncLanguage);
      window.removeEventListener(
        WALLET_LANGUAGE_CHANGE_EVENT,
        syncLanguage as EventListener,
      );
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return {
    language,
    t: walletTranslations[language],
  };
}