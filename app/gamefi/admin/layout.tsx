// app/gamefi/admin/layout.tsx
// Server layout for admin with metadata
import type { Metadata } from 'next';
import { createStandardViewport } from '../../../lib/responsive/displayStandard';

export const metadata: Metadata = {
    title: 'Admin Dashboard | Banmao GameFi',
    description: 'Admin configuration for Banmao GameFi games',
};

export const viewport = createStandardViewport("#05070d");

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
