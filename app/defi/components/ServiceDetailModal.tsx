"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import "./ServiceDetailModal.css"; // We will create this
import { StakingIcon, PoolIcon, FarmIcon, LendingIcon } from "./DeFiIcons"; // Import icons

interface ServiceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: {
        id: string;
        name: string;
        desc: string;
        contractAddress?: string;
        stats: { label: string; value: string }[];
        color: string;
        Icon: React.ComponentType<{ className?: string }>;
        status: "live" | "coming";
        href: string;
    } | null;
    enterAppLabel?: string;
    comingSoonLabel?: string;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ isOpen, onClose, service, enterAppLabel, comingSoonLabel }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !service) return null;

    const handleCopy = () => {
        if (service.contractAddress) {
            navigator.clipboard.writeText(service.contractAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const Icon = service.Icon;

    return createPortal(
        <div className="service-modal-overlay" onClick={onClose}>
            <div className="service-modal-content" onClick={e => e.stopPropagation()}>
                <button className="service-modal-close" onClick={onClose}>×</button>

                <div className="service-modal-header" style={{ borderColor: service.color }}>
                    <div className="service-modal-icon-wrapper" style={{ color: service.color }}>
                        <Icon className="w-12 h-12" />
                    </div>
                    <h2 className="service-modal-title">{service.name}</h2>
                    {service.status === "coming" && <span className="coming-badge">Coming Soon</span>}
                    {service.status === "live" && <span className="live-badge">Live</span>}
                </div>

                <div className="service-modal-body">
                    <p className="service-modal-desc" style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>{service.desc}</p>

                    <div className="service-modal-stats">
                        {service.stats.map((stat, i) => (
                            <div className="service-stat-item" key={i}>
                                <span className="stat-label">{stat.label}</span>
                                <span className="stat-value" style={i === 0 ? { color: service.color } : {}}>{stat.value}</span>
                            </div>
                        ))}
                    </div>

                    {service.contractAddress && (
                        <div className="contract-address-box">
                            <span className="contract-label">Contract Address</span>
                            <div className="contract-value-row">
                                <a
                                    href={`https://www.okx.com/web3/explorer/xlayer/address/${service.contractAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="contract-code-link"
                                >
                                    <code className="contract-code">{service.contractAddress}</code>
                                </a>
                                <button className="copy-btn" onClick={handleCopy}>
                                    {copied ? "Copied!" : "📋"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="service-modal-footer">
                    {service.status === 'live' ? (
                        <a href={service.href} className="modal-cta-btn" style={{ background: service.color }}>
                            {enterAppLabel || "Enter App"} →
                        </a>
                    ) : (
                        <button disabled className="modal-cta-btn disabled">{comingSoonLabel || "Coming Soon"}</button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
