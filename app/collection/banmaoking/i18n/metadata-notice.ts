import type { Lang } from './index';

type MetadataNoticeCopy = {
  title: string; summary: string; more: string; technical: string;
  ownership: string; view: string; refresh: string; gas: string;
  marketplace: string; faq: string;
};

export const KING_METADATA_NOTICE: Record<Lang, MetadataNoticeCopy> = {
  en: {
    title: 'Mini Banmao metadata limitation',
    summary: 'NFTs with the Mini Banmao accessory may not display their image or metadata in some wallets and marketplaces. Please consider this limitation before minting.',
    more: 'Why this happens and how to view the SVG',
    technical: 'Mini Banmao adds nested SVG artwork. Creating tokenURI renders the SVG, Base64-encodes it, builds JSON metadata and encodes that JSON again. This can exceed the execution gas budget of X Layer/OKX RPC endpoints, even when renderSVG succeeds. Compatibility varies by RPC and platform.',
    ownership: 'Missing metadata does not by itself mean minting failed or the NFT was lost. Check the transaction receipt and on-chain ownership before minting again.',
    view: 'In Lookup, enter the NFT ID under “Read renderSVG” to try viewing or downloading the original on-chain SVG. No wallet connection or gas payment is required. This does not repair tokenURI or guarantee marketplace display.',
    refresh: 'Refreshing metadata only requests another read; it does not reduce SVG size or raise RPC limits. A paid refresh transaction is not a guaranteed fix.',
    gas: '“Out of gas” during an RPC read refers to its execution budget, not your wallet balance. Adding funds to your wallet does not increase that limit.',
    marketplace: 'Mini Banmao NFTs may not display here if the platform cannot read their metadata.',
    faq: 'Why might a Mini Banmao NFT be missing its image or metadata?',
  },
  vi: {
    title: 'Giới hạn metadata của Mini Banmao',
    summary: 'NFT có phụ kiện Mini Banmao có thể không hiển thị hình ảnh hoặc metadata trên một số ví và marketplace. Vui lòng cân nhắc giới hạn này trước khi mint.',
    more: 'Nguyên nhân và cách xem SVG',
    technical: 'Mini Banmao bổ sung các hình SVG lồng bên trong. Khi tạo tokenURI, hợp đồng render SVG, mã hóa Base64, ghép metadata JSON rồi mã hóa JSON thêm một lần nữa. Quá trình này có thể vượt ngân sách gas thực thi của RPC X Layer/OKX, ngay cả khi renderSVG thành công. Khả năng tương thích tùy thuộc RPC và nền tảng.',
    ownership: 'Không tải được metadata không đồng nghĩa mint thất bại hoặc NFT đã mất. Hãy kiểm tra biên nhận giao dịch và quyền sở hữu on-chain trước khi mint lại.',
    view: 'Trong Lookup, nhập ID NFT ở mục “Đọc renderSVG” để thử xem hoặc tải SVG gốc on-chain. Không cần kết nối ví hoặc trả phí gas. Cách này không sửa tokenURI và không bảo đảm NFT hiển thị trên marketplace.',
    refresh: 'Refresh metadata chỉ yêu cầu đọc lại dữ liệu; không làm SVG nhỏ hơn hoặc tăng giới hạn RPC. Giao dịch refresh có phí không bảo đảm khắc phục được lỗi.',
    gas: '“Hết gas” khi đọc RPC nói về ngân sách thực thi, không phải số dư ví. Nạp thêm tiền vào ví không làm tăng giới hạn này.',
    marketplace: 'NFT Mini Banmao có thể không hiển thị tại đây nếu nền tảng không đọc được metadata.',
    faq: 'Vì sao NFT Mini Banmao có thể thiếu hình ảnh hoặc metadata?',
  },
  zh: {
    title: 'Mini Banmao 元数据限制',
    summary: '带有 Mini Banmao 配饰的 NFT 在部分钱包和 NFT 市场中可能无法显示图像或元数据。铸造前请考虑此限制。',
    more: '原因与 SVG 查看方法',
    technical: 'Mini Banmao 包含嵌套的 SVG 图像。生成 tokenURI 时，合约渲染 SVG、进行 Base64 编码、构建 JSON 元数据并再次编码。即使 renderSVG 成功，此过程也可能超过 X Layer/OKX RPC 的执行 Gas 预算。兼容性取决于 RPC 和平台。',
    ownership: '无法加载元数据并不等于铸造失败或 NFT 丢失。再次铸造前，请检查交易回执和链上所有权。',
    view: '在查询页面的“读取renderSVG”区域输入 NFT ID，尝试查看或下载原始链上 SVG。无需连接钱包或支付 Gas。这不会修复 tokenURI，也不保证 NFT 市场能够显示。',
    refresh: '刷新元数据只是重新请求读取，不会缩小 SVG 或提高 RPC 限制。付费刷新交易不保证解决问题。',
    gas: 'RPC 读取时的“Gas 不足”指执行预算，而非钱包余额。向钱包充值不会提高此限制。',
    marketplace: '如果平台无法读取元数据，Mini Banmao NFT 可能无法在此显示。',
    faq: '为什么 Mini Banmao NFT 可能缺少图像或元数据？',
  },

  ko: {
    title: 'Mini Banmao 메타데이터 제한',
    summary: 'Mini Banmao 액세서리가 있는 NFT는 일부 지갑과 마켓플레이스에서 이미지나 메타데이터가 표시되지 않을 수 있습니다. 민팅 전에 이 제한을 고려하세요.',
    more: '원인 및 SVG 확인 방법',
    technical: 'Mini Banmao에는 중첩된 SVG 이미지가 포함됩니다. tokenURI를 생성할 때 컨트랙트는 SVG 렌더링, Base64 인코딩, JSON 메타데이터 구성 및 재인코딩을 수행합니다. renderSVG가 성공해도 이 과정은 X Layer/OKX RPC의 실행 가스 한도를 초과할 수 있습니다. 호환성은 RPC와 플랫폼에 따라 다릅니다.',
    ownership: '메타데이터를 불러오지 못했다고 민팅 실패나 NFT 분실을 의미하지는 않습니다. 다시 민팅하기 전에 거래 영수증과 온체인 소유권을 확인하세요.',
    view: '조회 화면의 “renderSVG 읽기”에 NFT ID를 입력하여 원본 온체인 SVG를 확인하거나 다운로드해 보세요. 지갑 연결이나 가스 결제가 필요하지 않습니다. 이 방법은 tokenURI를 수정하거나 마켓플레이스 표시를 보장하지 않습니다.',
    refresh: '메타데이터 새로고침은 다시 읽기를 요청할 뿐 SVG 크기를 줄이거나 RPC 한도를 높이지 않습니다. 유료 새로고침 거래도 해결을 보장하지 않습니다.',
    gas: 'RPC 읽기 중 “가스 부족”은 지갑 잔액이 아닌 실행 한도를 뜻합니다. 지갑에 자금을 추가해도 이 한도는 늘어나지 않습니다.',
    marketplace: '플랫폼이 메타데이터를 읽지 못하면 Mini Banmao NFT가 여기에 표시되지 않을 수 있습니다.',
    faq: 'Mini Banmao NFT의 이미지나 메타데이터가 보이지 않는 이유는 무엇인가요?',
  },
  ru: {
    title: 'Ограничение метаданных Mini Banmao',
    summary: 'NFT с аксессуаром Mini Banmao могут не отображать изображение или метаданные в некоторых кошельках и на маркетплейсах. Учитывайте это ограничение перед выпуском NFT.',
    more: 'Причина и способ просмотра SVG',
    technical: 'Mini Banmao добавляет вложенные SVG-изображения. При создании tokenURI контракт формирует SVG, кодирует его в Base64, собирает метаданные JSON и кодирует JSON повторно. Это может превысить лимит газа на выполнение запроса RPC X Layer/OKX, даже если renderSVG работает. Совместимость зависит от RPC и платформы.',
    ownership: 'Отсутствие метаданных само по себе не означает неудачный выпуск или потерю NFT. Перед повторным выпуском проверьте квитанцию транзакции и право собственности в блокчейне.',
    view: 'В разделе поиска введите ID NFT в поле «Прочитать renderSVG», чтобы попробовать просмотреть или скачать исходный SVG из блокчейна. Подключение кошелька и оплата газа не нужны. Это не исправляет tokenURI и не гарантирует отображение на маркетплейсе.',
    refresh: 'Обновление метаданных лишь запрашивает повторное чтение: оно не уменьшает SVG и не повышает лимиты RPC. Платная транзакция обновления не гарантирует устранение проблемы.',
    gas: '«Недостаточно газа» при чтении RPC означает лимит выполнения, а не баланс кошелька. Пополнение кошелька не увеличивает этот лимит.',
    marketplace: 'Mini Banmao NFT могут не отображаться здесь, если платформа не может прочитать их метаданные.',
    faq: 'Почему у Mini Banmao NFT может отсутствовать изображение или метаданные?',
  },
  id: {
    title: 'Batasan metadata Mini Banmao',
    summary: 'NFT dengan aksesori Mini Banmao mungkin tidak menampilkan gambar atau metadata di beberapa dompet dan marketplace. Pertimbangkan batasan ini sebelum mint.',
    more: 'Penyebab dan cara melihat SVG',
    technical: 'Mini Banmao menambahkan gambar SVG bersarang. Saat membuat tokenURI, kontrak merender SVG, mengodekannya ke Base64, menyusun metadata JSON, lalu mengodekan JSON lagi. Proses ini dapat melampaui anggaran gas eksekusi RPC X Layer/OKX, meskipun renderSVG berhasil. Kompatibilitas bergantung pada RPC dan platform.',
    ownership: 'Metadata yang tidak dapat dimuat tidak selalu berarti mint gagal atau NFT hilang. Periksa bukti transaksi dan kepemilikan on-chain sebelum mint ulang.',
    view: 'Di bagian pencarian, masukkan ID NFT pada “Baca renderSVG” untuk mencoba melihat atau mengunduh SVG on-chain asli. Tidak perlu menghubungkan dompet atau membayar gas. Ini tidak memperbaiki tokenURI atau menjamin tampilan di marketplace.',
    refresh: 'Penyegaran metadata hanya meminta pembacaan ulang; tidak memperkecil SVG atau menaikkan batas RPC. Transaksi penyegaran berbayar tidak menjamin masalah teratasi.',
    gas: '“Kehabisan gas” saat membaca RPC mengacu pada anggaran eksekusi, bukan saldo dompet. Menambah dana ke dompet tidak menaikkan batas tersebut.',
    marketplace: 'NFT Mini Banmao mungkin tidak tampil di sini jika platform tidak dapat membaca metadatanya.',
    faq: 'Mengapa gambar atau metadata NFT Mini Banmao mungkin tidak muncul?',
  },
};
