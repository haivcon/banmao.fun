// Auto-Resume hook — detects unfinished airdrop sessions after browser crash/reload
"use client";

import { useState, useEffect } from "react";
import { RecipientEntry, SendResult } from "../components/airdropTypes";

const STORAGE_PROGRESS = "banmao_airdrop_progress";

export interface ResumeData {
    entries: RecipientEntry[];
    results: SendResult[];
    timestamp: number;
    /** How many were already sent successfully */
    completedCount: number;
    /** Remaining unsent addresses */
    pendingEntries: RecipientEntry[];
}

export interface AutoResumeState {
    /** Whether an unfinished session was detected */
    hasUnfinished: boolean;
    /** The resume data if available */
    resumeData: ResumeData | null;
    /** Resume the unfinished airdrop */
    resume: () => ResumeData | null;
    /** Discard the unfinished session */
    discard: () => void;
    /** Age of the unfinished session in minutes */
    ageMinutes: number;
}

export function useAutoResume(): AutoResumeState {
    const [resumeData, setResumeData] = useState<ResumeData | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_PROGRESS);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (!data?.entries?.length) return;

            const entries: RecipientEntry[] = data.entries;
            const results: SendResult[] = data.results || [];
            const successAddrs = new Set(results.filter(r => r.success).map(r => r.address.toLowerCase()));
            const pendingEntries = entries.filter(e => !successAddrs.has(e.address.toLowerCase()));

            if (pendingEntries.length > 0) {
                setResumeData({
                    entries,
                    results,
                    timestamp: data.timestamp || Date.now(),
                    completedCount: successAddrs.size,
                    pendingEntries,
                });
            }
        } catch {
            // Corrupt data — silently ignore
        }
    }, []);

    const resume = (): ResumeData | null => {
        const data = resumeData;
        // Don't clear storage yet — executeAirdrop will manage it
        return data;
    };

    const discard = () => {
        setResumeData(null);
        try { localStorage.removeItem(STORAGE_PROGRESS); } catch {}
        try { localStorage.removeItem("banmao_airdrop_temp"); } catch {}
    };

    const ageMinutes = resumeData
        ? Math.round((Date.now() - resumeData.timestamp) / 60000)
        : 0;

    return {
        hasUnfinished: resumeData !== null && resumeData.pendingEntries.length > 0,
        resumeData,
        resume,
        discard,
        ageMinutes,
    };
}
