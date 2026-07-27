"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { xLayerExplorerAddressUrl } from "../../lib/walletConfig";
import "./ServiceDetailModal.css";

export interface BulletItem {
  icon: string;
  title: string;
  desc: string;
}

interface ModalService {
  id: string;
  name: string;
  desc: string;
  contractAddress?: string;
  stats: { label: string; value: string }[];
  color: string;
  Icon: ComponentType<{ className?: string }>;
  status: "live" | "coming";
  href: string;
}

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ModalService | null;
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

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ServiceDetailModal({
  isOpen,
  onClose,
  service,
  bullets,
  introText,
  outroText,
  mascotSrc = "/branding/banmao_logo.png",
  enterAppLabel = "Enter app",
  comingSoonLabel = "Coming soon",
  liveLabel = "Live",
  contractAddressLabel = "Smart contract",
  viewExplorerLabel = "View on explorer",
}: ServiceDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      const firstFocusable =
        dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (firstFocusable ?? dialogRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  if (!isOpen || !service || typeof document === "undefined") return null;

  const handleCopy = async () => {
    if (!service.contractAddress) return;
    try {
      await navigator.clipboard.writeText(service.contractAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const hasBullets = Boolean(bullets?.length);
  const ServiceIcon = service.Icon;

  return createPortal(
    <div
      className="service-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`service-modal-content ${
          hasBullets ? "infographic-mode" : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={introText || service.desc ? descriptionId : undefined}
        tabIndex={-1}
      >
        <button
          type="button"
          className="service-modal-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <span aria-hidden="true">×</span>
        </button>

        <div
          className="service-modal-header"
          style={{ borderColor: service.color }}
        >
          <h2 id={titleId} className="service-modal-title">
            <span className="title-emoji" style={{ color: service.color }}>
              <ServiceIcon />
            </span>
            {service.name}
          </h2>
          {service.status === "coming" ? (
            <span className="coming-badge">{comingSoonLabel}</span>
          ) : (
            <span
              className="live-badge"
              style={{
                background: service.color,
                color: "#fff",
                borderColor: "transparent",
              }}
            >
              {liveLabel}
            </span>
          )}
        </div>

        {introText ? (
          <p id={descriptionId} className="infographic-intro">
            {introText}
          </p>
        ) : null}

        {hasBullets ? (
          <div className="infographic-mascot-bg" aria-hidden="true">
            <div
              className="mascot-glow"
              style={{ background: service.color }}
            />
            <Image
              src={mascotSrc}
              alt=""
              width={420}
              height={420}
              className="mascot-image-bg"
            />
          </div>
        ) : null}

        {hasBullets ? (
          <div className="infographic-body">
            <div className="infographic-panel infographic-bullets">
              <div className="panel-header">{service.name}</div>
              {bullets?.map((bullet, index) => (
                <div
                  className="bullet-card"
                  key={`${bullet.title}-${index}`}
                  style={
                    {
                      "--bullet-delay": `${index * 0.08}s`,
                    } as CSSProperties
                  }
                >
                  <span className="bullet-icon" aria-hidden="true">
                    {bullet.icon}
                  </span>
                  <div className="bullet-text">
                    <span className="bullet-title">{bullet.title}</span>
                    <span className="bullet-desc">{bullet.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="infographic-panel infographic-stats-col">
              {service.stats.map((stat, index) => (
                <div
                  className="infographic-stat-card"
                  key={`${stat.label}-${index}`}
                >
                  <span className="infographic-stat-label">{stat.label}</span>
                  <span
                    className="infographic-stat-value"
                    style={index === 0 ? { color: service.color } : undefined}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}

              {service.contractAddress ? (
                <div className="infographic-contract-mini">
                  <span className="contract-mini-label">
                    {contractAddressLabel}
                  </span>
                  <div className="contract-mini-row">
                    <code className="contract-mini-code">
                      {service.contractAddress}
                    </code>
                    <button
                      type="button"
                      className="copy-btn-mini"
                      onClick={handleCopy}
                      aria-label={
                        copied
                          ? "Contract address copied"
                          : "Copy contract address"
                      }
                      title={
                        copied
                          ? "Contract address copied"
                          : "Copy contract address"
                      }
                    >
                      <span aria-hidden="true">{copied ? "✓" : "⧉"}</span>
                    </button>
                  </div>
                  <span className="sr-only" aria-live="polite">
                    {copied ? "Contract address copied" : ""}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="service-modal-body">
            <p
              id={descriptionId}
              className="service-modal-desc"
              style={{ whiteSpace: "pre-line", textAlign: "left" }}
            >
              {service.desc}
            </p>
            <div className="service-modal-stats">
              {service.stats.map((stat, index) => (
                <div
                  className="service-stat-item"
                  key={`${stat.label}-${index}`}
                >
                  <span className="stat-label">{stat.label}</span>
                  <span
                    className="stat-value"
                    style={index === 0 ? { color: service.color } : undefined}
                  >
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {outroText ? <p className="infographic-outro">{outroText}</p> : null}

        {hasBullets && service.contractAddress ? (
          <a
            href={xLayerExplorerAddressUrl(service.contractAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="explorer-link-inline"
            style={{
              color: service.color,
              borderColor: `${service.color}44`,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" x2="21" y1="14" y2="3" />
            </svg>
            {viewExplorerLabel}
          </a>
        ) : null}

        <div className="service-modal-footer">
          {service.status === "live" ? (
            <Link
              href={service.href}
              className="modal-cta-btn"
              style={{
                background: `linear-gradient(135deg, ${service.color}, ${service.color}cc)`,
              }}
            >
              {enterAppLabel} →
            </Link>
          ) : (
            <button type="button" disabled className="modal-cta-btn disabled">
              {comingSoonLabel}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ServiceDetailModal;