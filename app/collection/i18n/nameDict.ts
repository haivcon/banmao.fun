// Offline word-by-word translation dictionary for image names
// Key: English word (lowercase) → translations per language

const DICT: Record<string, Record<string, string>> = {
    // Common descriptive words
    "happy": { vi: "Vui vẻ", zh: "快乐", ko: "행복한", ru: "Счастливый", id: "Bahagia" },
    "birthday": { vi: "Sinh nhật", zh: "生日", ko: "생일", ru: "День рождения", id: "Ulang tahun" },
    "new": { vi: "Mới", zh: "新", ko: "새", ru: "Новый", id: "Baru" },
    "year": { vi: "Năm", zh: "年", ko: "년", ru: "Год", id: "Tahun" },
    "angry": { vi: "Giận dữ", zh: "愤怒", ko: "화난", ru: "Злой", id: "Marah" },
    "sad": { vi: "Buồn", zh: "悲伤", ko: "슬픈", ru: "Грустный", id: "Sedih" },
    "cute": { vi: "Dễ thương", zh: "可爱", ko: "귀여운", ru: "Милый", id: "Imut" },
    "cool": { vi: "Ngầu", zh: "酷", ko: "멋진", ru: "Крутой", id: "Keren" },
    "love": { vi: "Tình yêu", zh: "爱", ko: "사랑", ru: "Любовь", id: "Cinta" },
    "cat": { vi: "Mèo", zh: "猫", ko: "고양이", ru: "Кот", id: "Kucing" },
    "banana": { vi: "Chuối", zh: "香蕉", ko: "바나나", ru: "Банан", id: "Pisang" },
    "king": { vi: "Vua", zh: "国王", ko: "왕", ru: "Король", id: "Raja" },
    "queen": { vi: "Nữ hoàng", zh: "女王", ko: "여왕", ru: "Королева", id: "Ratu" },
    "angel": { vi: "Thiên thần", zh: "天使", ko: "천사", ru: "Ангел", id: "Malaikat" },
    "devil": { vi: "Ác quỷ", zh: "恶魔", ko: "악마", ru: "Дьявол", id: "Iblis" },
    "fire": { vi: "Lửa", zh: "火", ko: "불", ru: "Огонь", id: "Api" },
    "water": { vi: "Nước", zh: "水", ko: "물", ru: "Вода", id: "Air" },
    "gold": { vi: "Vàng", zh: "黄金", ko: "금", ru: "Золото", id: "Emas" },
    "star": { vi: "Ngôi sao", zh: "星星", ko: "별", ru: "Звезда", id: "Bintang" },
    "moon": { vi: "Trăng", zh: "月亮", ko: "달", ru: "Луна", id: "Bulan" },
    "sun": { vi: "Mặt trời", zh: "太阳", ko: "태양", ru: "Солнце", id: "Matahari" },
    "night": { vi: "Đêm", zh: "夜晚", ko: "밤", ru: "Ночь", id: "Malam" },
    "day": { vi: "Ngày", zh: "白天", ko: "낮", ru: "День", id: "Siang" },
    "baby": { vi: "Em bé", zh: "宝宝", ko: "아기", ru: "Малыш", id: "Bayi" },
    "super": { vi: "Siêu", zh: "超级", ko: "슈퍼", ru: "Супер", id: "Super" },
    "hero": { vi: "Anh hùng", zh: "英雄", ko: "영웅", ru: "Герой", id: "Pahlawan" },
    "magic": { vi: "Ma thuật", zh: "魔法", ko: "마법", ru: "Магия", id: "Sihir" },
    "power": { vi: "Sức mạnh", zh: "力量", ko: "힘", ru: "Сила", id: "Kekuatan" },
    "dragon": { vi: "Rồng", zh: "龙", ko: "용", ru: "Дракон", id: "Naga" },
    "robot": { vi: "Người máy", zh: "机器人", ko: "로봇", ru: "Робот", id: "Robot" },
    "ninja": { vi: "Ninja", zh: "忍者", ko: "닌자", ru: "Ниндзя", id: "Ninja" },
    "pirate": { vi: "Cướp biển", zh: "海盗", ko: "해적", ru: "Пират", id: "Bajak laut" },
    "ghost": { vi: "Ma", zh: "幽灵", ko: "유령", ru: "Призрак", id: "Hantu" },
    "zombie": { vi: "Xác sống", zh: "僵尸", ko: "좀비", ru: "Зомби", id: "Zombie" },
    "alien": { vi: "Người ngoài hành tinh", zh: "外星人", ko: "외계인", ru: "Инопланетянин", id: "Alien" },
    "space": { vi: "Không gian", zh: "太空", ko: "우주", ru: "Космос", id: "Luar angkasa" },
    "dream": { vi: "Giấc mơ", zh: "梦", ko: "꿈", ru: "Мечта", id: "Mimpi" },
    "sleep": { vi: "Ngủ", zh: "睡觉", ko: "잠", ru: "Сон", id: "Tidur" },
    "dance": { vi: "Nhảy", zh: "跳舞", ko: "춤", ru: "Танец", id: "Menari" },
    "music": { vi: "Âm nhạc", zh: "音乐", ko: "음악", ru: "Музыка", id: "Musik" },
    "party": { vi: "Tiệc", zh: "派对", ko: "파티", ru: "Вечеринка", id: "Pesta" },
    "fight": { vi: "Chiến đấu", zh: "战斗", ko: "싸움", ru: "Бой", id: "Pertarungan" },
    "run": { vi: "Chạy", zh: "跑", ko: "달리기", ru: "Бег", id: "Berlari" },
    "fly": { vi: "Bay", zh: "飞", ko: "날다", ru: "Летать", id: "Terbang" },
    "smile": { vi: "Cười", zh: "微笑", ko: "미소", ru: "Улыбка", id: "Senyum" },
    "cry": { vi: "Khóc", zh: "哭", ko: "울다", ru: "Плакать", id: "Menangis" },
    "eat": { vi: "Ăn", zh: "吃", ko: "먹다", ru: "Есть", id: "Makan" },
    "chef": { vi: "Đầu bếp", zh: "厨师", ko: "요리사", ru: "Шеф-повар", id: "Koki" },
    "food": { vi: "Thức ăn", zh: "食物", ko: "음식", ru: "Еда", id: "Makanan" },
    "drink": { vi: "Uống", zh: "喝", ko: "마시다", ru: "Пить", id: "Minum" },
    "coffee": { vi: "Cà phê", zh: "咖啡", ko: "커피", ru: "Кофе", id: "Kopi" },
    "tea": { vi: "Trà", zh: "茶", ko: "차", ru: "Чай", id: "Teh" },
    "game": { vi: "Trò chơi", zh: "游戏", ko: "게임", ru: "Игра", id: "Permainan" },
    "play": { vi: "Chơi", zh: "玩", ko: "놀다", ru: "Играть", id: "Bermain" },
    "win": { vi: "Thắng", zh: "赢", ko: "이기다", ru: "Победа", id: "Menang" },
    "boss": { vi: "Trùm", zh: "老板", ko: "보스", ru: "Босс", id: "Bos" },
    "rich": { vi: "Giàu", zh: "富有", ko: "부자", ru: "Богатый", id: "Kaya" },
    "money": { vi: "Tiền", zh: "钱", ko: "돈", ru: "Деньги", id: "Uang" },
    "diamond": { vi: "Kim cương", zh: "钻石", ko: "다이아몬드", ru: "Бриллиант", id: "Berlian" },
    "crown": { vi: "Vương miện", zh: "皇冠", ko: "왕관", ru: "Корона", id: "Mahkota" },
    "sword": { vi: "Kiếm", zh: "剑", ko: "검", ru: "Меч", id: "Pedang" },
    "shield": { vi: "Khiên", zh: "盾", ko: "방패", ru: "Щит", id: "Perisai" },
    "warrior": { vi: "Chiến binh", zh: "战士", ko: "전사", ru: "Воин", id: "Prajurit" },
    "knight": { vi: "Hiệp sĩ", zh: "骑士", ko: "기사", ru: "Рыцарь", id: "Ksatria" },
    "wizard": { vi: "Phù thủy", zh: "巫师", ko: "마법사", ru: "Волшебник", id: "Penyihir" },
    "princess": { vi: "Công chúa", zh: "公主", ko: "공주", ru: "Принцесса", id: "Putri" },
    "prince": { vi: "Hoàng tử", zh: "王子", ko: "왕자", ru: "Принц", id: "Pangeran" },
    "flower": { vi: "Hoa", zh: "花", ko: "꽃", ru: "Цветок", id: "Bunga" },
    "tree": { vi: "Cây", zh: "树", ko: "나무", ru: "Дерево", id: "Pohon" },
    "rain": { vi: "Mưa", zh: "雨", ko: "비", ru: "Дождь", id: "Hujan" },
    "snow": { vi: "Tuyết", zh: "雪", ko: "눈", ru: "Снег", id: "Salju" },
    "ice": { vi: "Băng", zh: "冰", ko: "얼음", ru: "Лёд", id: "Es" },
    "summer": { vi: "Mùa hè", zh: "夏天", ko: "여름", ru: "Лето", id: "Musim panas" },
    "winter": { vi: "Mùa đông", zh: "冬天", ko: "겨울", ru: "Зима", id: "Musim dingin" },
    "spring": { vi: "Mùa xuân", zh: "春天", ko: "봄", ru: "Весна", id: "Musim semi" },
    "christmas": { vi: "Giáng sinh", zh: "圣诞节", ko: "크리스마스", ru: "Рождество", id: "Natal" },
    "halloween": { vi: "Halloween", zh: "万圣节", ko: "할로윈", ru: "Хэллоуин", id: "Halloween" },
    "valentine": { vi: "Valentine", zh: "情人节", ko: "발렌타인", ru: "Валентинка", id: "Valentine" },
    "family": { vi: "Gia đình", zh: "家庭", ko: "가족", ru: "Семья", id: "Keluarga" },
    "friend": { vi: "Bạn bè", zh: "朋友", ko: "친구", ru: "Друг", id: "Teman" },
    "dog": { vi: "Chó", zh: "狗", ko: "개", ru: "Собака", id: "Anjing" },
    "fish": { vi: "Cá", zh: "鱼", ko: "물고기", ru: "Рыба", id: "Ikan" },
    "bird": { vi: "Chim", zh: "鸟", ko: "새", ru: "Птица", id: "Burung" },
    "bear": { vi: "Gấu", zh: "熊", ko: "곰", ru: "Медведь", id: "Beruang" },
    "lion": { vi: "Sư tử", zh: "狮子", ko: "사자", ru: "Лев", id: "Singa" },
    "tiger": { vi: "Hổ", zh: "老虎", ko: "호랑이", ru: "Тигр", id: "Harimau" },
    "wolf": { vi: "Sói", zh: "狼", ko: "늑대", ru: "Волк", id: "Serigala" },
    "monkey": { vi: "Khỉ", zh: "猴子", ko: "원숭이", ru: "Обезьяна", id: "Monyet" },
    "panda": { vi: "Gấu trúc", zh: "熊猫", ko: "판다", ru: "Панда", id: "Panda" },
    "penguin": { vi: "Chim cánh cụt", zh: "企鹅", ko: "펭귄", ru: "Пингвин", id: "Penguin" },
    "fox": { vi: "Cáo", zh: "狐狸", ko: "여우", ru: "Лиса", id: "Rubah" },
    "red": { vi: "Đỏ", zh: "红色", ko: "빨간", ru: "Красный", id: "Merah" },
    "blue": { vi: "Xanh dương", zh: "蓝色", ko: "파란", ru: "Синий", id: "Biru" },
    "green": { vi: "Xanh lá", zh: "绿色", ko: "초록", ru: "Зелёный", id: "Hijau" },
    "black": { vi: "Đen", zh: "黑色", ko: "검은", ru: "Чёрный", id: "Hitam" },
    "white": { vi: "Trắng", zh: "白色", ko: "하얀", ru: "Белый", id: "Putih" },
    "pink": { vi: "Hồng", zh: "粉色", ko: "분홍", ru: "Розовый", id: "Merah muda" },
    "dark": { vi: "Tối", zh: "黑暗", ko: "어두운", ru: "Тёмный", id: "Gelap" },
    "light": { vi: "Sáng", zh: "光", ko: "밝은", ru: "Светлый", id: "Terang" },
    "big": { vi: "To", zh: "大", ko: "큰", ru: "Большой", id: "Besar" },
    "small": { vi: "Nhỏ", zh: "小", ko: "작은", ru: "Маленький", id: "Kecil" },
    "fast": { vi: "Nhanh", zh: "快", ko: "빠른", ru: "Быстрый", id: "Cepat" },
    "slow": { vi: "Chậm", zh: "慢", ko: "느린", ru: "Медленный", id: "Lambat" },
    "old": { vi: "Cũ", zh: "旧", ko: "오래된", ru: "Старый", id: "Tua" },
    "young": { vi: "Trẻ", zh: "年轻", ko: "젊은", ru: "Молодой", id: "Muda" },
    "hot": { vi: "Nóng", zh: "热", ko: "뜨거운", ru: "Горячий", id: "Panas" },
    "cold": { vi: "Lạnh", zh: "冷", ko: "차가운", ru: "Холодный", id: "Dingin" },
    // Category keywords from cloudinary
    "landmark": { vi: "Danh lam", zh: "地标", ko: "랜드마크", ru: "Достопримечательность", id: "Landmark" },
    "traditional": { vi: "Truyền thống", zh: "传统", ko: "전통", ru: "Традиционный", id: "Tradisional" },
    "clothing": { vi: "Trang phục", zh: "服装", ko: "의상", ru: "Одежда", id: "Pakaian" },
    "buy": { vi: "Mua", zh: "买", ko: "구매", ru: "Купить", id: "Beli" },
    "bike": { vi: "Xe máy", zh: "自行车", ko: "자전거", ru: "Байк", id: "Sepeda" },
    "slide": { vi: "Trượt", zh: "滑行", ko: "슬라이드", ru: "Слайд", id: "Slide" },
    "contact": { vi: "Liên hệ", zh: "联系", ko: "연락", ru: "Контакт", id: "Kontak" },
    "diplomat": { vi: "Nhà ngoại giao", zh: "外交官", ko: "외교관", ru: "Дипломат", id: "Diplomat" },
    "gothic": { vi: "Gothic", zh: "哥特式", ko: "고딕", ru: "Готический", id: "Gotik" },
    "vent": { vi: "Ống thông hơi", zh: "通风口", ko: "환풍구", ru: "Вентиляция", id: "Ventilasi" },
    "halo": { vi: "Vầng hào quang", zh: "光环", ko: "후광", ru: "Ореол", id: "Halo" },
    "brows": { vi: "Lông mày", zh: "眉毛", ko: "눈썹", ru: "Брови", id: "Alis" },
    "mobster": { vi: "Gangster", zh: "黑帮", ko: "갱스터", ru: "Гангстер", id: "Gangster" },
    "chestburster": { vi: "Quái vật", zh: "破膛者", ko: "체스트버스터", ru: "Честбёрстер", id: "Chestburster" },
    "american": { vi: "Mỹ", zh: "美国", ko: "미국", ru: "Американский", id: "Amerika" },
    "among": { vi: "Trong số", zh: "在其中", ko: "어몽", ru: "Среди", id: "Di antara" },
    "us": { vi: "Chúng ta", zh: "我们", ko: "어스", ru: "Нас", id: "Kita" },
    "sunday": { vi: "Chủ nhật", zh: "星期天", ko: "일요일", ru: "Воскресенье", id: "Minggu" },
    "on": { vi: "Trên", zh: "在", ko: "위", ru: "На", id: "Di" },
    "the": { vi: "", zh: "", ko: "", ru: "", id: "" },
    "a": { vi: "", zh: "", ko: "", ru: "", id: "" },
    "of": { vi: "Của", zh: "的", ko: "의", ru: "", id: "Dari" },
    "and": { vi: "Và", zh: "和", ko: "그리고", ru: "И", id: "Dan" },
    "in": { vi: "Trong", zh: "在", ko: "안에", ru: "В", id: "Di" },
    "with": { vi: "Với", zh: "与", ko: "함께", ru: "С", id: "Dengan" },
    "for": { vi: "Cho", zh: "为", ko: "위한", ru: "Для", id: "Untuk" },
    "at": { vi: "Tại", zh: "在", ko: "에서", ru: "В", id: "Di" },
    // More nouns & actions
    "hat": { vi: "Mũ", zh: "帽子", ko: "모자", ru: "Шляпа", id: "Topi" },
    "car": { vi: "Xe hơi", zh: "汽车", ko: "자동차", ru: "Машина", id: "Mobil" },
    "house": { vi: "Nhà", zh: "房子", ko: "집", ru: "Дом", id: "Rumah" },
    "ball": { vi: "Bóng", zh: "球", ko: "공", ru: "Мяч", id: "Bola" },
    "phone": { vi: "Điện thoại", zh: "手机", ko: "전화", ru: "Телефон", id: "Telepon" },
    "camera": { vi: "Máy ảnh", zh: "相机", ko: "카메라", ru: "Камера", id: "Kamera" },
    "book": { vi: "Sách", zh: "书", ko: "책", ru: "Книга", id: "Buku" },
    "key": { vi: "Chìa khóa", zh: "钥匙", ko: "열쇠", ru: "Ключ", id: "Kunci" },
    "door": { vi: "Cửa", zh: "门", ko: "문", ru: "Дверь", id: "Pintu" },
    "heart": { vi: "Trái tim", zh: "心", ko: "하트", ru: "Сердце", id: "Hati" },
    "eye": { vi: "Mắt", zh: "眼睛", ko: "눈", ru: "Глаз", id: "Mata" },
    "hand": { vi: "Tay", zh: "手", ko: "손", ru: "Рука", id: "Tangan" },
    "head": { vi: "Đầu", zh: "头", ko: "머리", ru: "Голова", id: "Kepala" },
    "foot": { vi: "Chân", zh: "脚", ko: "발", ru: "Нога", id: "Kaki" },
    "wing": { vi: "Cánh", zh: "翅膀", ko: "날개", ru: "Крыло", id: "Sayap" },
    "tail": { vi: "Đuôi", zh: "尾巴", ko: "꼬리", ru: "Хвост", id: "Ekor" },
    "horn": { vi: "Sừng", zh: "角", ko: "뿔", ru: "Рог", id: "Tanduk" },
    "claw": { vi: "Vuốt", zh: "爪", ko: "발톱", ru: "Коготь", id: "Cakar" },
    "mountain": { vi: "Núi", zh: "山", ko: "산", ru: "Гора", id: "Gunung" },
    "ocean": { vi: "Đại dương", zh: "海洋", ko: "바다", ru: "Океан", id: "Samudra" },
    "river": { vi: "Sông", zh: "河", ko: "강", ru: "Река", id: "Sungai" },
    "sky": { vi: "Bầu trời", zh: "天空", ko: "하늘", ru: "Небо", id: "Langit" },
    "cloud": { vi: "Mây", zh: "云", ko: "구름", ru: "Облако", id: "Awan" },
    "wind": { vi: "Gió", zh: "风", ko: "바람", ru: "Ветер", id: "Angin" },
    "earth": { vi: "Trái đất", zh: "地球", ko: "지구", ru: "Земля", id: "Bumi" },
    "kiss": { vi: "Hôn", zh: "亲吻", ko: "키스", ru: "Поцелуй", id: "Ciuman" },
    "jump": { vi: "Nhảy", zh: "跳", ko: "점프", ru: "Прыжок", id: "Lompat" },
    "swim": { vi: "Bơi", zh: "游泳", ko: "수영", ru: "Плавать", id: "Berenang" },
    "think": { vi: "Suy nghĩ", zh: "思考", ko: "생각", ru: "Думать", id: "Berpikir" },
    "read": { vi: "Đọc", zh: "读", ko: "읽다", ru: "Читать", id: "Membaca" },
    "write": { vi: "Viết", zh: "写", ko: "쓰다", ru: "Писать", id: "Menulis" },
    "sing": { vi: "Hát", zh: "唱歌", ko: "노래", ru: "Петь", id: "Menyanyi" },
    "paint": { vi: "Vẽ", zh: "画", ko: "그림", ru: "Рисовать", id: "Melukis" },
    "build": { vi: "Xây dựng", zh: "建造", ko: "건설", ru: "Строить", id: "Membangun" },
    "royal": { vi: "Hoàng gia", zh: "皇家", ko: "왕실", ru: "Королевский", id: "Kerajaan" },
    "brave": { vi: "Dũng cảm", zh: "勇敢", ko: "용감한", ru: "Храбрый", id: "Berani" },
    "crazy": { vi: "Điên", zh: "疯狂", ko: "미친", ru: "Сумасшедший", id: "Gila" },
    "funny": { vi: "Hài hước", zh: "有趣", ko: "재미있는", ru: "Смешной", id: "Lucu" },
    "scary": { vi: "Đáng sợ", zh: "可怕", ko: "무서운", ru: "Страшный", id: "Menakutkan" },
    "mystic": { vi: "Huyền bí", zh: "神秘", ko: "신비한", ru: "Мистический", id: "Mistis" },
    "lucky": { vi: "May mắn", zh: "幸运", ko: "행운", ru: "Везучий", id: "Beruntung" },
    "secret": { vi: "Bí mật", zh: "秘密", ko: "비밀", ru: "Секрет", id: "Rahasia" },
    "lost": { vi: "Lạc", zh: "迷失", ko: "잃어버린", ru: "Потерянный", id: "Tersesat" },
    "wild": { vi: "Hoang dã", zh: "野生", ko: "야생", ru: "Дикий", id: "Liar" },
    "electric": { vi: "Điện", zh: "电", ko: "전기", ru: "Электрический", id: "Listrik" },
    "crystal": { vi: "Pha lê", zh: "水晶", ko: "크리스탈", ru: "Кристалл", id: "Kristal" },
    "shadow": { vi: "Bóng tối", zh: "阴影", ko: "그림자", ru: "Тень", id: "Bayangan" },
    "storm": { vi: "Bão", zh: "暴风雨", ko: "폭풍", ru: "Буря", id: "Badai" },
    "thunder": { vi: "Sấm sét", zh: "雷", ko: "천둥", ru: "Гром", id: "Petir" },
    "galaxy": { vi: "Thiên hà", zh: "银河", ko: "은하", ru: "Галактика", id: "Galaksi" },
    "samurai": { vi: "Samurai", zh: "武士", ko: "사무라이", ru: "Самурай", id: "Samurai" },
    "meme": { vi: "Meme", zh: "表情包", ko: "밈", ru: "Мем", id: "Meme" },
    "sticker": { vi: "Nhãn dán", zh: "贴纸", ko: "스티커", ru: "Стикер", id: "Stiker" },
    "background": { vi: "Nền", zh: "背景", ko: "배경", ru: "Фон", id: "Latar" },
    "emoji": { vi: "Biểu tượng", zh: "表情", ko: "이모지", ru: "Эмодзи", id: "Emoji" },
    "flag": { vi: "Cờ", zh: "旗帜", ko: "깃발", ru: "Флаг", id: "Bendera" },
    "country": { vi: "Quốc gia", zh: "国家", ko: "나라", ru: "Страна", id: "Negara" },
    "world": { vi: "Thế giới", zh: "世界", ko: "세계", ru: "Мир", id: "Dunia" },
    "army": { vi: "Quân đội", zh: "军队", ko: "군대", ru: "Армия", id: "Tentara" },
    "battle": { vi: "Trận chiến", zh: "战斗", ko: "전투", ru: "Битва", id: "Pertempuran" },
    "victory": { vi: "Chiến thắng", zh: "胜利", ko: "승리", ru: "Победа", id: "Kemenangan" },
    // Folder names
    "avatar": { vi: "Hình đại diện", zh: "头像", ko: "아바타", ru: "Аватар", id: "Avatar" },
    "countries": { vi: "Quốc gia", zh: "国家", ko: "나라", ru: "Страны", id: "Negara" },
    "expressions": { vi: "Biểu cảm", zh: "表情", ko: "표정", ru: "Выражения", id: "Ekspresi" },
    "expression": { vi: "Biểu cảm", zh: "表情", ko: "표정", ru: "Выражение", id: "Ekspresi" },
    "parody": { vi: "Nhại", zh: "恶搞", ko: "패러디", ru: "Пародия", id: "Parodi" },
    "stickers": { vi: "Nhãn dán", zh: "贴纸", ko: "스티커", ru: "Стикеры", id: "Stiker" },
    // Country names
    "afghanistan": { vi: "Afghanistan", zh: "阿富汗", ko: "아프가니스탄", ru: "Афганистан", id: "Afganistan" },
    "albania": { vi: "Albania", zh: "阿尔巴尼亚", ko: "알바니아", ru: "Албания", id: "Albania" },
    "algeria": { vi: "Algeria", zh: "阿尔及利亚", ko: "알제리", ru: "Алжир", id: "Aljazair" },
    "argentina": { vi: "Argentina", zh: "阿根廷", ko: "아르헨티나", ru: "Аргентина", id: "Argentina" },
    "armenia": { vi: "Armenia", zh: "亚美尼亚", ko: "아르메니아", ru: "Армения", id: "Armenia" },
    "australia": { vi: "Úc", zh: "澳大利亚", ko: "호주", ru: "Австралия", id: "Australia" },
    "austria": { vi: "Áo", zh: "奥地利", ko: "오스트리아", ru: "Австрия", id: "Austria" },
    "azerbaijan": { vi: "Azerbaijan", zh: "阿塞拜疆", ko: "아제르바이잔", ru: "Азербайджан", id: "Azerbaijan" },
    "bahrain": { vi: "Bahrain", zh: "巴林", ko: "바레인", ru: "Бахрейн", id: "Bahrain" },
    "bangladesh": { vi: "Bangladesh", zh: "孟加拉国", ko: "방글라데시", ru: "Бангладеш", id: "Bangladesh" },
    "belarus": { vi: "Belarus", zh: "白俄罗斯", ko: "벨라루스", ru: "Беларусь", id: "Belarus" },
    "belgium": { vi: "Bỉ", zh: "比利时", ko: "벨기에", ru: "Бельгия", id: "Belgia" },
    "bolivia": { vi: "Bolivia", zh: "玻利维亚", ko: "볼리비아", ru: "Боливия", id: "Bolivia" },
    "bosnia": { vi: "Bosnia", zh: "波斯尼亚", ko: "보스니아", ru: "Босния", id: "Bosnia" },
    "brazil": { vi: "Brazil", zh: "巴西", ko: "브라질", ru: "Бразилия", id: "Brasil" },
    "brunei": { vi: "Brunei", zh: "文莱", ko: "브루나이", ru: "Бруней", id: "Brunei" },
    "bulgaria": { vi: "Bulgaria", zh: "保加利亚", ko: "불가리아", ru: "Болгария", id: "Bulgaria" },
    "cambodia": { vi: "Campuchia", zh: "柬埔寨", ko: "캄보디아", ru: "Камбоджа", id: "Kamboja" },
    "cameroon": { vi: "Cameroon", zh: "喀麦隆", ko: "카메룬", ru: "Камерун", id: "Kamerun" },
    "canada": { vi: "Canada", zh: "加拿大", ko: "캐나다", ru: "Канада", id: "Kanada" },
    "chile": { vi: "Chile", zh: "智利", ko: "칠레", ru: "Чили", id: "Chili" },
    "china": { vi: "Trung Quốc", zh: "中国", ko: "중국", ru: "Китай", id: "Tiongkok" },
    "colombia": { vi: "Colombia", zh: "哥伦比亚", ko: "콜롬비아", ru: "Колумбия", id: "Kolombia" },
    "congo": { vi: "Congo", zh: "刚果", ko: "콩고", ru: "Конго", id: "Kongo" },
    "costa": { vi: "Costa", zh: "哥斯达", ko: "코스타", ru: "Коста", id: "Kosta" },
    "rica": { vi: "Rica", zh: "黎加", ko: "리카", ru: "Рика", id: "Rika" },
    "croatia": { vi: "Croatia", zh: "克罗地亚", ko: "크로아티아", ru: "Хорватия", id: "Kroasia" },
    "cuba": { vi: "Cuba", zh: "古巴", ko: "쿠바", ru: "Куба", id: "Kuba" },
    "cyprus": { vi: "Síp", zh: "塞浦路斯", ko: "키프로스", ru: "Кипр", id: "Siprus" },
    "czech": { vi: "Séc", zh: "捷克", ko: "체코", ru: "Чехия", id: "Ceko" },
    "denmark": { vi: "Đan Mạch", zh: "丹麦", ko: "덴마크", ru: "Дания", id: "Denmark" },
    "dominican": { vi: "Dominica", zh: "多米尼加", ko: "도미니카", ru: "Доминиканская", id: "Dominika" },
    "ecuador": { vi: "Ecuador", zh: "厄瓜多尔", ko: "에콰도르", ru: "Эквадор", id: "Ekuador" },
    "egypt": { vi: "Ai Cập", zh: "埃及", ko: "이집트", ru: "Египет", id: "Mesir" },
    "estonia": { vi: "Estonia", zh: "爱沙尼亚", ko: "에스토니아", ru: "Эстония", id: "Estonia" },
    "ethiopia": { vi: "Ethiopia", zh: "埃塞俄比亚", ko: "에티오피아", ru: "Эфиопия", id: "Etiopia" },
    "fiji": { vi: "Fiji", zh: "斐济", ko: "피지", ru: "Фиджи", id: "Fiji" },
    "finland": { vi: "Phần Lan", zh: "芬兰", ko: "핀란드", ru: "Финляндия", id: "Finlandia" },
    "france": { vi: "Pháp", zh: "法国", ko: "프랑스", ru: "Франция", id: "Prancis" },
    "georgia": { vi: "Georgia", zh: "格鲁吉亚", ko: "조지아", ru: "Грузия", id: "Georgia" },
    "germany": { vi: "Đức", zh: "德国", ko: "독일", ru: "Германия", id: "Jerman" },
    "ghana": { vi: "Ghana", zh: "加纳", ko: "가나", ru: "Гана", id: "Ghana" },
    "greece": { vi: "Hy Lạp", zh: "希腊", ko: "그리스", ru: "Греция", id: "Yunani" },
    "guatemala": { vi: "Guatemala", zh: "危地马拉", ko: "과테말라", ru: "Гватемала", id: "Guatemala" },
    "haiti": { vi: "Haiti", zh: "海地", ko: "아이티", ru: "Гаити", id: "Haiti" },
    "honduras": { vi: "Honduras", zh: "洪都拉斯", ko: "온두라스", ru: "Гондурас", id: "Honduras" },
    "hungary": { vi: "Hungary", zh: "匈牙利", ko: "헝가리", ru: "Венгрия", id: "Hungaria" },
    "iceland": { vi: "Iceland", zh: "冰岛", ko: "아이슬란드", ru: "Исландия", id: "Islandia" },
    "india": { vi: "Ấn Độ", zh: "印度", ko: "인도", ru: "Индия", id: "India" },
    "indonesia": { vi: "Indonesia", zh: "印度尼西亚", ko: "인도네시아", ru: "Индонезия", id: "Indonesia" },
    "iran": { vi: "Iran", zh: "伊朗", ko: "이란", ru: "Иран", id: "Iran" },
    "iraq": { vi: "Iraq", zh: "伊拉克", ko: "이라크", ru: "Ирак", id: "Irak" },
    "ireland": { vi: "Ireland", zh: "爱尔兰", ko: "아일랜드", ru: "Ирландия", id: "Irlandia" },
    "israel": { vi: "Israel", zh: "以色列", ko: "이스라엘", ru: "Израиль", id: "Israel" },
    "italy": { vi: "Ý", zh: "意大利", ko: "이탈리아", ru: "Италия", id: "Italia" },
    "jamaica": { vi: "Jamaica", zh: "牙买加", ko: "자메이카", ru: "Ямайка", id: "Jamaika" },
    "japan": { vi: "Nhật Bản", zh: "日本", ko: "일본", ru: "Япония", id: "Jepang" },
    "jordan": { vi: "Jordan", zh: "约旦", ko: "요르단", ru: "Иордания", id: "Yordania" },
    "kazakhstan": { vi: "Kazakhstan", zh: "哈萨克斯坦", ko: "카자흐스탄", ru: "Казахстан", id: "Kazakhstan" },
    "kenya": { vi: "Kenya", zh: "肯尼亚", ko: "케냐", ru: "Кения", id: "Kenya" },
    "korea": { vi: "Hàn Quốc", zh: "韩国", ko: "한국", ru: "Корея", id: "Korea" },
    "kuwait": { vi: "Kuwait", zh: "科威特", ko: "쿠웨이트", ru: "Кувейт", id: "Kuwait" },
    "laos": { vi: "Lào", zh: "老挝", ko: "라오스", ru: "Лаос", id: "Laos" },
    "latvia": { vi: "Latvia", zh: "拉脱维亚", ko: "라트비아", ru: "Латвия", id: "Latvia" },
    "lebanon": { vi: "Lebanon", zh: "黎巴嫩", ko: "레바논", ru: "Ливан", id: "Lebanon" },
    "libya": { vi: "Libya", zh: "利比亚", ko: "리비아", ru: "Ливия", id: "Libya" },
    "lithuania": { vi: "Lithuania", zh: "立陶宛", ko: "리투아니아", ru: "Литва", id: "Lituania" },
    "luxembourg": { vi: "Luxembourg", zh: "卢森堡", ko: "룩셈부르크", ru: "Люксембург", id: "Luksemburg" },
    "madagascar": { vi: "Madagascar", zh: "马达加斯加", ko: "마다가스카르", ru: "Мадагаскар", id: "Madagaskar" },
    "malaysia": { vi: "Malaysia", zh: "马来西亚", ko: "말레이시아", ru: "Малайзия", id: "Malaysia" },
    "mali": { vi: "Mali", zh: "马里", ko: "말리", ru: "Мали", id: "Mali" },
    "malta": { vi: "Malta", zh: "马耳他", ko: "몰타", ru: "Мальта", id: "Malta" },
    "mexico": { vi: "Mexico", zh: "墨西哥", ko: "멕시코", ru: "Мексика", id: "Meksiko" },
    "mongolia": { vi: "Mông Cổ", zh: "蒙古", ko: "몽골", ru: "Монголия", id: "Mongolia" },
    "morocco": { vi: "Maroc", zh: "摩洛哥", ko: "모로코", ru: "Марокко", id: "Maroko" },
    "mozambique": { vi: "Mozambique", zh: "莫桑比克", ko: "모잠비크", ru: "Мозамбик", id: "Mozambik" },
    "myanmar": { vi: "Myanmar", zh: "缅甸", ko: "미얀마", ru: "Мьянма", id: "Myanmar" },
    "nepal": { vi: "Nepal", zh: "尼泊尔", ko: "네팔", ru: "Непал", id: "Nepal" },
    "netherlands": { vi: "Hà Lan", zh: "荷兰", ko: "네덜란드", ru: "Нидерланды", id: "Belanda" },
    "zealand": { vi: "Zealand", zh: "西兰", ko: "질랜드", ru: "Зеландия", id: "Selandia" },
    "nicaragua": { vi: "Nicaragua", zh: "尼加拉瓜", ko: "니카라과", ru: "Никарагуа", id: "Nikaragua" },
    "niger": { vi: "Niger", zh: "尼日尔", ko: "니제르", ru: "Нигер", id: "Niger" },
    "nigeria": { vi: "Nigeria", zh: "尼日利亚", ko: "나이지리아", ru: "Нигерия", id: "Nigeria" },
    "north": { vi: "Bắc", zh: "北", ko: "북", ru: "Северная", id: "Utara" },
    "south": { vi: "Nam", zh: "南", ko: "남", ru: "Южная", id: "Selatan" },
    "norway": { vi: "Na Uy", zh: "挪威", ko: "노르웨이", ru: "Норвегия", id: "Norwegia" },
    "oman": { vi: "Oman", zh: "阿曼", ko: "오만", ru: "Оман", id: "Oman" },
    "pakistan": { vi: "Pakistan", zh: "巴基斯坦", ko: "파키스탄", ru: "Пакистан", id: "Pakistan" },
    "palestine": { vi: "Palestine", zh: "巴勒斯坦", ko: "팔레스타인", ru: "Палестина", id: "Palestina" },
    "panama": { vi: "Panama", zh: "巴拿马", ko: "파나마", ru: "Панама", id: "Panama" },
    "paraguay": { vi: "Paraguay", zh: "巴拉圭", ko: "파라과이", ru: "Парагвай", id: "Paraguay" },
    "peru": { vi: "Peru", zh: "秘鲁", ko: "페루", ru: "Перу", id: "Peru" },
    "philippines": { vi: "Philippines", zh: "菲律宾", ko: "필리핀", ru: "Филиппины", id: "Filipina" },
    "poland": { vi: "Ba Lan", zh: "波兰", ko: "폴란드", ru: "Польша", id: "Polandia" },
    "portugal": { vi: "Bồ Đào Nha", zh: "葡萄牙", ko: "포르투갈", ru: "Португалия", id: "Portugal" },
    "qatar": { vi: "Qatar", zh: "卡塔尔", ko: "카타르", ru: "Катар", id: "Qatar" },
    "romania": { vi: "Romania", zh: "罗马尼亚", ko: "루마니아", ru: "Румыния", id: "Rumania" },
    "russia": { vi: "Nga", zh: "俄罗斯", ko: "러시아", ru: "Россия", id: "Rusia" },
    "rwanda": { vi: "Rwanda", zh: "卢旺达", ko: "르완다", ru: "Руанда", id: "Rwanda" },
    "saudi": { vi: "Ả Rập", zh: "沙特", ko: "사우디", ru: "Саудовская", id: "Saudi" },
    "arabia": { vi: "Saudi", zh: "阿拉伯", ko: "아라비아", ru: "Аравия", id: "Arabia" },
    "senegal": { vi: "Senegal", zh: "塞内加尔", ko: "세네갈", ru: "Сенегал", id: "Senegal" },
    "serbia": { vi: "Serbia", zh: "塞尔维亚", ko: "세르비아", ru: "Сербия", id: "Serbia" },
    "singapore": { vi: "Singapore", zh: "新加坡", ko: "싱가포르", ru: "Сингапур", id: "Singapura" },
    "slovakia": { vi: "Slovakia", zh: "斯洛伐克", ko: "슬로바키아", ru: "Словакия", id: "Slovakia" },
    "slovenia": { vi: "Slovenia", zh: "斯洛文尼亚", ko: "슬로베니아", ru: "Словения", id: "Slovenia" },
    "somalia": { vi: "Somalia", zh: "索马里", ko: "소말리아", ru: "Сомали", id: "Somalia" },
    "africa": { vi: "Châu Phi", zh: "非洲", ko: "아프리카", ru: "Африка", id: "Afrika" },
    "spain": { vi: "Tây Ban Nha", zh: "西班牙", ko: "스페인", ru: "Испания", id: "Spanyol" },
    "sri": { vi: "Sri", zh: "斯里", ko: "스리", ru: "Шри", id: "Sri" },
    "lanka": { vi: "Lanka", zh: "兰卡", ko: "랑카", ru: "Ланка", id: "Lanka" },
    "sudan": { vi: "Sudan", zh: "苏丹", ko: "수단", ru: "Судан", id: "Sudan" },
    "sweden": { vi: "Thụy Điển", zh: "瑞典", ko: "스웨덴", ru: "Швеция", id: "Swedia" },
    "switzerland": { vi: "Thụy Sĩ", zh: "瑞士", ko: "스위스", ru: "Швейцария", id: "Swiss" },
    "syria": { vi: "Syria", zh: "叙利亚", ko: "시리아", ru: "Сирия", id: "Suriah" },
    "taiwan": { vi: "Đài Loan", zh: "台湾", ko: "대만", ru: "Тайвань", id: "Taiwan" },
    "tajikistan": { vi: "Tajikistan", zh: "塔吉克斯坦", ko: "타지키스탄", ru: "Таджикистан", id: "Tajikistan" },
    "tanzania": { vi: "Tanzania", zh: "坦桑尼亚", ko: "탄자니아", ru: "Танзания", id: "Tanzania" },
    "thailand": { vi: "Thái Lan", zh: "泰国", ko: "태국", ru: "Таиланд", id: "Thailand" },
    "tunisia": { vi: "Tunisia", zh: "突尼斯", ko: "튀니지", ru: "Тунис", id: "Tunisia" },
    "turkey": { vi: "Thổ Nhĩ Kỳ", zh: "土耳其", ko: "튀르키예", ru: "Турция", id: "Turki" },
    "turkmenistan": { vi: "Turkmenistan", zh: "土库曼斯坦", ko: "투르크메니스탄", ru: "Туркменистан", id: "Turkmenistan" },
    "uganda": { vi: "Uganda", zh: "乌干达", ko: "우간다", ru: "Уганда", id: "Uganda" },
    "ukraine": { vi: "Ukraine", zh: "乌克兰", ko: "우크라이나", ru: "Украина", id: "Ukraina" },
    "united": { vi: "Hợp chủng", zh: "联合", ko: "유나이티드", ru: "Объединённые", id: "Serikat" },
    "states": { vi: "Quốc Hoa Kỳ", zh: "国", ko: "스테이츠", ru: "Штаты", id: "Amerika" },
    "kingdom": { vi: "Vương quốc Anh", zh: "王国", ko: "왕국", ru: "Королевство", id: "Kerajaan" },
    "emirates": { vi: "Tiểu vương quốc", zh: "酋长国", ko: "에미리트", ru: "Эмираты", id: "Emirat" },
    "uruguay": { vi: "Uruguay", zh: "乌拉圭", ko: "우루과이", ru: "Уругвай", id: "Uruguay" },
    "uzbekistan": { vi: "Uzbekistan", zh: "乌兹别克斯坦", ko: "우즈베키스탄", ru: "Узбекистан", id: "Uzbekistan" },
    "venezuela": { vi: "Venezuela", zh: "委内瑞拉", ko: "베네수엘라", ru: "Венесуэла", id: "Venezuela" },
    "vietnam": { vi: "Việt Nam", zh: "越南", ko: "베트남", ru: "Вьетнам", id: "Vietnam" },
    "yemen": { vi: "Yemen", zh: "也门", ko: "예멘", ru: "Йемен", id: "Yaman" },
    "zambia": { vi: "Zambia", zh: "赞比亚", ko: "잠비아", ru: "Замбия", id: "Zambia" },
    "zimbabwe": { vi: "Zimbabwe", zh: "津巴布韦", ko: "짐바브웨", ru: "Зимбабве", id: "Zimbabwe" },
};

