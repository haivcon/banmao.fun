// app/defi/admin/page.tsx
// DeFi Staking Admin Dashboard - Dynamic import to avoid SSR issues

"use client";

import React, { useState, useEffect } from 'react';

function DynamicAdmin() {
    const [Component, setComponent] = useState<React.ComponentType | null>(null);

    useEffect(() => {
        import('./AdminDashboard').then((mod) => {
            setComponent(() => mod.default);
        });
    }, []);

    if (!Component) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1a2e 50%, #0f0f23 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui'
            }}>
                <div style={{ fontSize: '20px' }}>🔧 Loading DeFi Admin Dashboard...</div>
            </div>
        );
    }

    return <Component />;
}

export default function DefiAdminPage() {
    return <DynamicAdmin />;
}
