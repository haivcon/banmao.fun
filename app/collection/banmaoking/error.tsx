'use client';

export default function KingError({ reset }: { reset: () => void }) {
  return <main style={{ minHeight: '100dvh', padding: '48px 24px', background: '#0b1018', color: '#f4f6fb' }}>
    <h1>Banmao King</h1>
    <p lang="vi">Không thể hiển thị trang. Nếu vừa gửi giao dịch, hãy kiểm tra ví hoặc Explorer trước khi mint lại.</p>
    <p lang="en">Unable to display this page. If you submitted a transaction, check your wallet or Explorer before minting again.</p>
    <button type="button" onClick={reset} style={{ minHeight: 44, padding: '12px 20px', cursor: 'pointer' }}>Thử lại / Try again</button>
    <p><a href="/collection" style={{ color: '#f5d79a' }}>Collection</a></p>
  </main>;
}
