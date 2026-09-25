import type { Lang } from './index';
type Copy = { incomplete: string; verified: string; unknown: string; retry: string; wallets: string; payer: string; fee: string };
export const RECEIPT_COPY: Record<Lang, Copy> = {
  vi: { incomplete: 'Giao dịch thành công; chi tiết NFT chưa được xác minh đầy đủ. Không mint lại.', verified: 'Đã xác minh', unknown: 'Chưa xác minh', retry: 'Đọc lại biên nhận (miễn phí)', wallets: 'Ví nhận', payer: 'Ví thanh toán', fee: 'Phí mạng thực tế' },
  en: { incomplete: 'Transaction succeeded; NFT details are not fully verified. Do not mint again.', verified: 'Verified', unknown: 'Not verified', retry: 'Recheck receipt (free)', wallets: 'Recipient wallets', payer: 'Payer', fee: 'Actual network fee' },
  zh: { incomplete: '交易成功；NFT 详情尚未完全验证。请勿重新铸造。', verified: '已验证', unknown: '尚未验证', retry: '重新读取凭证（免费）', wallets: '接收钱包', payer: '付款钱包', fee: '实际网络费用' },
  ko: { incomplete: '거래는 성공했으나 NFT 상세 정보가 완전히 검증되지 않았습니다. 다시 민팅하지 마세요.', verified: '검증됨', unknown: '미검증', retry: '영수증 다시 확인 (무료)', wallets: '수령 지갑', payer: '결제 지갑', fee: '실제 네트워크 수수료' },
  ru: { incomplete: 'Транзакция успешна; данные NFT проверены не полностью. Не повторяйте минт.', verified: 'Проверено', unknown: 'Не проверено', retry: 'Проверить квитанцию (бесплатно)', wallets: 'Кошельки получателей', payer: 'Плательщик', fee: 'Фактическая комиссия сети' },
  id: { incomplete: 'Transaksi berhasil; detail NFT belum sepenuhnya terverifikasi. Jangan mint ulang.', verified: 'Terverifikasi', unknown: 'Belum terverifikasi', retry: 'Periksa ulang bukti (gratis)', wallets: 'Dompet penerima', payer: 'Pembayar', fee: 'Biaya jaringan aktual' },
};
