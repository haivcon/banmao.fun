import "./defi.css";

export default function DeFiLoading() {
  return (
    <div className="defi-overview" aria-busy="true" aria-label="Loading BANMAO DeFi">
      <div className="defi-overview__container">
        <div className="defi-overview__hero">
          <div className="defi-overview__hero-copy">
            <span className="defi-skeleton" style={{ width: 140, height: 32 }} />
            <span
              className="defi-skeleton"
              style={{ width: "85%", height: 64, marginTop: 24 }}
            />
            <span
              className="defi-skeleton"
              style={{ width: "60%", height: 20, marginTop: 22 }}
            />
            <span
              className="defi-skeleton"
              style={{ width: 160, height: 46, marginTop: 30 }}
            />
          </div>

          <div className="defi-wallet-card">
            <span className="defi-skeleton" style={{ width: 130, height: 22 }} />
            <span
              className="defi-skeleton"
              style={{ width: "100%", height: 130, marginTop: 24 }}
            />
          </div>
        </div>

        <div className="defi-metrics">
          <span className="defi-skeleton" style={{ width: 170, height: 22 }} />
          <div className="defi-metrics__grid" style={{ marginTop: 20 }}>
            {[0, 1, 2, 3].map((item) => (
              <div className="defi-metric" key={item}>
                <span
                  className="defi-skeleton"
                  style={{ width: 100, height: 14 }}
                />
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
  );
}