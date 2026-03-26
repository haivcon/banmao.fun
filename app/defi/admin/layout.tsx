import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "DeFi Admin | BANMAO",
    description: "Admin dashboard for managing BANMAO Staking contract",
    keywords: ["BANMAO", "DeFi", "Staking", "Admin", "XLayer"],
};

export default function DefiAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
