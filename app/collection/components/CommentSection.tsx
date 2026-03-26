"use client";
import React, { useState, useCallback, useEffect, useRef } from "react";

interface CommentSectionProps {
    t: Record<string, string>;
    postId: number;
    address?: string;
}

interface Comment {
    id: number;
    author_address: string;
    username?: string;
    avatar_url?: string;
    text: string;
    created_at: number;
    parent_id?: number | null;
    like_count?: number;
}

const EMOJIS = ["😀", "😂", "😍", "🥰", "😎", "🔥", "❤️", "👍", "👏", "🎉", "💯", "🙏", "😭", "🤣", "✨", "💪", "🐱", "🍌", "🚀", "💰"];

export default function CommentSection({ t, postId, address }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
    const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
    const [showEmoji, setShowEmoji] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const fetchComments = useCallback(async () => {
        const res = await fetch(`/api/hub/posts/${postId}`);
        const data = await res.json();
        if (data.comments) setComments(data.comments);
        // Fetch liked comments
        if (address) {
            try {
                const lr = await fetch("/api/hub/comments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "get_liked", postId, address }),
                });
                const ld = await lr.json();
                if (ld.likedIds) setLikedComments(new Set(ld.likedIds));
            } catch { /* ignore */ }
        }
    }, [postId, address]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    const handlePost = useCallback(async () => {
        if (!text.trim() || !address) return;
        setLoading(true);
        try {
            await fetch("/api/hub/comments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    postId, address, text: text.trim(),
                    parentId: replyTo?.id || null,
                }),
            });
            setText("");
            setReplyTo(null);
            await fetchComments();
        } catch (e) {
            console.error("Comment error:", e);
        } finally {
            setLoading(false);
        }
    }, [text, address, postId, replyTo, fetchComments]);

    const handleDelete = useCallback(async (commentId: number) => {
        await fetch(`/api/hub/comments?id=${commentId}&address=${address}`, { method: "DELETE" });
        await fetchComments();
    }, [address, fetchComments]);

    const handleLikeComment = useCallback(async (commentId: number) => {
        if (!address) return;
        // Optimistic
        setLikedComments(prev => {
            const next = new Set(prev);
            next.has(commentId) ? next.delete(commentId) : next.add(commentId);
            return next;
        });
        setComments(prev => prev.map(c =>
            c.id === commentId
                ? { ...c, like_count: (c.like_count || 0) + (likedComments.has(commentId) ? -1 : 1) }
                : c
        ));
        await fetch("/api/hub/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "like_comment", commentId, address }),
        });
    }, [address, likedComments]);

    const handleReply = useCallback((comment: Comment) => {
        setReplyTo({ id: comment.id, name: comment.username || shortAddr(comment.author_address) });
        inputRef.current?.focus();
    }, []);

    const shortAddr = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);
    const timeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        if (diff < 60000) return "just now";
        if (diff < 3600000) return Math.floor(diff / 60000) + "m";
        if (diff < 86400000) return Math.floor(diff / 3600000) + "h";
        return Math.floor(diff / 86400000) + "d";
    };

    // Separate top-level comments and replies
    const topLevel = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);

    const renderComment = (c: Comment, isReply = false) => (
        <div key={c.id} className={`hub-comment-item ${isReply ? "hub-comment-reply" : ""}`}>
            <div className="hub-comment-header">
                <span className="hub-comment-author">{c.username || shortAddr(c.author_address)}</span>
                <span className="hub-comment-time">{timeAgo(c.created_at)}</span>
            </div>
            <div className="hub-comment-text">{c.text}</div>
            <div className="hub-comment-actions">
                {address && (
                    <>
                        <button
                            className={`hub-comment-action-btn ${likedComments.has(c.id) ? "hub-comment-liked" : ""}`}
                            onClick={() => handleLikeComment(c.id)}
                        >
                            {likedComments.has(c.id) ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="hub-icon-sm"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
                            ) : (
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                            )}
                            <span style={{ marginLeft: '4px' }}>{c.like_count || 0}</span>
                        </button>
                        {!isReply && (
                            <button className="hub-comment-action-btn" onClick={() => handleReply(c)}>
                                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                                <span>{t.reply || 'Reply'}</span>
                            </button>
                        )}
                    </>
                )}
                {address && address.toLowerCase() === c.author_address.toLowerCase() && (
                    <button className="hub-comment-action-btn hub-comment-delete" onClick={() => handleDelete(c.id)}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                )}
            </div>
            {replyTo?.id === c.id && renderInputBox(true)}
        </div>
    );

    const renderInputBox = (isInline = false) => (
        <div className={`hub-comment-input-wrap ${isInline ? 'hub-comment-input-inline' : ''}`}>
            {isInline && (
                <div className="hub-reply-indicator">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                        {t.replyingTo || 'Replying to'} <strong>{replyTo?.name}</strong>
                    </span>
                    <button onClick={() => setReplyTo(null)}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="hub-icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}
            <div className={`hub-comment-input-row ${isInline ? 'hub-comment-input-row-inline' : ''}`}>
                <button className="hub-emoji-toggle" onClick={() => setShowEmoji(!showEmoji)} title="Emoji">
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon" style={{ color: '#8b5cf6' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm3.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" /></svg>
                </button>
                <input
                    ref={isInline ? inputRef : undefined}
                    className="hub-comment-input"
                    placeholder={isInline ? `Reply to ${replyTo?.name}...` : (t.commentPlaceholder || "Write a comment...")}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePost()}
                    maxLength={500}
                />
                <button className="hub-btn hub-btn-small" disabled={!text.trim() || loading} onClick={handlePost}>
                    {t.commentPost || "Post"}
                </button>
            </div>
            {showEmoji && (
                <div className="hub-emoji-picker">
                    {EMOJIS.map((e, i) => (
                        <button key={i} className="hub-emoji-btn" onClick={() => { setText(prev => prev + e); setShowEmoji(false); if (isInline) inputRef.current?.focus(); }}>{e}</button>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="hub-comments">
            <h4 className="hub-comments-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon" style={{ width: 18, height: 18 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
                {t.comments} ({comments.length})
            </h4>

            {address && !replyTo && renderInputBox(false)}

            {comments.length === 0 && <div className="hub-no-comments">{t.noComments || "No comments yet"}</div>}

            <div className="hub-comments-list">
                {topLevel.map((c) => (
                    <div key={c.id}>
                        {renderComment(c)}
                        {/* Replies to this comment */}
                        {replies.filter(r => r.parent_id === c.id).map(r => renderComment(r, true))}
                    </div>
                ))}
            </div>
        </div>
    );
}