export type Lang = "vi" | "zh" | "ko" | "ru" | "id";

export function translateName(name: string, lang: Lang): string {
    if (!name) return name;
    const words = name.split(/\s+/);
    const translated = words.map(word => {
        const lower = word.toLowerCase().replace(/[^a-z]/g, "");
        const entry = DICT[lower];
        if (entry && entry[lang]) {
            return entry[lang];
        }
        return word;
    });
    return translated.filter(w => w.trim() !== "").join(" ").trim() || name;
}

// Build a one-time reverse index: translated word → English word(s)
let _reverseCache: Record<string, Record<string, string[]>> | null = null;
function getReverseIndex(): Record<string, Record<string, string[]>> {
    if (_reverseCache) return _reverseCache;
    _reverseCache = {};
    for (const [eng, translations] of Object.entries(DICT)) {
        for (const [langCode, word] of Object.entries(translations)) {
            if (!word) continue;
            const lower = word.toLowerCase();
            if (!_reverseCache[langCode]) _reverseCache[langCode] = {};
            if (!_reverseCache[langCode][lower]) _reverseCache[langCode][lower] = [];
            _reverseCache[langCode][lower].push(eng);
        }
    }
    return _reverseCache;
}

/**
 * Given a search query in the user's language, return matching English keywords.
 * This allows searching "mèo" to find images with "cat" in their name.
 */
