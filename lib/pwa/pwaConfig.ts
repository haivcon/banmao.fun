// lib/pwa/pwaConfig.ts
// Centralized PWA configuration for all apps

export type AppId = 'main' | 'gamefi' | 'rps' | 'snake' | 'slots';

export interface PWAAppConfig {
    appId: AppId;
    name: string;
    shortName: string;
    version: string;
    icon: string;
    emoji: string;
    themeColor: string;
    accentColor: string;
    swPath: string;
    swScope: string;
    manifestPath: string;
    startUrl: string;
    storagePrefix: string;
}

// Current app versions - increment these when deploying new versions
export const APP_VERSIONS: Record<AppId, string> = {
    main: '2.0.0',
    gamefi: '1.0.0',
    rps: '1.0.0',
    snake: '1.0.0',
    slots: '1.0.0',
};

// App configurations
export const PWA_APPS: Record<AppId, PWAAppConfig> = {
    main: {
        appId: 'main',
        name: '$banmao — Banana Cat',
        shortName: '$banmao',
        version: APP_VERSIONS.main,
        icon: '/pwa/main/icon-96x96.png',
        emoji: '🐱🍌',
        themeColor: '#a855f7',
        accentColor: '#facc15',
        swPath: '/sw-main.js',
        swScope: '/',
        manifestPath: '/manifest.json',
        startUrl: '/',
        storagePrefix: 'banmao_pwa',
    },
    gamefi: {
        appId: 'gamefi',
        name: 'GameFi $banmao',
        shortName: 'GameFi',
        version: APP_VERSIONS.gamefi,
        icon: '/pwa/gamefi/gamefi-icon-96x96.png',
        emoji: '🎮',
        themeColor: '#22d3ee',
        accentColor: '#facc15',
        swPath: '/sw-gamefi.js',
        swScope: '/gamefi/',
        manifestPath: '/manifest-gamefi.json',
        startUrl: '/gamefi',
        storagePrefix: 'banmao_gamefi_pwa',
    },
    rps: {
        appId: 'rps',
        name: 'BANMAO RPS',
        shortName: 'BANMAO RPS',
        version: APP_VERSIONS.rps,
        icon: '/games/rps/rps-icon-96x96.png',
        emoji: '✊✋✌️',
        themeColor: '#FFD700',
        accentColor: '#facc15',
        swPath: '/sw-rps.js',
        swScope: '/gamefi/banmaorps/',
        manifestPath: '/manifest-game.json',
        startUrl: '/gamefi/banmaorps',
        storagePrefix: 'banmao_rps_pwa',
    },
    snake: {
        appId: 'snake',
        name: 'BANMAO SNAKE',
        shortName: 'BANMAO SNAKE',
        version: APP_VERSIONS.snake,
        icon: '/games/snake/snake-icon-96x96.png',
        emoji: '🐍',
        themeColor: '#22d3ee',
        accentColor: '#4ade80',
        swPath: '/sw-snake.js',
        swScope: '/gamefi/banmaosnake/',
        manifestPath: '/manifest-snake.json',
        startUrl: '/gamefi/banmaosnake',
        storagePrefix: 'banmao_snake_pwa',
    },
    slots: {
        appId: 'slots',
        name: 'BANMAO SLOTS',
        shortName: 'BANMAO SLOTS',
        version: APP_VERSIONS.slots,
        icon: '/games/slots/slots-icon-96x96.png',
        emoji: '🎰',
        themeColor: '#00bfff',
        accentColor: '#ff00ff',
        swPath: '/sw-slots.js',
        swScope: '/gamefi/banmaoslots/',
        manifestPath: '/manifest-slots.json',
        startUrl: '/gamefi/banmaoslots',
        storagePrefix: 'banmao_slots_pwa',
    },
};

// Translation type
export interface PWATranslation {
    title: string;
    description: string;
    updateAvailable: string;
    iosHint: string;
    installLabel: string;
    updateLabel: string;
    installedLabel: string;
    dismissLabel: string;
    offlineLabel: string;
    backOnlineLabel: string;
}

