"use client";

import React, { useState } from "react";
import type { LandingTranslations } from "../../web3d/locals";

// Sound effects
function playSound(soundKey: 'hover' | 'click' | 'success' | 'whoosh') {
    if (typeof window === "undefined") return;
    const isMuted = localStorage.getItem("banmao_sound_muted") === "true";
    if (isMuted) return;
    const volume = parseFloat(localStorage.getItem("banmao_sound_volume") || "0.5");
    const SOUNDS = {
        hover: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdX19b2BfZ3N6fm5ka2tqY2Bpd4GFfHd2c3Frbm92dnN0eXt6dXBxcXRybm1sbHF5fXlzbGdlaXB5fnd0cW9rbWxobXV5fHdwbWloaGhqdH2CgXpzbmloZmlsc3l+fXhxbWlnZ2dpbXJ3e3x4c25qZ2ZlZWhscXZ6e3ZwaWdkZWVmaW9ydnl5dXBsaWdmZmdobnN3enl1cG1qZ2ZmZmdpcHR4e3lzbmtpZ2ZmZ2hrcXd7fXlzbWpnZmVlZ2lscnl/fndwbGhnZmZmZ2txd3x+eXJtaWdmZWVmam91e398d3FsaWdmZWVnam90e399d3BramhnZ2dnam91e399d3FraGdmZmZnam51fH59dnBramhnZmZoam90fH99dnFqaWdnZmdoam51fH99dnBramhnZmZnam51fH99d3FqamhnZmdoam91fH99d3BramhnZmZnam51fH99dnFraGdmZmZnam51fH99d3BramhnZmZoam91fH99d3BramhnZmZnam51fH99dnBramhnZmZoam91fH99d3FraWdnZmdoam91fH99d3BqamhnZmdoam91fH99dnFraWdnZ2hpam91fH99d3FqamhnZ2doam91fH99d3BqamhnZmZoam91fH99d3BramhnZmZnam51fH99d3BramhnZmZoam91fH99d3FqamhnZmdobm91fH99d3Bqamhnmqkk',
        click: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgICAgICAgICAgH9/f4B/f39+f3+Af3+Af39/gH9/f4B/gH+Af4CAgIGBgIGBgYGBgYKBgYGBgYGBgYGBgIGAgYCAgICAgH9/f39/f39/f39/f39/f39/f39/gH9/gH+Af4B/gICAgICAgICAgYGBgYGBgoKCgoKCgoKCgoKCgoKCgYGBgYGBgIGAgICAgIB/gH+Af39/f35/fn9+fn5+fn5+fn5+f35/fn9+f39/f3+Af4B/gICAgICAgYGBgYKCgoKCg4ODg4ODg4ODg4ODg4KCgoKCgoGBgYCAgICAf39/f35+fn59fX19fX19fX19fX19fX5+fn5/f39/gICAgIGBgYKCgoODg4SDhISEhISEhISEhISEg4ODg4KCgoGBgYCAgH9/fn5+fX19fHx8fHx8fHx8fHx8fH19fX5+fn9/gICBgYGCgoODhISEhYWFhYWFhYWFhYWFhISEg4OCgoGBgIB/f35+fX18fHt7e3t7e3t7e3t7e3x8fH19fn5/gICBgYKCg4OEhIWFhoaG',
        success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgH9/f39/f39/gH+Af4CAgICAgYGBgYGBgoKCgoKDg4ODg4ODg4ODg4ODg4OCgoKCgoGBgYGAgICAgH9/f39+fn5+fX5+fn5+fn5/f39/gICAgIGBgYKCgoODg4SEhISFhYWFhYWFhYWFhYSEhIODg4KCgYGAgH9/fn59fX18fHx7e3t7e3t7e3t7fHx8fX1+fn9/gICBgYKCg4OEhIWFhoaGhoaGhoaGhoaGhYWEhIODgoKBgH9/fn59fHx7e3p6enp6enp6enp6e3t8fH1+f3+AgYGCg4OEhYWGh4eHh4iIiIiHh4eHhoaFhYSEg4KBgH9+fX18e3p6eXl5eXl5eXl5eXl6ent8fX5/gIGCg4SFhoeHiIiJiYmJiYmJiYiIh4eGhYSEgoGA',
        whoosh: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgH5+fHx6enl5eXp7fX+BgoSFhoeHiIiIh4eFg4F+fHp4d3Z2d3l7foGEhomLjI2Oj46OjYyKiIWCf3x5dnRzc3R2eX2BhYmMj5GSkpKSkZCOi4eDf3t3dHJxcXJ0d3uAhIiMj5KUlZWVlJORjoqGgn14dXJwcHF0eH2ChouPkpWXl5eXlpSRjoqFgXx4dXFvcHJ2e4CGio6RlZeYmJiXlpORjYmFgHt3dHFwcXR4fYKHi46SlZeYmJeWk5GNiYV/e3d0cXBxdHl+g4iMj5OWl5iYl5WTj4yHg353dHFwcXR5foOIjI+TlpeYmJeWk5CL',
    };
    try {
        const audio = new Audio(SOUNDS[soundKey]);
        audio.volume = volume;
        audio.play().catch(() => { });
    } catch { }
}

