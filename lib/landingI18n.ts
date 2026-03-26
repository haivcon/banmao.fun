// lib/landingI18n.ts
// Translations for landing page

export type Language = "en" | "vi" | "zh" | "ko" | "ru" | "id";

export interface LandingTranslations {
    logoTitle: string;
    tokenStats: string;
    totalSupply: string;
    circulating: string;
    burned: string;
    holders: string;
    priceFeed: string;
    network: string;
    price: string;
    change24h: string;
    mcap: string;
    buyToken: string;
    joinMission: string;
    gamefi: string;
    installApp: string;
    installDesc: string;
    installNow: string;
    howToInstall: string;
    language: string;
    selectLang: string;
}

export const LANGUAGES: { code: Language; name: string; flag: string }[] = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "ru", name: "Русский", flag: "🇷🇺" },
    { code: "id", name: "Indonesia", flag: "🇮🇩" },
];

export const translations: Record<Language, LandingTranslations> = {
    en: {
        logoTitle: "BANMAO NEBULA",
        tokenStats: "TOKEN STATS",
        totalSupply: "TOTAL SUPPLY:",
        circulating: "CIRCULATING:",
        burned: "BURNED:",
        holders: "HOLDERS:",
        priceFeed: "PRICE FEED",
        network: "NETWORK:",
        price: "PRICE:",
        change24h: "24H CHANGE:",
        mcap: "MCAP:",
        buyToken: "BUY $BANMAO",
        joinMission: "JOIN MISSION",
        gamefi: "GameFi",
        installApp: "INSTALL APP",
        installDesc: "Add to home screen for faster access!",
        installNow: "Install Now",
        howToInstall: "How to Install",
        language: "LANGUAGE",
        selectLang: "Select Language",
    },
    vi: {
        logoTitle: "BANMAO NEBULA",
        tokenStats: "THỐNG KÊ TOKEN",
        totalSupply: "TỔNG CUNG:",
        circulating: "LƯU HÀNH:",
        burned: "ĐÃ ĐỐT:",
        holders: "NGƯỜI GIỮ:",
        priceFeed: "GIÁ TOKEN",
        network: "MẠNG:",
        price: "GIÁ:",
        change24h: "24H:",
        mcap: "VỐN HÓA:",
        buyToken: "MUA $BANMAO",
        joinMission: "THAM GIA",
        gamefi: "GameFi",
        installApp: "CÀI ĐẶT APP",
        installDesc: "Thêm vào màn hình để truy cập nhanh!",
        installNow: "Cài đặt",
        howToInstall: "Hướng dẫn",
        language: "NGÔN NGỮ",
        selectLang: "Chọn ngôn ngữ",
    },
    zh: {
        logoTitle: "BANMAO 星云",
        tokenStats: "代币统计",
        totalSupply: "总供应量:",
        circulating: "流通量:",
        burned: "已销毁:",
        holders: "持有人:",
        priceFeed: "价格动态",
        network: "网络:",
        price: "价格:",
        change24h: "24H变化:",
        mcap: "市值:",
        buyToken: "购买 $BANMAO",
        joinMission: "加入任务",
        gamefi: "GameFi",
        installApp: "安装应用",
        installDesc: "添加到主屏幕快速访问！",
        installNow: "立即安装",
        howToInstall: "安装指南",
        language: "语言",
        selectLang: "选择语言",
    },
    ko: {
        logoTitle: "BANMAO 성운",
        tokenStats: "토큰 통계",
        totalSupply: "총 공급량:",
        circulating: "유통량:",
        burned: "소각량:",
        holders: "홀더:",
        priceFeed: "가격 피드",
        network: "네트워크:",
        price: "가격:",
        change24h: "24시간:",
        mcap: "시가총액:",
        buyToken: "$BANMAO 구매",
        joinMission: "미션 참가",
        gamefi: "GameFi",
        installApp: "앱 설치",
        installDesc: "홈 화면에 추가하여 빠르게 접속!",
        installNow: "설치하기",
        howToInstall: "설치 방법",
        language: "언어",
        selectLang: "언어 선택",
    },
    ru: {
        logoTitle: "BANMAO ТУМАННОСТЬ",
        tokenStats: "СТАТИСТИКА ТОКЕНА",
        totalSupply: "ОБЩИЙ ЗАПАС:",
        circulating: "В ОБРАЩЕНИИ:",
        burned: "СОЖЖЕНО:",
        holders: "ДЕРЖАТЕЛИ:",
        priceFeed: "КУРС ТОКЕНА",
        network: "СЕТЬ:",
        price: "ЦЕНА:",
        change24h: "24Ч:",
        mcap: "КАПИТАЛИЗАЦИЯ:",
        buyToken: "КУПИТЬ $BANMAO",
        joinMission: "ПРИСОЕДИНИТЬСЯ",
        gamefi: "GameFi",
        installApp: "УСТАНОВИТЬ",
        installDesc: "Добавьте на главный экран!",
        installNow: "Установить",
        howToInstall: "Как установить",
        language: "ЯЗЫК",
        selectLang: "Выбрать язык",
    },
    id: {
        logoTitle: "BANMAO NEBULA",
        tokenStats: "STATISTIK TOKEN",
        totalSupply: "TOTAL SUPLAI:",
        circulating: "BEREDAR:",
        burned: "DIBAKAR:",
        holders: "PEMEGANG:",
        priceFeed: "HARGA TOKEN",
        network: "JARINGAN:",
        price: "HARGA:",
        change24h: "24JAM:",
        mcap: "MCAP:",
        buyToken: "BELI $BANMAO",
        joinMission: "GABUNG MISI",
        gamefi: "GameFi",
        installApp: "INSTALL APLIKASI",
        installDesc: "Tambahkan ke layar utama!",
        installNow: "Install",
        howToInstall: "Cara Install",
        language: "BAHASA",
        selectLang: "Pilih Bahasa",
    },
};

/**
 * Get browser language and map to supported language
 */
export function getBrowserLanguage(): Language {
    if (typeof window === "undefined") return "en";
    const browserLang = navigator.language.split("-")[0].toLowerCase();
    const supported: Language[] = ["en", "vi", "zh", "ko", "ru", "id"];
    return supported.includes(browserLang as Language) ? (browserLang as Language) : "en";
}

/**
 * Get translation function for a given language
 */
export function getTranslation(lang: Language): (key: keyof LandingTranslations) => string {
    return (key: keyof LandingTranslations): string => {
        return translations[lang][key] || translations.en[key] || key;
    };
}
