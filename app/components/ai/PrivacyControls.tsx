"use client";

import { Download, Settings2, Trash2 } from "lucide-react";

type Props = { optIn: boolean; onOptIn: (value: boolean) => void; mascotVisible: boolean; onMascotVisible: (value: boolean) => void; reducedMotion: boolean; onReducedMotion: (value: boolean) => void; onClear: () => void; onExport: () => void };

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: string }) {
  return <label className="banmao-ai-toggle"><span>{children}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}

export default function PrivacyControls(props: Props) {
  return <details className="banmao-ai-privacy">
    <summary><Settings2 size={15} aria-hidden="true" /> Privacy & appearance</summary>
    <div className="banmao-ai-privacy-body">
      <p>Conversation context is enabled by default, stays only in this browser tab, expires after 30 minutes, and sends at most 12 recent turns with the next AI request. You can disable or clear it anytime.</p>
      <Toggle checked={props.optIn} onChange={props.onOptIn}>Remember this conversation</Toggle>
      <Toggle checked={props.mascotVisible} onChange={props.onMascotVisible}>Show BANMAO mascot</Toggle>
      <Toggle checked={props.reducedMotion} onChange={props.onReducedMotion}>Reduce mascot motion</Toggle>
      <div className="banmao-ai-data-actions"><button type="button" onClick={props.onExport}><Download size={14} /> Export</button><button type="button" className="is-danger" onClick={props.onClear}><Trash2 size={14} /> Clear chat</button></div>
    </div>
  </details>;
}
