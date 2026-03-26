// BANMAO SLOTS - Professional Toast Notifications
// Cyber Blue Theme with SVG Icons

import toast from 'react-hot-toast';
import { SlotsTranslations } from './i18n/types';

// ==================== COLORS ====================
const COLORS = {
    success: {
        bg: 'linear-gradient(135deg, rgba(0,255,136,0.15) 0%, rgba(0,200,100,0.1) 100%)',
        border: '#00ff88',
        icon: '#00ff88',
        text: '#e2e8f0',
    },
    error: {
        bg: 'linear-gradient(135deg, rgba(255,80,80,0.15) 0%, rgba(200,50,50,0.1) 100%)',
        border: '#ff5050',
        icon: '#ff5050',
        text: '#e2e8f0',
    },
    loading: {
        bg: 'linear-gradient(135deg, rgba(0,191,255,0.15) 0%, rgba(0,150,200,0.1) 100%)',
        border: '#00bfff',
        icon: '#00bfff',
        text: '#e2e8f0',
    },
    info: {
        bg: 'linear-gradient(135deg, rgba(0,191,255,0.15) 0%, rgba(0,150,200,0.1) 100%)',
        border: '#00bfff',
        icon: '#00bfff',
        text: '#e2e8f0',
    },
};

// ==================== SVG ICONS ====================
const Icons = {
    success: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke={COLORS.success.icon} strokeWidth="2" />
            <path d="M6 10L9 13L14 7" stroke={COLORS.success.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    error: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke={COLORS.error.icon} strokeWidth="2" />
            <path d="M7 7L13 13M13 7L7 13" stroke={COLORS.error.icon} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    loading: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="10" cy="10" r="8" stroke={COLORS.loading.icon} strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
        </svg>
    ),
    deposit: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 3V14M10 14L6 10M10 14L14 10" stroke={COLORS.loading.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17H16" stroke={COLORS.loading.icon} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    withdraw: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 14V3M10 3L6 7M10 3L14 7" stroke={COLORS.loading.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 17H16" stroke={COLORS.loading.icon} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    settings: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" stroke={COLORS.loading.icon} strokeWidth="2" />
            <path d="M10 2V4M10 16V18M18 10H16M4 10H2M15.5 4.5L14 6M6 14L4.5 15.5M15.5 15.5L14 14M6 6L4.5 4.5" stroke={COLORS.loading.icon} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    approve: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2L12 6H17L13 9L15 14L10 11L5 14L7 9L3 6H8L10 2Z" stroke={COLORS.loading.icon} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M7 10L9 12L13 8" stroke={COLORS.success.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    wallet: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="2" y="5" width="16" height="12" rx="2" stroke={COLORS.loading.icon} strokeWidth="2" />
            <path d="M14 11H16" stroke={COLORS.loading.icon} strokeWidth="2" strokeLinecap="round" />
            <path d="M2 9H18" stroke={COLORS.loading.icon} strokeWidth="2" />
        </svg>
    ),
    copy: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="6" y="6" width="10" height="12" rx="2" stroke={COLORS.success.icon} strokeWidth="2" />
            <path d="M4 14V4C4 2.9 4.9 2 6 2H12" stroke={COLORS.success.icon} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
    pool: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="7" stroke={COLORS.loading.icon} strokeWidth="2" />
            <path d="M10 6V10L13 13" stroke={COLORS.loading.icon} strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),
};

// ==================== BASE TOAST STYLE ====================
const getToastStyle = (type: 'success' | 'error' | 'loading' | 'info') => ({
    background: COLORS[type].bg,
    border: `1px solid ${COLORS[type].border}`,
    borderRadius: '9999px',
    padding: '12px 16px',
    color: COLORS[type].text,
    boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 20px ${COLORS[type].border}33`,
    backdropFilter: 'blur(10px)',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    maxWidth: '400px',
});

// ==================== TOAST FUNCTIONS ====================

/**
 * Success toast with checkmark icon
 */
export function toastSuccess(message: string, options?: { duration?: number }) {
    return toast.custom(
        (t) => (
            <div
                style={{
                    ...getToastStyle('success'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: t.visible ? 1 : 0,
                    transform: t.visible ? 'translateY(0)' : 'translateY(-10px)',
                    transition: 'all 0.3s ease',
                }}
            >
                {Icons.success}
                <span>{message}</span>
            </div>
        ),
        { duration: options?.duration || 3000 }
    );
}

/**
 * Error toast with X icon
 */
export function toastError(message: string, details?: string) {
    return toast.custom(
        (t) => (
            <div
                style={{
                    ...getToastStyle('error'),
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    opacity: t.visible ? 1 : 0,
                    transform: t.visible ? 'translateY(0)' : 'translateY(-10px)',
                    transition: 'all 0.3s ease',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {Icons.error}
                    <span>{message}</span>
                </div>
                {details && (
                    <div style={{
                        fontSize: '11px',
                        color: '#94a3b8',
                        marginLeft: '32px',
                        maxHeight: '60px',
                        overflow: 'auto'
                    }}>
                        {details}
                    </div>
                )}
            </div>
        ),
        { duration: 5000 }
    );
}

/**
 * Loading toast with spinner - returns toast ID for dismissal
 */
export function toastLoading(message: string, icon?: keyof typeof Icons): string {
    return toast.custom(
        (t) => (
            <div
                style={{
                    ...getToastStyle('loading'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    opacity: t.visible ? 1 : 0,
                    transform: t.visible ? 'translateY(0)' : 'translateY(-10px)',
                    transition: 'all 0.3s ease',
                }}
            >
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                {icon && Icons[icon] ? Icons[icon] : Icons.loading}
                <span>{message}</span>
            </div>
        ),
        { duration: Infinity }
    );
}

/**
 * Dismiss a toast by ID
 */
export function toastDismiss(toastId: string) {
    toast.dismiss(toastId);
}

/**
 * Update loading toast to success
 */
export function toastUpdateSuccess(toastId: string, message: string) {
    toast.dismiss(toastId);
    toastSuccess(message);
}

/**
 * Update loading toast to error
 */
export function toastUpdateError(toastId: string, message: string, details?: string) {
    toast.dismiss(toastId);
    toastError(message, details);
}

// ==================== QUICK TOAST HELPERS ====================

export const slotsToast = {
    success: toastSuccess,
    error: toastError,
    loading: toastLoading,
    dismiss: toastDismiss,
    updateSuccess: toastUpdateSuccess,
    updateError: toastUpdateError,

    // Quick copy feedback
    copied: (t?: SlotsTranslations) => toastSuccess(t?.toastCopied || 'Copied!', { duration: 1500 }),

    // Wallet
    connectWallet: (t?: SlotsTranslations) => toastError(t?.toastConnectWalletFirst || 'Please connect wallet first'),
};

export default slotsToast;
