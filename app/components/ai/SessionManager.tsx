"use client";

import { Archive, Download, History, Menu, MessageSquarePlus, Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { aiText } from "../../../lib/ai/client/i18n";
import { filterSessions, getQuotaState, runConfirmedDelete, SESSION_TITLE_MAX_LENGTH, validateSessionTitle } from "../../../lib/ai/client/sessionUI";
import { useAIChatPersistence } from "./AIChatProvider";

export default function SessionManager({ language }: { language: string }) {
  const api = useAIChatPersistence();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const renameRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const t = (key: Parameters<typeof aiText>[1]) => aiText(language, key);
  const visible = useMemo(() => filterSessions(api.sessions, query, archived), [api.sessions, archived, query]);
  const quota = getQuotaState(api.estimatedTokens, api.quotaTokens);
  const mutationsDisabled = busy || api.actionsDisabled;
  const pendingSession = api.sessions.find((session) => session.id === pendingDelete);

  useEffect(() => { if (renamingId) renameRef.current?.focus(); }, [renamingId]);
  useEffect(() => { if (pendingDelete) confirmRef.current?.focus(); }, [pendingDelete]);

  function closeDrawer(restoreFocus = true) {
    setOpen(false);
    setPendingDelete(null);
    setRenamingId(null);
    if (restoreFocus) window.setTimeout(() => toggleRef.current?.focus(), 0);
  }

  async function perform(action: () => Promise<unknown>) {
    setBusy(true); setError("");
    try { await action(); return true; }
    catch { setError(t("sessionActionError")); return false; }
    finally { setBusy(false); }
  }
  async function create() { if (await perform(api.createSession)) closeDrawer(); }
  async function switchTo(id: string) { if (await perform(() => api.switchSession(id))) closeDrawer(); }
  async function rename(id: string) {
    const validation = validateSessionTitle(title);
    if (!validation.valid) { setError(t("sessionNameInvalid")); return; }
    if (await perform(() => api.renameSession(id, validation.title))) setRenamingId(null);
  }
  async function archive(id: string) { await perform(() => api.archiveSession(id)); }
  async function remove(id: string) {
    let removed = false;
    const succeeded = await perform(async () => { removed = await runConfirmedDelete(pendingDelete, id, api.deleteSession); });
    if (succeeded && removed) setPendingDelete(null);
  }
  async function exportSelected(id: string) {
    await perform(async () => {
      const data = await api.exportSession(id);
      if (!data) throw new Error("missing");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `banmao-ai-${data.session.id}.json`; link.click();
      URL.revokeObjectURL(url);
    });
  }

  const stateText = !api.persistenceReady ? t("sessionsLoading") : api.persistenceError ? t("fallbackMemory") : !api.persistenceEnabled ? t("persistenceDisabled") : "";
  return <>
    <button ref={toggleRef} className="banmao-ai-session-toggle" type="button" aria-expanded={open} aria-controls="banmao-ai-sessions" aria-label={open ? t("closeSessions") : t("openSessions")} onClick={() => open ? closeDrawer(false) : setOpen(true)}><Menu size={18} /></button>
    {open && <button className="banmao-ai-session-scrim" type="button" aria-label={t("closeSessions")} onClick={() => closeDrawer()} />}
    <aside id="banmao-ai-sessions" className={`banmao-ai-sessions${open ? " is-open" : ""}`} aria-label={t("sessions")} aria-hidden={!open} onKeyDown={(event) => { if (event.key === "Escape") closeDrawer(); }}>
      <header><div><History size={17} /><strong>{t("sessions")}</strong></div><button type="button" aria-label={t("closeSessions")} onClick={() => closeDrawer()}><X size={18} /></button></header>
      <button className="banmao-ai-new-session" type="button" disabled={!api.persistenceReady || mutationsDisabled} onClick={() => void create()}><MessageSquarePlus size={17} /> {t("newChat")}</button>
      <label className="banmao-ai-session-search"><Search size={15} /><span className="banmao-ai-sr-only">{t("searchSessions")}</span><input type="search" value={query} placeholder={t("searchSessions")} onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="banmao-ai-session-tabs" role="group" aria-label={t("sessionView")}><button type="button" aria-pressed={!archived} onClick={() => setArchived(false)}>{t("activeSessions")}</button><button type="button" aria-pressed={archived} onClick={() => setArchived(true)}>{t("archivedSessions")}</button></div>
      {stateText && <p className="banmao-ai-session-state" role="status">{stateText}</p>}
      {error && <p className="banmao-ai-session-error" role="alert">{error}</p>}
      <div className="banmao-ai-session-list">
        {api.persistenceReady && !api.sessions.length && <p className="banmao-ai-session-empty">{t("noSessions")}</p>}
        {api.persistenceReady && api.sessions.length > 0 && !visible.length && <p className="banmao-ai-session-empty">{query ? t("noSessionResults") : archived ? t("noArchivedSessions") : t("noActiveSessions")}</p>}
        {visible.map((session) => <article className={session.id === api.currentSessionId ? "is-current" : ""} key={session.id}>
          {renamingId === session.id ? <form onSubmit={(event) => { event.preventDefault(); void rename(session.id); }}><label className="banmao-ai-sr-only" htmlFor={`rename-${session.id}`}>{t("sessionName")}</label><input ref={renameRef} id={`rename-${session.id}`} maxLength={SESSION_TITLE_MAX_LENGTH} value={title} onChange={(event) => setTitle(event.target.value)} /><div><button type="submit" disabled={busy}>{t("save")}</button><button type="button" onClick={() => setRenamingId(null)}>{t("cancel")}</button></div></form> : <>
            <button className="banmao-ai-session-select" type="button" disabled={api.actionsDisabled} onClick={() => void switchTo(session.id)} aria-current={session.id === api.currentSessionId ? "true" : undefined}><strong>{session.title}</strong><small>{session.messageCount} {t("storedMessages")}</small></button>
            <div className="banmao-ai-session-actions">
              <button type="button" disabled={api.actionsDisabled} aria-label={`${t("renameSession")}: ${session.title}`} onClick={() => { setRenamingId(session.id); setTitle(session.title); }}><Pencil size={14} /></button>
              {!session.archivedAt && <button type="button" disabled={api.actionsDisabled} aria-label={`${t("archiveSession")}: ${session.title}`} onClick={() => void archive(session.id)}><Archive size={14} /></button>}
              <button type="button" aria-label={`${t("exportSession")}: ${session.title}`} onClick={() => void exportSelected(session.id)}><Download size={14} /></button>
              <button type="button" disabled={api.actionsDisabled} aria-label={`${t("deleteSession")}: ${session.title}`} onClick={() => setPendingDelete(session.id)}><Trash2 size={14} /></button>
            </div>
          </>}
        </article>)}
      </div>
      <section className={`banmao-ai-quota is-${quota.level}`} aria-label={t("storageQuota")}>
        <div><strong>{t("storageQuota")}</strong><span>{api.estimatedTokens.toLocaleString(language)} / {api.quotaTokens.toLocaleString(language)}</span></div>
        <progress value={api.estimatedTokens} max={api.quotaTokens}>{quota.percent}%</progress>
        <p>{quota.level === "full" ? t("storageQuotaFull") : quota.level === "near" ? t("storageQuotaNear") : t("storageQuotaHelp")}</p>
      </section>
      <p className="banmao-ai-local-only">{t("localOnly")}</p>
    </aside>
    {pendingDelete && pendingSession !== undefined && <div className="banmao-ai-confirm" role="alertdialog" aria-modal="true" aria-labelledby="banmao-ai-delete-title" aria-describedby="banmao-ai-delete-description">
      <div><h3 id="banmao-ai-delete-title">{t("deleteSessionTitle")}</h3><p id="banmao-ai-delete-description">{t("deleteSessionConfirm")}</p><div><button type="button" onClick={() => setPendingDelete(null)}>{t("cancel")}</button><button ref={confirmRef} className="is-danger" type="button" disabled={mutationsDisabled} onClick={() => void remove(pendingDelete)}>{t("delete")}</button></div></div>
    </div>}
  </>;
}
