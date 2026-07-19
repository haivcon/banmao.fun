import React from 'react';

export const StakingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect x="8" y="2" width="8" height="12" rx="1" />
        <path d="M4 14v3a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-3" />
        <path d="M12 9v3" />
        <path d="M10 2v4" />
        <path d="M14 2v4" />
    </svg>
);

export const PoolIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 20c0-1.1-.9-2-2-2-.9 0-1.1.9-2 2 0-1.1-.9-2-2-2-.9 0-1.1.9-2 2 0-1.1-.9-2-2-2-.9 0-1.1.9-2 2 0-1.1-.9-2-2-2-.9 0-1.1.9-2 2" />
        <path d="M2 18c0-1.1.9-2 2-2 .9 0 1.1.9 2 2 0-1.1.9-2 2-2 .9 0 1.1.9 2 2 0-1.1.9-2 2-2 .9 0 1.1.9 2 2 0-1.1.9-2 2-2 .9 0 1.1.9 2 2" />
        <path d="M2 14c0-1.1.9-2 2-2 .9 0 1.1.9 2 2 0-1.1.9-2 2-2 .9 0 1.1.9 2 2 0-1.1.9-2 2-2 .9 0 1.1.9 2 2 0-1.1.9-2 2-2 .9 0 1.1.9 2 2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M12 3v1" />
        <path d="M12 10v1" />
        <path d="M8 7h1" />
        <path d="M15 7h1" />
    </svg>
);

export const FarmIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2a9 9 0 0 0-9 9v9h9l1-9" />
        <path d="M12 11h9v9h-9" />
        <path d="M12 2v9" />
        <path d="M21 2v4" />
        <path d="M16 4v2" />
    </svg>
);

export const LendingIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4 22h16" />
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 7v11.5" />
        <path d="M22 7v11.5" />
        <path d="M7 22v-9" />
        <path d="M12 22v-9" />
        <path d="M17 22v-9" />
    </svg>
);

export const StatsArrowIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
    </svg>
);

export const BurnIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2c0 5-4 7-4 12a6 6 0 0 0 8 5.65" />
        <path d="M12 2c0 5 4 7 4 12a6 6 0 0 1-8 5.65" />
        <circle cx="12" cy="18" r="2" />
    </svg>
);

export const AirdropIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2C7.03 2 3 6.03 3 11h18c0-4.97-4.03-9-9-9z" />
        <path d="M3 11l9 11 9-11" />
        <line x1="12" y1="22" x2="12" y2="15" />
        <path d="M8 11c0-3 1-6 4-9" />
        <path d="M16 11c0-3-1-6-4-9" />
    </svg>
);

export const LaunchpadIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
);
