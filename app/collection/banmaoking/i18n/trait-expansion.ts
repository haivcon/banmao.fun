import type { Lang } from './index';

// In canonical catalogue order. Accessory indexing is applied in traits.ts.
export const expandedTraitLabels: Record<Lang, readonly (readonly string[])[]> = {
  en: [
    ['Cosmic Suit', 'Bitcoin Suit', 'Ethereum Suit', 'OKB Suit', 'Developer Suit', 'Office Suit', 'Nature Suit', 'Royal Suit', "King's Gold", 'Frost Suit'],
    ['Cosmic Wonder', 'Diamond Gaze', 'Focused Coder', 'Whistling', 'Suspicious', 'Angry', 'Determined Grin', 'Dreaming', 'Royal Decree'],
    ['Astronaut Helmet', 'Bitcoin Medallion', 'Ethereum Scepter', 'OKB Shield', 'Developer Laptop', 'Coffee Break', 'Flower Crown', 'Bubble Blaster', 'Imperial Regalia', 'Mini Banmao', 'Boxing Gloves', 'Green Candles', 'Ruby Wine Glass'],
    ['Deep Cosmos', 'Bitcoin Blocks', 'Ethereum Network', 'OKB Orbit', 'Code Terminal', 'Office', 'Sakura Garden', 'Royal Hall', 'Throne Room'],
  ],
  vi: [
    ['Bộ đồ vũ trụ', 'Bộ đồ Bitcoin', 'Bộ đồ Ethereum', 'Bộ đồ OKB', 'Bộ đồ lập trình viên', 'Bộ đồ công sở', 'Bộ đồ thiên nhiên', 'Bộ đồ hoàng gia', 'Vàng đế vương', 'Bộ đồ băng giá'],
    ['Ngỡ ngàng vũ trụ', 'Ánh nhìn kim cương', 'Tập trung lập trình', 'Huýt sáo', 'Nghi ngờ', 'Giận dữ', 'Cười quyết tâm', 'Mơ màng', 'Uy nghi đế vương'],
    ['Mũ phi hành gia', 'Huy chương Bitcoin', 'Quyền trượng Ethereum', 'Khiên OKB', 'Máy tính lập trình', 'Tách cà phê', 'Vòng hoa', 'Súng bong bóng', 'Vương phục đế vương', 'Banmao tí hon', 'Găng quyền anh', 'Nến xanh', 'Ly vang hồng ngọc'],
    ['Vũ trụ sâu thẳm', 'Khối Bitcoin', 'Mạng Ethereum', 'Quỹ đạo OKB', 'Cửa sổ dòng lệnh', 'Văn phòng', 'Vườn anh đào', 'Đại sảnh hoàng gia', 'Phòng ngai vàng'],
  ],
  zh: [
    ['宇宙套装', '比特币套装', '以太坊套装', 'OKB套装', '程序员套装', '商务套装', '自然套装', '皇家套装', '帝王黄金', '冰霜套装'],
    ['宇宙惊叹', '钻石凝视', '专注编程', '吹口哨', '怀疑', '生气', '坚定笑容', '梦幻', '帝王威仪'],
    ['宇航员头盔', '比特币勋章', '以太坊权杖', 'OKB盾牌', '程序员笔记本', '咖啡时光', '花冠', '泡泡枪', '帝王礼服', '迷你Banmao', '拳击手套', '绿色K线', '红宝石酒杯'],
    ['深邃宇宙', '比特币区块', '以太坊网络', 'OKB轨道', '代码终端', '办公室', '樱花庭园', '皇家大厅', '王座厅'],
  ],
  ko: [
    ['우주 슈트', '비트코인 슈트', '이더리움 슈트', 'OKB 슈트', '개발자 슈트', '정장', '자연 슈트', '왕실 슈트', '제왕의 황금', '서리 슈트'],
    ['우주의 경이', '다이아몬드 시선', '집중하는 개발자', '휘파람', '의심', '화남', '결연한 미소', '꿈꾸는 표정', '제왕의 위엄'],
    ['우주인 헬멧', '비트코인 메달', '이더리움 홀', 'OKB 방패', '개발자 노트북', '커피 타임', '화관', '비눗방울 총', '황제 예복', '꼬마 Banmao', '복싱 글러브', '초록 캔들', '루비 와인잔'],
    ['깊은 우주', '비트코인 블록', '이더리움 네트워크', 'OKB 궤도', '코드 터미널', '사무실', '벚꽃 정원', '왕실 대강당', '왕좌의 방'],
  ],
  ru: [
    ['Космический костюм', 'Костюм Bitcoin', 'Костюм Ethereum', 'Костюм OKB', 'Костюм разработчика', 'Деловой костюм', 'Костюм природы', 'Королевский костюм', 'Золото короля', 'Ледяной костюм'],
    ['Космическое изумление', 'Алмазный взгляд', 'Сосредоточенный программист', 'Свист', 'Подозрение', 'Злость', 'Решительная улыбка', 'Мечтательность', 'Королевское величие'],
    ['Шлем космонавта', 'Медальон Bitcoin', 'Скипетр Ethereum', 'Щит OKB', 'Ноутбук разработчика', 'Кофейный перерыв', 'Цветочный венок', 'Пузырьковый бластер', 'Императорские регалии', 'Малыш Banmao', 'Боксёрские перчатки', 'Зелёные свечи', 'Рубиновый бокал'],
    ['Глубокий космос', 'Блоки Bitcoin', 'Сеть Ethereum', 'Орбита OKB', 'Терминал кода', 'Офис', 'Сад сакуры', 'Королевский зал', 'Тронный зал'],
  ],
  id: [
    ['Baju antariksa', 'Baju Bitcoin', 'Baju Ethereum', 'Baju OKB', 'Baju pengembang', 'Baju kantor', 'Baju alam', 'Baju kerajaan', 'Emas sang raja', 'Baju es'],
    ['Takjub kosmis', 'Tatapan berlian', 'Pemrogram fokus', 'Bersiul', 'Curiga', 'Marah', 'Senyum penuh tekad', 'Melamun', 'Wibawa raja'],
    ['Helm astronaut', 'Medali Bitcoin', 'Tongkat Ethereum', 'Perisai OKB', 'Laptop pengembang', 'Rehat kopi', 'Mahkota bunga', 'Penembak gelembung', 'Busana kekaisaran', 'Banmao mungil', 'Sarung tinju', 'Lilin hijau', 'Gelas anggur rubi'],
    ['Angkasa dalam', 'Blok Bitcoin', 'Jaringan Ethereum', 'Orbit OKB', 'Terminal kode', 'Kantor', 'Taman sakura', 'Balairung kerajaan', 'Ruang takhta'],
  ],
};
