import type { Lang } from "./index";
// UI labels only: canonical on-chain trait names and IDs remain unchanged.
export const traitLabels: Record<Lang, readonly (readonly string[])[]> = {
en: [["Golden Banana","Ripe Sunshine","Lime Banana","Peach Banana","Cyborg Suit"],["Happy Smile","Joy","Wink","Love Eyes","Sleepy","Surprised","Determined","Teary","Silly","Cool Gaze","Starstruck","Zen"],["None","King Crown","Red Bow","Round Glasses","Pixel Shades","Party Hat","AK Rifle","Flying Sword","Headphones","Wizard Hat","Halo","Star Lantern"],["Banana Cream","Cyberpunk Nexus","Mint Bubbles","Royal Split","Midnight Grid","Mango Burst","Candy Ring","Cloud Blue"]],
vi: [["Chuối vàng","Nắng chín","Chuối xanh chanh","Chuối đào","Giáp Cyborg"],["Cười tươi","Hân hoan","Nháy mắt","Mắt tình yêu","Buồn ngủ","Ngạc nhiên","Quyết tâm","Rưng rưng","Tinh nghịch","Ánh nhìn ngầu","Mắt ngôi sao","An nhiên"],["Không có","Vương miện","Nơ đỏ","Kính tròn","Kính pixel","Mũ tiệc","Súng AK","Phi kiếm","Tai nghe","Mũ phù thủy","Hào quang","Đèn ông sao"],["Kem chuối","Thế giới Cyberpunk","Bong bóng bạc hà","Mảng hoàng gia","Lưới đêm","Xoài rực rỡ","Vòng kẹo","Mây xanh"]],
zh: [["金色香蕉","成熟阳光","青柠香蕉","蜜桃香蕉","赛博格战甲"],["开心微笑","喜悦","眨眼","爱心眼","困倦","惊讶","坚定","含泪","俏皮","酷眼神","星星眼","禅意"],["无","王冠","红蝴蝶结","圆眼镜","像素墨镜","派对帽","AK步枪","飞剑","耳机","巫师帽","光环","越南星星灯笼"],["香蕉奶油","赛博朋克枢纽","薄荷泡泡","皇家拼色","午夜网格","芒果绽放","糖果环","蓝云"]],
ko: [["황금 바나나","익은 햇살","라임 바나나","복숭아 바나나","사이보그 슈트"],["밝은 미소","기쁨","윙크","하트 눈","졸림","놀람","결의","눈물","장난","멋진 시선","별 눈","평온"],["없음","왕관","빨간 리본","둥근 안경","픽셀 선글라스","파티 모자","AK 소총","비검","헤드폰","마법사 모자","후광","베트남 별 등불"],["바나나 크림","사이버펑크 넥서스","민트 거품","왕실 배색","한밤 격자","망고 폭발","사탕 고리","파란 구름"]],
ru: [["Золотой банан","Спелое солнце","Лаймовый банан","Персиковый банан","Костюм киборга"],["Улыбка","Радость","Подмигивание","Влюблённые глаза","Сонный","Удивление","Решимость","Слёзы","Озорство","Крутой взгляд","Звёздные глаза","Дзен"],["Нет","Корона","Красный бант","Круглые очки","Пиксельные очки","Колпак","Автомат АК","Летающий меч","Наушники","Шляпа волшебника","Нимб","Вьетнамский звёздный фонарь"],["Банановый крем","Киберпанк Нексус","Мятные пузыри","Королевские блоки","Полночная сетка","Всплеск манго","Конфетное кольцо","Голубые облака"]],
id: [["Pisang emas","Mentari matang","Pisang limau","Pisang persik","Baju Cyborg"],["Senyum bahagia","Gembira","Kedipan","Mata cinta","Mengantuk","Terkejut","Bertekad","Berkaca-kaca","Jenaka","Tatapan keren","Mata bintang","Tenang"],["Tanpa aksesori","Mahkota raja","Pita merah","Kacamata bulat","Kacamata piksel","Topi pesta","Senapan AK","Pedang terbang","Headphone","Topi penyihir","Halo","Lentera Bintang Vietnam"],["Krim pisang","Nexus Cyberpunk","Gelembung mint","Blok kerajaan","Kisi tengah malam","Ledakan mangga","Cincin permen","Awan biru"]],
};


// Preserve the existing fallback names at IDs 12–20, then localize the new props.
const newAccessoryLabels: Record<Lang, readonly string[]> = {
  en: ['Mini Banmao', 'Boxing Gloves'],
  vi: ['Mini Banmao', 'Găng boxing'],
  zh: ['Mini Banmao', '拳击手套'],
  ko: ['Mini Banmao', '복싱 글러브'],
  ru: ['Mini Banmao', 'Боксёрские перчатки'],
  id: ['Mini Banmao', 'Sarung Tinju'],
};
for (const lang of Object.keys(traitLabels) as Lang[]) {
  const groups = traitLabels[lang].map(group => [...group]);
  groups[1][15] = lang === 'vi' ? 'Huýt sáo' : 'Whistling';
  groups[1][17] = ({ en: 'Angry', vi: 'Giận dữ', zh: '生气', ko: '화남', ru: 'Злость', id: 'Marah' } as const)[lang];
  groups[0].length = 14;
  groups[0].push(lang === "vi" ? "Băng Giá" : "Frost Suit");
  groups[2].length = 21;
  groups[2].push(...newAccessoryLabels[lang]);
  groups[2].unshift(''); // Labels are keyed by public accessory ID, not array position.
  groups[2][24] = lang === 'vi' ? 'Nến xanh' : 'Green Candles';
  groups[2][25] = lang === 'vi' ? 'Ly vang ruby' : 'Ruby Wine Glass';
  traitLabels[lang] = groups;
}
