import type { Lang } from './index';
const copy = {
  'Find your king': ['Tìm King của bạn', '寻找你的King', '나의 King 찾기', 'Найти своего King', 'Temukan King Anda'],
  'Every ID, a king of its own. Explore minted artwork and traits — no wallet required.': ['Mỗi ID, một King riêng. Khám phá hình ảnh và đặc điểm NFT đã mint — không cần ví.', '每个ID都有专属King。探索已铸造的作品和特征，无需钱包。', '각 ID마다 고유한 King이 있습니다. 지갑 없이 민팅된 작품과 특성을 살펴보세요.', 'У каждого ID свой King. Изучайте выпущенные NFT и их черты без кошелька.', 'Setiap ID memiliki King tersendiri. Jelajahi karya dan ciri NFT yang sudah dicetak tanpa dompet.'],
  'NFT ID': ['ID NFT', 'NFT编号', 'NFT ID', 'ID NFT', 'ID NFT'],
  'Example: 42': ['Ví dụ: 42', '例如：42', '예: 42', 'Например: 42', 'Contoh: 42'],
  'Searching…': ['Đang tìm…', '搜索中…', '검색 중…', 'Поиск…', 'Mencari…'],
  'Find king': ['Tìm King', '查找King', 'King 찾기', 'Найти King', 'Cari King'],
  'Enter an ID from 1, optionally with #. Press Enter to search.': ['Nhập ID từ 1, có thể thêm #. Nhấn Enter để tìm.', '输入从1开始的ID，可加#。按回车搜索。', '1 이상의 ID를 입력하세요. #는 선택 사항입니다. Enter로 검색합니다.', 'Введите ID от 1, при желании с #. Нажмите Enter для поиска.', 'Masukkan ID mulai 1, boleh diawali #. Tekan Enter untuk mencari.'],
  'Reading blockchain…': ['Đang đọc blockchain…', '正在读取区块链…', '블록체인 조회 중…', 'Чтение блокчейна…', 'Membaca blockchain…'],
  'Invalid token ID. Enter a whole number from 1.': ['ID không hợp lệ. Nhập số nguyên từ 1.', '代币ID无效，请输入大于等于1的整数。', '잘못된 토큰 ID입니다. 1 이상의 정수를 입력하세요.', 'Неверный ID токена. Введите целое число от 1.', 'ID token tidak valid. Masukkan bilangan bulat mulai 1.'],
  'This NFT has not been minted. Try another ID.': ['NFT này chưa được mint. Hãy thử ID khác.', '该NFT尚未铸造，请尝试其他ID。', '아직 민팅되지 않은 NFT입니다. 다른 ID를 입력하세요.', 'Этот NFT ещё не выпущен. Попробуйте другой ID.', 'NFT ini belum dicetak. Coba ID lain.'],
  'Unable to read data. Your ID is saved so you can retry.': ['Không đọc được dữ liệu. ID được giữ lại để thử lại.', '无法读取数据。已保留ID，可重试。', '데이터를 읽을 수 없습니다. 다시 시도할 수 있도록 ID를 유지합니다.', 'Не удалось прочитать данные. ID сохранён для повторной попытки.', 'Data tidak dapat dibaca. ID disimpan agar Anda bisa mencoba lagi.'],
  'Enter an NFT ID to view its artwork and owner on X Layer.': ['Nhập ID NFT để xem hình ảnh và chủ sở hữu trên X Layer.', '输入NFT编号，查看其作品及X Layer上的所有者。', 'NFT ID를 입력하여 작품과 X Layer의 소유자를 확인하세요.', 'Введите ID NFT, чтобы увидеть изображение и владельца в X Layer.', 'Masukkan ID NFT untuk melihat karya dan pemiliknya di X Layer.'],
  'Reload metadata (free)': ['Tải lại metadata (miễn phí)', '重新加载元数据（免费）', '메타데이터 다시 불러오기 (무료)', 'Обновить метаданные (бесплатно)', 'Muat ulang metadata (gratis)'],
  'ON-CHAIN COLLECTION': ['BỘ SƯU TẬP ON-CHAIN', '链上藏品', '온체인 컬렉션', 'КОЛЛЕКЦИЯ В БЛОКЧЕЙНЕ', 'KOLEKSI ON-CHAIN'],
  'King': ['King', 'King', 'King', 'King', 'King'],
  'Copy ID': ['Sao chép ID', '复制ID', 'ID 복사', 'Копировать ID', 'Salin ID'],
  'Copy link': ['Sao chép liên kết', '复制链接', '링크 복사', 'Копировать ссылку', 'Salin tautan'],
  'NFT permalink': ['Liên kết cố định NFT', 'NFT永久链接', 'NFT 고정 링크', 'Постоянная ссылка NFT', 'Tautan tetap NFT'],
  'King traits': ['Đặc điểm King', 'King特征', 'King 특성', 'Черты King', 'Ciri King'],
  'On-chain owner': ['Chủ sở hữu on-chain', '链上所有者', '온체인 소유자', 'Владелец в блокчейне', 'Pemilik on-chain'],
  'View on explorer ↗': ['Xem trên trình khám phá ↗', '在浏览器查看 ↗', '탐색기에서 보기 ↗', 'Открыть в обозревателе ↗', 'Lihat di penjelajah ↗'],
  'Technical details & SVG downloads': ['Chi tiết kỹ thuật và tải SVG', '技术详情与SVG下载', '기술 정보 및 SVG 다운로드', 'Технические данные и загрузка SVG', 'Detail teknis dan unduhan SVG'],
  'Composition': ['Tổ hợp', '组合', '조합', 'Комбинация', 'Kombinasi'],
  'Download preview SVG with composition code': ['Tải SVG xem trước có mã tổ hợp', '下载带组合代码的预览SVG', '조합 코드가 포함된 미리보기 SVG 다운로드', 'Скачать SVG предпросмотра с кодом комбинации', 'Unduh SVG pratinjau dengan kode kombinasi'],
  'Download original on-chain SVG': ['Tải SVG gốc on-chain', '下载链上原始SVG', '온체인 원본 SVG 다운로드', 'Скачать оригинальный SVG из блокчейна', 'Unduh SVG asli on-chain'],
  'A preview is not proof of ownership. Verify the contract and owner before buying.': ['Bản xem trước không chứng minh quyền sở hữu. Kiểm tra hợp đồng và chủ sở hữu trước khi mua.', '预览不代表所有权证明。购买前请核实合约和所有者。', '미리보기는 소유권 증명이 아닙니다. 구매 전 컨트랙트와 소유자를 확인하세요.', 'Предпросмотр не доказывает владение. Перед покупкой проверьте контракт и владельца.', 'Pratinjau bukan bukti kepemilikan. Verifikasi kontrak dan pemilik sebelum membeli.'],
} satisfies Record<string, readonly [string, string, string, string, string]>;
const index: Record<Exclude<Lang, 'en'>, number> = { vi: 0, zh: 1, ko: 2, ru: 3, id: 4 };
export function kingLookupCopy(lang: Lang, key: keyof typeof copy): string {
  return lang === 'en' ? key : copy[key][index[lang]];
}
