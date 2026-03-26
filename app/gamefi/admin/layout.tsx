// app/gamefi/admin/layout.tsx
// Server layout for admin with metadata
// Force desktop view on mobile for better admin experience

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
    title: 'Admin Dashboard | Banmao GameFi',
    description: 'Admin configuration for Banmao GameFi games',
};

// Force desktop viewport on mobile - makes the page render like desktop site
export const viewport: Viewport = {
    width: 1200,
    initialScale: 0.5,
    maximumScale: 2,
    userScalable: true,
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
