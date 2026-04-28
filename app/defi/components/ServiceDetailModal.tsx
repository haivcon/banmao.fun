"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import "./ServiceDetailModal.css";

export interface BulletItem {
    icon: string;
    title: string;
    desc: string;
}

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
    bullets?: BulletItem[];
    introText?: string;
    outroText?: string;
    mascotSrc?: string;
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
    bullets,
    introText,
    outroText,
    mascotSrc = "/branding/banmao_logo.png",
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

    const hasBullets = bullets && bullets.length > 0;

    return createPortal(
        <div className="service-modal-overlay" onClick={onClose}>
            <div className={`service-modal-content ${hasBullets ? 'infographic-mode' : ''}`} onClick={e => e.stopPropagation()}>
                <button className="service-modal-close" onClick={onClose}>×</button>

                {/* Header — Title + Status Badge */}
                <div className="service-modal-header" style={{ borderColor: service.color }}>
                    <h2 className="service-modal-title">
                        <span className="title-emoji">🍌</span>
                        {service.name}
                    </h2>
                    {service.status === "coming" && <span className="coming-badge">{comingSoonLabel || "Coming Soon"}</span>}
                    {service.status === "live" && <span className="live-badge" style={{ background: service.color, color: '#fff', borderColor: 'transparent' }}>{liveLabel || "Live"}</span>}
                </div>

                {/* Intro Text */}
                {introText && (
                    <p className="infographic-intro">{introText}</p>
                )}

                {/* Infographic layout: mascot hero + panels below */}
                {/* Mascot — full background watermark behind content */}
                {hasBullets && (
                    <div className="infographic-mascot-bg">
                        <div className="mascot-glow" style={{ background: service.color }} />
                        <Image
                            src={mascotSrc}
                            alt="Banmao"
                            width={420}
                            height={420}
                            className="mascot-image-bg"
                            priority
                        />
                    </div>
                )}

                {/* Info panels — 2-col grid over background */}
                {hasBullets ? (
                    <div className="infographic-body">
                            {/* Left Panel: Feature Bullets */}
                            <div className="infographic-panel infographic-bullets">
                                <div className="panel-header">{service.name}</div>
                                {bullets.map((b, i) => (
                                    <div className="bullet-card" key={i} style={{ '--bullet-delay': `${i * 0.08}s` } as React.CSSProperties}>
                                        <span className="bullet-icon">{b.icon}</span>
                                        <div className="bullet-text">
                                            <span className="bullet-title">{b.title}</span>
                                            <span className="bullet-desc">{b.desc}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Right Panel: Stats + Contract */}
                            <div className="infographic-panel infographic-stats-col">
                                {service.stats.map((stat, i) => (
                                    <div className="infographic-stat-card" key={i}>
                                        <span className="infographic-stat-label">{stat.label}</span>
                                        <span className="infographic-stat-value" style={i === 0 ? { color: service.color } : {}}>{stat.value}</span>
                                    </div>
                                ))}
                                {service.contractAddress && (
                                    <div className="infographic-contract-mini">
                                        <span className="contract-mini-label">{contractAddressLabel || "Smart Contract"}</span>
                                        <div className="contract-mini-row">
                                            <code className="contract-mini-code">
                                                {service.contractAddress}
                                            </code>
                                            <button className="copy-btn-mini" onClick={handleCopy}>
                                                {copied ? "✓" : "📋"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                ) : (
                    /* Fallback: original simple layout for coming-soon services */
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
                    </div>
                )}

                {/* Outro Text */}
                {outroText && (
                    <p className="infographic-outro">{outroText}</p>
                )}

                {/* Explorer Link (infographic mode) */}
                {hasBullets && service.contractAddress && (
                    <a
                        href={`https://www.okx.com/web3/explorer/xlayer/address/${service.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="explorer-link-inline"
                        style={{ color: service.color, borderColor: `${service.color}44` }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                        {viewExplorerLabel || "View on Explorer"}
                    </a>
                )}

                {/* CTA Footer */}
                <div className="service-modal-footer">
                    {service.status === 'live' ? (
                        <a href={service.href} className="modal-cta-btn" style={{ background: `linear-gradient(135deg, ${service.color}, ${service.color}cc)` }}>
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
