"use client";

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('App error:', error);
    }, [error]);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            padding: '20px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '60px' }}>😿</div>
            <h1 style={{ color: '#fff', fontSize: '24px', margin: 0 }}>
                Something went wrong!
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '400px' }}>
                An unexpected error occurred. Please try again.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                    onClick={reset}
                    style={{
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}
                >
                    🔄 Try Again
                </button>
                <a
                    href="/"
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        fontSize: '14px'
                    }}
                >
                    ← Back to Home
                </a>
            </div>
        </div>
    );
}
