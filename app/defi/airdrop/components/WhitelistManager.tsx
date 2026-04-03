// Whitelist Manager — allows users to define a "only send to these addresses" list
"use client";

import React, { useState, useCallback } from "react";
import AIcon from "./AirdropIcons";

const STORAGE_WHITELIST = "banmao_airdrop_whitelist";

interface WhitelistManagerProps {
    t: (key: string) => string;
    playClick: () => void;
    onWhitelistChange: (addresses: Set<string>) => void;
    whitelist: Set<string>;
}

export default function WhitelistManager({ t, playClick, onWhitelistChange, whitelist }: WhitelistManagerProps) {
    const [input, setInput] = useState(() => Array.from(whitelist).join("\n"));
    const [isEnabled, setIsEnabled] = useState(whitelist.size > 0);

    const parseAndSave = useCallback((text: string) => {
        const addrs = text
            .split(/[\n;,]+/)
            .map(s => s.trim().toLowerCase())
            .filter(s => /^0x[a-fA-F0-9]{40}$/.test(s));
        const unique = new Set(addrs);
        onWhitelistChange(unique);
        try { localStorage.setItem(STORAGE_WHITELIST, JSON.stringify(Array.from(unique))); } catch {}
    }, [onWhitelistChange]);

    const toggle = () => {
        const next = !isEnabled;
        setIsEnabled(next);
        if (!next) {
            onWhitelistChange(new Set());
            try { localStorage.removeItem(STORAGE_WHITELIST); } catch {}
        } else {
            parseAndSave(input);
        }
        playClick();
    };

    return (
        <div style={{
            padding: "12px 16px", borderRadius: 12,
            background: isEnabled ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isEnabled ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)"}`,
            transition: "all 0.3s",
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AIcon name="check" size={16} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: isEnabled ? "#60a5fa" : "#888" }}>
                        {t("whitelistTitle") || "Whitelist Mode"}
                    </span>
                    {whitelist.size > 0 && (
                        <span style={{
                            background: "rgba(59,130,246,0.2)", color: "#60a5fa",
                            padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        }}>
                            {whitelist.size}
                        </span>
                    )}
                </div>
                <button
                    onClick={toggle}
                    style={{
                        padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        background: isEnabled ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isEnabled ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                        color: isEnabled ? "#60a5fa" : "#666",
                    }}
                >
                    {isEnabled ? (t("whitelistDisable") || "Disable") : (t("whitelistEnable") || "Enable")}
                </button>
            </div>
            <p style={{ fontSize: 11, color: "#888", marginBottom: 8, lineHeight: 1.4 }}>
                {t("whitelistDesc") || "When enabled, ONLY addresses in this list will receive tokens. All other addresses will be skipped. Useful for community events and reward airdrops."}
            </p>
            {isEnabled && (
                <>
                    <textarea
                        value={input}
                        onChange={e => { setInput(e.target.value); parseAndSave(e.target.value); }}
                        placeholder={t("whitelistPlaceholder") || "Paste whitelisted addresses, one per line...\n0x1234...abcd\n0x5678...efgh"}
                        rows={4}
                        style={{
                            width: "100%", padding: "10px", background: "rgba(0,0,0,0.3)",
                            border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8,
                            color: "#fff", fontSize: 12, fontFamily: "monospace",
                            resize: "vertical", outline: "none", boxSizing: "border-box",
                        }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button
                            onClick={() => { setInput(""); onWhitelistChange(new Set()); playClick(); try { localStorage.removeItem(STORAGE_WHITELIST); } catch {} }}
                            style={{
                                padding: "4px 10px", borderRadius: 6, fontSize: 11,
                                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                                color: "#f87171", cursor: "pointer",
                            }}
                        >
                            {t("whitelistClear") || "Clear All"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// Helper to load whitelist from storage
export function loadWhitelist(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_WHITELIST);
        if (raw) return new Set(JSON.parse(raw).map((a: string) => a.toLowerCase()));
    } catch {}
    return new Set();
}
