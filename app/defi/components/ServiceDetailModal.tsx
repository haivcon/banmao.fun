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
    liveLabel?: string;
    contractAddressLabel?: string;
    viewExplorerLabel?: string;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({ 
    isOpen, 
    onClose, 
    service, 
    enterAppLabel, 
    comingSoonLabel,
    liveLabel,
    contractAddressLabel,
    viewExplorerLabel
}) => {
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
                    {service.status === "coming" && <span className="coming-badge">{comingSoonLabel || "Coming Soon"}</span>}
                    {service.status === "live" && <span className="live-badge" style={{ background: service.color, color: '#fff', borderColor: 'transparent' }}>{liveLabel || "Live"}</span>}
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
                        <div className="contract-address-box" style={{ borderColor: 'rgba(255, 255, 255, 0.08)', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <span className="contract-label" style={{ margin: 0 }}>{contractAddressLabel || "Contract Address"}</span>
                            </div>
                            <div className="contract-value-row" style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.6rem 0.8rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <code className="contract-code" style={{ color: 'rgba(255,255,255,0.7)' }}>{service.contractAddress}</code>
                                <button className="copy-btn" onClick={handleCopy} title="Copy">
                                    {copied ? "✓" : "📋"}
                                </button>
                            </div>
                            <a
                                href={`https://www.okx.com/web3/explorer/xlayer/address/${service.contractAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="explorer-link-button"
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    gap: '0.5rem',
                                    border: `1px solid ${service.color}`,
                                    color: service.color,
                                    padding: '0.75rem',
                                    borderRadius: '9999px',
                                    textDecoration: 'none',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = service.color;
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = service.color;
                                }}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                                {viewExplorerLabel || "View on OKX Explorer"}
                            </a>
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
