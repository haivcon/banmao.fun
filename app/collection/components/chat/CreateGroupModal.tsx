"use client";
import React, { useState } from "react";
import { BANMAO_TOKEN_ADDRESS } from "../../lib/hubContract";

interface CreateGroupModalProps {
    pushUser: any;
    onClose: () => void;
    onSuccess: (newGroup: any) => void;
    t: any;
}

export default function CreateGroupModal({ pushUser, onClose, onSuccess, t }: CreateGroupModalProps) {
    const [groupName, setGroupName] = useState("");
    const [groupDesc, setGroupDesc] = useState("");
    const [tokenAmount, setTokenAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleCreate = async () => {
        if (!groupName) {
            setError(t.reqGroupName || "Group name is required");
            return;
        }
        if (!tokenAmount || Number(tokenAmount) <= 0) {
            setError(t.reqTokenAmount || "Token amount must be greater than 0");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Push Protocol Token Gated Rule for ERC20 hold on XLayer (Chain ID 196 or Base 8453)
            // Using standard eip155:196 or eip155:1 for placeholder if XLayer not natively supported by Push.
            // Push supports polygon, eth, bnb, etc. We'll use the BANMAO Token address.
            // Format: eip155:CHAIN_ID:CONTRACT_ADDRESS
            const chainId = 196; // XLayer Mainnet
            const contract = `eip155:${chainId}:${BANMAO_TOKEN_ADDRESS}`;

            const rules = {
                entry: {
                    conditions: {
                        any: [
                            {
                                type: "PUSH",
                                category: "ERC20",
                                subcategory: "holder",
                                data: {
                                    contract: contract,
                                    amount: Number(tokenAmount),
                                    decimals: 18,
                                },
                            },
                        ],
                    },
                },
            };

            const createdGroup = await pushUser.chat.group.create({
                groupName: groupName,
                groupDescription: groupDesc || "A Token-Gated Banmao Group",
                groupImage: "https://bafybeicei5gylol267j54n2y2eq2qjryf64wtdclt3m3lhlg3s7zttixm4.ipfs.w3s.link/banmao-coin.png", // Demo image
                members: [], // Only creator for now
                admins: [],
                isPublic: true,
                groupType: 'default', // Using default group type
                rules: rules,
            });

            onSuccess(createdGroup);
        } catch (err: any) {
            console.error("Create group error:", err);
            setError(err.message || "Failed to create group.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="hub-modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
            <div className="hub-modal hub-tip-modal" onClick={e => e.stopPropagation()}>
                <div className="hub-modal-header">
                    <h3>{t.createGatedGroup || "Create Token-Gated Group"}</h3>
                    <button className="hub-modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="hub-modal-body" style={{ textAlign: "left", paddingBottom: "20px" }}>
                    <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: "15px" }}>
                        {t.groupRuleDesc || "Users must hold the specified amount of $BANMAO on XLayer to join this group."}
                    </p>

                    <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>{t.groupNameLabel || "Group Name"}</label>
                    <input
                        type="text"
                        className="hub-tip-input"
                        style={{ width: "100%", marginBottom: 15 }}
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        placeholder="e.g. Whale Club"
                    />

                    <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>{t.groupDescLabel || "Description (Optional)"}</label>
                    <input
                        type="text"
                        className="hub-tip-input"
                        style={{ width: "100%", marginBottom: 15 }}
                        value={groupDesc}
                        onChange={e => setGroupDesc(e.target.value)}
                    />

                    <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>{t.minBanmaoHold || "Minimum $BANMAO to hold"}</label>
                    <div className="hub-tip-input-wrapper" style={{ marginBottom: 15 }}>
                        <input
                            type="number"
                            className="hub-tip-input"
                            value={tokenAmount}
                            onChange={e => setTokenAmount(e.target.value)}
                            placeholder="10000"
                            min="1"
                        />
                        <span className="hub-tip-symbol">$BANMAO</span>
                    </div>

                    {error && <div className="hub-error" style={{ marginBottom: 15 }}>{error}</div>}

                    <button
                        className="hub-btn hub-btn-primary"
                        style={{ width: "100%", padding: "12px", background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                        onClick={handleCreate}
                        disabled={loading || !groupName || !tokenAmount}
                    >
                        {loading ? (t.creatingGroup || "Creating...") : (t.createGroupBtn || "Create Group")}
                    </button>
                </div>
            </div>
        </div>
    );
}
