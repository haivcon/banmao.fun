import type { Lang } from './index';

const copy = {
  'Unable to display this page. If you submitted a transaction, check your wallet or Explorer before minting again.': ['Không thể hiển thị trang. Nếu vừa gửi giao dịch, hãy kiểm tra ví hoặc trình khám phá trước khi mint lại.', '无法显示页面。如果已提交交易，请先检查钱包或区块链浏览器，再决定是否重新铸造。', '페이지를 표시할 수 없습니다. 거래를 제출했다면 다시 민팅하기 전에 지갑이나 탐색기를 확인하세요.', 'Не удалось показать страницу. Если вы отправили транзакцию, проверьте кошелёк или обозреватель перед повторным минтом.', 'Halaman tidak dapat ditampilkan. Jika Anda mengirim transaksi, periksa dompet atau penjelajah sebelum mint lagi.'],
  'Try again': ['Thử lại', '重试', '다시 시도', 'Повторить', 'Coba lagi'],
  'Body': ['Thân', '身体', '몸체', 'Тело', 'Tubuh'],
  'Expression': ['Biểu cảm', '表情', '표정', 'Выражение', 'Ekspresi'],
  'Accessory': ['Phụ kiện', '配饰', '액세서리', 'Аксессуар', 'Aksesori'],
  'Background': ['Phông nền', '背景', '배경', 'Фон', 'Latar'],
  'Motion': ['Chuyển động', '动画', '움직임', 'Движение', 'Gerakan'],
  'Identity': ['Định danh', '身份标识', '식별 정보', 'Идентификация', 'Identitas'],
  'Composition code': ['Mã tổ hợp', '组合代码', '조합 코드', 'Код комбинации', 'Kode kombinasi'],
  'Preview by code': ['Nhập mã xem trước', '按代码预览', '코드로 미리보기', 'Предпросмотр по коду', 'Pratinjau dengan kode'],
  'View composition': ['Xem tổ hợp', '查看组合', '조합 보기', 'Посмотреть комбинацию', 'Lihat kombinasi'],
  'Invalid code or unknown trait.': ['Mã không hợp lệ hoặc đặc điểm không tồn tại.', '代码无效或特征不存在。', '잘못된 코드이거나 없는 특성입니다.', 'Неверный код или неизвестная черта.', 'Kode tidak valid atau ciri tidak dikenal.'],
  'Open preview permalink': ['Mở liên kết cố định của mẫu', '打开预览永久链接', '미리보기 고정 링크 열기', 'Открыть постоянную ссылку', 'Buka tautan tetap pratinjau'],
  'Download preview SVG': ['Tải SVG xem thử', '下载预览SVG', '미리보기 SVG 다운로드', 'Скачать SVG предпросмотра', 'Unduh SVG pratinjau'],
  'Body · Expression · Accessory · Background — two digits each, starting at 01. Codes exclude pose; previews use the default pose. Not proof of minting or ownership.': ['Thân · Biểu cảm · Phụ kiện · Phông nền — mỗi nhóm 2 chữ số, từ 01. Mã không bao gồm tư thế; bản xem trước dùng tư thế mặc định. Không phải bằng chứng mint hay sở hữu.', '身体 · 表情 · 配饰 · 背景——每项两位数字，从01开始。代码不含姿势；预览使用默认姿势。不代表铸造或所有权证明。', '몸체 · 표정 · 액세서리 · 배경 — 각 두 자리 숫자이며 01부터 시작합니다. 코드는 포즈를 포함하지 않으며 기본 포즈로 미리 봅니다. 민팅이나 소유권 증명이 아닙니다.', 'Тело · Выражение · Аксессуар · Фон — по две цифры, начиная с 01. Код не включает позу; предпросмотр использует стандартную позу. Не подтверждает минт или владение.', 'Tubuh · Ekspresi · Aksesori · Latar — masing-masing dua digit, mulai 01. Kode tidak mencakup pose; pratinjau memakai pose standar. Bukan bukti mint atau kepemilikan.'],
  'SVG viewer': ['Xem SVG phóng to', 'SVG查看器', 'SVG 뷰어', 'Просмотр SVG', 'Penampil SVG'],
  'Close': ['Đóng', '关闭', '닫기', 'Закрыть', 'Tutup'],
  'SVG image, scroll to pan': ['Ảnh SVG, cuộn để xem vùng phóng to', 'SVG图像，滚动以平移', 'SVG 이미지, 스크롤하여 이동', 'Изображение SVG, прокрутите для перемещения', 'Gambar SVG, gulir untuk menggeser'],
  'Zoom out': ['Thu nhỏ', '缩小', '축소', 'Уменьшить', 'Perkecil'],
  'Zoom in': ['Phóng to', '放大', '확대', 'Увеличить', 'Perbesar'],
  'Fit': ['Vừa khung', '适应窗口', '화면에 맞춤', 'Вписать', 'Sesuaikan ukuran'],
  'Sound effects': ['Hiệu ứng âm thanh', '音效', '효과음', 'Звуковые эффекты', 'Efek suara'],
  'On': ['Bật', '开', '켜짐', 'Вкл.', 'Aktif'],
  'Off': ['Tắt', '关', '꺼짐', 'Выкл.', 'Nonaktif'],
  'Toggle light / dark appearance': ['Chuyển giao diện sáng / tối', '切换浅色 / 深色外观', '밝은 / 어두운 테마 전환', 'Светлая / тёмная тема', 'Ganti tampilan terang / gelap'],
  'Show less': ['Thu gọn', '收起', '접기', 'Свернуть', 'Tampilkan lebih sedikit'],
  'Show all': ['Xem tất cả', '显示全部', '모두 보기', 'Показать всё', 'Tampilkan semua'],
  'Search name, address or description': ['Tìm tên, địa chỉ hoặc mô tả', '搜索名称、地址或描述', '이름, 주소 또는 설명 검색', 'Поиск по имени, адресу или описанию', 'Cari nama, alamat, atau deskripsi'],
  'Contract category': ['Nhóm hợp đồng', '合约分类', '컨트랙트 분류', 'Категория контрактов', 'Kategori kontrak'],
  'All contracts': ['Tất cả hợp đồng', '全部合约', '전체 컨트랙트', 'Все контракты', 'Semua kontrak'],
  'Contract pagination': ['Phân trang hợp đồng', '合约分页', '컨트랙트 페이지 탐색', 'Страницы контрактов', 'Halaman kontrak'],
  '← Previous': ['← Trước', '← 上一页', '← 이전', '← Назад', '← Sebelumnya'],
  'Page': ['Trang', '页', '페이지', 'Страница', 'Halaman'],
  'Next →': ['Sau →', '下一页 →', '다음 →', 'Далее →', 'Berikutnya →'],
  'No matching contracts.': ['Không tìm thấy hợp đồng phù hợp.', '没有匹配的合约。', '일치하는 컨트랙트가 없습니다.', 'Подходящих контрактов нет.', 'Tidak ada kontrak yang cocok.'],
  'Clear filters': ['Xóa bộ lọc', '清除筛选', '필터 초기화', 'Сбросить фильтры', 'Hapus filter'],
} satisfies Record<string, readonly [string, string, string, string, string]>;
const index: Record<Exclude<Lang, 'en'>, number> = { vi: 0, zh: 1, ko: 2, ru: 3, id: 4 };
export function kingControl(lang: Lang, key: keyof typeof copy): string {
  return lang === 'en' ? key : copy[key][index[lang]];
}
