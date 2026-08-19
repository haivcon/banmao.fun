import "./defi.css";

export default function DeFiLoading() {
  return (
    <div id="defi-loading-boundary" className="defi-loading-boundary">
      <div id="defi-loading-pending">
        <div className="defi-overview" aria-busy="true" aria-label="Loading BANMAO DeFi">
      <div className="defi-overview__container">
        <div className="defi-overview__hero">
          <div className="defi-overview__hero-copy">
            <span className="defi-skeleton" style={{ width: 140, height: 32 }} />
            <span className="defi-skeleton" style={{ width: "85%", height: 64, marginTop: 24 }} />
            <span className="defi-skeleton" style={{ width: "60%", height: 20, marginTop: 22 }} />
            <span className="defi-skeleton" style={{ width: 160, height: 46, marginTop: 30 }} />
          </div>
          <div className="defi-wallet-card">
            <span className="defi-skeleton" style={{ width: 130, height: 22 }} />
            <span className="defi-skeleton" style={{ width: "100%", height: 130, marginTop: 24 }} />
          </div>
        </div>
        <div className="defi-metrics">
          <span className="defi-skeleton" style={{ width: 170, height: 22 }} />
          <div className="defi-metrics__grid" style={{ marginTop: 20 }}>
            {[0, 1, 2, 3].map((item) => (
              <div className="defi-metric" key={item}>
                <span className="defi-skeleton" style={{ width: 100, height: 14 }} />
                <span className="defi-skeleton defi-skeleton--metric" />
              </div>
            ))}
          </div>
        </div>
        <div className="defi-section">
          <span className="defi-skeleton" style={{ width: 200, height: 32, marginBottom: 8 }} />
          <span className="defi-skeleton" style={{ width: 300, height: 18, marginBottom: 24 }} />
          <div className="defi-products-grid">
            {[0, 1].map((item) => (
              <div key={item} className="defi-product-card" style={{ padding: 24 }}>
                <span className="defi-skeleton" style={{ width: 140, height: 44, marginBottom: 24 }} />
                <span className="defi-skeleton" style={{ width: "100%", height: 40, marginBottom: 30 }} />
                <div style={{ display: "flex", gap: 28, marginTop: "auto", marginBottom: 24 }}>
                  <span className="defi-skeleton" style={{ width: 80, height: 30 }} />
                  <span className="defi-skeleton" style={{ width: 80, height: 30 }} />
                </div>
                <div style={{ borderTop: "1px solid rgba(148, 163, 184, 0.15)", paddingTop: 18, display: "flex", justifyContent: "space-between" }}>
                  <span className="defi-skeleton" style={{ width: 100, height: 42, borderRadius: 11 }} />
                  <span className="defi-skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </div>
      </div>
      <div id="defi-loading-timeout" className="defi-overview-state" role="alert" hidden>
        <div className="defi-overview-state__card">
          <div className="defi-overview-state__icon" aria-hidden="true">⌛</div>
          <h1>DeFi is taking longer than expected</h1>
          <p>
            Check your connection and try loading this page again. Your wallet
            and funds are not affected.
          </p>
          <div className="defi-overview__hero-actions">
            <button id="defi-loading-retry" type="button" className="defi-button defi-button--primary">
              Retry
            </button>
          </div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        (() => {
          const boundary = document.getElementById("defi-loading-boundary");
          const pending = document.getElementById("defi-loading-pending");
          const timeout = document.getElementById("defi-loading-timeout");
          const retry = document.getElementById("defi-loading-retry");
          if (!boundary || !pending || !timeout || !retry) return;
          const timer = window.setTimeout(() => {
            pending.hidden = true;
            timeout.hidden = false;
          }, 12000);
          const observer = new MutationObserver(() => {
            if (!boundary.isConnected) {
              window.clearTimeout(timer);
              observer.disconnect();
            }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
          retry.addEventListener("click", () => window.location.reload(), { once: true });
        })();
      ` }} />
    </div>
  );
}