// Translations per app per language
export const PWA_TRANSLATIONS: Record<AppId, Record<string, PWATranslation>> = {
    main: {
        en: {
            title: '$banmao 🐱🍌',
            description: 'Install app for the best experience!',
            updateAvailable: 'New version available! Update now.',
            iosHint: 'Tap Share then "Add to Home Screen"',
            installLabel: 'Install',
            updateLabel: 'Update',
            installedLabel: 'Installed ✓',
            dismissLabel: 'Later',
            offlineLabel: "You're offline",
            backOnlineLabel: 'Back online!',
        },
        vi: {
            title: '$banmao 🐱🍌',
            description: 'Cài đặt ứng dụng để có trải nghiệm tốt nhất!',
            updateAvailable: 'Có phiên bản mới! Cập nhật ngay.',
            iosHint: 'Nhấn nút Share rồi chọn "Add to Home Screen"',
            installLabel: 'Cài đặt',
            updateLabel: 'Cập nhật',
            installedLabel: 'Đã cài ✓',
            dismissLabel: 'Để sau',
            offlineLabel: 'Bạn đang offline',
            backOnlineLabel: 'Đã có mạng!',
        },
        zh: {
            title: '$banmao 🐱🍌',
            description: '安装应用获得最佳体验！',
            updateAvailable: '新版本可用！立即更新。',
            iosHint: '点击分享按钮，然后选择"添加到主屏幕"',
            installLabel: '安装',
            updateLabel: '更新',
            installedLabel: '已安装 ✓',
            dismissLabel: '稍后',
            offlineLabel: '您已离线',
            backOnlineLabel: '已恢复连接！',
        },
        ko: {
            title: '$banmao 🐱🍌',
            description: '최고의 경험을 위해 앱을 설치하세요!',
            updateAvailable: '새 버전이 있습니다! 지금 업데이트하세요.',
            iosHint: '공유 버튼을 누른 후 "홈 화면에 추가"를 선택하세요',
            installLabel: '설치',
            updateLabel: '업데이트',
            installedLabel: '설치됨 ✓',
            dismissLabel: '나중에',
            offlineLabel: '오프라인 상태입니다',
            backOnlineLabel: '온라인 복귀!',
        },
        id: {
            title: '$banmao 🐱🍌',
            description: 'Pasang aplikasi untuk pengalaman terbaik!',
            updateAvailable: 'Versi baru tersedia! Perbarui sekarang.',
            iosHint: 'Ketuk Bagikan lalu "Tambah ke Layar Utama"',
            installLabel: 'Pasang',
            updateLabel: 'Perbarui',
            installedLabel: 'Terpasang ✓',
            dismissLabel: 'Nanti',
            offlineLabel: 'Anda sedang offline',
            backOnlineLabel: 'Kembali online!',
        },
        ru: {
            title: '$banmao 🐱🍌',
            description: 'Установите приложение для лучшего опыта!',
            updateAvailable: 'Доступна новая версия! Обновите сейчас.',
            iosHint: 'Нажмите "Поделиться", затем "На экран Домой"',
            installLabel: 'Установить',
            updateLabel: 'Обновить',
            installedLabel: 'Установлено ✓',
            dismissLabel: 'Позже',
            offlineLabel: 'Вы офлайн',
            backOnlineLabel: 'Снова онлайн!',
        },
    },
    gamefi: {
        en: {
            title: 'GameFi $banmao 🎮',
            description: 'Install for faster gaming access!',
            updateAvailable: 'New version available! Update now.',
            iosHint: 'Tap Share then "Add to Home Screen"',
            installLabel: 'Install',
            updateLabel: 'Update',
            installedLabel: 'Installed ✓',
            dismissLabel: 'Later',
            offlineLabel: "You're offline",
            backOnlineLabel: 'Back online!',
        },
        vi: {
            title: 'GameFi $banmao 🎮',
            description: 'Cài đặt để chơi game nhanh hơn!',
            updateAvailable: 'Có phiên bản mới! Cập nhật ngay.',
            iosHint: 'Nhấn Share rồi chọn "Add to Home Screen"',
            installLabel: 'Cài đặt',
            updateLabel: 'Cập nhật',
            installedLabel: 'Đã cài ✓',
            dismissLabel: 'Để sau',
            offlineLabel: 'Bạn đang offline',
            backOnlineLabel: 'Đã có mạng!',
        },
        zh: {
            title: 'GameFi $banmao 🎮',
            description: '安装以更快地访问游戏！',
            updateAvailable: '新版本可用！立即更新。',
            iosHint: '点击分享然后选择"添加到主屏幕"',
            installLabel: '安装',
            updateLabel: '更新',
            installedLabel: '已安装 ✓',
            dismissLabel: '稍后',
            offlineLabel: '您已离线',
            backOnlineLabel: '已恢复连接！',
        },
        ko: {
            title: 'GameFi $banmao 🎮',
            description: '더 빠른 게임 접근을 위해 설치하세요!',
            updateAvailable: '새 버전이 있습니다! 지금 업데이트하세요.',
            iosHint: '공유를 누른 후 "홈 화면에 추가"를 선택하세요',
            installLabel: '설치',
            updateLabel: '업데이트',
            installedLabel: '설치됨 ✓',
            dismissLabel: '나중에',
            offlineLabel: '오프라인 상태입니다',
            backOnlineLabel: '온라인 복귀!',
        },
        id: {
            title: 'GameFi $banmao 🎮',
            description: 'Install untuk akses game lebih cepat!',
            updateAvailable: 'Versi baru tersedia! Perbarui sekarang.',
            iosHint: 'Ketuk Bagikan lalu "Tambah ke Layar Utama"',
            installLabel: 'Pasang',
            updateLabel: 'Perbarui',
            installedLabel: 'Terpasang ✓',
            dismissLabel: 'Nanti',
            offlineLabel: 'Anda sedang offline',
            backOnlineLabel: 'Kembali online!',
        },
        ru: {
            title: 'GameFi $banmao 🎮',
            description: 'Установите для быстрого доступа к играм!',
            updateAvailable: 'Доступна новая версия! Обновите сейчас.',
            iosHint: 'Нажмите "Поделиться" затем "На экран Домой"',
            installLabel: 'Установить',
            updateLabel: 'Обновить',
            installedLabel: 'Установлено ✓',
            dismissLabel: 'Позже',
            offlineLabel: 'Вы офлайн',
            backOnlineLabel: 'Снова онлайн!',
        },
    },
    rps: {
        en: {
            title: 'BANMAO RPS ✊✋✌️',
            description: 'Add to home screen for faster gameplay!',
            updateAvailable: 'New version available! Update now.',
            iosHint: 'Tap Share then "Add to Home Screen"',
            installLabel: 'Install',
            updateLabel: 'Update',
            installedLabel: 'Installed ✓',
            dismissLabel: 'Later',
            offlineLabel: "You're offline",
            backOnlineLabel: 'Back online!',
        },
        vi: {
            title: 'BANMAO RPS ✊✋✌️',
            description: 'Thêm vào màn hình chính để chơi nhanh hơn!',
            updateAvailable: 'Có phiên bản mới! Cập nhật ngay.',
            iosHint: 'Nhấn nút Share rồi chọn "Add to Home Screen"',
            installLabel: 'Cài đặt',
            updateLabel: 'Cập nhật',
            installedLabel: 'Đã cài ✓',
            dismissLabel: 'Để sau',
            offlineLabel: 'Bạn đang offline',
            backOnlineLabel: 'Đã có mạng!',
        },
        zh: {
            title: 'BANMAO RPS ✊✋✌️',
            description: '添加到主屏幕，游戏更快捷！',
            updateAvailable: '新版本可用！立即更新。',
            iosHint: '点击分享按钮，然后选择"添加到主屏幕"',
            installLabel: '安装',
            updateLabel: '更新',
            installedLabel: '已安装 ✓',
            dismissLabel: '稍后',
            offlineLabel: '您已离线',
            backOnlineLabel: '已恢复连接！',
        },
        ko: {
            title: 'BANMAO RPS ✊✋✌️',
            description: '홈 화면에 추가하여 더 빠르게 플레이하세요!',
            updateAvailable: '새 버전이 있습니다! 지금 업데이트하세요.',
            iosHint: '공유 버튼을 누른 후 "홈 화면에 추가"를 선택하세요',
            installLabel: '설치',
            updateLabel: '업데이트',
            installedLabel: '설치됨 ✓',
            dismissLabel: '나중에',
            offlineLabel: '오프라인 상태입니다',
            backOnlineLabel: '온라인 복귀!',
        },
        id: {
            title: 'BANMAO RPS ✊✋✌️',
            description: 'Tambahkan ke layar utama untuk bermain lebih cepat!',
            updateAvailable: 'Versi baru tersedia! Perbarui sekarang.',
            iosHint: 'Ketuk Bagikan lalu "Tambah ke Layar Utama"',
            installLabel: 'Pasang',
            updateLabel: 'Perbarui',
            installedLabel: 'Terpasang ✓',
            dismissLabel: 'Nanti',
            offlineLabel: 'Anda sedang offline',
            backOnlineLabel: 'Kembali online!',
        },
        ru: {
            title: 'BANMAO RPS ✊✋✌️',
            description: 'Добавьте на главный экран для быстрой игры!',
            updateAvailable: 'Доступна новая версия! Обновите сейчас.',
            iosHint: 'Нажмите "Поделиться", затем "На экран Домой"',
            installLabel: 'Установить',
            updateLabel: 'Обновить',
            installedLabel: 'Установлено ✓',
            dismissLabel: 'Позже',
            offlineLabel: 'Вы офлайн',
            backOnlineLabel: 'Снова онлайн!',
        },
    },
    snake: {
        en: {
            title: 'BANMAO SNAKE 🐍',
            description: 'Install for faster gameplay!',
            updateAvailable: 'New version available! Update now.',
            iosHint: 'Tap Share then "Add to Home Screen"',
            installLabel: 'Install',
            updateLabel: 'Update',
            installedLabel: 'Installed ✓',
            dismissLabel: 'Later',
            offlineLabel: "You're offline",
            backOnlineLabel: 'Back online!',
        },
        vi: {
            title: 'BANMAO SNAKE 🐍',
            description: 'Cài đặt để chơi nhanh hơn!',
            updateAvailable: 'Có phiên bản mới! Cập nhật ngay.',
            iosHint: 'Nhấn Share rồi chọn "Add to Home Screen"',
            installLabel: 'Cài đặt',
            updateLabel: 'Cập nhật',
            installedLabel: 'Đã cài ✓',
            dismissLabel: 'Để sau',
            offlineLabel: 'Bạn đang offline',
            backOnlineLabel: 'Đã có mạng!',
        },
        zh: {
            title: 'BANMAO 贪吃蛇 🐍',
            description: '安装以更快地玩游戏！',
            updateAvailable: '新版本可用！立即更新。',
            iosHint: '点击分享然后选择"添加到主屏幕"',
            installLabel: '安装',
            updateLabel: '更新',
            installedLabel: '已安装 ✓',
            dismissLabel: '稍后',
            offlineLabel: '您已离线',
            backOnlineLabel: '已恢复连接！',
        },
        ko: {
            title: 'BANMAO 스네이크 🐍',
            description: '더 빠른 게임플레이를 위해 설치하세요!',
            updateAvailable: '새 버전이 있습니다! 지금 업데이트하세요.',
            iosHint: '공유를 누른 후 "홈 화면에 추가"를 선택하세요',
            installLabel: '설치',
            updateLabel: '업데이트',
            installedLabel: '설치됨 ✓',
            dismissLabel: '나중에',
            offlineLabel: '오프라인 상태입니다',
            backOnlineLabel: '온라인 복귀!',
        },
        id: {
            title: 'BANMAO ULAR 🐍',
            description: 'Install untuk bermain lebih cepat!',
            updateAvailable: 'Versi baru tersedia! Perbarui sekarang.',
            iosHint: 'Ketuk Bagikan lalu "Tambah ke Layar Utama"',
            installLabel: 'Pasang',
            updateLabel: 'Perbarui',
            installedLabel: 'Terpasang ✓',
            dismissLabel: 'Nanti',
            offlineLabel: 'Anda sedang offline',
            backOnlineLabel: 'Kembali online!',
        },
        ru: {
            title: 'BANMAO ЗМЕЙКА 🐍',
            description: 'Установите для быстрой игры!',
            updateAvailable: 'Доступна новая версия! Обновите сейчас.',
            iosHint: 'Нажмите "Поделиться" затем "На экран Домой"',
            installLabel: 'Установить',
            updateLabel: 'Обновить',
            installedLabel: 'Установлено ✓',
            dismissLabel: 'Позже',
            offlineLabel: 'Вы офлайн',
            backOnlineLabel: 'Снова онлайн!',
        },
    },
    slots: {
        en: {
            title: 'BANMAO SLOTS 🎰',
            description: 'Install for faster spinning!',
            updateAvailable: 'New version available! Update now.',
            iosHint: 'Tap Share then "Add to Home Screen"',
            installLabel: 'Install',
            updateLabel: 'Update',
            installedLabel: 'Installed ✓',
            dismissLabel: 'Later',
            offlineLabel: "You're offline",
            backOnlineLabel: 'Back online!',
        },
        vi: {
            title: 'BANMAO SLOTS 🎰',
            description: 'Cài đặt để quay nhanh hơn!',
            updateAvailable: 'Có phiên bản mới! Cập nhật ngay.',
            iosHint: 'Nhấn Share rồi chọn "Add to Home Screen"',
            installLabel: 'Cài đặt',
            updateLabel: 'Cập nhật',
            installedLabel: 'Đã cài ✓',
            dismissLabel: 'Để sau',
            offlineLabel: 'Bạn đang offline',
            backOnlineLabel: 'Đã có mạng!',
        },
        zh: {
            title: 'BANMAO 老虎机 🎰',
            description: '安装以更快地玩老虎机！',
            updateAvailable: '新版本可用！立即更新。',
            iosHint: '点击分享然后选择"添加到主屏幕"',
            installLabel: '安装',
            updateLabel: '更新',
            installedLabel: '已安装 ✓',
            dismissLabel: '稍后',
            offlineLabel: '您已离线',
            backOnlineLabel: '已恢复连接！',
        },
        ko: {
            title: 'BANMAO 슬롯 🎰',
            description: '더 빠른 게임플레이를 위해 설치하세요!',
            updateAvailable: '새 버전이 있습니다! 지금 업데이트하세요.',
            iosHint: '공유를 누른 후 "홈 화면에 추가"를 선택하세요',
            installLabel: '설치',
            updateLabel: '업데이트',
            installedLabel: '설치됨 ✓',
            dismissLabel: '나중에',
            offlineLabel: '오프라인 상태입니다',
            backOnlineLabel: '온라인 복귀!',
        },
        id: {
            title: 'BANMAO SLOT 🎰',
            description: 'Install untuk bermain lebih cepat!',
            updateAvailable: 'Versi baru tersedia! Perbarui sekarang.',
            iosHint: 'Ketuk Bagikan lalu "Tambah ke Layar Utama"',
            installLabel: 'Pasang',
            updateLabel: 'Perbarui',
            installedLabel: 'Terpasang ✓',
            dismissLabel: 'Nanti',
            offlineLabel: 'Anda sedang offline',
            backOnlineLabel: 'Kembali online!',
        },
        ru: {
            title: 'BANMAO СЛОТЫ 🎰',
            description: 'Установите для быстрой игры!',
            updateAvailable: 'Доступна новая версия! Обновите сейчас.',
            iosHint: 'Нажмите "Поделиться" затем "На экран Домой"',
            installLabel: 'Установить',
            updateLabel: 'Обновить',
            installedLabel: 'Установлено ✓',
            dismissLabel: 'Позже',
            offlineLabel: 'Вы офлайн',
            backOnlineLabel: 'Снова онлайн!',
        },
    },
};

// Helper to get translation for an app
export function getTranslation(appId: AppId, lang: string): PWATranslation {
    const appTranslations = PWA_TRANSLATIONS[appId];
    return appTranslations[lang] || appTranslations.en;
}

// Helper to get browser language code
export function getBrowserLanguage(): string {
    if (typeof navigator === 'undefined') return 'en';
    const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('banmao_language') : null;
    if (savedLang && ['en', 'vi', 'zh', 'ko', 'id', 'ru'].includes(savedLang)) {
        return savedLang;
    }
    const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
    const langCode = browserLang.split('-')[0].toLowerCase();
    return ['en', 'vi', 'zh', 'ko', 'id', 'ru'].includes(langCode) ? langCode : 'en';
}

// Storage key generators
export function getStorageKey(appId: AppId, key: string): string {
    return `${PWA_APPS[appId].storagePrefix}_${key}`;
}

export const STORAGE_KEYS = {
    DISMISSED: 'dismissed',
    INSTALLED: 'installed',
    VERSION: 'version',
} as const;
