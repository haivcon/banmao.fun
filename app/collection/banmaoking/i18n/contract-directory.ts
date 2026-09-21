import type { Lang } from "./index";
import type { KING_CONTRACTS } from "../contract-directory";

type Category = typeof KING_CONTRACTS[number]["category"];
type DirectoryCopy = { intro: string; functions: string; dependencies: string; roles: Record<Category, string> };
export const directoryCopy: Record<Lang, DirectoryCopy> = {
  vi: {
    intro: "Đầy đủ 95 hợp đồng triển khai cho bộ sưu tập này: NFT, renderer và 93 thành phần đồ họa/chuyển động. Địa chỉ bên dưới được đối chiếu với manifest triển khai.",
    functions: "Chức năng công khai", dependencies: "Thành phần liên kết",
    roles: {
      NFT: "Quản lý NFT ERC-721, quyền sở hữu, mint bằng BANMAO, mint hàng loạt và thông tin royalty 2%.",
      Renderer: "Kết hợp các lớp đồ họa và chuyển động để tạo SVG và metadata NFT hoàn toàn on-chain.",
      Body: "Cung cấp hoặc ghép các lớp SVG cơ thể, trang phục và tư thế của nhân vật.",
      Expression: "Cung cấp hoặc định tuyến đồ họa biểu cảm và chi tiết khuôn mặt theo đặc điểm NFT.",
      Accessory: "Cung cấp hoặc ghép các lớp phụ kiện và hiệu ứng tương tác của nhân vật.",
      Background: "Cung cấp hoặc ghép cảnh nền, ánh sáng và hiệu ứng không gian cho SVG.",
      Motion: "Cung cấp dữ liệu hoặc lớp hoạt ảnh để phối hợp chuyển động trong SVG.",
      Identity: "Tạo các lớp nhận diện và chi tiết hình ảnh gắn với đặc điểm của NFT.",
      Shared: "Lưu các đoạn SVG dùng chung để những thành phần đồ họa khác ghép vào cảnh."
    }
  },
  en: {
    intro: "All 95 contracts deployed for this collection: the NFT, renderer and 93 artwork/motion components. Addresses are matched against the deployment manifest.",
    functions: "Public functions", dependencies: "Linked components",
    roles: {
      NFT: "Manages ERC-721 ownership, BANMAO mint payments, batch minting and 2% royalty information.",
      Renderer: "Combines artwork and motion layers into fully on-chain SVG and NFT metadata.",
      Body: "Supplies or composes body, clothing and pose SVG layers for the character.",
      Expression: "Supplies or routes expression artwork and facial details according to NFT traits.",
      Accessory: "Supplies or composes accessory layers and character interaction effects.",
      Background: "Supplies or composes scenery, lighting and atmosphere layers for the SVG.",
      Motion: "Supplies animation data or layers to coordinate movement within the SVG.",
      Identity: "Builds identity layers and visual details associated with NFT traits.",
      Shared: "Stores shared SVG fragments used by other artwork components to compose scenes."
    }
  },
  zh: {
    intro: "本系列部署的全部 95 个合约：NFT、渲染器和 93 个图形及动画组件。地址已与部署清单逐一核对。",
    functions: "公开函数", dependencies: "关联组件",
    roles: {
      NFT: "管理 ERC-721 所有权、BANMAO 铸造付款、批量铸造及 2% 版税信息。",
      Renderer: "将图形和动画图层合成为完全链上的 SVG 和 NFT 元数据。",
      Body: "提供或组合角色身体、服装和姿态的 SVG 图层。",
      Expression: "根据 NFT 特征提供或分配表情图形和面部细节。",
      Accessory: "提供或组合配饰图层及角色互动效果。",
      Background: "提供或组合 SVG 的场景、光照和氛围图层。",
      Motion: "提供动画数据或图层，协调 SVG 中的动作。",
      Identity: "生成与 NFT 特征相关的身份图层和视觉细节。",
      Shared: "保存供其他图形组件组合场景使用的共享 SVG 片段。"
    }
  },
  ko: {
    intro: "이 컬렉션에 배포된 전체 95개 계약: NFT, 렌더러, 그래픽 및 모션 구성 요소 93개입니다. 주소는 배포 명세와 대조했습니다.",
    functions: "공개 함수", dependencies: "연결된 구성 요소",
    roles: {
      NFT: "ERC-721 소유권, BANMAO 민팅 결제, 일괄 민팅 및 2% 로열티 정보를 관리합니다.",
      Renderer: "그래픽과 모션 레이어를 완전한 온체인 SVG 및 NFT 메타데이터로 합성합니다.",
      Body: "캐릭터의 몸체, 의상 및 자세 SVG 레이어를 제공하거나 합성합니다.",
      Expression: "NFT 특성에 따라 표정 그래픽과 얼굴 세부 요소를 제공하거나 연결합니다.",
      Accessory: "액세서리 레이어와 캐릭터 상호작용 효과를 제공하거나 합성합니다.",
      Background: "SVG의 배경, 조명 및 분위기 레이어를 제공하거나 합성합니다.",
      Motion: "SVG 내 움직임을 조율하는 애니메이션 데이터 또는 레이어를 제공합니다.",
      Identity: "NFT 특성과 관련된 식별 레이어 및 시각적 세부 요소를 생성합니다.",
      Shared: "다른 그래픽 구성 요소가 장면 합성에 사용하는 공통 SVG 조각을 저장합니다."
    }
  },

  ru: {
    intro: "Все 95 контрактов этой коллекции: NFT, рендерер и 93 компонента графики и анимации. Адреса сверены с манифестом развёртывания.",
    functions: "Публичные функции", dependencies: "Связанные компоненты",
    roles: {
      NFT: "Управляет владением ERC-721, оплатой минта в BANMAO, пакетным минтом и информацией о роялти 2%.",
      Renderer: "Объединяет графику и анимацию в полностью ончейн SVG и метаданные NFT.",
      Body: "Предоставляет или объединяет SVG-слои тела, одежды и позы персонажа.",
      Expression: "Предоставляет или направляет графику эмоций и деталей лица согласно чертам NFT.",
      Accessory: "Предоставляет или объединяет слои аксессуаров и эффекты взаимодействия персонажа.",
      Background: "Предоставляет или объединяет слои фона, освещения и атмосферы SVG.",
      Motion: "Предоставляет данные или слои анимации для согласования движений в SVG.",
      Identity: "Создаёт слои идентичности и визуальные детали, связанные с чертами NFT.",
      Shared: "Хранит общие фрагменты SVG, используемые другими графическими компонентами сцены."
    }
  },
  id: {
    intro: "Seluruh 95 kontrak yang diterapkan untuk koleksi ini: NFT, renderer, dan 93 komponen grafis/gerakan. Alamat dicocokkan dengan manifes deployment.",
    functions: "Fungsi publik", dependencies: "Komponen tertaut",
    roles: {
      NFT: "Mengelola kepemilikan ERC-721, pembayaran mint BANMAO, mint massal, dan informasi royalti 2%.",
      Renderer: "Menggabungkan lapisan grafis dan gerakan menjadi SVG serta metadata NFT sepenuhnya on-chain.",
      Body: "Menyediakan atau menggabungkan lapisan SVG tubuh, pakaian, dan pose karakter.",
      Expression: "Menyediakan atau mengarahkan grafis ekspresi dan detail wajah sesuai ciri NFT.",
      Accessory: "Menyediakan atau menggabungkan lapisan aksesori dan efek interaksi karakter.",
      Background: "Menyediakan atau menggabungkan latar, pencahayaan, dan lapisan suasana SVG.",
      Motion: "Menyediakan data atau lapisan animasi untuk mengoordinasikan gerakan dalam SVG.",
      Identity: "Membuat lapisan identitas dan detail visual yang terkait dengan ciri NFT.",
      Shared: "Menyimpan fragmen SVG bersama yang digunakan komponen grafis lain untuk menyusun adegan."
    }
  }
};

export function contractDescription(contract: typeof KING_CONTRACTS[number], language: Lang): string {
  const copy = directoryCopy[language];
  return `${copy.roles[contract.category]} ${copy.functions}: ${contract.functions.join(", ")}.`;
}
