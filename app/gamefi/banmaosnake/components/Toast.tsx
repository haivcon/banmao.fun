// ===== TOAST NOTIFICATION COMPONENT =====
// Displays success/error toast notifications

import React from 'react';

export type ToastType = 'success' | 'error';

export interface ToastData {
    msg: string;
    type: ToastType;
}

interface ToastProps {
    toast: ToastData | null;
}

export function Toast({ toast }: ToastProps) {
    if (!toast) return null;

    const isSuccess = toast.type === 'success';

    return (
        <div
            style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 24px',
                borderRadius: 16,
                background: isSuccess
                    ? 'linear-gradient(135deg, rgba(74,222,128,0.95), rgba(34,197,94,0.9))'
                    : 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.9))',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                zIndex: 3000,
                boxShadow: isSuccess
                    ? '0 8px 30px rgba(74,222,128,0.4), 0 0 20px rgba(74,222,128,0.3)'
                    : '0 8px 30px rgba(239,68,68,0.4), 0 0 20px rgba(239,68,68,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                animation: 'slideDown 0.3s ease-out',
            }}
        >
            <span style={{ fontSize: 22 }}>{isSuccess ? '🎉' : '❌'}</span>
            {toast.msg}
        </div>
    );
}

// Add this to your styles/animations.css:
// @keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

export default Toast;
