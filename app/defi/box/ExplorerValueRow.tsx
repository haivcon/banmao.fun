"use client";

import { Copy, ExternalLink } from "lucide-react";
import type { Address, Hash } from "viem";

type ExplorerValueRowProps = {
  label: string;
  value: Address | Hash;
  explorerBaseUrl: string;
  kind: "address" | "tx";
  copyLabel: string;
  onCopied: (label: string) => void;
  onCopyFailed?: () => void;
  className?: string;
};

export function ExplorerValueRow({
  label,
  value,
  explorerBaseUrl,
  kind,
  copyLabel,
  onCopied,
  onCopyFailed,
  className = "",
}: ExplorerValueRowProps) {
  const href = `${explorerBaseUrl.replace(/\/+$/, "")}/${kind}/${value}`;
  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      onCopied(label);
    } catch {
      onCopyFailed?.();
    }
  };

  return (
    <div className={`box-explorer-value ${className}`.trim()}>
      <span className="box-explorer-value__label">{label}</span>
      <a
        className="box-explorer-value__link"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {value}
        <ExternalLink aria-hidden="true" />
      </a>
      <button type="button" aria-label={copyLabel} onClick={() => void copyValue()}>
        <Copy aria-hidden="true" />
      </button>
    </div>
  );
}
