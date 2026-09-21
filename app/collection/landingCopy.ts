import type { Lang } from "./i18n";

type Copy = { title: string; subtitle: string; images: string; imagesDesc: string; hubDesc: string; kingDesc: string; open: string; preview: string };
export const landingCopy: Record<Lang, Copy> = {
    en: { title: "A world of Banmao.", subtitle: "Collect inspiration. Connect with creators. Make your own king.", images: "Images", imagesDesc: "Explore stickers, backgrounds and videos. Find your favorites, edit and download.", hubDesc: "Discover community creations, share your stories and support creators.", kingDesc: "Compose animated artwork in Theme Lab, explore traits and open the NFT mint studio.", open: "Explore", preview: "Artwork preview" },
    vi: { title: "Thế giới Banmao.", subtitle: "Khám phá hình ảnh. Kết nối cộng đồng. Sáng tạo vị vua của bạn.", images: "Hình ảnh", imagesDesc: "Khám phá sticker, hình nền và video. Lưu yêu thích, chỉnh sửa và tải xuống.", hubDesc: "Khám phá sáng tạo cộng đồng, chia sẻ câu chuyện và ủng hộ nhà sáng tạo.", kingDesc: "Phối tác phẩm động trong Theme Lab, khám phá đặc tính và mở studio mint NFT.", open: "Khám phá", preview: "Xem trước tác phẩm" },
    zh: { title: "Banmao 的世界。", subtitle: "收集灵感。连接创作者。创造你的国王。", images: "图片", imagesDesc: "探索贴纸、壁纸和视频。收藏、编辑并下载喜爱的作品。", hubDesc: "发现社区作品，分享故事并支持创作者。", kingDesc: "在 Theme Lab 组合动态作品，探索特征并打开 NFT 铸造工作室。", open: "探索", preview: "作品预览" },
    ko: { title: "Banmao의 세계.", subtitle: "영감을 모으고, 창작자와 연결하고, 나만의 왕을 만드세요.", images: "이미지", imagesDesc: "스티커, 배경과 동영상을 탐색하고 즐겨찾기, 편집 및 다운로드하세요.", hubDesc: "커뮤니티 작품을 발견하고 이야기를 공유하며 창작자를 응원하세요.", kingDesc: "Theme Lab에서 움직이는 작품을 조합하고 특성과 NFT 민팅 스튜디오를 살펴보세요.", open: "탐색", preview: "작품 미리보기" },
    ru: { title: "Мир Banmao.", subtitle: "Вдохновляйтесь. Общайтесь с авторами. Создайте своего короля.", images: "Изображения", imagesDesc: "Стикеры, фоны и видео. Сохраняйте любимое, редактируйте и скачивайте.", hubDesc: "Открывайте работы сообщества, делитесь историями и поддерживайте авторов.", kingDesc: "Создавайте анимации в Theme Lab, изучайте черты и откройте студию минта NFT.", open: "Открыть", preview: "Предпросмотр" },
    id: { title: "Dunia Banmao.", subtitle: "Kumpulkan inspirasi. Terhubung dengan kreator. Ciptakan rajamu.", images: "Gambar", imagesDesc: "Jelajahi stiker, latar dan video. Simpan favorit, edit dan unduh.", hubDesc: "Temukan karya komunitas, bagikan cerita dan dukung kreator.", kingDesc: "Susun karya animasi di Theme Lab, jelajahi atribut dan buka studio mint NFT.", open: "Jelajahi", preview: "Pratinjau karya" },
};

