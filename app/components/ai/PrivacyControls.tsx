"use client";

type Props = {
  optIn: boolean;
  onOptIn: (value: boolean) => void;
  mascotVisible: boolean;
  onMascotVisible: (value: boolean) => void;
  reducedMotion: boolean;
  onReducedMotion: (value: boolean) => void;
  onClear: () => void;
  onExport: () => void;
};

export default function PrivacyControls(props: Props) {
  return (
    <details className="banmao-ai-privacy">
      <summary>Privacy & appearance</summary>
      <fieldset>
        <legend>Tab-only preferences</legend>
        <label><input type="checkbox" checked={props.optIn} onChange={(event) => props.onOptIn(event.target.checked)} /> Keep bounded memory in this tab only</label>
        <label><input type="checkbox" checked={props.mascotVisible} onChange={(event) => props.onMascotVisible(event.target.checked)} /> Show mascot</label>
        <label><input type="checkbox" checked={props.reducedMotion} onChange={(event) => props.onReducedMotion(event.target.checked)} /> Reduce mascot motion</label>
        <div><button type="button" onClick={props.onExport}>Export</button><button type="button" onClick={props.onClear}>Clear</button></div>
      </fieldset>
    </details>
  );
}
