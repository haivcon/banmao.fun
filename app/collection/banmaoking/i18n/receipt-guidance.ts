import type { Lang } from './index';

type Guidance = { confirmed: string; verification: string; fullAddress: string; select: string; viewing: string; recipient: string; delivery: string; retry: string; readOnly: string; payment: string; payer: string; fee: string; unavailable: string };
export const RECEIPT_GUIDANCE: Record<Lang, Guidance> = {
  vi: {
    confirmed: 'Giao dịch đã thành công', verification: 'Xác minh kết quả', fullAddress: 'Xem địa chỉ đầy đủ',
    select: 'Chọn NFT để xem ảnh và thông tin bên dưới', viewing: 'Đang xem NFT', recipient: 'Ví nhận NFT',
    delivery: 'NFT được gửi đến các ví nhận bên dưới, không nhất thiết là ví trả BANMAO.',
    retry: 'Kiểm tra lại kết quả (miễn phí)', readOnly: 'Kiểm tra chỉ đọc dữ liệu, không yêu cầu ký và không gửi giao dịch mới. Các mục chưa xác minh sẽ được cập nhật khi có đủ dữ liệu.',
    payment: 'Thanh toán mint', payer: 'Ví trả BANMAO', fee: 'Phí mạng của giao dịch này', unavailable: 'Chưa có dữ liệu',
  },
  en: {
    confirmed: 'Transaction succeeded', verification: 'Result verification', fullAddress: 'Show full address',
    select: 'Select an NFT to view its artwork and details below', viewing: 'Viewing NFT', recipient: 'NFT recipient wallet',
    delivery: 'NFTs are sent to the recipient wallets below, which may differ from the wallet paying BANMAO.',
    retry: 'Check results again (free)', readOnly: 'This check only reads data. No signature or new transaction is required. Unverified fields update when sufficient data is available.',
    payment: 'Mint payment', payer: 'Wallet paying BANMAO', fee: 'Network fee for this transaction', unavailable: 'Not available',
  },
  zh: {
    confirmed: '交易已成功', verification: '结果验证', fullAddress: '查看完整地址',
    select: '选择 NFT，在下方查看图像和详情', viewing: '正在查看 NFT', recipient: 'NFT 接收钱包',
    delivery: 'NFT 将发送至下方接收钱包，不一定是支付 BANMAO 的钱包。',
    retry: '重新检查结果（免费）', readOnly: '此检查仅读取数据，无需签名，也不会发送新交易。获取足够数据后，尚未验证的字段将更新。',
    payment: '铸造付款', payer: '支付 BANMAO 的钱包', fee: '本次交易的网络费用', unavailable: '暂无数据',
  },
  ko: {
    confirmed: '거래가 성공했습니다', verification: '결과 검증', fullAddress: '전체 주소 보기',
    select: 'NFT를 선택하면 아래에서 이미지와 정보를 볼 수 있습니다', viewing: '보고 있는 NFT', recipient: 'NFT 수령 지갑',
    delivery: 'NFT는 아래 수령 지갑으로 전송되며 BANMAO 결제 지갑과 다를 수 있습니다.',
    retry: '결과 다시 확인 (무료)', readOnly: '데이터만 조회합니다. 서명이나 새 거래가 필요하지 않습니다. 충분한 데이터를 확보하면 미검증 항목이 갱신됩니다.',
    payment: '민팅 결제', payer: 'BANMAO 결제 지갑', fee: '이 거래의 네트워크 수수료', unavailable: '데이터 없음',
  },
  ru: {
    confirmed: 'Транзакция успешна', verification: 'Проверка результата', fullAddress: 'Показать полный адрес',
    select: 'Выберите NFT, чтобы посмотреть изображение и данные ниже', viewing: 'Просмотр NFT', recipient: 'Кошелёк получателя NFT',
    delivery: 'NFT отправлены на кошельки ниже, которые могут отличаться от кошелька, оплатившего BANMAO.',
    retry: 'Проверить результат (бесплатно)', readOnly: 'Проверка только читает данные. Подпись и новая транзакция не нужны. Непроверенные поля обновятся при получении достаточных данных.',
    payment: 'Оплата минта', payer: 'Кошелёк оплаты BANMAO', fee: 'Комиссия сети за эту транзакцию', unavailable: 'Нет данных',
  },
  id: {
    confirmed: 'Transaksi berhasil', verification: 'Verifikasi hasil', fullAddress: 'Lihat alamat lengkap',
    select: 'Pilih NFT untuk melihat gambar dan detail di bawah', viewing: 'Melihat NFT', recipient: 'Dompet penerima NFT',
    delivery: 'NFT dikirim ke dompet penerima di bawah, yang mungkin berbeda dari dompet pembayar BANMAO.',
    retry: 'Periksa hasil lagi (gratis)', readOnly: 'Pemeriksaan hanya membaca data. Tidak perlu tanda tangan atau transaksi baru. Kolom yang belum terverifikasi diperbarui saat data mencukupi.',
    payment: 'Pembayaran mint', payer: 'Dompet pembayar BANMAO', fee: 'Biaya jaringan untuk transaksi ini', unavailable: 'Data belum tersedia',
  },
};
