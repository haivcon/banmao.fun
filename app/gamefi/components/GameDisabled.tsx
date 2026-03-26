
"use client";

import React from 'react';
import Link from 'next/link';

interface GameDisabledProps {
    gameName?: string;
}

export default function GameDisabled({ gameName = "Game" }: GameDisabledProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
            color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif",
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{
                fontSize: '64px',
                marginBottom: '20px',
                animation: 'pulse 2s infinite'
            }}>
                🚧
            </div>
            <h1 style={{
                fontSize: '32px',
                fontWeight: 'bold',
                marginBottom: '10px',
                background: 'linear-gradient(90deg, #ff4d4d, #f9cb28)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
            }}>
                {gameName} Currently Unavailable
            </h1>
            <p style={{
                fontSize: '16px',
                color: '#94a3b8',
                maxWidth: '500px',
                marginBottom: '30px',
                lineHeight: '1.6'
            }}>
                This game is currently undergoing maintenance or has been temporarily disabled by the administrators.
                Please check back later or try one of our other games.
            </p>

            <Link href="/gamefi" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
            }}>
                <span>←</span> Back to GameFi Hub
            </Link>

            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
