'use client';

import React, { useState, useEffect } from 'react';

interface LogoHeaderProps {
    title?: string;
    subtitle?: string;
}

// Component for flickering letter
const FlickerLetter: React.FC<{ char: string; isHovered: boolean; delay: number }> = ({ char, isHovered, delay }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!isHovered) {
            setVisible(true);
            return;
        }

        const flickerInterval = setInterval(() => {
            if (Math.random() < 0.3) {
                setVisible(false);
                setTimeout(() => setVisible(true), 50 + Math.random() * 100);
            }
        }, 100 + delay);

        return () => clearInterval(flickerInterval);
    }, [isHovered, delay]);

    return (
        <span style={{
            opacity: visible ? 1 : 0.1,
            transition: 'opacity 0.05s',
            display: 'inline-block',
            textShadow: visible ? `
                0 0 5px #00BFFF,
                0 0 10px #00BFFF,
                0 0 20px #00BFFF,
                0 0 40px rgba(0, 191, 255, 0.5)
            ` : 'none'
        }}>
            {char === ' ' ? '\u00A0' : char}
        </span>
    );
};

export const LogoHeader: React.FC<LogoHeaderProps> = ({
    title = "BANMAO SLOTS STREET",
    subtitle = "CRYPTO GAMING ZONE",
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isLampOn, setIsLampOn] = useState(false);

    // Toggle lamp when hovering on icons
    const handleIconHover = (entering: boolean) => {
        if (entering) {
            setIsLampOn(true);
        } else {
            setIsLampOn(false);
        }
    };

    return (
        <div style={{
            textAlign: 'center',
            marginBottom: 5,
            position: 'relative',
            paddingTop: 10,
        }}>
            <style jsx>{`
                @keyframes borderGlow {
                    0%, 100% { 
                        box-shadow: 
                            0 0 15px rgba(0, 191, 255, 0.4),
                            0 0 30px rgba(0, 191, 255, 0.2),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1);
                    }
                    50% { 
                        box-shadow: 
                            0 0 25px rgba(0, 191, 255, 0.6),
                            0 0 50px rgba(0, 191, 255, 0.3),
                            inset 0 1px 0 rgba(255, 255, 255, 0.15);
                    }
                }

                @keyframes lampGlow {
                    0%, 100% { 
                        box-shadow: 
                            0 0 20px rgba(255, 230, 150, 0.6),
                            0 0 40px rgba(255, 220, 100, 0.4),
                            0 0 80px rgba(255, 200, 50, 0.3),
                            0 10px 60px rgba(255, 220, 100, 0.5),
                            inset 0 1px 0 rgba(255, 255, 255, 0.2);
                    }
                    50% { 
                        box-shadow: 
                            0 0 30px rgba(255, 230, 150, 0.8),
                            0 0 60px rgba(255, 220, 100, 0.6),
                            0 0 100px rgba(255, 200, 50, 0.4),
                            0 15px 80px rgba(255, 220, 100, 0.7),
                            inset 0 1px 0 rgba(255, 255, 255, 0.25);
                    }
                }

                @keyframes iconFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }

                @keyframes subtitleGlow {
                    0%, 100% { opacity: 0.7; letter-spacing: 8px; }
                    50% { opacity: 1; letter-spacing: 10px; }
                }

                @keyframes lightRayPulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }

                /* Cyber badge - Glassmorphism style with nice border */
                .cyber-badge {
                    position: relative;
                    display: inline-block;
                    padding: 16px 50px;
                    background: linear-gradient(
                        135deg,
                        rgba(0, 30, 60, 0.3) 0%,
                        rgba(0, 50, 80, 0.4) 50%,
                        rgba(0, 30, 60, 0.3) 100%
                    );
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 2px solid rgba(0, 191, 255, 0.5);
                    border-radius: 50px;
                    animation: borderGlow 3s ease-in-out infinite;
                    transition: all 0.4s ease;
                }

                /* Inner highlight */
                .cyber-badge::before {
                    content: '';
                    position: absolute;
                    top: 1px;
                    left: 20px;
                    right: 20px;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    border-radius: 50%;
                }

                /* Lamp mode - warm glow */
                .cyber-badge.lamp-mode {
                    background: linear-gradient(
                        180deg, 
                        rgba(80, 70, 40, 0.5) 0%, 
                        rgba(60, 55, 30, 0.6) 50%,
                        rgba(50, 45, 25, 0.5) 100%
                    );
                    border: 2px solid rgba(255, 215, 0, 0.7);
                    border-radius: 30px 30px 50px 50px;
                    animation: lampGlow 1.5s ease-in-out infinite;
                }

                .title-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 20px;
                }

                .title-text {
                    font-family: 'Orbitron', 'Space Mono', sans-serif;
                    font-size: clamp(20px, 4vw, 30px);
                    font-weight: 900;
                    letter-spacing: 4px;
                    color: #00BFFF;
                    text-transform: uppercase;
                    transition: all 0.4s ease;
                }

                .cyber-badge.lamp-mode .title-text {
                    color: #FFE082;
                    text-shadow: 
                        0 0 10px #FFD700,
                        0 0 20px #FFD700,
                        0 0 40px rgba(255, 215, 0, 0.5);
                }

                .emoji-icon {
                    font-size: 32px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    filter: drop-shadow(0 0 8px rgba(0, 191, 255, 0.5));
                    user-select: none;
                    animation: iconFloat 3s ease-in-out infinite;
                }

                .emoji-icon:hover {
                    transform: scale(1.3) rotate(10deg);
                    filter: drop-shadow(0 0 20px #FFD700) drop-shadow(0 0 40px #FFD700);
                }

                .cyber-badge.lamp-mode .emoji-icon {
                    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.7));
                }

                .subtitle-text {
                    margin-top: 10px;
                    font-family: 'Space Mono', monospace;
                    font-size: 11px;
                    letter-spacing: 8px;
                    color: #00BFFF;
                    text-transform: uppercase;
                    animation: subtitleGlow 2s ease-in-out infinite;
                    text-shadow: 0 0 10px rgba(0, 191, 255, 0.8);
                    transition: all 0.4s ease;
                }

                .subtitle-text.lamp-mode {
                    color: #FFE082;
                    text-shadow: 0 0 15px rgba(255, 224, 130, 0.8);
                }

                /* Main spotlight - soft radial glow */
                .spotlight {
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 600%;
                    height: 1000px;
                    background: radial-gradient(
                        ellipse 40% 80% at 50% 0%,
                        rgba(255, 240, 180, 0.3) 0%,
                        rgba(255, 230, 150, 0.15) 30%,
                        rgba(255, 220, 100, 0.08) 50%,
                        transparent 70%
                    );
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    z-index: 50;
                    filter: blur(15px);
                }

                .spotlight.active {
                    opacity: 1;
                    animation: lightRayPulse 2s ease-in-out infinite;
                }

                /* Multiple light rays */
                .light-rays {
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100%;
                    height: 350px;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    z-index: 51;
                }

                .light-rays.active {
                    opacity: 1;
                }

                .light-ray {
                    position: absolute;
                    top: 0;
                    left: 50%;
                    width: 2px;
                    height: 250px;
                    background: linear-gradient(180deg, rgba(255, 240, 200, 0.5) 0%, transparent 100%);
                    transform-origin: top center;
                    filter: blur(3px);
                    animation: lightRayPulse 2s ease-in-out infinite;
                }

                /* Lamp glow strip at bottom */
                .lamp-glow-strip {
                    position: absolute;
                    bottom: -3px;
                    left: 15%;
                    right: 15%;
                    height: 6px;
                    background: linear-gradient(90deg, 
                        transparent 0%, 
                        rgba(255, 220, 100, 0.9) 30%, 
                        rgba(255, 250, 200, 1) 50%, 
                        rgba(255, 220, 100, 0.9) 70%, 
                        transparent 100%
                    );
                    border-radius: 50%;
                    filter: blur(3px);
                    opacity: 0;
                    transition: opacity 0.4s ease;
                }

                .lamp-glow-strip.active {
                    opacity: 1;
                }

                @media (max-width: 768px) {
                    .cyber-badge {
                        padding: 10px 20px !important;
                    }
                    .title-container {
                        gap: 10px !important;
                    }
                    .emoji-icon {
                        font-size: 24px !important;
                    }
                    .title-text {
                        font-size: 18px !important;
                        letter-spacing: 2px !important;
                    }
                }
            `}</style>

            <div
                className={`cyber-badge ${isLampOn ? 'lamp-mode' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="title-container">
                    {/* Cat emoji - left */}
                    <span
                        className="emoji-icon"
                        onMouseEnter={() => handleIconHover(true)}
                        onMouseLeave={() => handleIconHover(false)}
                        title="Hover to toggle lamp"
                    >
                        🐱
                    </span>

                    <span className="title-text">
                        {title.split('').map((char, i) => (
                            <FlickerLetter
                                key={i}
                                char={char}
                                isHovered={isHovered}
                                delay={i * 20}
                            />
                        ))}
                    </span>

                    {/* Banana emoji - right */}
                    <span
                        className="emoji-icon"
                        onMouseEnter={() => handleIconHover(true)}
                        onMouseLeave={() => handleIconHover(false)}
                        title="Hover to toggle lamp"
                    >
                        🍌
                    </span>
                </div>

                {/* Lamp glow strip at bottom */}
                <div className={`lamp-glow-strip ${isLampOn ? 'active' : ''}`}></div>

                {/* Main spotlight */}
                <div className={`spotlight ${isLampOn ? 'active' : ''}`}></div>

                {/* Light rays */}
                <div className={`light-rays ${isLampOn ? 'active' : ''}`}>
                    {[-20, -12, -6, 0, 6, 12, 20].map((angle, i) => (
                        <div
                            key={i}
                            className="light-ray"
                            style={{
                                transform: `translateX(-50%) rotate(${angle}deg)`,
                                animationDelay: `${i * 0.15}s`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
