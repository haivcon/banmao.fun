'use client';

export default function KingError({ reset }: { reset: () => void }) {
  return <main lang="en" style={{ minHeight: '100dvh', padding: '48px 24px', background: '#0b1018', color: '#f4f6fb' }}>
    <p>Banmao King</p>
    <h1>We couldn’t load this page</h1>
    <p>An unexpected error occurred. Please try again.</p>
    <p>If you recently submitted a mint transaction, verify its status in your wallet or the block explorer before attempting another mint to avoid duplicate transactions.</p>
    <button type="button" onClick={reset} style={{ minHeight: 44, padding: '12px 20px', cursor: 'pointer' }}>Try again</button>
    <p><a href="/collection" style={{ color: '#f5d79a' }}>Back to collection</a></p>
  </main>;
}
