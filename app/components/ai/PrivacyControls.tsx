"use client";

import { Download, Settings2, Trash2 } from "lucide-react";
import { aiText } from "../../../lib/ai/client/i18n";

type Props = { language: string; optIn: boolean; onOptIn: (value: boolean) => void; mascotVisible: boolean; onMascotVisible: (value: boolean) => void; reducedMotion: boolean; onReducedMotion: (value: boolean) => void; onClear: () => void; onExport: () => void };

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: string }) {
  return <label className="banmao-ai-toggle"><span>{children}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}

export default function PrivacyControls(props: Props) {
  const t = (key: Parameters<typeof aiText>[1]) => aiText(props.language, key);
  return <details className="banmao-ai-privacy">
    <summary><Settings2 size={15} aria-hidden="true" /> {t("privacy")}</summary>
    <div className="banmao-ai-privacy-body">
      <p>{t("privacyInfoStored")}</p>
      <Toggle checked={props.optIn} onChange={props.onOptIn}>{t("disablePersistence")}</Toggle>
      <Toggle checked={props.mascotVisible} onChange={props.onMascotVisible}>{t("mascot")}</Toggle>
      <Toggle checked={props.reducedMotion} onChange={props.onReducedMotion}>{t("motion")}</Toggle>
      <div className="banmao-ai-data-actions"><button type="button" onClick={props.onExport}><Download size={14} /> {t("export")}</button><button type="button" className="is-danger" onClick={props.onClear}><Trash2 size={14} /> {t("clear")}</button></div>
    </div>
  </details>;
}
