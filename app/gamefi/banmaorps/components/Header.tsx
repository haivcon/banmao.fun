"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "../../../components/wallet/WalletConnection";

interface HeaderProps {
  connectLabel: string;
  chainUnsupportedLabel: string;
}

export default function Header({ connectLabel, chainUnsupportedLabel }: HeaderProps) {
  const [imgError, setImgError] = useState(false);

  const leftBlock = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Link
        href="/gamefi"
        aria-label="BANMAO Home"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          textDecoration: "none", // ✅ bỏ underline
          color: "inherit",        // ✅ không đổi sang tím
          outline: "none",         // ✅ không viền tím khi focus
        }}
      >
        {!imgError ? (
          <Image
            src="/games/rps/logo.jpg"
            alt="BANMAO RPS logo"
            width={55}
            height={55}
            priority
            onError={() => setImgError(true)}
            sizes="(max-width: 640px) 36px, 44px"
            style={{
              borderRadius: 16,
              border: "3px solid var(--gold)",
              background: "#00000050",
              boxShadow: "0 0 10px rgba(var(--gold-rgb),0.45)",
              objectFit: "cover",
            }}
          />
        ) : (
          <img
            src="/games/rps/logo.jpg"
            alt="BANMAO RPS logo"
            width={55}
            height={55}
            style={{
              borderRadius: 16,
              border: "3px solid var(--gold)",
              background: "#00000050",
              objectFit: "cover",
            }}
          />
        )}

        <span
          style={{
            fontFamily: "var(--font-title)",
            fontSize: "1.9rem",
            lineHeight: 0,
            letterSpacing: "1px",
            color: "var(--gold)",
            textShadow: "0 0 8px rgba(var(--gold-rgb),0.6)",
            margin: 0,
            display: "inline-block",
          }}
        >
          $BANMAO
        </span>
      </Link>
    </div>
  );

  const rightBlock = (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      <ConnectButton.Custom>
        {({
          account,
          chain,
          mounted,
          openAccountModal,
          openChainModal,
          openConnectModal,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          if (!connected) {
            return (
              <button
                type="button"
                className="wallet-connect wallet-connect--frame"
                onClick={openConnectModal}
              >
                {connectLabel}
              </button>
            );
          }

          if (chain?.unsupported) {
            return (
              <button
                type="button"
                className="wallet-connect wallet-connect--warning"
                onClick={openChainModal}
              >
                {chainUnsupportedLabel}
              </button>
            );
          }

          return (
            <div className="wallet-connect__group" data-ready={ready}>
              <button
                type="button"
                className="wallet-connect wallet-connect--chip"
                onClick={openChainModal}
              >
                {chain?.iconUrl ? (
                  <span className="wallet-connect__icon" aria-hidden="true">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={chain.iconUrl} alt="" width={16} height={16} />
                  </span>
                ) : (
                  <span className="wallet-connect__dot" aria-hidden="true" />
                )}
                <span>{chain?.name ?? ""}</span>
              </button>
              <button
                type="button"
                className="wallet-connect wallet-connect--chip"
                onClick={openAccountModal}
              >
                {account?.displayName ?? ""}
              </button>
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 24px",
        borderBottom: "1px solid #222",
        background: "rgba(0,0,0,0.44)",
        backdropFilter: "blur(6px)",
      }}
    >
      {leftBlock}
      {rightBlock}

      <style jsx>{`
        header :global(a),
        header :global(a:hover),
        header :global(a:focus),
        header :global(a:active),
        header :global(a:visited) {
          text-decoration: none !important;
          color: inherit !important;
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        @media (max-width: 640px) {
          header :global(img), header :global(.next-image) { width: 36px; height: 36px; }
          header span { font-size: 1.4rem !important; text-shadow: none !important; }
        }
      `}</style>
    </header>
  );
}
