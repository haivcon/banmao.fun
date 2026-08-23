import { CheckCircle2, ShieldAlert, ShieldX } from "lucide-react";
import type { CollectionVerificationStatus } from "./types";
import type { ExplorerCopy } from "./copy";

export function VerificationBadge({ status, copy }: { status: CollectionVerificationStatus; copy: ExplorerCopy }) {
  const label = status === "verified" ? copy.verifiedStatus : status === "warning" ? copy.warningStatus : copy.unverifiedStatus;
  return <span className={`bce-badge bce-badge--${status}`}>{status === "verified" ? <CheckCircle2 /> : status === "warning" ? <ShieldAlert /> : <ShieldX />}{label}</span>;
}
