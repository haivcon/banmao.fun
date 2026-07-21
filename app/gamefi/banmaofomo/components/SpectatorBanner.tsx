/**
 * SpectatorBanner - Prompt for non-connected users to connect
 */
"use client";

import React from "react";
import { motion } from "framer-motion";
import { ConnectButton } from "../../../components/wallet/WalletConnection";

interface SpectatorBannerProps {
    message?: string;
}

export default function SpectatorBanner({
    message = "👀 You're watching as a spectator"
}: SpectatorBannerProps) {
    return (
        <motion.div
            className="spectator-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="spectator-content">
                <span className="spectator-icon">👁️</span>
                <div className="spectator-text">
                    <span className="spectator-title">{message}</span>
                    <span className="spectator-subtitle">
                        Connect wallet to attack and win!
                    </span>
                </div>
            </div>
            <div className="spectator-action">
                <ConnectButton
                    label="🔗 Connect to Play"
                    showBalance={false}
                />
            </div>
        </motion.div>
    );
}
