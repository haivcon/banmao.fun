"use client";

import Link from "next/link";
import { useEffect } from "react";
import "./defi.css";

export default function DeFiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DeFi route error:", error);
  }, [error]);

  return (
    <div className="defi-overview-state" role="alert">
      <div className="defi-overview-state__card">
        <div className="defi-overview-state__icon" aria-hidden="true">
          ⚠️
        </div>
        <h1>Unable to load DeFi</h1>
        <p>
          The route or its on-chain data could not be loaded. Your wallet and
          funds are not affected.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre
            style={{
              margin: "0 0 20px",
              padding: "12px",
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
              border: "1px solid rgba(251, 113, 133, 0.28)",
              borderRadius: "10px",
              background: "rgba(127, 29, 29, 0.14)",
              color: "#fecdd3",
              fontSize: "12px",
              lineHeight: 1.5,
              textAlign: "left",
            }}
          >
            {error.name}: {error.message}
            {error.digest ? `\nDigest: ${error.digest}` : ""}
          </pre>
        )}
        <div className="defi-overview__hero-actions">
          <button
            type="button"
            className="defi-button defi-button--primary"
            onClick={reset}
          >
            Try again
          </button>
          <Link href="/defi" className="defi-button defi-button--secondary">
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}