"use client";

import { ChevronDown, LayoutGrid, RotateCcw } from "lucide-react";
import { useCollectionDisplaySettings } from "../../collection/useCollectionDisplaySettings";
import type { CollectionDisplaySettings } from "../../collection/collectionDisplaySettings";

const COPY = {
  en: { title: "Manual display settings", note: "Collection only · saved in this browser. Banmao AI can propose these changes too.", width: "Content width", card: "Card size", density: "Spacing", info: "Show card information", reset: "Reset display", focused: "Focused", wide: "Wide", full: "Full width", large: "Large", medium: "Medium", small: "Small", comfortable: "Comfortable", compact: "Compact" },
  vi: { title: "Cài đặt hiển thị thủ công", note: "Chỉ dành cho Collection · được lưu trên trình duyệt này. Banmao AI cũng có thể đề xuất thay đổi.", width: "Độ rộng nội dung", card: "Kích thước card", density: "Khoảng cách", info: "Hiện thông tin card", reset: "Đặt lại hiển thị", focused: "Tập trung", wide: "Rộng", full: "Toàn chiều rộng", large: "Lớn", medium: "Vừa", small: "Nhỏ", comfortable: "Thoáng", compact: "Gọn" },
} as const;

export default function CollectionDisplayControls({ language }: { language: string }) {
  const { settings, updateSetting, resetSettings } = useCollectionDisplaySettings();
  const copy = language.toLowerCase().startsWith("vi") ? COPY.vi : COPY.en;
  const select = <K extends "contentWidth" | "cardSize" | "density">(key: K, label: string, options: readonly CollectionDisplaySettings[K][]) => (
    <label className="banmao-ai-display-field"><span>{label}</span><select value={settings[key]} onChange={event => updateSetting(key, event.target.value as CollectionDisplaySettings[K])} data-banmao-ai-id={`collection.display.${key}`} data-banmao-ai-type="input" data-banmao-ai-label={`${label}; options: ${options.join(", ")}`} data-banmao-ai-state={settings[key]} data-banmao-ai-action="fill" data-banmao-ai-risk="reversible">{options.map(option => <option key={option} value={option}>{copy[option]}</option>)}</select></label>
  );
  return <details className="banmao-ai-display-settings" open>
    <summary><span><LayoutGrid size={16} aria-hidden="true" /> {copy.title}</span><ChevronDown className="banmao-ai-display-chevron" size={15} aria-hidden="true" /></summary>
    <div className="banmao-ai-display-body">
      <p>{copy.note}</p>
      {select("contentWidth", copy.width, ["focused", "wide", "full"])}
      {select("cardSize", copy.card, ["large", "medium", "small"])}
      {select("density", copy.density, ["comfortable", "compact"])}
      <label className="banmao-ai-toggle"><span>{copy.info}</span><input type="checkbox" checked={settings.showCardInfo} onChange={event => updateSetting("showCardInfo", event.target.checked)} data-banmao-ai-id="collection.display.showCardInfo" data-banmao-ai-type="input" data-banmao-ai-label={`${copy.info}; options: true, false`} data-banmao-ai-state={String(settings.showCardInfo)} data-banmao-ai-action="fill" data-banmao-ai-risk="reversible" /><i aria-hidden="true" /></label>
      <button className="banmao-ai-display-reset" type="button" onClick={resetSettings} data-banmao-ai-id="collection.display.reset" data-banmao-ai-label={copy.reset} data-banmao-ai-action="activate" data-banmao-ai-risk="reversible"><RotateCcw size={14} /> {copy.reset}</button>
    </div>
  </details>;
}
