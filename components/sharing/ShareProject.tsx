"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import { formatShareText, getShareIntroduction, getShareUrl, getSharingPath, sharingPages, type SharingPath } from "../../lib/sharing/content";
import styles from "./ShareProject.module.css";

function ShareControl({ path }: { path: SharingPath }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const textArea = useRef<HTMLTextAreaElement>(null);
  const [introduction, setIntroduction] = useState(getShareIntroduction(path));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const url = getShareUrl(path);

  async function copy(withIntroduction: boolean) {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(withIntroduction ? formatShareText(introduction, url) : url);
      setStatus(withIntroduction ? "Introduction and link copied." : "Link copied.");
    } catch {
      setStatus("Copy is unavailable. Select and copy the text or link below manually.");
      textArea.current?.focus();
      textArea.current?.select();
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    setBusy(true);
    try {
      await navigator.share({ title: sharingPages[path].title, text: introduction.trim(), url });
      setStatus("Shared with your selected app.");
    } catch (error) {
      setStatus(error instanceof Error && error.name === "AbortError" ? "Sharing cancelled." : "Sharing is unavailable. Try copying the introduction and link instead.");
    } finally {
      setBusy(false);
    }
  }

  return <div className={styles.root} lang="en">
    <button ref={trigger} className={styles.trigger} type="button" aria-haspopup="dialog" onClick={() => {
      setStatus("");
      setCanShare(typeof navigator.share === "function");
      dialog.current?.showModal();
    }}><Share2 size={16} aria-hidden="true" /> Share</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="project-share-title" aria-describedby="project-share-help" onClose={() => trigger.current?.focus()}>
      <div className={styles.heading}>
        <h2 id="project-share-title">Share {path === "/" ? "BANMAO" : "this project"}</h2>
        <button type="button" className={styles.close} aria-label="Close sharing" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>
      </div>
      <p id="project-share-help">A short introduction to send to a friend. Make it your own before sharing.</p>
      <label htmlFor="project-share-introduction">Introduction</label>
      <textarea ref={textArea} id="project-share-introduction" value={introduction} onChange={event => { setIntroduction(event.target.value); setStatus(""); }} rows={6} maxLength={2000} />
      <label htmlFor="project-share-url">Project link</label>
      <input id="project-share-url" value={url} readOnly onFocus={event => event.currentTarget.select()} />
      <button type="button" className={styles.primary} disabled={busy} onClick={() => void copy(true)}>Copy introduction + link</button>
      <div className={styles.actions}>
        <button type="button" disabled={busy} onClick={() => void copy(false)}>Copy link only</button>
        {canShare && <button type="button" disabled={busy} onClick={() => void share()}>Share via…</button>}
      </div>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
      <small>Shares the project page, not your wallet, filters, or NFT selection. Each app controls how its link preview appears.</small>
    </dialog>
  </div>;
}

export default function ShareProject() {
  const pathname = usePathname();
  const path = getSharingPath(pathname);
  // Do not introduce sharing controls on admin, transaction, or private subpages.
  return path ? <ShareControl key={path} path={path} /> : null;
}
