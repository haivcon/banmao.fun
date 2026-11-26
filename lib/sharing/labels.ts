import type { Language } from "../landingI18n";

type ShareCopy = {
    trigger: string;
    title: string;
    close: string;
    help: string;
    introduction: string;
    link: string;
    copyBoth: string;
    copyLink: string;
    shareVia: string;
    copiedBoth: string;
    copiedLink: string;
    copyError: string;
    shared: string;
    cancelled: string;
    shareError: string;
    note: string;
    homeIntroduction: string;
};

export const shareCopies: Record<Language, ShareCopy> = {
    en: {
        trigger: "Share", title: "Share BANMAO", close: "Close sharing",
        help: "Edit the introduction before sharing with a friend.",
        introduction: "Introduction", link: "Project link", copyBoth: "Copy introduction + link",
        copyLink: "Copy link only", shareVia: "Share via…",
        copiedBoth: "Introduction and link copied.", copiedLink: "Link copied.",
        copyError: "Copy is unavailable. Select and copy the text or link below manually.",
        shared: "Shared with your selected app.", cancelled: "Sharing cancelled.",
        shareError: "Sharing is unavailable. You can copy the introduction and link.",
        note: "The link opens the project page. The receiving app controls the link preview.",
        homeIntroduction: "BANMAO — Come explore\nDiscover NFTs, games, and on-chain experiences on X Layer. Start with whatever sparks your curiosity.",
    },
    vi: {
        trigger: "Chia sẻ", title: "Chia sẻ BANMAO", close: "Đóng cửa sổ chia sẻ",
        help: "Bạn có thể sửa lời giới thiệu trước khi gửi cho bạn bè.",
        introduction: "Lời giới thiệu", link: "Liên kết dự án", copyBoth: "Sao chép lời giới thiệu và liên kết",
        copyLink: "Chỉ sao chép liên kết", shareVia: "Chia sẻ qua…",
        copiedBoth: "Đã sao chép lời giới thiệu và liên kết.", copiedLink: "Đã sao chép liên kết.",
        copyError: "Không thể sao chép tự động. Hãy chọn và sao chép văn bản hoặc liên kết bên dưới.",
        shared: "Đã chia sẻ qua ứng dụng bạn chọn.", cancelled: "Đã hủy chia sẻ.",
        shareError: "Không thể chia sẻ trực tiếp. Bạn có thể sao chép lời giới thiệu và liên kết.",
        note: "Liên kết mở trang dự án. Bản xem trước tùy theo ứng dụng nhận.",
        homeIntroduction: "BANMAO — Cùng khám phá\nChơi game, sưu tầm NFT và khám phá các trải nghiệm on-chain trên X Layer.",
    },
    zh: {
        trigger: "分享", title: "分享 BANMAO", close: "关闭分享窗口",
        help: "发送给朋友之前，可以编辑项目介绍。",
        introduction: "项目介绍", link: "项目链接", copyBoth: "复制介绍和链接",
        copyLink: "仅复制链接", shareVia: "通过其他应用分享…",
        copiedBoth: "已复制介绍和链接。", copiedLink: "已复制链接。",
        copyError: "无法自动复制。请手动选择并复制下方的文字或链接。",
        shared: "已通过所选应用分享。", cancelled: "已取消分享。",
        shareError: "无法直接分享。可以复制项目介绍和链接。",
        note: "链接会打开项目页面。链接预览由接收应用决定。",
        homeIntroduction: "BANMAO — 一起来探索\n在 X Layer 上玩游戏、收藏 NFT，探索链上体验。",
    },
    ko: {
        trigger: "공유", title: "BANMAO 공유", close: "공유 창 닫기",
        help: "친구에게 보내기 전에 소개 글을 편집할 수 있어요.",
        introduction: "소개 글", link: "프로젝트 링크", copyBoth: "소개 글과 링크 복사",
        copyLink: "링크만 복사", shareVia: "다른 앱으로 공유…",
        copiedBoth: "소개 글과 링크를 복사했어요.", copiedLink: "링크를 복사했어요.",
        copyError: "자동으로 복사할 수 없어요. 아래의 글이나 링크를 선택해 직접 복사해 주세요.",
        shared: "선택한 앱으로 공유했어요.", cancelled: "공유를 취소했어요.",
        shareError: "직접 공유할 수 없어요. 소개 글과 링크를 복사할 수 있어요.",
        note: "링크는 프로젝트 페이지를 열어요. 미리보기는 받는 앱에 따라 달라져요.",
        homeIntroduction: "BANMAO — 함께 둘러봐요\nX Layer에서 게임을 즐기고 NFT를 수집하며 온체인 기능을 둘러보세요.",
    },
    ru: {
        trigger: "Поделиться", title: "Поделиться BANMAO", close: "Закрыть окно отправки",
        help: "Перед отправкой другу можно отредактировать описание.",
        introduction: "Описание", link: "Ссылка на проект", copyBoth: "Скопировать описание и ссылку",
        copyLink: "Скопировать только ссылку", shareVia: "Поделиться через…",
        copiedBoth: "Описание и ссылка скопированы.", copiedLink: "Ссылка скопирована.",
        copyError: "Автоматическое копирование недоступно. Выделите и скопируйте текст или ссылку вручную.",
        shared: "Отправлено через выбранное приложение.", cancelled: "Отправка отменена.",
        shareError: "Прямая отправка недоступна. Можно скопировать описание и ссылку.",
        note: "Ссылка открывает страницу проекта. Вид предпросмотра зависит от приложения получателя.",
        homeIntroduction: "BANMAO — Давайте исследовать\nИграйте, собирайте NFT и знакомьтесь с ончейн-возможностями X Layer.",
    },
    id: {
        trigger: "Bagikan", title: "Bagikan BANMAO", close: "Tutup jendela berbagi",
        help: "Edit pengantar sebelum mengirimkannya ke teman.",
        introduction: "Pengantar", link: "Tautan proyek", copyBoth: "Salin pengantar dan tautan",
        copyLink: "Salin tautan saja", shareVia: "Bagikan lewat…",
        copiedBoth: "Pengantar dan tautan disalin.", copiedLink: "Tautan disalin.",
        copyError: "Penyalinan otomatis tidak tersedia. Pilih dan salin teks atau tautan di bawah secara manual.",
        shared: "Dibagikan melalui aplikasi pilihan Anda.", cancelled: "Berbagi dibatalkan.",
        shareError: "Berbagi langsung tidak tersedia. Anda dapat menyalin pengantar dan tautan.",
        note: "Tautan membuka halaman proyek. Pratinjau tautan bergantung pada aplikasi penerima.",
        homeIntroduction: "BANMAO — Ayo jelajahi\nMain gim, koleksi NFT, dan temukan berbagai fitur on-chain di X Layer.",
    },
};