// Play Icon
const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);

// Game type
export type GameInfo = {
    id: string;
    nameKey: keyof LandingTranslations;
    descKey: keyof LandingTranslations;
    icon: string;
    thumbnailIcon: string;
    href: string;
    status: "live" | "coming" | "maintenance";
    contractAddress?: string;
    detailsKey?: keyof LandingTranslations;
    badge?: "hot" | "new" | "popular" | "top1" | "top2" | "top3";
    videoPreview?: string;  // Video URL for preview on hover
    iconImage?: string;     // Image URL for icon
    visitCount?: number;    // 24h visit count
    rank?: number;          // Rank by visits (1=most visited)
    hidden?: boolean;       // Hide from GameFi page (still accessible via direct link)
};

interface GameCardProps {
    game: GameInfo;
    t: (key: keyof LandingTranslations) => string;
    index: number;
    onNavigate: () => void;
    onShowInfo: (game: GameInfo) => void;
}

export function GameCard({ game, t, index, onNavigate, onShowInfo }: GameCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isBtnHovered, setIsBtnHovered] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);

    // Auto-play video with sound on hover
    React.useEffect(() => {
        if (videoRef.current) {
            if (isHovered) {
                // Try to play with sound
                videoRef.current.muted = false;
                videoRef.current.volume = 0.5; // Set reasonable volume
                videoRef.current.play().catch((e) => {
                    // Fallback to muted if autoplay blocked
                    console.log("Autoplay with sound blocked, falling back to muted", e);
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(() => { });
                    }
                });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isHovered]);
    const cardRef = React.useRef<HTMLDivElement>(null);
    const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)' });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        setTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05,1.05,1.05)`
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setTiltStyle({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)' });

        // Ensure video stops and resets when mouse leaves
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.game-card__play-btn')) {
            return;
        }
        e.preventDefault();
        playSound('click');
        onShowInfo(game);
    };

    const handlePlayClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        playSound('success');
        onNavigate();
        setTimeout(() => {
            window.location.href = game.href;
        }, 600);
    };

    return (
        <div
            ref={cardRef}
            className={`game-card ${isHovered ? 'game-card--hovered' : ''}`}
            style={{
                animationDelay: `${index * 0.15}s`,
                ...tiltStyle,
                transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out'
            }}
            onMouseEnter={() => {
                setIsHovered(true);
                playSound('hover');
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCardClick}
        >
            <div className="game-card__glow" />

            <div className="game-card__thumbnail">
                {/* Video preview on hover */}
                {game.videoPreview && (
                    <video
                        ref={videoRef}
                        className={`game-card__video-preview ${isHovered ? 'game-card__video-preview--active' : ''}`}
                        src={game.videoPreview}
                        loop
                        playsInline
                    />
                )}
                <span className={`game-card__thumbnail-icon ${game.videoPreview && isHovered ? 'game-card__thumbnail-icon--hidden' : ''}`}>
                    {game.thumbnailIcon === 'snake-img'
                        ? <img src="/games/snake/snake-icon-192x192.png" alt="Snake" className="logo-float-card" style={{ width: 120, height: 120, borderRadius: 20 }} />
                        : game.thumbnailIcon === 'rps-img'
                            ? <img src="/games/rps/logo.jpg" alt="RPS" className="logo-float-card" style={{ width: 120, height: 120, borderRadius: 20 }} />
                            : game.thumbnailIcon === 'fomo-img'
                                ? <img src="/games/fomo/fomo-icon.jpg" alt="FOMO" className="logo-float-card" style={{ width: 120, height: 120, borderRadius: 20, objectFit: 'cover' }} />
                                : game.iconImage
                                    ? <img src={game.iconImage} alt="" className="logo-float-card" style={{ width: 120, height: 120, borderRadius: 20, objectFit: 'cover' }} />
                                    : game.thumbnailIcon
                    }
                </span>

                {isHovered && (
                    <div className="game-card__particles">
                        {[...Array(8)].map((_, i) => (
                            <span key={i} className="game-card__particle" style={{
                                '--delay': `${i * 0.1}s`,
                                '--x': `${Math.random() * 100}%`,
                            } as React.CSSProperties} />
                        ))}
                    </div>
                )}

                {game.badge && (
                    <span className={`game-card__rating-badge game-card__rating-badge--${game.badge}`}>
                        {game.badge === 'hot' && '🔥 HOT'}
                        {game.badge === 'new' && '⭐ NEW'}
                        {game.badge === 'popular' && '🏆 TOP'}
                        {game.badge === 'top1' && '🥇 #1'}
                        {game.badge === 'top2' && '🥈 #2'}
                        {game.badge === 'top3' && '🥉 #3'}
                    </span>
                )}

                {game.visitCount !== undefined && game.visitCount > 0 && (
                    <span className="game-card__visit-count">
                        👁️ {game.visitCount} visits
                    </span>
                )}

                <span className={`game-card__badge game-card__badge--${game.status}`}>
                    {game.status === "live"
                        ? `🟢 ${t('gamefiLive')}`
                        : game.status === "maintenance"
                            ? `🔴 ${t('gamefiMaintenance')}`
                            : `🔮 ${t('gamefiComingSoon')}`
                    }
                </span>
            </div>

            <div className="game-card__content">
                <h3 className="game-card__name">
                    <span className="game-card__name-icon">
                        {game.icon === 'snake-img'
                            ? <img src="/games/snake/snake-icon-96x96.png" alt="" style={{ width: 20, height: 20, verticalAlign: 'middle', marginRight: 6, display: 'inline-block', borderRadius: 6 }} />
                            : game.icon === 'rps-img'
                                ? <img src="/games/rps/logo.jpg" alt="" style={{ width: 20, height: 20, verticalAlign: 'middle', marginRight: 6, display: 'inline-block', borderRadius: 6 }} />
                                : game.icon === 'fomo-img'
                                    ? <img src="/games/fomo/fomo-icon.jpg" alt="" style={{ width: 20, height: 20, verticalAlign: 'middle', marginRight: 6, display: 'inline-block', borderRadius: 6, objectFit: 'cover' }} />
                                    : game.iconImage
                                        ? <img src={game.iconImage} alt="" style={{ width: 20, height: 20, verticalAlign: 'middle', marginRight: 6, display: 'inline-block', borderRadius: 6, objectFit: 'cover' }} />
                                        : game.icon
                        }
                    </span>
                    {t(game.nameKey)}
                </h3>
                <p className="game-card__description">{t(game.descKey)}</p>

                <button
                    className={`game-card__play-btn ${isBtnHovered ? 'game-card__play-btn--active' : ''}`}
                    data-banmao-ai-id={`gamefi.play.${game.id}`}
                    data-banmao-ai-label={`Play ${String(t(game.nameKey))}`}
                    data-banmao-ai-action="activate"
                    data-banmao-ai-risk="none"
                    onClick={handlePlayClick}
                    onMouseEnter={() => {
                        setIsBtnHovered(true);
                        playSound('hover');
                    }}
                    onMouseLeave={() => setIsBtnHovered(false)}
                >
                    <PlayIcon />
                    {t('gamefiPlayNow')}
                </button>
            </div>

            <div className="game-card__shine" />
        </div>
    );
}

export default GameCard;
