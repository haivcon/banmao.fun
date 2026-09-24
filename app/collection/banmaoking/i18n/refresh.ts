import type { Lang } from './index';
const copy = {
  'Refresh reverted. Your NFT is safe; you can retry refresh.': ['Làm mới bị hoàn tác. NFT không bị ảnh hưởng; có thể thử lại.', '刷新已回退。NFT不受影响，可以重试。', '새로고침이 되돌려졌습니다. NFT는 안전하며 다시 시도할 수 있습니다.', 'Обновление отменено сетью. NFT не затронут; можно повторить.', 'Penyegaran dibatalkan jaringan. NFT aman; Anda dapat mencoba lagi.'],
  'Connect wallet to refresh': ['Kết nối ví để làm mới', '连接钱包以刷新', '새로고침하려면 지갑 연결', 'Подключить кошелёк для обновления', 'Hubungkan dompet untuk menyegarkan'],
  'Please switch your wallet to X Layer.': ['Vui lòng chuyển ví sang X Layer.', '请将钱包切换至X Layer。', '지갑을 X Layer로 전환하세요.', 'Переключите кошелёк на X Layer.', 'Alihkan dompet ke X Layer.'],
  'Switch to X Layer': ['Chuyển sang X Layer', '切换至X Layer', 'X Layer로 전환', 'Переключить на X Layer', 'Beralih ke X Layer'],
  'Confirm in wallet…': ['Xác nhận trong ví…', '请在钱包中确认…', '지갑에서 확인…', 'Подтвердите в кошельке…', 'Konfirmasi di dompet…'],
  'Waiting for confirmation…': ['Đang chờ xác nhận…', '等待确认…', '확인 대기 중…', 'Ожидание подтверждения…', 'Menunggu konfirmasi…'],
  'Refresh explorer metadata': ['Làm mới metadata trên trình khám phá', '刷新浏览器元数据', '탐색기 메타데이터 새로고침', 'Обновить метаданные в обозревателе', 'Segarkan metadata penjelajah'],
  'Refresh transaction ↗': ['Giao dịch làm mới ↗', '刷新交易 ↗', '새로고침 거래 ↗', 'Транзакция обновления ↗', 'Transaksi penyegaran ↗'],
  'Refresh signal confirmed. Marketplace indexing may take more time.': ['Đã xác nhận tín hiệu làm mới. Sàn giao dịch có thể cần thêm thời gian cập nhật.', '刷新信号已确认。市场索引可能需要更多时间。', '새로고침 신호가 확인되었습니다. 마켓플레이스 반영에는 시간이 더 걸릴 수 있습니다.', 'Сигнал обновления подтверждён. Индексация площадками может занять время.', 'Sinyal penyegaran dikonfirmasi. Pengindeksan pasar mungkin perlu waktu.'],
  'Refresh unavailable': ['Không thể làm mới. Kiểm tra ví và thử lại.', '无法刷新，请检查钱包后重试。', '새로고침할 수 없습니다. 지갑을 확인하고 다시 시도하세요.', 'Обновление недоступно. Проверьте кошелёк и повторите.', 'Penyegaran tidak tersedia. Periksa dompet dan coba lagi.'],
  'Refresh NFT #{id} metadata on explorers: emit an ERC-4906 signal, paying OKB gas only, no BANMAO. This does not change artwork or ownership and does not guarantee an immediate OKX Explorer update. Sign only if you want to send the request.': ['Làm mới metadata NFT #{id} trên trình khám phá: phát tín hiệu ERC-4906, chỉ tốn phí OKB, không tốn BANMAO. Không đổi hình ảnh hay quyền sở hữu, không bảo đảm OKX Explorer cập nhật ngay. Chỉ ký nếu muốn gửi yêu cầu.', '刷新浏览器中NFT #{id}的元数据：发送ERC-4906信号，仅支付OKB网络费，不花费BANMAO。不改变作品或所有权，也不保证OKX Explorer立即更新。仅在你希望发送请求时签名。', '탐색기에서 NFT #{id} 메타데이터 갱신: ERC-4906 신호를 보내며 OKB 가스비만 지불하고 BANMAO는 쓰지 않습니다. 작품이나 소유권은 바뀌지 않으며 OKX Explorer의 즉시 갱신을 보장하지 않습니다. 요청을 보낼 때만 서명하세요.', 'Обновить метаданные NFT #{id} в обозревателях: сигнал ERC-4906, только комиссия OKB, без BANMAO. Изображение и владелец не меняются, мгновенное обновление OKX Explorer не гарантируется. Подписывайте, только если хотите отправить запрос.', 'Segarkan metadata NFT #{id} di penjelajah: kirim sinyal ERC-4906, hanya biaya gas OKB, tanpa BANMAO. Karya dan kepemilikan tidak berubah, pembaruan langsung OKX Explorer tidak dijamin. Tanda tangani hanya jika ingin mengirim permintaan.'],
} satisfies Record<string, readonly [string, string, string, string, string]>;
const index: Record<Exclude<Lang, 'en'>, number> = { vi: 0, zh: 1, ko: 2, ru: 3, id: 4 };
export function kingRefreshCopy(lang: Lang, key: keyof typeof copy, id?: bigint): string {
  return (lang === 'en' ? key : copy[key][index[lang]]).replace('{id}', String(id ?? ''));
}
