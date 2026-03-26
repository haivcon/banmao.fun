'use client';
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

interface Short {
    id: number;
    media_url: string;
    thumb_url: string;
    caption: string;
    author_address: string;
    username: string;
    avatar_url: string;
    like_count: number;
    comment_count: number;
    liked: boolean;
}

interface BanmaoShortsProps {
    t: Record<string, string>;
    address?: string;
    onProfileClick?: (addr: string) => void;
}

const BanmaoShorts = memo(function BanmaoShorts({ t, address, onProfileClick }: BanmaoShortsProps) {
    const [shorts, setShorts] = useState<Short[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

    useEffect(() => {
        setLoading(true);
        fetch(`/api/hub/posts?limit=20&sort=trending${address ? `&viewer=${address}` : ''}`)
            .then(r => r.json())
            .then(data => {
                // Filter for video posts or use all posts
                const videoPosts = (data.posts || []).filter((p: any) => p.media_type === 'video');
                const allPosts = videoPosts.length > 0 ? videoPosts : (data.posts || []).slice(0, 10);
                setShorts(allPosts.map((p: any) => ({
                    id: p.id,
                    media_url: p.media_url,
                    thumb_url: p.thumb_url || p.media_url,
                    caption: p.caption || '',
                    author_address: p.author_address,
                    username: p.username || p.author_address?.slice(0, 6) + '...',
                    avatar_url: p.avatar_url || '',
                    like_count: p.like_count || 0,
                    comment_count: p.comment_count || 0,
                    liked: p.liked || false,
                })));
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [address]);

    // Scroll-snap to detect current short
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const scrollTop = containerRef.current.scrollTop;
        const height = containerRef.current.clientHeight;
        const idx = Math.round(scrollTop / height);
        setCurrentIdx(idx);
    }, []);

    // Play/pause videos based on visibility
    useEffect(() => {
        videoRefs.current.forEach((video, idx) => {
            if (idx === currentIdx) {
                video.play().catch(() => {});
            } else {
                video.pause();
            }
        });
    }, [currentIdx]);

    if (loading) {
        return (
            <div className="shorts-container">
                <div className="shorts-loading">⏳ {t.loading || 'Loading...'}</div>
            </div>
        );
    }

    if (shorts.length === 0) return null;

    return (
        <div className="shorts-container" ref={containerRef} onScroll={handleScroll}>
            {shorts.map((short, idx) => (
                <div key={short.id} className="shorts-slide">
                    {short.media_url.match(/\.(mp4|webm|mov)/) ? (
                        <video
                            ref={el => {
                                if (el) videoRefs.current.set(idx, el);
                                else videoRefs.current.delete(idx);
                            }}
                            src={short.media_url}
                            className="shorts-media"
                            loop
                            muted
                            playsInline
                            poster={short.thumb_url}
                        />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={short.media_url} alt="" className="shorts-media" />
                    )}

                    {/* Overlay info */}
                    <div className="shorts-overlay">
                        <div className="shorts-author" onClick={() => onProfileClick?.(short.author_address)}>
                            <div className="shorts-avatar">
                                {short.avatar_url
                                    ? <img src={short.avatar_url} alt="" />
                                    : (short.username || '?')[0].toUpperCase()
                                }
                            </div>
                            <span className="shorts-username">{short.username}</span>
                        </div>
                        {short.caption && (
                            <p className="shorts-caption">{short.caption}</p>
                        )}
                    </div>

                    {/* Side actions */}
                    <div className="shorts-actions">
                        <button className={`shorts-action-btn ${short.liked ? 'shorts-liked' : ''}`}>
                            <span>❤️</span>
                            <span className="shorts-action-count">{short.like_count}</span>
                        </button>
                        <button className="shorts-action-btn">
                            <span>💬</span>
                            <span className="shorts-action-count">{short.comment_count}</span>
                        </button>
                        <button className="shorts-action-btn">
                            <span>↗️</span>
                        </button>
                    </div>

                    {/* Slide indicator */}
                    <div className="shorts-indicator">
                        {idx + 1}/{shorts.length}
                    </div>
                </div>
            ))}
        </div>
    );
});

export default BanmaoShorts;
