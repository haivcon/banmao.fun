import React, { useState, useEffect, useRef } from 'react';
import './HubNotifications.css';

interface Notification {
    id: number;
    type: 'like' | 'comment' | 'tip' | 'follow';
    actor_name: string | null;
    actor_avatar: string | null;
    actor_address: string;
    post_id: number | null;
    read_status: number;
    created_at: number;
    post_thumb: string | null;
    post_media: string | null;
}

export default function HubNotifications({
    viewerAddress,
    onPostClick,
    onProfileClick,
    t
}: {
    viewerAddress: string;
    onPostClick: (postId: number) => void;
    onProfileClick: (address: string) => void;
    t: any;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`/api/hub/notifications?address=${viewerAddress}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setNotifications(data.notifications);
                    setUnreadCount(data.unreadCount);
                }
            }
        } catch (error) {
            console.error('Failed to load notifications', error);
        }
    };

    // Auto-fetch on mount and periodically
    useEffect(() => {
        if (!viewerAddress) return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, [viewerAddress]);

    // Handle clicks outside dropdown to close it
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const handleToggle = async () => {
        const nextState = !isOpen;
        setIsOpen(nextState);

        // If opening and there are unread items, mark them as read in the background
        if (nextState && unreadCount > 0) {
            setUnreadCount(0); // Optimistic UI update

            // Mark visually read immediately
            setNotifications(prev => prev.map(n => ({ ...n, read_status: 1 })));

            try {
                await fetch('/api/hub/notifications', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ address: viewerAddress, markAll: true })
                });
            } catch (error) {
                console.error('Mark read failed', error);
            }
        }
    };

    const handleItemClick = (n: Notification) => {
        setIsOpen(false);
        if (n.type === 'follow') {
            onProfileClick(n.actor_address);
        } else if (n.post_id) {
            onPostClick(n.post_id);
        }
    };

    const formatTimeAgo = (ts: number) => {
        const secs = Math.floor((Date.now() - ts) / 1000);
        if (secs < 60) return "Just now";
        if (secs < 3600) return `${Math.floor(secs / 60)}m`;
        if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
        return `${Math.floor(secs / 86400)}d`;
    };

    const getActionText = (n: Notification) => {
        switch (n.type) {
            case 'like': return t.notifLike || "liked your post";
            case 'comment': return t.notifComment || "commented on your post";
            case 'tip': return t.notifTip || "sent you a tip";
            case 'follow': return t.notifFollow || "started following you";
            default: return "interacted with you";
        }
    };

    if (!viewerAddress) return null;

    return (
        <div className="hub-notif-container" ref={containerRef}>
            <button className="hub-notif-bell-btn col-pill-btn col-pill-pink" onClick={handleToggle}>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>
                {unreadCount > 0 && <span className="hub-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="hub-notif-dropdown animate-view-switch">
                    <div className="hub-notif-header">
                        <h3>{t.notifications || 'Notifications'}</h3>
                    </div>
                    <div className="hub-notif-list">
                        {loading && notifications.length === 0 ? (
                            <div className="hub-notif-empty">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="hub-notif-empty">No notifications yet</div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    className={`hub-notif-item ${n.read_status === 0 ? 'unread' : ''}`}
                                    onClick={() => handleItemClick(n)}
                                >
                                    <div className="hub-notif-avatar">
                                        {n.actor_avatar ? <img src={n.actor_avatar} alt="avatar" /> : (n.actor_name || n.actor_address)[0].toUpperCase()}
                                    </div>
                                    <div className="hub-notif-content">
                                        <div className="hub-notif-text">
                                            <strong>{n.actor_name || n.actor_address.slice(0, 6) + '...'}</strong> {getActionText(n)}
                                        </div>
                                        <div className="hub-notif-time">{formatTimeAgo(n.created_at)}</div>
                                    </div>
                                    {n.post_thumb && n.type !== 'follow' && (
                                        <div className="hub-notif-post-thumb">
                                            <img src={n.post_thumb} alt="post" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
