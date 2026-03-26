"use client";

import { useReadContract } from "wagmi";
import { RPS_ABI, ERC20_ABI } from "../lib/abis";
import { BANMAO, RPS, formatTokenAmount } from "../lib/gameUtils";
import { FaFire } from "react-icons/fa";

import { LocaleStrings } from "../lib/i18n";

export default function BurnTracker({ decimals = 18, strings }: { decimals?: number; strings: LocaleStrings }) {
  // 1. Get deadWallet address from RPS contract
  const { data: deadWallet } = useReadContract({
    address: RPS,
    abi: RPS_ABI,
    functionName: "deadWallet",
  });

  // 2. Get balance of deadWallet from BANMAO token contract
  const { data: burnedAmount } = useReadContract({
    address: BANMAO,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: deadWallet ? [deadWallet] : undefined,
    query: {
      enabled: !!deadWallet,
      refetchInterval: 30000, // Refresh every 30s
    },
  });

  if (!burnedAmount) return null;

  return (
    <div className="burn-tracker animate-pulse-slow">
      <div className="burn-icon-wrapper">
        <FaFire className="burn-icon" />
      </div>
      <div className="burn-content">
        <span className="burn-label">{strings.totalBurned ?? "TOTAL BURNED"}</span>
        <span className="burn-value">
          {formatTokenAmount(burnedAmount, decimals)} $BANMAO
        </span>
      </div>
      <style jsx>{`
        .burn-tracker {
          display: flex;
          align-items: center;
          gap: 22px;
          background: linear-gradient(135deg, rgba(80, 0, 0, 0.9), rgba(30, 0, 0, 0.95));
          border: 2px solid #ff4500;
          border-radius: 12px;
          padding: 8px 16px;
          margin: 22px 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 20px rgba(255, 69, 0, 0.4), inset 0 0 30px rgba(255, 0, 0, 0.2);
          animation: box-pulse 1.5s infinite alternate;
        }
        
        /* Sparkle effect overlay */
        .burn-tracker::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,140,0,0.15) 5%, transparent 60%);
          animation: bg-shift 4s infinite linear;
          pointer-events: none;
        }

        .burn-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          background: radial-gradient(circle, rgba(255, 69, 0, 0.3), rgba(0, 0, 0, 0.5));
          border-radius: 50%;
          border: 2px solid #ff8c00;
          box-shadow: 0 0 20px #ff4500, inset 0 0 10px #ff0000;
          z-index: 1;
          position: relative;
        }

        .burn-icon {
          color: #ffaa00;
          font-size: 32px;
          filter: drop-shadow(0 0 8px #ff0000);
          transform-origin: center bottom;
          animation: flame-flicker 0.4s infinite alternate; // Faster and more chaotic
        }

        .burn-content {
          display: flex;
          flex-direction: column;
        }

        .burn-label {
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #ff6347;
          text-transform: uppercase;
          text-shadow: 0 0 5px rgba(255, 69, 0, 0.5);
          margin-bottom: 2px;
        }

        .burn-value {
          font-size: 24px;
          font-weight: 800;
          color: #ffd700;
          font-family: var(--font-mono);
          text-shadow: 0 0 10px #ff4500, 0 0 20px #ff0000;
          animation: text-glow 1.5s infinite alternate;
        }

        /* Animations */
        @keyframes flame-flicker {
          0% { transform: scale(1) rotate(-3deg) translateY(0); opacity: 0.9; color: #ff4500; }
          25% { transform: scale(1.1) rotate(3deg) translateY(-1px); opacity: 1; color: #ff8c00; }
          50% { transform: scale(0.9) rotate(-2deg) translateY(1px); opacity: 0.85; color: #ff0000; }
          75% { transform: scale(1.15) rotate(2deg) translateY(-2px); opacity: 1; color: #ffd700; }
          100% { transform: scale(1) rotate(0deg) translateY(0); opacity: 0.95; color: #ff4500; }
        }

        @keyframes box-pulse {
          0% { box-shadow: 0 0 20px rgba(255, 69, 0, 0.3), inset 0 0 15px rgba(255, 0, 0, 0.1); border-color: #ff4500; }
          100% { box-shadow: 0 0 30px rgba(255, 140, 0, 0.6), inset 0 0 30px rgba(255, 69, 0, 0.3); border-color: #ffd700; }
        }

        @keyframes text-glow {
          0% { text-shadow: 0 0 10px #ff4500, 0 0 20px #ff0000; color: #ffd700; }
          100% { text-shadow: 0 0 20px #ff8c00, 0 0 30px #ff4500; color: #fff8dc; }
        }

        @keyframes bg-shift {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -15px) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>
    </div>
  );
}
