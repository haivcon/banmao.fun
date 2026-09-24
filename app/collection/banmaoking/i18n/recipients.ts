import type { Lang } from './index';
const copy = {
  'Check every address and quantity. Maximum 50 NFTs in total; zero addresses are not allowed.': ['Kiểm tra từng địa chỉ và số lượng. Tối đa 50 NFT; không dùng địa chỉ 0.', '请检查每个地址和数量。总计最多50个NFT，不允许零地址。', '모든 주소와 수량을 확인하세요. 총 50 NFT까지 가능하며 영 주소는 허용되지 않습니다.', 'Проверьте все адреса и количество. Максимум 50 NFT; нулевые адреса запрещены.', 'Periksa setiap alamat dan jumlah. Maksimal 50 NFT; alamat nol tidak diizinkan.'],
  'Recipient list': ['Danh sách người nhận', '接收者列表', '수신자 목록', 'Список получателей', 'Daftar penerima'],
  'Close paste editor': ['Đóng phần dán danh sách', '关闭粘贴编辑器', '붙여넣기 편집기 닫기', 'Закрыть редактор вставки', 'Tutup editor tempel'],
  'Paste a list': ['Dán danh sách', '粘贴列表', '목록 붙여넣기', 'Вставить список', 'Tempel daftar'],
  'One row: address, quantity': ['Mỗi dòng: địa chỉ, số lượng', '每行：地址，数量', '한 행: 주소, 수량', 'Одна строка: адрес, количество', 'Satu baris: alamat, jumlah'],
  'Apply replaces the list below. Unapplied text is not used for minting.': ['Áp dụng sẽ thay danh sách bên dưới. Nội dung chưa áp dụng không được dùng để mint.', '应用将替换下方列表。未应用的文本不会用于铸造。', '적용하면 아래 목록이 교체됩니다. 적용하지 않은 텍스트는 민팅에 사용되지 않습니다.', 'Применение заменит список ниже. Неприменённый текст не используется для минта.', 'Terapkan akan mengganti daftar di bawah. Teks yang belum diterapkan tidak digunakan untuk mint.'],
  'Apply list': ['Áp dụng danh sách', '应用列表', '목록 적용', 'Применить список', 'Terapkan daftar'],
  'Recipient': ['Người nhận', '接收者', '수신자', 'Получатель', 'Penerima'],
  'Remove recipient': ['Xóa người nhận', '移除接收者', '수신자 삭제', 'Удалить получателя', 'Hapus penerima'],
  'Invalid address.': ['Địa chỉ không hợp lệ.', '地址无效。', '잘못된 주소입니다.', 'Неверный адрес.', 'Alamat tidak valid.'],
  'Enter a whole number from 1 to 50.': ['Nhập số nguyên từ 1 đến 50.', '请输入1至50的整数。', '1~50의 정수를 입력하세요.', 'Введите целое число от 1 до 50.', 'Masukkan bilangan bulat 1–50.'],
  'Repeated wallet. Please review; rows are not merged.': ['Ví bị lặp. Hãy kiểm tra; các dòng không được gộp.', '钱包重复。请检查，行不会自动合并。', '중복된 지갑입니다. 행은 병합되지 않으므로 확인하세요.', 'Кошелёк повторяется. Проверьте: строки не объединяются.', 'Dompet berulang. Periksa kembali; baris tidak digabungkan.'],
  'Valid format — verify the intended recipient.': ['Đúng định dạng — hãy xác minh người nhận.', '格式有效，请核实接收者。', '유효한 형식입니다. 의도한 수신자인지 확인하세요.', 'Формат верен — проверьте получателя.', 'Format valid — pastikan penerimanya benar.'],
  'Enter a full EVM address.': ['Nhập đầy đủ địa chỉ EVM.', '请输入完整EVM地址。', '전체 EVM 주소를 입력하세요.', 'Введите полный EVM-адрес.', 'Masukkan alamat EVM lengkap.'],
  'The total exceeds the 50 NFT limit.': ['Tổng số vượt giới hạn 50 NFT.', '总数超过50个NFT的限制。', '총수량이 50 NFT 한도를 초과합니다.', 'Общее количество превышает лимит 50 NFT.', 'Total melebihi batas 50 NFT.'],
  'Add recipient': ['Thêm người nhận', '添加接收者', '수신자 추가', 'Добавить получателя', 'Tambah penerima'],
} satisfies Record<string, readonly [string, string, string, string, string]>;
const index: Record<Exclude<Lang, 'en'>, number> = { vi: 0, zh: 1, ko: 2, ru: 3, id: 4 };
export function kingRecipientCopy(lang: Lang, key: keyof typeof copy): string {
  return lang === 'en' ? key : copy[key][index[lang]];
}
