"use client";

import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import type { Language } from "../../lib/landingI18n";
import { formatShareText, getShareIntroduction, getShareUrl, getSharingPath, sharingPages, type SharingPath } from "../../lib/sharing/content";
import { shareCopies } from "../../lib/sharing/labels";
import styles from "./ShareProject.module.css";

function ShareControl({ path, language = "en", inline = false }: { path: SharingPath; language?: Language; inline?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const id = useId();
  const url = getShareUrl(path);
  const copyLabels = shareCopies[language];
  const isHome = path === "/";
  const introduction = draft ?? (isHome ? copyLabels.homeIntroduction : getShareIntroduction(path));

  async function copy(withIntroduction: boolean) {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(withIntroduction ? formatShareText(introduction, url) : url);
      setStatus(withIntroduction ? copyLabels.copiedBoth : copyLabels.copiedLink);
    } catch {
      setStatus(copyLabels.copyError);
      textArea.current?.focus();
      textArea.current?.select();
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      const title = isHome ? copyLabels.homeIntroduction.split("\n")[0] : sharingPages[path].title;
      await navigator.share({ title, text: introduction.trim(), url });
      setStatus(copyLabels.shared);
    } catch (error) {
      setStatus(error instanceof Error && error.name === "AbortError" ? copyLabels.cancelled : copyLabels.shareError);
    } finally {
      setBusy(false);
    }
  }

  return <div className={inline ? `${styles.root} ${styles.inline}` : styles.root} lang={language}>
    <button ref={trigger} className={styles.trigger} type="button" aria-haspopup="dialog" onClick={() => {
      setStatus("");
      setCanShare(typeof navigator.share === "function");
      dialog.current?.showModal();
    }}><Share2 size={16} aria-hidden="true" />{copyLabels.trigger}</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} onClose={() => trigger.current?.focus()}>
      <div className={styles.heading}>
        <h2 id={`${id}-title`}>{isHome ? copyLabels.title : "Share this project"}</h2>
        <button type="button" className={styles.close} aria-label={copyLabels.close} onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
      </div>
      <p id={`${id}-help`}>{copyLabels.help}</p>
      <label htmlFor={`${id}-introduction`}>{copyLabels.introduction}</label>
      <textarea ref={textArea} id={`${id}-introduction`} value={introduction} onChange={event => { setDraft(event.target.value); setStatus(""); }} rows={6} maxLength={2000} />
      <label htmlFor={`${id}-url`}>{copyLabels.link}</label>
      <input id={`${id}-url`} value={url} readOnly onFocus={event => event.currentTarget.select()} />
      <button type="button" className={styles.primary} disabled={busy} onClick={() => void copy(true)}>{copyLabels.copyBoth}</button>
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={() => void copy(false)}>{copyLabels.copyLink}</button>
        {canShare && <button type="button" disabled={busy} onClick={() => void share()}>{copyLabels.shareVia}</button>}
      </div>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
      <small>{copyLabels.note}</small>
    </dialog>
  </div>;
}

export function HomeShare({ language, inline }: { language: Language; inline?: boolean }) {
  return <ShareControl path="/" language={language} inline={inline} />;
}

export default function ShareProject() {
  const pathname = usePathname();
  const path = getSharingPath(pathname);
  if (path === "/") return null;
  // Do not introduce sharing controls on admin, transaction, or private subpages.
  return path ? <ShareControl key={path} path={path} /> : null;
}
