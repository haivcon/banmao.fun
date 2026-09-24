import type { Lang } from './index';

// English source keys are shared by small controls; every entry has six locales.
export const interfaceCopy = {
  'Customize': ['Customize', 'Tùy chỉnh', '自定义', '꾸미기', 'Настроить', 'Sesuaikan'],
  'Cyborg form': ['Cyborg form', 'Dạng người máy', '赛博格形态', '사이보그 형태', 'Форма киборга', 'Bentuk siborg'],
  'Hybrid': ['Hybrid', 'Lai sinh học', '混合形态', '혼합형', 'Гибрид', 'Hibrida'],
  'Full Machine': ['Full Machine', 'Máy toàn phần', '全机械形态', '완전 기계형', 'Полностью механический', 'Mesin sepenuhnya'],
  'Switch sample tokens to preview both forms. Actual NFT form is fixed by token ID, not selected at mint.': ['Switch sample tokens to preview both forms. Actual NFT form is fixed by token ID, not selected at mint.', 'Đổi token mẫu để xem hai dạng. Dạng NFT thật cố định theo ID token, không chọn khi mint.', '切换示例代币以预览两种形态。实际NFT形态由代币ID决定，铸造时无法选择。', '샘플 토큰을 바꿔 두 형태를 미리 보세요. 실제 NFT 형태는 토큰 ID로 결정되며 민팅 시 선택할 수 없습니다.', 'Переключайте образцы для просмотра обеих форм. Форма NFT определяется ID токена и не выбирается при минте.', 'Ganti token contoh untuk melihat kedua bentuk. Bentuk NFT ditentukan oleh ID token, bukan dipilih saat mint.'],
  'Advanced options · Composition · Share · SVG': ['Advanced options · Composition · Share · SVG', 'Nâng cao · Mã tổ hợp · Chia sẻ · SVG', '高级选项 · 组合 · 分享 · SVG', '고급 옵션 · 조합 · 공유 · SVG', 'Дополнительно · Комбинация · Поделиться · SVG', 'Opsi lanjutan · Kombinasi · Bagikan · SVG'],
  'SVG preview': ['SVG preview', 'Xem trước SVG', 'SVG预览', 'SVG 미리보기', 'Предпросмотр SVG', 'Pratinjau SVG'],
  'Enter an integer from 0 to 999999. Keeping the last valid preview.': ['Enter an integer from 0 to 999999. Keeping the last valid preview.', 'Nhập số nguyên từ 0 đến 999999. Giữ bản xem trước hợp lệ gần nhất.', '请输入0至999999的整数。保留上次有效预览。', '0~999999의 정수를 입력하세요. 마지막 유효한 미리보기를 유지합니다.', 'Введите целое число от 0 до 999999. Сохранён последний корректный предпросмотр.', 'Masukkan bilangan bulat 0–999999. Pratinjau valid terakhir dipertahankan.'],
  'Enter 0–999999 to inspect the digits. Preview only; this does not select a mint ID.': ['Enter 0–999999 to inspect the digits. Preview only; this does not select a mint ID.', 'Nhập 0–999999 để xem cách xếp số. Chỉ xem trước, không chọn ID khi mint.', '输入0–999999查看数字排布。仅供预览，不会选择铸造ID。', '0~999999를 입력해 숫자 배치를 확인하세요. 미리보기 전용이며 민팅 ID를 선택하지 않습니다.', 'Введите 0–999999 для просмотра цифр. Это предпросмотр, а не выбор ID при минте.', 'Masukkan 0–999999 untuk melihat tata letak angka. Hanya pratinjau, bukan memilih ID mint.'],
  'Theme Lab': ['Theme Lab', 'Thư viện bộ phối', '搭配库', '스타일 라이브러리', 'Библиотека образов', 'Pustaka gaya'],
  'looks': ['looks', 'bộ phối', '种搭配', '가지 스타일', 'образов', 'gaya'],
  'Choose a look to update the preview, then customize each layer.': ['Choose a look to update the preview, then customize each layer.', 'Chọn bộ phối để xem trước, sau đó tùy chỉnh từng lớp.', '选择搭配更新预览，再自定义各个图层。', '스타일을 선택해 미리보기를 업데이트한 후 각 레이어를 꾸미세요.', 'Выберите образ для предпросмотра, затем настройте каждый слой.', 'Pilih gaya untuk memperbarui pratinjau, lalu sesuaikan setiap lapisan.'],
  'Search themes': ['Search themes', 'Tìm bộ phối', '搜索搭配', '스타일 검색', 'Поиск образов', 'Cari gaya'],
  'Search themes, traits…': ['Search themes, traits…', 'Tìm bộ phối, đặc điểm…', '搜索搭配、特征…', '스타일, 특성 검색…', 'Поиск образов, черт…', 'Cari gaya, ciri…'],
  'Theme categories': ['Theme categories', 'Nhóm bộ phối', '搭配分类', '스타일 분류', 'Категории образов', 'Kategori gaya'],
  'All themes': ['All themes', 'Tất cả', '全部搭配', '전체 스타일', 'Все образы', 'Semua gaya'],
  'Royal': ['Royal', 'Hoàng gia', '皇家', '왕실', 'Королевские', 'Kerajaan'],
  'Cosmic': ['Cosmic', 'Vũ trụ', '宇宙', '우주', 'Космические', 'Antariksa'],
  'Nature': ['Nature', 'Thiên nhiên', '自然', '자연', 'Природа', 'Alam'],
  'Lifestyle': ['Lifestyle', 'Đời sống', '生活', '일상', 'Повседневные', 'Keseharian'],
  'Previewing: ': ['Previewing: ', 'Đang xem: ', '预览：', '미리보기: ', 'Предпросмотр: ', 'Pratinjau: '],
  'Custom look': ['Custom look', 'Bộ phối tùy chỉnh', '自定义搭配', '맞춤 스타일', 'Свой образ', 'Gaya kustom'],
  'Selected': ['Selected', 'Đang chọn', '已选', '선택됨', 'Выбрано', 'Dipilih'],
  'Show fewer': ['Show fewer', 'Thu gọn', '收起', '접기', 'Свернуть', 'Tampilkan lebih sedikit'],
  'Show more looks': ['Show more looks', 'Xem thêm bộ phối', '查看更多搭配', '스타일 더 보기', 'Больше образов', 'Lihat gaya lainnya'],
  'View preview ↑': ['View preview ↑', 'Xem bản phối ↑', '查看预览 ↑', '미리보기 ↑', 'Предпросмотр ↑', 'Lihat pratinjau ↑'],
  'No themes match your search.': ['No themes match your search.', 'Không tìm thấy bộ phối phù hợp.', '没有匹配的搭配。', '검색에 맞는 스타일이 없습니다.', 'Подходящих образов нет.', 'Tidak ada gaya yang cocok.'],
  'Clear filters': ['Clear filters', 'Xóa bộ lọc', '清除筛选', '필터 초기화', 'Сбросить фильтры', 'Hapus filter'],
  'bodies': ['bodies', 'thân', '种身体', '가지 몸체', 'тел', 'tubuh'],
  'expressions': ['expressions', 'biểu cảm', '种表情', '가지 표정', 'выражений', 'ekspresi'],
  'accessories': ['accessories', 'phụ kiện', '种配饰', '가지 액세서리', 'аксессуаров', 'aksesori'],
  'backgrounds': ['backgrounds', 'phông nền', '种背景', '가지 배경', 'фонов', 'latar'],
  'Presets are previews, not mint selections. Catalogue network deployment is not confirmed.': ['Presets are previews, not mint selections. Catalogue network deployment is not confirmed.', 'Bộ phối chỉ để xem trước, không quyết định NFT khi mint. Chưa xác nhận triển khai danh mục lên mạng.', '搭配仅供预览，并非铸造选项。尚未确认目录已部署到网络。', '스타일은 미리보기이며 민팅 선택 사항이 아닙니다. 카탈로그의 네트워크 배포는 확인되지 않았습니다.', 'Образы служат для предпросмотра, а не выбора при минте. Развёртывание каталога в сети не подтверждено.', 'Gaya hanya pratinjau, bukan pilihan mint. Penerapan katalog di jaringan belum dikonfirmasi.'],
} satisfies Record<string, readonly [string, string, string, string, string, string]>;

const localeIndex: Record<Lang, number> = { en: 0, vi: 1, zh: 2, ko: 3, ru: 4, id: 5 };
export function kingUi(lang: Lang, key: keyof typeof interfaceCopy): string {
  return interfaceCopy[key][localeIndex[lang]];
}
