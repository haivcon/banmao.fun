import React, { useState, useEffect } from "react";
import "./ProfileHeader.css";

interface ProfileStats {
    totalPosts: number;
    totalLikes: number;
    totalTips: number;
}

interface HubProfile {
    address: string;
    username: string;
    avatar_url: string;
    banner_url: string;
    bio: string;
    stats: ProfileStats;
}

interface ProfileHeaderProps {
    profileAddress: string;
    viewerAddress?: string;
    onBack: () => void;
    activeTab: "posts" | "liked" | "saved";
    onTabChange: (tab: "posts" | "liked" | "saved") => void;
    onEditProfile: () => void;
    onMessageClick?: (address: string) => void;
    t: Record<string, string>;
    refreshTrigger?: number;
}

const shortAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

export default function ProfileHeader({
    profileAddress,
    viewerAddress,
    onBack,
    activeTab,
    onTabChange,
    onEditProfile,
    onMessageClick,
    t,
    refreshTrigger
}: ProfileHeaderProps) {
    const [profile, setProfile] = useState<HubProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Follow system states
    const [followers, setFollowers] = useState(0);
    const [following, setFollowing] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    const isOwner = viewerAddress?.toLowerCase() === profileAddress.toLowerCase();

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const [profileRes, followsRes] = await Promise.all([
                    fetch(`/api/hub/profiles?address=${profileAddress}`),
                    fetch(`/api/hub/follows?address=${profileAddress}${viewerAddress ? `&viewer=${viewerAddress}` : ''}`)
                ]);

                if (profileRes.ok) {
                    const data = await profileRes.json();
                    setProfile(data);
                }

                if (followsRes.ok) {
                    const fData = await followsRes.json();
                    if (fData.success) {
                        setFollowers(fData.followers || 0);
                        setFollowing(fData.following || 0);
                        setIsFollowing(fData.isFollowing || false);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch profile info", error);
            } finally {
                setLoading(false);
            }
        };

        if (profileAddress) {
            fetchProfile();
        }
    }, [profileAddress, refreshTrigger, viewerAddress]);

    const handleFollow = async () => {
        if (!viewerAddress || followLoading) return;
        try {
            setFollowLoading(true);
            const res = await fetch('/api/hub/follows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    follower_address: viewerAddress,
                    following_address: profileAddress
                })
            });
            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.isFollowing);
                setFollowers(prev => data.isFollowing ? prev + 1 : Math.max(0, prev - 1));
                if (typeof window !== 'undefined' && (window as any).toast) {
                    (window as any).toast.success(data.isFollowing ? "Followed!" : "Unfollowed!");
                }
            }
        } catch (error) {
            console.error("Follow error:", error);
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="hub-profile-header-skeleton">
                <div className="hub-ph-banner-skel"></div>
                <div className="hub-ph-info-skel">
                    <div className="hub-ph-avatar-skel"></div>
                    <div className="hub-ph-text-skel"></div>
                    <div className="hub-ph-text-skel short"></div>
                </div>
            </div>
        );
    }

    const defaultBanner = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop";
    const bannerUrl = profile?.banner_url || defaultBanner;
    const avatarContent = profile?.avatar_url
        ? <img src={profile.avatar_url} alt="avatar" />
        : (profile?.username || "?")[0].toUpperCase();

    return (
        <div className="hub-profile-container animate-view-switch">
            {/* Banner Area */}
            <div className="hub-profile-banner" style={{ backgroundImage: `url(${bannerUrl})` }}>
                <button className="hub-profile-back-btn" onClick={onBack}>
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="hub-icon"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                    {t.back || 'Back'}
                </button>
                {isOwner ? (
                    <button className="hub-profile-edit-cover-btn" onClick={onEditProfile}>
                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="hub-icon-sm"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>
                        {t.editProfile || 'Edit Profile'}
                    </button>
                ) : (
                    <></>
                )}
            </div>

            {/* Profile Info Area */}
            <div className="hub-profile-info-section">
                <div className="hub-profile-avatar-wrap">
                    <div className="hub-profile-avatar">
                        {avatarContent}
                    </div>
                </div>

                <div className="hub-profile-details">
                    <div className="hub-profile-name-row">
                        <h1 className="hub-profile-name">{profile?.username || shortAddr(profileAddress)}</h1>

                        {/* Moved Actions to Name Row */}
                        {!isOwner && viewerAddress && (
                            <div className="hub-profile-actions">
                                <button
                                    className="hub-action-btn hub-msg-btn"
                                    onClick={() => onMessageClick?.(profileAddress)}
                                    title={t.message || "Message"}
                                >
                                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                                    <span className="hub-action-text">{t.message || 'Message'}</span>
                                </button>
                                <button
                                    className={`hub-action-btn hub-btn-primary ${isFollowing ? 'hub-following-btn' : ''}`}
                                    onClick={handleFollow}
                                    disabled={followLoading}
                                >
                                    {isFollowing ? (t.following || 'Following') : (t.follow || 'Follow')}
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="hub-profile-address">{shortAddr(profileAddress)}</p>
                    {profile?.bio && <p className="hub-profile-bio">{profile.bio}</p>}
                </div>

                <div className="hub-profile-stats">
                    <div className="hub-stat-item">
                        <span className="hub-stat-value">{followers}</span>
                        <span className="hub-stat-label">{t.followers || 'Followers'}</span>
                    </div>
                    <div className="hub-stat-item">
                        <span className="hub-stat-value">{following}</span>
                        <span className="hub-stat-label">{t.followingCount || 'Following'}</span>
                    </div>
                    <div className="hub-stat-item">
                        <span className="hub-stat-value">{profile?.stats?.totalPosts || 0}</span>
                        <span className="hub-stat-label">{t.posts || 'Posts'}</span>
                    </div>
                    <div className="hub-stat-item">
                        <span className="hub-stat-value">{profile?.stats?.totalLikes || 0}</span>
                        <span className="hub-stat-label">{t.likes || 'Likes'}</span>
                    </div>
                    <div className="hub-stat-item">
                        <span className="hub-stat-value hub-stat-gradient">{(profile?.stats?.totalTips ? Number(profile.stats.totalTips) / 1e18 : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="hub-stat-label">{t.banmaoTips || '$BANMAO Tips'}</span>
                    </div>
                </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="hub-profile-tabs">
                <button
                    className={`hub-ptab ${activeTab === 'posts' ? 'active' : ''}`}
                    onClick={() => onTabChange('posts')}
                >
                    📝 {t.posts || 'Posts'}
                </button>
                <button
                    className={`hub-ptab ${activeTab === 'liked' ? 'active' : ''}`}
                    onClick={() => onTabChange('liked')}
                >
                    ❤️ {t.liked || 'Liked'}
                </button>
                {isOwner && (
                    <button
                        className={`hub-ptab ${activeTab === 'saved' ? 'active' : ''}`}
                        onClick={() => onTabChange('saved')}
                    >
                        🔖 {t.saved || 'Saved'}
                    </button>
                )}
            </div>
        </div>
    );
}
