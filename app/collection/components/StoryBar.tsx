'use client';
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';

interface Story {
    id: number;
    author_address: string;
    media_url: string;
    thumb_url: string;
    media_type: string;
    caption: string;
    bg_color: string;
    created_at: number;
    expires_at: number;
    view_count: number;
    viewed: boolean;
}

interface StoryGroup {
    author_address: string;
    username: string;
    avatar_url: string;
    stories: Story[];
    has_unviewed: boolean;
}

interface StoryBarProps {
    t: Record<string, string>;
    address?: string;
    isConnected: boolean;
    onProfileClick?: (addr: string) => void;
}

/* ── Story Ring (horizontal scrollable bar) ── */
const StoryBar = memo(function StoryBar({ t, address, isConnected, onProfileClick }: StoryBarProps) {
    const [groups, setGroups] = useState<StoryGroup[]>([]);
    const [activeGroup, setActiveGroup] = useState<StoryGroup | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    const fetchStories = useCallback(async () => {
        try {
            const url = `/api/hub/stories${address ? `?viewer=${address}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            setGroups(data.groups || []);
        } catch { }
    }, [address]);

    useEffect(() => { fetchStories(); }, [fetchStories]);

    /* Auto-advance story every 5s */
    const startTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        setProgress(0);
        const start = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min(elapsed / 5000, 1);
            setProgress(pct * 100);
            if (pct >= 1) {
                clearInterval(timerRef.current!);
                setActiveIdx(prev => prev + 1);
            }
        }, 50);
    }, []);

    /* Open a story group */
    const openGroup = useCallback((group: StoryGroup) => {
        const firstUnviewed = group.stories.findIndex(s => !s.viewed);
        setActiveGroup(group);
        setActiveIdx(firstUnviewed >= 0 ? firstUnviewed : 0);
    }, []);

    /* Mark current story as viewed */
    useEffect(() => {
        if (!activeGroup || !address) return;
        const story = activeGroup.stories[activeIdx];
        if (!story) return;
        startTimer();
        // Mark viewed via immutable state update
        if (!story.viewed) {
            fetch('/api/hub/stories', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storyId: story.id, viewerAddress: address })
            }).catch(() => {});
            // Immutably update the viewed flag
            setGroups(prev => prev.map(g =>
                g.author_address === activeGroup.author_address
                    ? { ...g, stories: g.stories.map(s => s.id === story.id ? { ...s, viewed: true } : s) }
                    : g
            ));
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeGroup, activeIdx, address, startTimer]);

    /* Auto-advance or close when reaching end */
    useEffect(() => {
        if (!activeGroup) return;
        if (activeIdx >= activeGroup.stories.length) {
            // Move to next group
            const currentGroupIdx = groups.findIndex(g => g.author_address === activeGroup.author_address);
            if (currentGroupIdx < groups.length - 1) {
                openGroup(groups[currentGroupIdx + 1]);
            } else {
                setActiveGroup(null);
                fetchStories(); // Refresh viewed state
            }
        }
    }, [activeIdx, activeGroup, groups, openGroup, fetchStories]);

    const goNext = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveIdx(prev => prev + 1);
    };
    const goPrev = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveIdx(prev => Math.max(0, prev - 1));
        startTimer();
    };

    if (groups.length === 0) return null;

    const activeStory = activeGroup?.stories[activeIdx];

    return (
        <>
            {/* ── Story Rings Bar ── */}
            <div className="story-bar" ref={barRef}>
                {/* Add Story button */}
                {isConnected && (
                    <button className="story-ring story-ring-add" title={t.addStory || 'Add Story'}>
                        <div className="story-ring-avatar story-ring-add-icon">+</div>
                        <span className="story-ring-name">{t.yourStory || 'Your Story'}</span>
                    </button>
                )}
                {groups.map((group) => (
                    <button
                        key={group.author_address}
                        className={`story-ring ${group.has_unviewed ? 'story-ring-unviewed' : 'story-ring-viewed'}`}
                        onClick={() => openGroup(group)}
                    >
                        <div className="story-ring-avatar">
                            {group.avatar_url
                                ? <img src={group.avatar_url} alt="" className="story-ring-avatar-img" />
                                : (group.username || '?')[0].toUpperCase()
                            }
                        </div>
                        <span className="story-ring-name">{group.username}</span>
                    </button>
                ))}
            </div>

            {/* ── Fullscreen Story Viewer ── */}
            {activeGroup && activeStory && (
                <div className="story-overlay" onClick={() => { setActiveGroup(null); fetchStories(); }}>
                    <div className="story-viewer" onClick={(e) => e.stopPropagation()}>
                        {/* Progress bars */}
                        <div className="story-progress-bar">
                            {activeGroup.stories.map((_, idx) => (
                                <div key={idx} className="story-progress-segment">
                                    <div
                                        className="story-progress-fill"
                                        style={{
                                            width: idx < activeIdx ? '100%' : idx === activeIdx ? `${progress}%` : '0%'
                                        }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Header */}
                        <div className="story-header">
                            <div className="story-header-author" onClick={() => onProfileClick?.(activeGroup.author_address)}>
                                <div className="story-header-avatar">
                                    {activeGroup.avatar_url
                                        ? <img src={activeGroup.avatar_url} alt="" />
                                        : (activeGroup.username || '?')[0].toUpperCase()
                                    }
                                </div>
                                <span className="story-header-name">{activeGroup.username}</span>
                                <span className="story-header-time">
                                    {Math.floor((Date.now() - Number(activeStory.created_at)) / 3600000)}h
                                </span>
                            </div>
                            <button className="story-close" onClick={() => { setActiveGroup(null); fetchStories(); }}>✕</button>
                        </div>

                        {/* Media */}
                        <div className="story-media" style={{ background: activeStory.bg_color || '#000' }}>
                            {activeStory.media_type === 'video' ? (
                                <video src={activeStory.media_url} className="story-media-content" autoPlay muted playsInline />
                            ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={activeStory.media_url} alt="" className="story-media-content" />
                            )}
                            {activeStory.caption && (
                                <div className="story-caption">{activeStory.caption}</div>
                            )}
                        </div>

                        {/* Tap zones */}
                        <div className="story-tap story-tap-prev" onClick={goPrev} />
                        <div className="story-tap story-tap-next" onClick={goNext} />

                        {/* View count */}
                        <div className="story-views">👁 {activeStory.view_count || 0}</div>
                    </div>
                </div>
            )}
        </>
    );
});

export default StoryBar;
