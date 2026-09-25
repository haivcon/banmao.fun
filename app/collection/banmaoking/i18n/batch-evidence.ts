import type { Lang } from './index';

export const BATCH_EVIDENCE_COPY: Record<Lang, { partial: string; inconsistent: string }> = {
  vi: { partial: 'Batch đã được xác nhận nhưng danh sách NFT bên dưới chưa đầy đủ. Xem tổng số lượng trong BatchMinted và kiểm tra giao dịch trên trình khám phá; không mint lại để khắc phục.', inconsistent: 'Chi tiết NFT và tổng kết batch không khớp. Kiểm tra giao dịch trên trình khám phá trước khi tiếp tục; không mint lại để khắc phục.' },
  en: { partial: 'The batch is confirmed, but the NFT list below is incomplete. See the BatchMinted quantity and check the transaction in the explorer; do not mint again to resolve this.', inconsistent: 'NFT details and the batch summary do not match. Check the transaction in the explorer before continuing; do not mint again to resolve this.' },
  zh: { partial: '批量铸造已确认，但下方 NFT 列表不完整。请查看 BatchMinted 数量并在浏览器核对交易；请勿重新铸造。', inconsistent: 'NFT 详情与批量汇总不一致。继续操作前请在浏览器核对交易；请勿重新铸造。' },
  ko: { partial: '배치가 확인되었지만 아래 NFT 목록은 불완전합니다. BatchMinted 수량과 탐색기의 거래를 확인하세요. 해결을 위해 다시 민팅하지 마세요.', inconsistent: 'NFT 상세와 배치 요약이 일치하지 않습니다. 계속하기 전에 탐색기에서 거래를 확인하세요. 다시 민팅하지 마세요.' },
  ru: { partial: 'Пакет подтверждён, но список NFT ниже неполный. Проверьте количество BatchMinted и транзакцию в обозревателе. Не повторяйте минт для исправления.', inconsistent: 'Данные NFT не совпадают со сводкой пакета. Перед продолжением проверьте транзакцию в обозревателе. Не повторяйте минт.' },
  id: { partial: 'Batch dikonfirmasi, tetapi daftar NFT di bawah belum lengkap. Lihat jumlah BatchMinted dan periksa transaksi di explorer; jangan mint ulang untuk mengatasinya.', inconsistent: 'Detail NFT dan ringkasan batch tidak cocok. Periksa transaksi di explorer sebelum melanjutkan; jangan mint ulang untuk mengatasinya.' },
};
