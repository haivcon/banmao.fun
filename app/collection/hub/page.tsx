import { Suspense } from "react";
import type { Metadata } from "next";
import CollectionClient from "../CollectionClient";

export const metadata: Metadata = {
    title: "BanmaoHub | Collection",
    description: "Share and discover Banmao community creations.",
};

export default function HubPage() {
    return <Suspense fallback={null}><CollectionClient initialViewMode="hub" /></Suspense>;
}
