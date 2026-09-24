import type { Lang } from './index';
import type { MintResultState } from '../mint-result';

type ResultCopy = {
  states: Record<MintResultState, readonly [string, string]>;
  summary: (nfts: number, wallets: number) => string;
  recipients: string; view: string; all: string; less: string; details: string;
  artwork: string; loading: string; imageError: string; noRemint: string;
};

export const MINT_RESULT_COPY: Record<Lang, ResultCopy> = {
  zh: {
    states: {
      checking: ['正在检查交易', '正在检查余额、授权和网络费用。'],
      signing: ['请在钱包中确认', '签名前请核对钱包中的交易信息。'],
      pending: ['等待区块链确认', '交易已提交。等待确认期间请勿重复提交。'],
      uncertain: ['交易结果尚未确定', '交易可能仍在处理中。系统会继续检查；再次提交前请查看交易。'],
      success: ['铸造成功', 'NFT 已记录在链上并转入下方接收钱包。'],
      approved: ['BANMAO 授权成功', '此步骤未铸造 NFT。授权数据更新后，请点击铸造按钮继续。'],
      reset: ['支出授权已重置', '尚未铸造 NFT。请使用上方交易按钮继续授权 BANMAO。'],
      unresolved: ['交易已确认', '暂时无法确定铸造结果。再次铸造前请在浏览器中查看交易。'],
      cancelled: ['已取消确认', '此交易未提交。核对信息后可继续操作。'],
      reverted: ['交易未成功', '交易已回滚，此交易未铸造任何 NFT；仍可能产生网络费用。'],
      error: ['无法完成交易', '请查看下方提示并核对支付信息后重试。'],
    },
    summary: (n, w) => `已将 ${n} 个 NFT 转入 ${w} 个接收钱包。`,
    recipients: '各钱包接收结果', view: '查看 NFT', all: '显示所有接收钱包', less: '收起', details: '交易详情',
    artwork: 'NFT 图像', loading: '正在从链上加载图像…', imageError: '暂时无法加载图像，不影响铸造结果。', noRemint: '无需重新铸造或额外支付费用。',
  },
  ko: {
    states: {
      checking: ['거래 확인 중', '잔액, 사용 승인 및 네트워크 수수료를 확인합니다.'],
      signing: ['지갑에서 확인하세요', '서명 전에 지갑의 거래 정보를 확인하세요.'],
      pending: ['블록체인 확인 대기 중', '거래가 제출되었습니다. 확인 중에는 다시 제출하지 마세요.'],
      uncertain: ['거래 결과 확인 중', '거래가 아직 처리 중일 수 있습니다. 자동 확인이 계속됩니다. 다시 제출하기 전에 거래를 확인하세요.'],
      success: ['민팅 성공', 'NFT가 온체인에 기록되어 아래 수령 지갑으로 전송되었습니다.'],
      approved: ['BANMAO 승인 완료', '이 단계에서는 NFT가 민팅되지 않았습니다. 승인 정보가 갱신되면 민팅 버튼으로 계속하세요.'],
      reset: ['사용 승인 초기화 완료', 'NFT가 민팅되지 않았습니다. 위 거래 버튼으로 BANMAO 승인을 계속하세요.'],
      unresolved: ['거래 확인 완료', '민팅 결과를 확인하지 못했습니다. 다시 민팅하기 전에 탐색기에서 거래를 확인하세요.'],
      cancelled: ['확인을 취소했습니다', '이 거래는 제출되지 않았습니다. 정보를 확인한 후 계속할 수 있습니다.'],
      reverted: ['거래 실패', '거래가 되돌려졌습니다. 이 거래에서 NFT는 민팅되지 않았으며 네트워크 수수료는 발생할 수 있습니다.'],
      error: ['거래를 완료할 수 없습니다', '아래 메시지와 결제 정보를 확인한 후 다시 시도하세요.'],
    },
    summary: (n, w) => `NFT ${n}개를 수령 지갑 ${w}개로 전송했습니다.`,
    recipients: '수령 지갑별 결과', view: 'NFT 보기', all: '모든 수령 지갑 보기', less: '접기', details: '거래 상세',
    artwork: 'NFT 이미지', loading: '온체인 이미지 로딩 중…', imageError: '이미지를 불러오지 못했습니다. 민팅 결과에는 영향이 없습니다.', noRemint: '다시 민팅하거나 추가 수수료를 지불할 필요가 없습니다.',
  },
  ru: {
    states: {
      checking: ['Проверка транзакции', 'Проверяем баланс, разрешение на списание и комиссию сети.'],
      signing: ['Подтвердите в кошельке', 'Проверьте данные транзакции перед подписью.'],
      pending: ['Ожидание подтверждения сети', 'Транзакция отправлена. Не отправляйте её повторно до подтверждения.'],
      uncertain: ['Результат пока неизвестен', 'Транзакция может ещё обрабатываться. Проверка продолжается; изучите транзакцию перед повторной отправкой.'],
      success: ['Минт выполнен', 'NFT записаны в блокчейн и переданы получателям ниже.'],
      approved: ['BANMAO разрешён к списанию', 'На этом этапе NFT не созданы. После обновления лимита продолжите кнопкой минтинга.'],
      reset: ['Разрешение на списание сброшено', 'NFT не созданы. Продолжите выдачу разрешения BANMAO кнопкой выше.'],
      unresolved: ['Транзакция подтверждена', 'Не удалось определить результат минтинга. Перед повтором проверьте транзакцию в обозревателе.'],
      cancelled: ['Подтверждение отменено', 'Эта транзакция не отправлена. Проверьте данные и продолжите, когда будете готовы.'],
      reverted: ['Транзакция не выполнена', 'Транзакция отменена контрактом. NFT в ней не созданы; комиссия сети могла быть списана.'],
      error: ['Не удалось завершить транзакцию', 'Проверьте сообщение ниже и данные платежа перед повтором.'],
    },
    summary: (n, w) => `Передано NFT: ${n}. Кошельков-получателей: ${w}.`,
    recipients: 'Результаты по получателям', view: 'Открыть NFT', all: 'Все получатели', less: 'Свернуть', details: 'Сведения о транзакции',
    artwork: 'Изображение NFT', loading: 'Загрузка изображения из блокчейна…', imageError: 'Изображение недоступно. Это не влияет на результат минтинга.', noRemint: 'Повторный минт и дополнительная оплата не нужны.',
  },
  id: {
    states: {
      checking: ['Memeriksa transaksi', 'Memeriksa saldo, izin belanja, dan biaya jaringan.'],
      signing: ['Konfirmasi di dompet', 'Periksa detail transaksi di dompet sebelum menandatangani.'],
      pending: ['Menunggu konfirmasi blockchain', 'Transaksi telah dikirim. Jangan kirim ulang selama menunggu konfirmasi.'],
      uncertain: ['Hasil transaksi belum diketahui', 'Transaksi mungkin masih diproses. Pemeriksaan berlanjut otomatis; periksa transaksi sebelum mengirim ulang.'],
      success: ['Mint berhasil', 'NFT telah dicatat di blockchain dan dikirim ke penerima di bawah.'],
      approved: ['BANMAO telah diizinkan', 'Belum ada NFT yang dicetak pada tahap ini. Lanjutkan dengan tombol mint setelah data izin diperbarui.'],
      reset: ['Izin belanja direset', 'Belum ada NFT yang dicetak. Lanjutkan pemberian izin BANMAO melalui tombol transaksi di atas.'],
      unresolved: ['Transaksi dikonfirmasi', 'Hasil mint belum dapat diidentifikasi. Periksa transaksi di Explorer sebelum mint lagi.'],
      cancelled: ['Konfirmasi dibatalkan', 'Transaksi ini belum dikirim. Periksa detail dan lanjutkan saat siap.'],
      reverted: ['Transaksi tidak berhasil', 'Transaksi dibatalkan oleh kontrak. Tidak ada NFT yang dicetak dalam transaksi ini; biaya jaringan mungkin tetap dikenakan.'],
      error: ['Transaksi belum dapat diselesaikan', 'Periksa pesan di bawah dan detail pembayaran sebelum mencoba lagi.'],
    },
    summary: (n, w) => `${n} NFT dikirim ke ${w} dompet penerima.`,
    recipients: 'Hasil per penerima', view: 'Lihat NFT', all: 'Lihat semua penerima', less: 'Ringkas', details: 'Detail transaksi',
    artwork: 'Gambar NFT', loading: 'Memuat gambar dari data on-chain…', imageError: 'Gambar belum tersedia. Ini tidak memengaruhi hasil mint.', noRemint: 'Tidak perlu mint ulang atau membayar biaya tambahan.',
  },
  vi: {
    states: {
      checking: ['Đang kiểm tra giao dịch', 'Kiểm tra số dư, quyền chi tiêu và phí mạng.'],
      signing: ['Chờ xác nhận trong ví', 'Kiểm tra thông tin giao dịch trong ví trước khi ký.'],
      pending: ['Đang chờ blockchain xác nhận', 'Giao dịch đã được gửi. Không gửi lại khi đang chờ xác nhận.'],
      uncertain: ['Chưa xác định được kết quả', 'Giao dịch có thể vẫn đang xử lý. Hệ thống tiếp tục kiểm tra; hãy xem giao dịch trước khi gửi lại.'],
      success: ['Mint thành công', 'NFT đã được ghi nhận trên blockchain và chuyển đến các ví nhận bên dưới.'],
      approved: ['Đã cấp quyền BANMAO', 'Chưa có NFT nào được mint ở bước này. Tiếp tục bằng nút mint khi dữ liệu quyền chi tiêu được cập nhật.'],
      reset: ['Đã đặt lại quyền chi tiêu', 'Chưa có NFT nào được mint. Tiếp tục cấp quyền BANMAO bằng nút giao dịch phía trên.'],
      unresolved: ['Giao dịch đã xác nhận', 'Chưa xác định được kết quả mint. Kiểm tra giao dịch trên Explorer trước khi mint lại.'],
      cancelled: ['Bạn đã hủy xác nhận', 'Chưa gửi giao dịch này. Bạn có thể kiểm tra thông tin và tiếp tục khi sẵn sàng.'],
      reverted: ['Giao dịch không thành công', 'Giao dịch đã bị hoàn tác. Không có NFT nào được mint trong giao dịch này; phí mạng vẫn có thể phát sinh.'],
      error: ['Chưa thể hoàn tất giao dịch', 'Kiểm tra thông báo bên dưới và thông tin thanh toán trước khi thử lại.'],
    },
    summary: (n, w) => `Đã chuyển ${n} NFT đến ${w} ví nhận.`,
    recipients: 'Kết quả theo ví nhận', view: 'Xem NFT', all: 'Xem tất cả ví nhận', less: 'Thu gọn', details: 'Chi tiết giao dịch',
    artwork: 'Ảnh NFT', loading: 'Đang tải ảnh từ dữ liệu on-chain…', imageError: 'Chưa tải được ảnh. Việc này không ảnh hưởng đến kết quả mint.', noRemint: 'Không cần mint lại hoặc trả thêm phí.',
  },
  en: {
    states: {
      checking: ['Checking transaction', 'Checking balances, spending permission and network fees.'],
      signing: ['Confirm in your wallet', 'Review the transaction in your wallet before signing.'],
      pending: ['Awaiting blockchain confirmation', 'Transaction submitted. Do not resubmit while confirmation is pending.'],
      uncertain: ['Transaction outcome not yet known', 'The transaction may still be processing. Checks continue automatically; inspect the transaction before resubmitting.'],
      success: ['Mint successful', 'NFTs were recorded on-chain and transferred to the recipients below.'],
      approved: ['BANMAO authorized', 'No NFTs were minted at this step. Continue with the mint button once the allowance data updates.'],
      reset: ['Spending permission reset', 'No NFTs were minted. Continue authorizing BANMAO with the transaction button above.'],
      unresolved: ['Transaction confirmed', 'The mint outcome could not be identified. Check the transaction on Explorer before minting again.'],
      cancelled: ['Confirmation cancelled', 'This transaction was not submitted. Review the details and continue when ready.'],
      reverted: ['Transaction unsuccessful', 'The transaction reverted. No NFTs were minted in this transaction; network fees may still apply.'],
      error: ['Unable to complete transaction', 'Review the message below and your payment details before retrying.'],
    },
    summary: (n, w) => `${n} NFT${n === 1 ? '' : 's'} transferred to ${w} recipient wallet${w === 1 ? '' : 's'}.`,
    recipients: 'Results by recipient', view: 'View NFT', all: 'Show all recipients', less: 'Show less', details: 'Transaction details',
    artwork: 'NFT artwork', loading: 'Loading artwork from on-chain data…', imageError: 'Artwork unavailable. This does not affect the mint outcome.', noRemint: 'No need to mint again or pay another fee.',
  },
};
