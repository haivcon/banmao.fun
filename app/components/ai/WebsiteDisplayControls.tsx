"use client";

import { ChevronDown, MonitorCog, RotateCcw } from "lucide-react";
import { DISPLAY_SCALE_OPTIONS } from "../../../lib/responsive/displayStandard";
import { useSiteDisplaySettings } from "../responsive/useSiteDisplaySettings";

const COPY = {
  en: { title: "Website interface size", note: "Applies across Banmao · saved in this browser. Browser zoom remains available.", scale: "Interface scale", reset: "Reset website size" },
  vi: { title: "Kích thước giao diện website", note: "Áp dụng toàn Banmao · được lưu trên trình duyệt này. Bạn vẫn có thể dùng zoom của trình duyệt.", scale: "Tỷ lệ giao diện", reset: "Đặt lại kích thước website" },
} as const;

const percent = (scale: number) => `${scale * 100}%`;

export default function WebsiteDisplayControls({ language }: { language: string }) {
  const { scale, setScale, resetScale } = useSiteDisplaySettings();
  const copy = language.toLowerCase().startsWith("vi") ? COPY.vi : COPY.en;

  return <details className="banmao-ai-display-settings">
    <summary><span><MonitorCog size={16} aria-hidden="true" /> {copy.title}</span><ChevronDown className="banmao-ai-display-chevron" size={15} aria-hidden="true" /></summary>
    <div className="banmao-ai-display-body">
      <p>{copy.note}</p>
      <label className="banmao-ai-display-field"><span>{copy.scale}</span><select value={scale} onChange={event => setScale(Number(event.target.value))} data-banmao-ai-id="website.display.scale" data-banmao-ai-type="input" data-banmao-ai-label={`${copy.scale}; options: ${DISPLAY_SCALE_OPTIONS.map(percent).join(", ")}`} data-banmao-ai-state={percent(scale)} data-banmao-ai-action="fill" data-banmao-ai-risk="reversible">{DISPLAY_SCALE_OPTIONS.map(option => <option key={option} value={option}>{percent(option)}</option>)}</select></label>
      <button className="banmao-ai-display-reset" type="button" onClick={resetScale} data-banmao-ai-id="website.display.reset" data-banmao-ai-label={copy.reset} data-banmao-ai-action="activate" data-banmao-ai-risk="reversible"><RotateCcw size={14} /> {copy.reset}</button>
    </div>
  </details>;
}