export function reverseTranslate(query: string, lang: Lang): string[] {
    if (lang === "en" as string) return [query.toLowerCase()];
    const idx = getReverseIndex();
    const langIdx = idx[lang] || {};
    const qLower = query.toLowerCase().trim();
    const results: string[] = [qLower]; // always include original query
    // Check each word
    for (const word of qLower.split(/\s+/)) {
        if (langIdx[word]) {
            results.push(...langIdx[word]);
        }
        // Also partial match: if user types partial word, match against keys
        for (const [translated, engWords] of Object.entries(langIdx)) {
            if (translated.includes(word) || word.includes(translated)) {
                results.push(...engWords);
            }
        }
    }
    return [...new Set(results)];
}

/**
 * Translate a folder label using the dictionary.
 */
export function translateFolder(folder: string, lang: Lang): string {
    if (lang === "en" as string) return folder;
    const words = folder.split(/[\s_-]+/);
    const translated = words.map(w => {
        const lower = w.toLowerCase();
        const entry = DICT[lower];
        if (entry && entry[lang]) return entry[lang];
        return w;
    });
    return translated.filter(w => w.trim() !== "").join(" ").trim() || folder;
}

/**
 * Detect best matching language from browser's navigator.language.
 */
export function detectBrowserLang(): Lang | "en" {
    if (typeof navigator === "undefined") return "en";
    const bl = navigator.language.toLowerCase();
    if (bl.startsWith("vi")) return "vi";
    if (bl.startsWith("zh")) return "zh";
    if (bl.startsWith("ko")) return "ko";
    if (bl.startsWith("ru")) return "ru";
    if (bl.startsWith("id") || bl.startsWith("ms")) return "id";
    return "en";
}
