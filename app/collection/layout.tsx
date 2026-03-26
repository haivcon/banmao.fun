"use client";
import SharedProviders from "../providers";

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
    return <SharedProviders>{children}</SharedProviders>;
}