type CardDetails = { note: string; tags: [string, string, string]; action: string };
type LandingDetails = { opening: string; gallery: CardDetails; hub: CardDetails; banmaoking: CardDetails };
export const landingDetails: Record<Lang, LandingDetails> = {
    vi: {
        opening: "Đang mở…",
        gallery: { note: "Xem chi tiết từng tác phẩm và chia sẻ hình ảnh bạn yêu thích.", tags: ["Hình ảnh & video", "Chỉnh sửa", "Tải xuống"], action: "Khám phá Gallery" },
        hub: { note: "Theo dõi bài đăng mới và kết nối với những người cùng sở thích.", tags: ["Bài đăng cộng đồng", "Chia sẻ sáng tạo", "Tương tác"], action: "Khám phá Hub" },
        banmaoking: { note: "Tra cứu NFT và thông tin sở hữu. Các thao tác on-chain cần kết nối ví.", tags: ["Theme Lab", "Tra cứu NFT", "Mint với ví"], action: "Khám phá BanmaoKing" },
    },
    en: {
        opening: "Opening…",
        gallery: { note: "View each artwork in detail and share the images you love.", tags: ["Images & video", "Editing", "Downloads"], action: "Explore Gallery" },
        hub: { note: "Follow new posts and connect with people who share your interests.", tags: ["Community posts", "Share creations", "Interactions"], action: "Explore Hub" },
        banmaoking: { note: "Look up NFTs and ownership details. On-chain actions require a connected wallet.", tags: ["Theme Lab", "NFT lookup", "Mint with wallet"], action: "Explore BanmaoKing" },
    },
    zh: {
        opening: "正在打开…",
        gallery: { note: "查看每件作品的细节，分享你喜爱的图片。", tags: ["图片与视频", "编辑", "下载"], action: "探索 Gallery" },
        hub: { note: "关注最新帖子，与志趣相投的人交流。", tags: ["社区帖子", "分享创作", "互动"], action: "探索 Hub" },
        banmaoking: { note: "查询 NFT 及其所有权信息。链上操作需要连接钱包。", tags: ["Theme Lab", "NFT 查询", "连接钱包铸造"], action: "探索 BanmaoKing" },
    },
    ko: {
        opening: "여는 중…",
        gallery: { note: "작품을 자세히 살펴보고 마음에 드는 이미지를 공유하세요.", tags: ["이미지와 동영상", "편집", "다운로드"], action: "Gallery 둘러보기" },
        hub: { note: "새 게시물을 확인하고 관심사가 비슷한 사람들과 소통하세요.", tags: ["커뮤니티 게시물", "창작물 공유", "소통"], action: "Hub 둘러보기" },
        banmaoking: { note: "NFT와 소유 정보를 조회하세요. 온체인 작업에는 지갑 연결이 필요합니다.", tags: ["Theme Lab", "NFT 조회", "지갑으로 민팅"], action: "BanmaoKing 둘러보기" },
    },
    ru: {
        opening: "Открываем…",
        gallery: { note: "Рассматривайте работы в деталях и делитесь любимыми изображениями.", tags: ["Фото и видео", "Редактирование", "Скачивание"], action: "Открыть Gallery" },
        hub: { note: "Следите за новыми публикациями и находите единомышленников.", tags: ["Посты сообщества", "Обмен работами", "Общение"], action: "Открыть Hub" },
        banmaoking: { note: "Ищите NFT и сведения о владельцах. Для действий в блокчейне нужен подключённый кошелёк.", tags: ["Theme Lab", "Поиск NFT", "Минт с кошельком"], action: "Открыть BanmaoKing" },
    },
    id: {
        opening: "Membuka…",
        gallery: { note: "Lihat detail setiap karya dan bagikan gambar yang kamu sukai.", tags: ["Gambar & video", "Pengeditan", "Unduhan"], action: "Jelajahi Gallery" },
        hub: { note: "Ikuti postingan terbaru dan terhubung dengan orang yang memiliki minat serupa.", tags: ["Postingan komunitas", "Bagikan karya", "Interaksi"], action: "Jelajahi Hub" },
        banmaoking: { note: "Cari NFT dan detail kepemilikannya. Tindakan on-chain memerlukan dompet terhubung.", tags: ["Theme Lab", "Pencarian NFT", "Mint dengan dompet"], action: "Jelajahi BanmaoKing" },
    },
};
